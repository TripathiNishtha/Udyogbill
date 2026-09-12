using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IBrokerService
{
    Task<Result<PagedResult<BrokerDto>>> GetBrokersAsync(
        int pageNumber = 1,
        int pageSize = 25,
        string? searchTerm = null,
        bool? activeOnly = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<BrokerDto>> GetBrokerByIdAsync(Guid brokerId, CancellationToken cancellationToken = default);

    Task<Result<Guid>> CreateBrokerAsync(
        CreateBrokerRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result> UpdateBrokerAsync(
        Guid brokerId,
        UpdateBrokerRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result> DeleteBrokerAsync(
        Guid brokerId,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<PagedResult<BrokerCommissionEntryDto>>> GetCommissionEntriesAsync(
        Guid? brokerId = null,
        int pageNumber = 1,
        int pageSize = 25,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<Guid>> AccrueCommissionForInvoiceAsync(
        Guid salesInvoiceId,
        Guid brokerId,
        decimal baseAmount,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result> AdjustCommissionForReturnAsync(
        Guid salesInvoiceId,
        decimal returnedTaxableAmount,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<Guid>> PayCommissionAsync(
        PayBrokerCommissionRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<IReadOnlyList<BrokerSummaryDto>>> GetBrokerSummariesAsync(CancellationToken cancellationToken = default);
}
