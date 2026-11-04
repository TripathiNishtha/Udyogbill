using System;
using System.Collections.Generic;

namespace UdyogBill.Application.DTOs;

public record UserCompanySummaryDto(
    Guid Id,
    string Code,
    string BusinessName,
    string TradeName,
    string? GSTIN,
    string? LogoUrl,
    string? IndustryName,
    string? IndustryCode,
    string? City,
    string? State,
    bool IsCurrent,
    bool IsOwner,
    DateTimeOffset CreatedAtUtc
);

public record CompanyQuotaDto(
    int CurrentCompaniesCount,
    int MaxCompaniesAllowed,
    bool CanCreateMore,
    string PlanName,
    string PlanCode,
    bool IsTrial = false,
    bool HasMultiCompanyAccess = false
);

public record CreateCompanyRequest(
    string BusinessName,
    string TradeName,
    Guid IndustryId,
    string? GSTIN = null,
    string? PAN = null,
    string? Phone = null,
    string? Email = null,
    string? AddressLine1 = null,
    string? AddressLine2 = null,
    string? City = null,
    string? State = null,
    string? StateCode = null,
    string? Pincode = null
);

public record SwitchCompanyResponse(
    string AccessToken,
    string RefreshToken,
    DateTimeOffset ExpiresAtUtc,
    AuthUserDto User
);
