using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Banking;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IChequeService
{
    Task<Result<PagedResult<ChequeRegisterDto>>> GetChequesAsync(
        int pageNumber = 1,
        int pageSize = 25,
        ChequeDirection? direction = null,
        ChequeStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<ChequeRegisterDto>> GetChequeByIdAsync(Guid chequeId, CancellationToken cancellationToken = default);

    Task<Result<Guid>> RecordChequeAsync(
        RecordChequeRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result> DepositChequeAsync(
        Guid chequeId,
        DepositChequeRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result> ClearChequeAsync(
        Guid chequeId,
        ClearChequeRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result> BounceChequeAsync(
        Guid chequeId,
        BounceChequeRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );

    Task<Result> CancelChequeAsync(
        Guid chequeId,
        string? reason = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );
}
