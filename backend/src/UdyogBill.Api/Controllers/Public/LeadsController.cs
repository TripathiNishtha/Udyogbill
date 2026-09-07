using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Domain.Entities.CMS;
using UdyogBill.Persistence.Context;

namespace UdyogBill.Api.Controllers;

[AllowAnonymous]
[EnableRateLimiting("PublicLeadPolicy")]
[Route("api/v1/public/leads")]
[Route("api/public/leads")]
public class PublicLeadsController : BaseApiController
{
    private readonly AppDbContext _db;

    public PublicLeadsController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Captures a new marketing lead from the UdyogBill website.
    /// No authentication required — this is a public endpoint.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SubmitLead(
        [FromBody] SubmitLeadRequest request,
        CancellationToken cancellationToken)
    {
        // Validate mobile is exactly 10 digits
        if (string.IsNullOrWhiteSpace(request.Mobile) ||
            request.Mobile.Length != 10 ||
            !request.Mobile.All(char.IsDigit))
        {
            return BadRequest(new { error = "Mobile number must be exactly 10 digits.", code = "INVALID_MOBILE" });
        }

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Name is required.", code = "VALIDATION_FAILED" });

        var industry = !string.IsNullOrWhiteSpace(request.IndustryCode) 
            ? request.IndustryCode.Trim().ToUpperInvariant() 
            : (!string.IsNullOrWhiteSpace(request.BusinessType) ? request.BusinessType.Trim().ToUpperInvariant() : "OTHER");

        var lead = new Lead
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            BusinessName = request.BusinessName?.Trim() ?? string.Empty,
            Mobile = request.Mobile.Trim(),
            Email = request.Email?.Trim() ?? string.Empty,
            City = request.City?.Trim() ?? string.Empty,
            State = request.State?.Trim() ?? string.Empty,
            BusinessType = request.BusinessType?.Trim() ?? string.Empty,
            IndustryCode = industry,
            Message = request.Message?.Trim() ?? string.Empty,
            Source = request.Source?.Trim() ?? string.Empty,
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
            Notes = string.Empty
        };

        _db.Leads.Add(lead);
        await _db.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Thank you! We will contact you within 24 hours." });
    }
}

/// <summary>Request body for submitting a lead from the marketing website.</summary>
public record SubmitLeadRequest(
    string Name,
    string? BusinessName,
    string Mobile,
    string? Email,
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
