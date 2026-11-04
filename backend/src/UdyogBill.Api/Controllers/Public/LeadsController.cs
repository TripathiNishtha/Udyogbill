using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Domain.Entities.CMS;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Persistence.Context;

namespace UdyogBill.Api.Controllers;

[AllowAnonymous]
[EnableRateLimiting("PublicLeadPolicy")]
[Route("api/v1/public/leads")]
[Route("api/public/leads")]
[Route("public/leads")]
[Route("api/v1/api/v1/public/leads")]
public class PublicLeadsController : BaseApiController
{
    private readonly AppDbContext _db;

    public PublicLeadsController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Captures a marketing or free tool lead with strict deduplication by GSTIN, Mobile, or Firm Name.
    /// No authentication required — this is a public endpoint.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitLead(
        [FromBody] SubmitLeadRequest request,
        CancellationToken cancellationToken)
    {
        // 1. Sanitize mobile
        var rawMobile = request.Mobile ?? string.Empty;
        var digitsOnly = new string(rawMobile.Where(char.IsDigit).ToArray());
        var cleanMobile = digitsOnly.Length >= 10 ? digitsOnly.Substring(digitsOnly.Length - 10) : digitsOnly;

        // Allow submission if either mobile is 10 digits OR a valid GSTIN/BusinessName is provided (e.g. from tool)
        if (cleanMobile.Length != 10 && string.IsNullOrWhiteSpace(request.Gstin) && string.IsNullOrWhiteSpace(request.BusinessName))
        {
            return BadRequest(new { error = "Valid 10-digit mobile number or business details required.", code = "INVALID_MOBILE" });
        }

        // 2. Sanitize GSTIN (ignore default dummy test value)
        var cleanGstin = !string.IsNullOrWhiteSpace(request.Gstin) ? request.Gstin.Trim().ToUpperInvariant() : null;
        if (cleanGstin == "07AAAAA0000A1Z5" || cleanGstin?.Length < 10)
        {
            cleanGstin = null;
        }

        // 3. Sanitize Firm/Business Name
        var cleanBusinessName = !string.IsNullOrWhiteSpace(request.BusinessName) ? request.BusinessName.Trim() : null;
        if (cleanBusinessName != null && (cleanBusinessName.Equals("Your Business Name", StringComparison.OrdinalIgnoreCase) || cleanBusinessName.Length < 2))
        {
            cleanBusinessName = null;
        }

        var contactName = !string.IsNullOrWhiteSpace(request.Name) 
            ? request.Name.Trim() 
            : (cleanBusinessName ?? "GST Invoice User");

        // -------------------------------------------------------------
        // DEDUPLICATION LOOKUP: Prevent duplicate entries
        // Priority 1: Match GSTIN (if non-empty)
        // Priority 2: Match Mobile Number (if 10 digits)
        // Priority 3: Match Firm / Business Name (if non-empty)
        // -------------------------------------------------------------
        Lead? existingLead = null;

        if (!string.IsNullOrWhiteSpace(cleanGstin))
        {
            existingLead = await _db.Leads.FirstOrDefaultAsync(l => l.Gstin == cleanGstin, cancellationToken);
        }

        if (existingLead == null && cleanMobile.Length == 10)
        {
            existingLead = await _db.Leads.FirstOrDefaultAsync(l => l.Mobile == cleanMobile, cancellationToken);
        }

        if (existingLead == null && !string.IsNullOrWhiteSpace(cleanBusinessName))
        {
            var bnLower = cleanBusinessName.ToLower();
            existingLead = await _db.Leads.FirstOrDefaultAsync(l => l.BusinessName.ToLower() == bnLower, cancellationToken);
        }

        if (existingLead != null)
        {
            // RECORD ALREADY EXISTS: Update activity and metrics without adding a duplicate!
            existingLead.InvoiceCount = Math.Max(existingLead.InvoiceCount + 1, 2);
            existingLead.LastActiveAt = DateTime.UtcNow;

            if (request.InvoiceAmount.HasValue && request.InvoiceAmount.Value > 0)
            {
                existingLead.LastInvoiceAmount = request.InvoiceAmount.Value;
            }

            if (!string.IsNullOrWhiteSpace(cleanGstin) && string.IsNullOrWhiteSpace(existingLead.Gstin))
            {
                existingLead.Gstin = cleanGstin;
            }

            if (cleanMobile.Length == 10 && (string.IsNullOrWhiteSpace(existingLead.Mobile) || existingLead.Mobile.Length != 10))
            {
                existingLead.Mobile = cleanMobile;
            }

            if (!string.IsNullOrWhiteSpace(cleanBusinessName) && (string.IsNullOrWhiteSpace(existingLead.BusinessName) || existingLead.BusinessName == "Your Business Name"))
            {
                existingLead.BusinessName = cleanBusinessName;
            }

            if (!string.IsNullOrWhiteSpace(request.City) && string.IsNullOrWhiteSpace(existingLead.City))
            {
                existingLead.City = request.City.Trim();
            }

            if (!string.IsNullOrWhiteSpace(request.State) && string.IsNullOrWhiteSpace(existingLead.State))
            {
                existingLead.State = request.State.Trim();
            }

            var noteStamp = $"[Invoice Activity: {DateTime.UtcNow:dd-MM-yyyy HH:mm}] Generated bill #{existingLead.InvoiceCount}" +
                            (request.InvoiceAmount.HasValue && request.InvoiceAmount.Value > 0 ? $" (₹{request.InvoiceAmount.Value:F2})" : "");
            
            existingLead.Notes = string.IsNullOrWhiteSpace(existingLead.Notes) 
                ? noteStamp 
                : $"{existingLead.Notes}\n{noteStamp}";

            await _db.SaveChangesAsync(cancellationToken);
            return Ok(new { message = "Lead updated successfully.", isDuplicate = true, leadId = existingLead.Id });
        }

        // -------------------------------------------------------------
        // NEW LEAD INSERTION
        // -------------------------------------------------------------
        var industry = !string.IsNullOrWhiteSpace(request.IndustryCode) 
            ? request.IndustryCode.Trim().ToUpperInvariant() 
            : (!string.IsNullOrWhiteSpace(request.BusinessType) ? request.BusinessType.Trim().ToUpperInvariant() : "OTHER");

        var lead = new Lead
        {
            Id = Guid.NewGuid(),
            Name = contactName,
            BusinessName = cleanBusinessName ?? contactName,
            Mobile = cleanMobile.Length == 10 ? cleanMobile : string.Empty,
            Email = request.Email?.Trim() ?? string.Empty,
            Gstin = cleanGstin,
            City = request.City?.Trim() ?? string.Empty,
            State = request.State?.Trim() ?? string.Empty,
            BusinessType = request.BusinessType?.Trim() ?? string.Empty,
            IndustryCode = industry,
            Message = request.Message?.Trim() ?? string.Empty,
            Source = request.Source?.Trim() ?? "Website",
            InvoiceCount = 1,
            LastInvoiceAmount = request.InvoiceAmount,
            LastActiveAt = DateTime.UtcNow,
            UtmSource = request.UtmSource?.Trim(),
            UtmMedium = request.UtmMedium?.Trim(),
            UtmCampaign = request.UtmCampaign?.Trim(),
            LandingPage = request.LandingPage?.Trim(),
            CitySlug = request.CitySlug?.Trim(),
            ReferrerUrl = request.ReferrerUrl?.Trim(),
            SearchKeyword = request.SearchKeyword?.Trim(),
            DeviceType = request.DeviceType?.Trim(),
            ConversionStage = "Lead",
            Status = "New",
            CreatedAt = DateTime.UtcNow,
            Notes = request.InvoiceAmount.HasValue 
                ? $"[Invoice Activity: {DateTime.UtcNow:dd-MM-yyyy HH:mm}] Generated first bill (₹{request.InvoiceAmount.Value:F2})"
                : string.Empty
        };

        _db.Leads.Add(lead);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Thank you! We will contact you within 24 hours.", isDuplicate = false, leadId = lead.Id });
    }

    /// <summary>
    /// Returns the current active configuration for the 3D marketing lead popup.
    /// Public endpoint.
    /// </summary>
    [HttpGet("/api/public/lead-popup-config")]
    [HttpGet("/api/v1/public/lead-popup-config")]
    [ProducesResponseType(typeof(PlatformLeadPopupConfig), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLeadPopupConfig(CancellationToken cancellationToken)
    {
        var config = await _db.PlatformLeadPopupConfigs.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        if (config == null)
        {
            config = new PlatformLeadPopupConfig();
        }
        return Ok(config);
    }
}

/// <summary>Request body for submitting a lead or free tool user from the marketing website.</summary>
public record SubmitLeadRequest(
    string? Name,
    string? BusinessName,
    string? Mobile,
    string? Email,
    string? Gstin,
    decimal? InvoiceAmount,
    string? City,
    string? State,
    string? BusinessType,
    string? IndustryCode,
    string? Message,
    string? Source,
    string? UtmSource,
    string? UtmMedium,
    string? UtmCampaign,
    string? LandingPage,
    string? CitySlug,
    string? ReferrerUrl,
    string? SearchKeyword,
    string? DeviceType);
