using System;
using System.Collections.Generic;

namespace UdyogBill.Application.DTOs;

public record GstinLookupRequest(string Gstin);

public record GstinLookupResponse(
    string Gstin,
    string LegalName,
    string TradeName,
    string Pan,
    string State,
    string StateCode,
    string Address,
    string Pincode,
    string GstType,
    bool IsActive,
    bool IsComposition
);

public record SeedIndustryCatalogRequest(
    string IndustryType,
    int ItemCount = 50
);

public record SeedIndustryCatalogResult(
    int SeededCount,
    string Message,
    IReadOnlyList<string> SampleItemNames
);

public record OnboardingStatusDto(
    bool HasStoreDetails,
    bool HasProducts,
    int ProductCount,
    bool HasParties,
    int PartyCount,
    bool HasInvoices,
    int InvoiceCount,
    bool HasUpiQr,
    string? UpiId,
    int CompletionPercentage,
    bool IsCompleted
);

public record CompleteOnboardingRequest(
    string? BusinessName = null,
    string? Gstin = null,
    string? State = null,
    string? StateCode = null,
    string? Address = null,
    string? Pincode = null,
    string? UpiId = null,
    string? PrimaryPhone = null
);
