using System;
using UdyogBill.Domain.Common;

namespace UdyogBill.Domain.Entities.Reports;

public class SavedReportPreset : BaseTenantAuditableEntity
{
    public string ReportCode { get; set; } = string.Empty; // e.g. "SALES_DETAILED", "STOCK_VALUATION"
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string ConfigurationJson { get; set; } = "{}"; // Filter criteria, selected columns, sort order, grouping
    public bool IsDefault { get; set; } = false;
    public bool IsSharedWithTenant { get; set; } = true;
}
