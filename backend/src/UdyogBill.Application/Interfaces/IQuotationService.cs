using System;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IQuotationService
{
    Task<Result<PagedResult<QuotationListDto>>> GetQuotationsAsync(
        int pageNumber,
        int pageSize,
        QuotationStatus? status,
        Guid? branchId,
        Guid? partyId,
        DateTime? fromDate,
        DateTime? toDate,
        string? searchTerm,
        CancellationToken cancellationToken = default);

    Task<Result<QuotationDetailsDto>> GetQuotationByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<QuotationDetailsDto>> GetQuotationByNumberAsync(string quotationNumber, CancellationToken cancellationToken = default);

    Task<Result<Guid>> CreateQuotationAsync(CreateQuotationRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> ConvertQuotationToInvoiceAsync(Guid quotationId, ConvertQuotationRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<bool>> CancelQuotationAsync(Guid id, string cancellationReason, string? ipAddress = null, CancellationToken cancellationToken = default);
}
