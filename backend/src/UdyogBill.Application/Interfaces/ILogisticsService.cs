using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Logistics;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface ILogisticsService
{
    // Transporters Master
    Task<Result<IReadOnlyList<TransporterDto>>> GetTransportersAsync(CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateTransporterAsync(CreateTransporterRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Delivery Challans
    Task<Result<PagedResult<DeliveryChallanDto>>> GetDeliveryChallansAsync(DispatchStatus? status = null, int pageNumber = 1, int pageSize = 50, CancellationToken cancellationToken = default);
    Task<Result<DeliveryChallanDto>> GetDeliveryChallanByIdAsync(Guid challanId, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateDeliveryChallanAsync(CreateDeliveryChallanRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateChallanFromInvoiceAsync(Guid invoiceId, string? vehicleNumber = null, Guid? transporterId = null, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<DeliveryChallanDto>> UpdateDispatchStatusAsync(Guid challanId, UpdateDispatchStatusRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);

    // GST E-Way Bill Studio
    Task<Result<EWayBillResultDto>> GenerateEWayBillAsync(GenerateEWayBillRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
}
