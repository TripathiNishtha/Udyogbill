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

    Task<Result<CsvTemplateFileDto>> GetProductImportTemplateAsync(CancellationToken cancellationToken = default);

    Task<Result<CsvTemplateFileDto>> GetPartyImportTemplateAsync(CancellationToken cancellationToken = default);
}
