using System;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface ISalesOrderService
{
    Task<Result<PagedResult<SalesOrderListDto>>> GetSalesOrdersAsync(
        int pageNumber,
        int pageSize,
        SalesOrderStatus? status,
        Guid? branchId,
        Guid? partyId,
        DateTime? fromDate,
        DateTime? toDate,
        string? searchTerm,
        CancellationToken cancellationToken = default);

    Task<Result<SalesOrderDetailsDto>> GetSalesOrderByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Result<SalesOrderDetailsDto>> GetSalesOrderByNumberAsync(string orderNumber, CancellationToken cancellationToken = default);

    Task<Result<Guid>> CreateSalesOrderAsync(CreateSalesOrderRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> UpdateSalesOrderAsync(Guid id, CreateSalesOrderRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);

    Task<Result<Guid>> ConvertQuotationToSalesOrderAsync(Guid quotationId, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> ConvertSalesOrderToInvoiceAsync(Guid orderId, ConvertSalesOrderRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> ConvertSalesOrderToChallanAsync(Guid orderId, ConvertSalesOrderRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);

    Task<Result<bool>> CancelSalesOrderAsync(Guid id, string cancellationReason, string? ipAddress = null, CancellationToken cancellationToken = default);
}
