using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IPartyService
{
    // Party Queries & Management
    Task<Result<PagedResult<PartyListDto>>> GetPartiesAsync(
        int pageNumber,
        int pageSize,
        PartyType? partyType = null,
        CustomerType? customerType = null,
        SupplierType? supplierType = null,
        string? searchTerm = null,
        bool? outstandingOnly = null,
        CancellationToken cancellationToken = default
    );

    Task<Result<PartyDetailsDto>> GetPartyByIdAsync(Guid partyId, CancellationToken cancellationToken = default);
    Task<Result<PartyDetailsDto>> GetPartyByGstinAsync(string gstin, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreatePartyAsync(CreatePartyRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> UpdatePartyAsync(Guid partyId, UpdatePartyRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> DeletePartyAsync(Guid partyId, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Multi-Address Management
    Task<Result<IReadOnlyList<PartyAddressDto>>> GetPartyAddressesAsync(Guid partyId, CancellationToken cancellationToken = default);
    Task<Result<Guid>> AddPartyAddressAsync(Guid partyId, CreatePartyAddressRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> DeletePartyAddressAsync(Guid partyId, Guid addressId, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Financial Ledgers & Statement of Account
    Task<Result<PartyStatementDto>> GetPartyStatementAsync(
        Guid partyId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default
    );

    Task<Result<Guid>> RecordPartyPaymentAsync(
        RecordPartyPaymentRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default
    );
}
