using System;
using System.Collections.Concurrent;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.Interfaces;

namespace UdyogBill.Infrastructure.Services;

public class IpGeolocationService : IIpGeolocationService
{
    private static readonly ConcurrentDictionary<string, GeoLocationResult> Cache = new();
    private static readonly HttpClient HttpClient = new() { Timeout = TimeSpan.FromSeconds(2) };
    private readonly ILogger<IpGeolocationService> _logger;

    public IpGeolocationService(ILogger<IpGeolocationService> logger)
    {
        _logger = logger;
    }

    public async Task<GeoLocationResult> ResolveIpAsync(string? ipAddress, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(ipAddress))
        {
            return new GeoLocationResult { City = "Unknown", State = "Unknown", Country = "IN", IspName = "Unknown" };
        }

        // Clean IP (remove port if attached)
        var cleanIp = ipAddress.Trim();
        if (cleanIp.Contains(':') && !cleanIp.Contains("::") && cleanIp.Split(':').Length == 2)
        {
            cleanIp = cleanIp.Split(':')[0];
        }

        // Check Loopback / Private IP
        if (IsPrivateOrLoopbackIp(cleanIp))
        {
            return new GeoLocationResult
            {
                City = "Local Development",
                State = "Localhost",
                Country = "IN",
                IspName = "Internal Network"
            };
        }

        // Check Cache
        if (Cache.TryGetValue(cleanIp, out var cached))
        {
            return cached;
        }

        try
        {
            // Fast lookup via ip-api.com
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(2));

            var url = $"http://ip-api.com/json/{cleanIp}?fields=status,country,regionName,city,isp,org";
            var response = await HttpClient.GetAsync(url, cts.Token);

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync(cts.Token);
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (root.TryGetProperty("status", out var status) && status.GetString() == "success")
                {
                    var result = new GeoLocationResult
                    {
                        City = root.TryGetProperty("city", out var c) ? c.GetString() ?? "" : "",
                        State = root.TryGetProperty("regionName", out var s) ? s.GetString() ?? "" : "",
                        Country = root.TryGetProperty("country", out var cntry) ? cntry.GetString() ?? "IN" : "IN",
                        IspName = root.TryGetProperty("isp", out var isp) ? isp.GetString() ?? "" : ""
                    };

                    Cache[cleanIp] = result;
                    return result;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug("IP Geolocation resolution failed for {Ip}: {Message}", cleanIp, ex.Message);
        }

        var fallback = new GeoLocationResult { City = "India (Resolved)", State = "", Country = "IN", IspName = "Broadband / Mobile Carrier" };
        Cache[cleanIp] = fallback;
        return fallback;
    }

    private static bool IsPrivateOrLoopbackIp(string ip)
    {
        if (ip == "127.0.0.1" || ip == "::1" || ip == "localhost") return true;

        if (IPAddress.TryParse(ip, out var addr))
        {
            if (IPAddress.IsLoopback(addr)) return true;

            var bytes = addr.GetAddressBytes();
            if (bytes.Length == 4)
            {
                // 10.0.0.0/8
                if (bytes[0] == 10) return true;
                // 172.16.0.0/12
                if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;
                // 192.168.0.0/16
                if (bytes[0] == 192 && bytes[1] == 168) return true;
            }
        }

        return false;
    }
}
