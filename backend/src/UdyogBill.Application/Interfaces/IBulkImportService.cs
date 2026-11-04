using System;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IBulkImportService
{
    Task<Result<BulkProductImportResult>> ImportProductsAsync(
        BulkProductImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<BulkPartyImportResult>> ImportPartiesAsync(
        BulkPartyImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<BulkInvoiceImportResult>> ImportInvoicesAsync(
        BulkInvoiceImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<BulkPurchaseImportResult>> ImportPurchasesAsync(
        BulkPurchaseImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<BulkExpenseImportResult>> ImportExpensesAsync(
        BulkExpenseImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<BulkLedgerImportResult>> ImportLedgersAsync(
        BulkLedgerImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<BulkSalesReturnImportResult>> ImportSalesReturnsAsync(
        BulkSalesReturnImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<BulkPurchaseReturnImportResult>> ImportPurchaseReturnsAsync(
        BulkPurchaseReturnImportRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<CsvTemplateFileDto>> GetProductImportTemplateAsync(CancellationToken cancellationToken = default);

    Task<Result<CsvTemplateFileDto>> GetPartyImportTemplateAsync(CancellationToken cancellationToken = default);
}
