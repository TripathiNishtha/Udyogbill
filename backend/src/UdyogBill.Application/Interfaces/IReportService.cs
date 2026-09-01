using System;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IReportService
{
    Task<Result<PagedResult<LedgerEntryDto>>> GetLedgerEntriesAsync(
        Guid? partyId,
        DateTime? fromDate,
        DateTime? toDate,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<Result<LedgerStatementDto>> GetLedgerStatementAsync(
        Guid partyId,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default);

    Task<Result<PnLReportDto>> GetPnLReportAsync(
        DateTime? fromDate,
        DateTime? toDate,
        Guid? branchId = null,
        CancellationToken cancellationToken = default);

    Task<Result<Gstr1ReportDto>> GetGstr1ReportAsync(
        DateTime? fromDate,
        DateTime? toDate,
        Guid? branchId = null,
        CancellationToken cancellationToken = default);

    Task<Result<Gstr3bReportDto>> GetGstr3bReportAsync(
        DateTime? fromDate,
        DateTime? toDate,
        Guid? branchId = null,
        CancellationToken cancellationToken = default);

    Task<Result<SummaryReportDto>> GetSummaryDashboardAsync(
        DateTime? fromDate,
        DateTime? toDate,
        Guid? branchId = null,
        CancellationToken cancellationToken = default);

    Task<Result<ExportFileResult>> ExportGstr1CsvAsync(
        DateTime? fromDate,
        DateTime? toDate,
        Guid? branchId = null,
        CancellationToken cancellationToken = default);

    Task<Result<ExportFileResult>> ExportGstr3bCsvAsync(
        DateTime? fromDate,
        DateTime? toDate,
        Guid? branchId = null,
        CancellationToken cancellationToken = default);

    Task<Result<ExportFileResult>> ExportLedgerCsvAsync(
        Guid? partyId,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken cancellationToken = default);
}
