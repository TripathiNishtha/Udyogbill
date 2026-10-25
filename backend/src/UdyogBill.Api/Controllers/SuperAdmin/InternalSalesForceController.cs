using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.SalesForce;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers.SuperAdmin;

[Authorize(Roles = Roles.SuperAdmin)]
[Route("api/v1/superadmin/sales-force")]
public class InternalSalesForceController : BaseApiController
{
    private readonly IInternalSalesForceService _sfaService;

    public InternalSalesForceController(IInternalSalesForceService sfaService)
    {
        _sfaService = sfaService;
    }

    private Guid GetCurrentUserId()
    {
        var idStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(idStr, out var id) ? id : Guid.Empty;
    }

    // 1. SALES REPS & HIERARCHY
    [HttpGet("reps")]
    [ProducesResponseType(typeof(IReadOnlyList<InternalSalesRepDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSalesReps([FromQuery] string? city, [FromQuery] SalesRoleTier? tier, [FromQuery] bool activeOnly = true)
    {
        var result = await _sfaService.GetSalesRepsAsync(city, tier, activeOnly);
        return HandleResult(result);
    }

    [HttpGet("reps/{id}")]
    [ProducesResponseType(typeof(InternalSalesRepDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSalesRepById(Guid id)
    {
        var result = await _sfaService.GetSalesRepByIdAsync(id);
        return HandleResult(result);
    }

    [HttpPost("reps")]
    [ProducesResponseType(typeof(InternalSalesRepDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateSalesRep([FromBody] CreateSalesRepRequest req)
    {
        var result = await _sfaService.CreateSalesRepAsync(req);
        return HandleResult(result);
    }

    [HttpPut("reps/{id}")]
    [ProducesResponseType(typeof(InternalSalesRepDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateSalesRep(Guid id, [FromBody] UpdateSalesRepRequest req)
    {
        var result = await _sfaService.UpdateSalesRepAsync(id, req);
        return HandleResult(result);
    }

    [HttpPut("reps/{id}/target")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateRepMonthlyTarget(Guid id, [FromBody] UpdateRepTargetRequest req)
    {
        var result = await _sfaService.UpdateRepMonthlyTargetAsync(id, req.MonthlyTarget);
        return HandleResult(result);
    }

    [HttpGet("hierarchy-tree")]
    public async Task<IActionResult> GetHierarchyTree([FromQuery] int? month, [FromQuery] int? year)
    {
        var now = DateTime.UtcNow;
        var m = month ?? now.Month;
        var y = year ?? now.Year;
        var result = await _sfaService.GetHierarchyTreeAsync(m, y);
        return HandleResult(result);
    }

    // 2. HARDWARE DEVICE BINDING
    [HttpGet("devices/pending")]
    [ProducesResponseType(typeof(IReadOnlyList<HardwareDeviceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPendingDevices()
    {
        var result = await _sfaService.GetPendingDevicesAsync();
        return HandleResult(result);
    }

    [HttpPost("devices/{deviceId}/approve")]
    [ProducesResponseType(typeof(HardwareDeviceDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> ApproveDevice(Guid deviceId, [FromBody] ApproveDeviceRequest req)
    {
        var adminId = GetCurrentUserId();
        var result = await _sfaService.ApproveDeviceAsync(deviceId, req, adminId);
        return HandleResult(result);
    }

    [HttpPost("devices/{deviceId}/revoke")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    public async Task<IActionResult> RevokeDevice(Guid deviceId)
    {
        var adminId = GetCurrentUserId();
        var result = await _sfaService.RevokeDeviceAsync(deviceId, adminId);
        return HandleResult(result);
    }

    // 3. PRODUCT CATALOG
    [HttpGet("products")]
    [ProducesResponseType(typeof(IReadOnlyList<CompanyProductCatalogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetProducts([FromQuery] bool activeOnly = true)
    {
        var result = await _sfaService.GetProductCatalogAsync(activeOnly);
        return HandleResult(result);
    }

    [HttpPost("products")]
    [ProducesResponseType(typeof(CompanyProductCatalogDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateProduct([FromBody] CreateCompanyProductRequest req)
    {
        var result = await _sfaService.CreateProductAsync(req);
        return HandleResult(result);
    }

    [HttpPut("products/{id}")]
    [ProducesResponseType(typeof(CompanyProductCatalogDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] UpdateCompanyProductRequest req)
    {
        var result = await _sfaService.UpdateProductAsync(id, req);
        return HandleResult(result);
    }

    [HttpDelete("products/{id}")]
    [HttpPost("products/{id}/delete")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteProduct(Guid id)
    {
        var result = await _sfaService.DeleteProductAsync(id);
        return HandleResult(result);
    }

    // 4. QUOTAS & REVENUE
    [HttpGet("quotas")]
    [ProducesResponseType(typeof(IReadOnlyList<SalesQuotaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetQuotas([FromQuery] int? month, [FromQuery] int? year, [FromQuery] string? city)
    {
        var now = DateTime.UtcNow;
        var m = month ?? now.Month;
        var y = year ?? now.Year;
        var result = await _sfaService.GetQuotasAsync(m, y, city);
        return HandleResult(result);
    }

    [HttpPost("quotas/allocate")]
    [ProducesResponseType(typeof(SalesQuotaDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AllocateQuota([FromBody] AllocateQuotaRequest req)
    {
        var result = await _sfaService.AllocateQuotaAsync(req);
        return HandleResult(result);
    }

    // 5. FIELD VISITS
    [HttpGet("visits")]
    [ProducesResponseType(typeof(PagedResult<FieldShopVisitDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetVisits(
        [FromQuery] Guid? repId,
        [FromQuery] string? city,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50)
    {
        var result = await _sfaService.GetVisitsAsync(repId, city, fromDate, toDate, pageNumber, pageSize);
        return HandleResult(result);
    }

    // 6. ATTRIBUTION & DISPUTE RESOLVER
    [HttpPost("subscriptions/{subscriptionId}/assign-rep")]
    [ProducesResponseType(typeof(SubscriptionAttributionLogDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AssignSubscriptionToRep(
        Guid subscriptionId,
        [FromQuery] Guid tenantId,
        [FromBody] AssignSubscriptionToRepRequest req)
    {
        var adminId = GetCurrentUserId();
        var result = await _sfaService.AssignSubscriptionToRepAsync(subscriptionId, tenantId, req, adminId);
        return HandleResult(result);
    }

    [HttpGet("attribution-logs")]
    [ProducesResponseType(typeof(PagedResult<SubscriptionAttributionLogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAttributionLogs([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 50)
    {
        var result = await _sfaService.GetAttributionAuditLogsAsync(pageNumber, pageSize);
        return HandleResult(result);
    }

    // 7. 1-CLICK EXCEL EXPORT
    [HttpGet("review-excel")]
    public async Task<IActionResult> ExportReviewExcel([FromQuery] string? city, [FromQuery] int? month, [FromQuery] int? year)
    {
        var now = DateTime.UtcNow;
        var m = month ?? now.Month;
        var y = year ?? now.Year;
        var result = await _sfaService.ExportWeeklyReviewExcelCsvAsync(city, m, y);
        if (!result.IsSuccess) return HandleResult(result);

        var filename = $"UdyogBill_Sales_Review_{city ?? "All"}_{y}_{m:D2}.csv";
        return File(result.Data!, "text/csv; charset=utf-8", filename);
    }
}
