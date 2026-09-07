using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface ISalesService
{
    Task<Result<PagedResult<SalesInvoiceListDto>>> GetInvoicesAsync(
        int pageNumber,
        int pageSize,
        InvoiceType? invoiceType = null,
        InvoiceStatus? status = null,
        PaymentStatus? paymentStatus = null,
        Guid? branchId = null,
        Guid? partyId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<SalesInvoiceDetailsDto>> GetInvoiceByIdAsync(Guid invoiceId, CancellationToken cancellationToken = default);
    Task<Result<SalesInvoiceDetailsDto>> GetInvoiceByNumberAsync(string invoiceNumber, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateInvoiceAsync(CreateSalesInvoiceRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> UpdateInvoiceAsync(Guid invoiceId, CreateSalesInvoiceRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> RecordInvoicePaymentAsync(RecordInvoicePaymentRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> CancelInvoiceAsync(Guid invoiceId, CancelInvoiceRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Sales Returns & Credit Notes
    Task<Result<PagedResult<SalesReturnDto>>> GetSalesReturnsAsync(
        int pageNumber,
        int pageSize,
        Guid? partyId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default
    );
    Task<Result<SalesReturnDto>> GetSalesReturnByIdAsync(Guid returnId, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateSalesReturnAsync(CreateSalesReturnRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
}
