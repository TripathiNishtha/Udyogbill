using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Reports;

namespace UdyogBill.Application.Interfaces;

public interface IP0ReportService
{
    Task<SalesRegisterDetailedReportDto> GetSalesRegisterDetailedAsync(P0ReportFilterRequest request, CancellationToken cancellationToken = default);
    Task<SalesSummaryReportDto> GetSalesSummaryAsync(P0ReportFilterRequest request, CancellationToken cancellationToken = default);
    
    Task<PurchaseRegisterDetailedReportDto> GetPurchaseRegisterDetailedAsync(P0ReportFilterRequest request, CancellationToken cancellationToken = default);
    Task<PurchaseSummaryReportDto> GetPurchaseSummaryAsync(P0ReportFilterRequest request, CancellationToken cancellationToken = default);
    
    Task<RealTimeStockBalanceReportDto> GetRealTimeStockBalanceAsync(P0ReportFilterRequest request, CancellationToken cancellationToken = default);
    Task<StockValuationReportDto> GetStockValuationAsync(P0ReportFilterRequest request, CancellationToken cancellationToken = default);
    
    Task<DebtorAgeingReportDto> GetDebtorAgeingScheduleAsync(P0ReportFilterRequest request, CancellationToken cancellationToken = default);
    Task<CreditorAgeingReportDto> GetCreditorAgeingScheduleAsync(P0ReportFilterRequest request, CancellationToken cancellationToken = default);
    
    Task<TruePnLReportDto> GetTruePnLReportAsync(P0ReportFilterRequest request, CancellationToken cancellationToken = default);

    Task<(byte[] FileBytes, string FileName, string ContentType)> ExportReportCsvAsync(string reportType, P0ReportFilterRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SavedReportPreset>> GetSavedPresetsAsync(string? reportCode = null, CancellationToken cancellationToken = default);
    Task<SavedReportPreset> SavePresetAsync(SavedReportPreset preset, CancellationToken cancellationToken = default);
    Task<bool> DeletePresetAsync(Guid id, CancellationToken cancellationToken = default);
}
