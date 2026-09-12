using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/v1/superadmin/leads")]
public class LeadManagementController : BaseApiController
{
    private readonly AppDbContext _db;

    public LeadManagementController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// GET /api/v1/superadmin/leads
    /// Returns a paginated list of marketing leads with optional filters.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<LeadDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLeads(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? industry = null,
        [FromQuery] string? conversionStage = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var query = _db.Leads.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(l => l.Status == status);

        if (!string.IsNullOrWhiteSpace(industry))
            query = query.Where(l => l.IndustryCode.ToUpper() == industry.ToUpper() || l.BusinessType.ToUpper() == industry.ToUpper());

        if (!string.IsNullOrWhiteSpace(conversionStage))
            query = query.Where(l => l.ConversionStage == conversionStage);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(l => 
                l.Name.ToLower().Contains(s) || 
                l.BusinessName.ToLower().Contains(s) || 
                l.Mobile.Contains(s) || 
                l.Email.ToLower().Contains(s) ||
                l.City.ToLower().Contains(s));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new LeadDto(
                l.Id,
                l.Name,
                l.BusinessName,
                l.Mobile,
                l.Email,
                l.City,
                l.State,
                l.BusinessType,
                l.IndustryCode,
                l.Message,
                l.Source,
                l.UtmSource,
                l.UtmMedium,
                l.UtmCampaign,
                l.LandingPage,
                l.CitySlug,
                l.TenantId,
                l.ReferrerUrl,
                l.SearchKeyword,
                l.DeviceType,
                l.ConversionStage,
                l.PaidAmount,
                l.TrialStartedAt,
                l.ConvertedPaidAt,
                l.Status,
                l.CreatedAt,
                l.ContactedAt,
                l.Notes))
            .ToListAsync(cancellationToken);

        var result = PagedResult<LeadDto>.Create(items, page, pageSize, totalCount);
        return Ok(result);
    }

    /// <summary>
    /// PATCH /api/v1/superadmin/leads/{id}/status
    /// Updates the status, conversion stage, revenue, or notes of a lead.
    /// </summary>
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateLeadStatus(
        Guid id,
        [FromBody] UpdateLeadStatusRequest request,
        CancellationToken cancellationToken)
    {
        var validStatuses = new[] { "New", "Contacted", "Converted", "Dropped" };
        if (!string.IsNullOrWhiteSpace(request.Status) && !validStatuses.Contains(request.Status))
            return BadRequest(new { error = $"Invalid status. Allowed values: {string.Join(", ", validStatuses)}", code = "INVALID_STATUS" });

        var validStages = new[] { "Lead", "Contacted", "Trial", "ConvertedPaid", "Dropped" };
        if (!string.IsNullOrWhiteSpace(request.ConversionStage) && !validStages.Contains(request.ConversionStage))
            return BadRequest(new { error = $"Invalid stage. Allowed values: {string.Join(", ", validStages)}", code = "INVALID_STAGE" });

        var lead = await _db.Leads.FindAsync(new object[] { id }, cancellationToken);
        if (lead is null)
            return NotFound(new { error = "Lead not found.", code = "NOT_FOUND" });

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            lead.Status = request.Status;

            if (request.Status == "Contacted" && lead.ContactedAt is null)
                lead.ContactedAt = DateTime.UtcNow;

            if (request.Status == "Converted" && lead.ConvertedPaidAt is null)
                lead.ConvertedPaidAt = DateTime.UtcNow;
        }

        if (!string.IsNullOrWhiteSpace(request.ConversionStage))
        {
            lead.ConversionStage = request.ConversionStage;

            if (request.ConversionStage == "Contacted" && lead.ContactedAt is null)
                lead.ContactedAt = DateTime.UtcNow;

            if (request.ConversionStage == "Trial" && lead.TrialStartedAt is null)
                lead.TrialStartedAt = DateTime.UtcNow;

            if (request.ConversionStage == "ConvertedPaid")
            {
                if (lead.ConvertedPaidAt is null)
                    lead.ConvertedPaidAt = DateTime.UtcNow;
                lead.Status = "Converted";
            }
        }

        if (request.PaidAmount.HasValue)
            lead.PaidAmount = request.PaidAmount.Value;

        if (!string.IsNullOrWhiteSpace(request.IndustryCode))
            lead.IndustryCode = request.IndustryCode.Trim().ToUpperInvariant();

        if (request.Notes is not null)
            lead.Notes = request.Notes;

        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// DELETE /api/v1/superadmin/leads/{id}
    /// Deletes a lead record by ID.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteLead(
        Guid id,
        CancellationToken cancellationToken)
    {
        var lead = await _db.Leads.FindAsync(new object[] { id }, cancellationToken);
        if (lead is null)
            return NotFound(new { error = "Lead not found.", code = "NOT_FOUND" });

        _db.Leads.Remove(lead);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}

/// <summary>Read model for a marketing lead with full organic attribution.</summary>
public record LeadDto(
    Guid Id,
    string Name,
    string BusinessName,
    string Mobile,
    string Email,
    string City,
    string State,
    string BusinessType,
    string IndustryCode,
    string Message,
    string Source,
    string? UtmSource,
    string? UtmMedium,
    string? UtmCampaign,
    string? LandingPage,
    string? CitySlug,
    Guid? TenantId,
    string? ReferrerUrl,
    string? SearchKeyword,
    string? DeviceType,
    string ConversionStage,
    decimal? PaidAmount,
    DateTime? TrialStartedAt,
    DateTime? ConvertedPaidAt,
    string Status,
    DateTime CreatedAt,
    DateTime? ContactedAt,
    string Notes);

/// <summary>Request body for updating a lead's status, funnel stage, revenue, and/or notes.</summary>
public record UpdateLeadStatusRequest(
    string? Status,
    string? Notes,
    string? ConversionStage = null,
    decimal? PaidAmount = null,
    string? IndustryCode = null);
