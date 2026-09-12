using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class SandboxGstService : ISandboxGstService
{
    private readonly AppDbContext _context;
    private readonly ILogger<SandboxGstService> _logger;
    private static readonly HttpClient _httpClient = new() { Timeout = TimeSpan.FromSeconds(15) };

    private static string? _cachedToken;
    private static string? _cachedForApiKey;
    private static DateTime _tokenExpiresAtUtc = DateTime.MinValue;
    private static readonly SemaphoreSlim _authLock = new(1, 1);

    private static readonly Dictionary<string, string> StateCodeMap = new()
    {
        ["01"] = "Jammu and Kashmir",
        ["02"] = "Himachal Pradesh",
        ["03"] = "Punjab",
        ["04"] = "Chandigarh",
        ["05"] = "Uttarakhand",
        ["06"] = "Haryana",
        ["07"] = "Delhi",
        ["08"] = "Rajasthan",
        ["09"] = "Uttar Pradesh",
        ["10"] = "Bihar",
        ["11"] = "Sikkim",
        ["12"] = "Arunachal Pradesh",
        ["13"] = "Nagaland",
        ["14"] = "Manipur",
        ["15"] = "Mizoram",
        ["16"] = "Tripura",
        ["17"] = "Meghalaya",
        ["18"] = "Assam",
        ["19"] = "West Bengal",
        ["20"] = "Jharkhand",
        ["21"] = "Odisha",
        ["22"] = "Chhattisgarh",
        ["23"] = "Madhya Pradesh",
        ["24"] = "Gujarat",
        ["26"] = "Dadra and Nagar Haveli and Daman and Diu",
        ["27"] = "Maharashtra",
        ["29"] = "Karnataka",
        ["30"] = "Goa",
        ["31"] = "Lakshadweep",
        ["32"] = "Kerala",
        ["33"] = "Tamil Nadu",
        ["34"] = "Puducherry",
        ["35"] = "Andaman and Nicobar Islands",
        ["36"] = "Telangana",
        ["37"] = "Andhra Pradesh",
        ["38"] = "Ladakh"
    };

    public SandboxGstService(AppDbContext context, ILogger<SandboxGstService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<GstLookupResponseDto>> LookupGstinAsync(string gstin, CancellationToken cancellationToken = default)
    {
        gstin = gstin?.Trim().ToUpperInvariant() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(gstin) || gstin.Length != 15)
        {
            return Result<GstLookupResponseDto>.Failure("Please enter a valid 15-digit GSTIN.", "INVALID_GSTIN");
        }

        var profile = await _context.PlatformCompanyProfiles
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(cancellationToken);

        if (profile == null || !profile.EnableGstAutoFill)
        {
            return Result<GstLookupResponseDto>.Failure("GST Auto-Fill is currently disabled by administrator.", "DISABLED");
        }

        if (string.IsNullOrWhiteSpace(profile.SandboxApiKey) || string.IsNullOrWhiteSpace(profile.SandboxApiSecret))
        {
            return Result<GstLookupResponseDto>.Failure("Sandbox API credentials are not configured.", "NOT_CONFIGURED");
        }

        return await FetchGstinDetailsAsync(profile.SandboxApiKey.Trim(), profile.SandboxApiSecret.Trim(), gstin, cancellationToken);
    }

    public async Task<Result<GstLookupResponseDto>> TestConnectionAsync(TestSandboxGstRequest request, CancellationToken cancellationToken = default)
    {
        var apiKey = request.ApiKey?.Trim();
        var apiSecret = request.ApiSecret?.Trim();

        // If credentials not provided in request, check saved profile credentials
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(apiSecret))
        {
            var profile = await _context.PlatformCompanyProfiles
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(cancellationToken);

            apiKey = string.IsNullOrWhiteSpace(apiKey) ? profile?.SandboxApiKey?.Trim() : apiKey;
            apiSecret = string.IsNullOrWhiteSpace(apiSecret) ? profile?.SandboxApiSecret?.Trim() : apiSecret;
        }

        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(apiSecret))
        {
            return Result<GstLookupResponseDto>.Failure("API Key and API Secret are required to test connection.", "MISSING_CREDENTIALS");
        }

        var testGstin = string.IsNullOrWhiteSpace(request.TestGstin) ? "06AAMCD2668N1Z2" : request.TestGstin.Trim().ToUpperInvariant();

        return await FetchGstinDetailsAsync(apiKey, apiSecret, testGstin, cancellationToken);
    }

    private async Task<Result<GstLookupResponseDto>> FetchGstinDetailsAsync(
        string apiKey,
        string apiSecret,
        string gstin,
        CancellationToken cancellationToken)
    {
        try
        {
            var token = await GetAccessTokenAsync(apiKey, apiSecret, cancellationToken);
            if (string.IsNullOrWhiteSpace(token))
            {
                return Result<GstLookupResponseDto>.Failure("Failed to authenticate with Sandbox.co.in. Please check your API Key & Secret.", "AUTH_FAILED");
            }

            // 1. Try POST /gst/compliance/public/gstin/search
            var searchUrl = "https://api.sandbox.co.in/gst/compliance/public/gstin/search";
            var requestMsg = new HttpRequestMessage(HttpMethod.Post, searchUrl);
            requestMsg.Headers.Add("x-api-key", apiKey);
            requestMsg.Headers.Add("authorization", token);
            requestMsg.Headers.Add("x-api-version", "1.0.0");
            requestMsg.Content = new StringContent(JsonSerializer.Serialize(new { gstin }), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(requestMsg, cancellationToken);

            // 2. If endpoint not found (404), fallback to GET /gsp/public/gstin/{gstin}
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                _logger.LogInformation("Compliance search 404, attempting fallback GSP endpoint for GSTIN: {Gstin}", gstin);
                var fallbackUrl = $"https://api.sandbox.co.in/gsp/public/gstin/{gstin}";
                var fallbackReq = new HttpRequestMessage(HttpMethod.Get, fallbackUrl);
                fallbackReq.Headers.Add("x-api-key", apiKey);
                fallbackReq.Headers.Add("authorization", token);
                fallbackReq.Headers.Add("x-api-version", "1.0.0");
                response = await _httpClient.SendAsync(fallbackReq, cancellationToken);
            }

            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Sandbox GST lookup failed ({Status}): {Response}", response.StatusCode, responseJson);
                
                // Parse error message if available
                string err = "Failed to fetch GST details from portal.";
                try
                {
                    using var doc = JsonDocument.Parse(responseJson);
                    if (doc.RootElement.TryGetProperty("message", out var msgEl))
                    {
                        err = msgEl.GetString() ?? err;
                    }
                }
                catch { }

                return Result<GstLookupResponseDto>.Failure(err, "LOOKUP_FAILED");
            }

            return ParseGstResponse(responseJson, gstin);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during Sandbox GST lookup for {Gstin}", gstin);
            return Result<GstLookupResponseDto>.Failure($"Error connecting to GST service: {ex.Message}", "SERVER_ERROR");
        }
    }

    private async Task<string?> GetAccessTokenAsync(string apiKey, string apiSecret, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrEmpty(_cachedToken) 
            && _cachedForApiKey == apiKey 
            && DateTime.UtcNow < _tokenExpiresAtUtc)
        {
            return _cachedToken;
        }

        await _authLock.WaitAsync(cancellationToken);
        try
        {
            if (!string.IsNullOrEmpty(_cachedToken) 
                && _cachedForApiKey == apiKey 
                && DateTime.UtcNow < _tokenExpiresAtUtc)
            {
                return _cachedToken;
            }

            var authUrl = "https://api.sandbox.co.in/authenticate";
            using var req = new HttpRequestMessage(HttpMethod.Post, authUrl);
            req.Headers.Add("x-api-key", apiKey);
            req.Headers.Add("x-api-secret", apiSecret);
            req.Headers.Add("x-api-version", "1.0.0");

            var res = await _httpClient.SendAsync(req, cancellationToken);
            var content = await res.Content.ReadAsStringAsync(cancellationToken);

            if (!res.IsSuccessStatusCode)
            {
                _logger.LogError("Sandbox auth failed ({StatusCode}): {Body}", res.StatusCode, content);
                return null;
            }

            using var doc = JsonDocument.Parse(content);
            if (doc.RootElement.TryGetProperty("data", out var dataEl) && 
                dataEl.TryGetProperty("access_token", out var tokenEl))
            {
                _cachedToken = tokenEl.GetString();
                _cachedForApiKey = apiKey;
                _tokenExpiresAtUtc = DateTime.UtcNow.AddHours(20); // Valid for 24 hours
                return _cachedToken;
            }

            _logger.LogError("Sandbox auth response missing access_token: {Body}", content);
            return null;
        }
        finally
        {
            _authLock.Release();
        }
    }

    private Result<GstLookupResponseDto> ParseGstResponse(string responseJson, string gstin)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            var root = doc.RootElement;

            JsonElement data = root;
            while (data.TryGetProperty("data", out var dEl) && dEl.ValueKind == JsonValueKind.Object)
            {
                data = dEl;
            }

            string legalName = GetPropString(data, "lgnm") ?? GetPropString(data, "legal_name") ?? string.Empty;
            string tradeName = GetPropString(data, "tradeNam") ?? GetPropString(data, "trade_name") ?? legalName;
            string status = GetPropString(data, "sts") ?? GetPropString(data, "status") ?? "Active";

            string stateCode = gstin.Length >= 2 ? gstin.Substring(0, 2) : "06";
            string state = StateCodeMap.TryGetValue(stateCode, out var mappedState) ? mappedState : "Haryana";

            string addressLine1 = string.Empty;
            string city = string.Empty;
            string pincode = string.Empty;

            // Check principal address (pradr.addr)
            if (data.TryGetProperty("pradr", out var pradrEl) && pradrEl.TryGetProperty("addr", out var addrEl))
            {
                var flno = GetPropString(addrEl, "flno");
                var bno = GetPropString(addrEl, "bno");
                var bnm = GetPropString(addrEl, "bnm");
                var st = GetPropString(addrEl, "st");
                var loc = GetPropString(addrEl, "loc");
                var locality = GetPropString(addrEl, "locality");
                var dst = GetPropString(addrEl, "dst");
                var stcd = GetPropString(addrEl, "stcd");
                
                if (!string.IsNullOrWhiteSpace(stcd)) state = stcd;
                city = GetPropString(addrEl, "city") ?? dst ?? string.Empty;
                pincode = GetPropString(addrEl, "pncd") ?? string.Empty;

                var addrParts = new List<string>();
                if (!string.IsNullOrWhiteSpace(flno)) addrParts.Add(flno);
                if (!string.IsNullOrWhiteSpace(bno)) addrParts.Add(bno);
                if (!string.IsNullOrWhiteSpace(bnm)) addrParts.Add(bnm);
                if (!string.IsNullOrWhiteSpace(st)) addrParts.Add(st);
                if (!string.IsNullOrWhiteSpace(loc)) addrParts.Add(loc);
                if (!string.IsNullOrWhiteSpace(locality) && locality != loc) addrParts.Add(locality);

                addressLine1 = string.Join(", ", addrParts);
            }

            var result = new GstLookupResponseDto(
                Success: true,
                Gstin: gstin,
                LegalName: legalName,
                TradeName: tradeName,
                Status: status,
                State: state,
                StateCode: stateCode,
                AddressLine1: addressLine1,
                City: city,
                Pincode: pincode,
                ErrorMessage: null
            );

            return Result<GstLookupResponseDto>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing GST response JSON: {Json}", responseJson);
            return Result<GstLookupResponseDto>.Failure("Failed to parse GST portal response.", "PARSE_ERROR");
        }
    }

    private static string? GetPropString(JsonElement el, string propName)
    {
        if (el.TryGetProperty(propName, out var p) && p.ValueKind == JsonValueKind.String)
        {
            return p.GetString()?.Trim();
        }
        return null;
    }
}
