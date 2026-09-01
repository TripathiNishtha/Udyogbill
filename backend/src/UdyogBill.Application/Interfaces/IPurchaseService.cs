using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Purchases;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IPurchaseService
{
    // Purchase Orders
    Task<Result<PagedResult<PurchaseOrderListDto>>> GetPurchaseOrdersAsync(
        int pageNumber,
        int pageSize,
        PurchaseOrderStatus? status = null,
        Guid? branchId = null,
        Guid? partyId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default);

    Task<Result<PurchaseOrderDetailsDto>> GetPurchaseOrderByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<PurchaseOrderDetailsDto>> GetPurchaseOrderByNumberAsync(string orderNumber, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreatePurchaseOrderAsync(CreatePurchaseOrderRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> CancelPurchaseOrderAsync(Guid id, string cancellationReason, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Goods Receipt Notes (GRN)
    Task<Result<PagedResult<GrnListDto>>> GetGoodsReceiptNotesAsync(
        int pageNumber,
        int pageSize,
        GrnStatus? status = null,
        Guid? branchId = null,
        Guid? warehouseId = null,
        Guid? partyId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default);

    Task<Result<GrnDetailsDto>> GetGrnByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<GrnDetailsDto>> GetGrnByNumberAsync(string grnNumber, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateGrnAsync(CreateGrnRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> CancelGrnAsync(Guid id, string cancellationReason, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Purchase Bills (Vendor Invoices)
    Task<Result<PagedResult<PurchaseBillListDto>>> GetPurchaseBillsAsync(
        int pageNumber,
        int pageSize,
        PurchaseBillStatus? status = null,
        Guid? branchId = null,
        Guid? partyId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default);

    Task<Result<PurchaseBillDetailsDto>> GetPurchaseBillByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<PurchaseBillDetailsDto>> GetPurchaseBillByNumberAsync(string billNumber, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreatePurchaseBillAsync(CreatePurchaseBillRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> RecordPurchaseBillPaymentAsync(Guid billId, RecordPurchaseBillPaymentRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> CancelPurchaseBillAsync(Guid id, string cancellationReason, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Purchase Returns (Debit Notes)
    Task<Result<PagedResult<PurchaseReturnDto>>> GetPurchaseReturnsAsync(
        int pageNumber,
        int pageSize,
        Guid? partyId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default);
    Task<Result<PurchaseReturnDto>> GetPurchaseReturnByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreatePurchaseReturnAsync(CreatePurchaseReturnRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
}
