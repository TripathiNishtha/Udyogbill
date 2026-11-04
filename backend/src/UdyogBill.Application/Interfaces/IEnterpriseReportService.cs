using System;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;

namespace UdyogBill.Application.Interfaces;

public interface IEnterpriseReportService
{
    // ==========================================
    // 1. UNIVERSAL REPORTS (All Industries)
    // ==========================================
    Task<BalanceSheetDto> GetBalanceSheetAsync(
        DateTime? asOfDate = null,
        CancellationToken cancellationToken = default);

    Task<BankReconciliationReportDto> GetBankReconciliationAsync(
        Guid? bankAccountId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default);

    Task<GrossProfitMarginReportDto> GetGrossProfitMarginReportAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        Guid? customerId = null,
        string? search = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<StockVelocityReportDto> GetStockVelocityReportAsync(
        Guid? categoryId = null,
        string? filterType = null, // "All", "Fast", "Slow", "Deadstock"
        string? search = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<StockWastageAuditReportDto> GetStockWastageAuditReportAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? reason = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<NegativeStockReportDto> GetNegativeStockReportAsync(
        Guid? categoryId = null,
        string? search = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<EWayEInvoiceRegisterReportDto> GetEWayEInvoiceRegisterAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? status = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<SerialAgingReportDto> GetSerialAgingReportAsync(
        int thresholdDays = 60,
        string? category = null,
        string? search = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    // ==========================================
    // 2. PHARMA & FMCG SPECIFIC REPORTS
    // ==========================================
    Task<NdpsRegisterReportDto> GetNdpsRegisterAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? search = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<TbDrugRegisterReportDto> GetTbDrugRegisterAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? search = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<SaltStockFinderReportDto> GetSaltStockFinderAsync(
        string? moleculeQuery = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<ExpiredQuarantineReportDto> GetExpiredQuarantineReportAsync(
        Guid? supplierId = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<SubstituteMarginReportDto> GetSubstituteMarginAnalysisAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<TradeSchemeClaimsReportDto> GetTradeSchemeClaimsAsync(
        Guid? supplierId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);
}
