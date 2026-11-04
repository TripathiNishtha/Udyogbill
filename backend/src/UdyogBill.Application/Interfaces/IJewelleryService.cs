using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IJewelleryService
{
    // 1. Daily Metal Rate Board
    Task<Result<DailyMetalRateDto>> GetTodayRateAsync(CancellationToken cancellationToken = default);
    Task<Result<DailyMetalRateDto>> SetDailyRateAsync(SetDailyMetalRateRequest request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<DailyMetalRateDto>>> GetRateHistoryAsync(int days = 30, CancellationToken cancellationToken = default);

    // 2. Jewellery Item Attributes
    Task<Result<JewelleryItemAttributeDto>> GetItemAttributeAsync(Guid itemId, CancellationToken cancellationToken = default);
    Task<Result<JewelleryItemAttributeDto>> SaveItemAttributeAsync(SaveJewelleryItemAttributeRequest request, CancellationToken cancellationToken = default);

    // 3. 0% Error Calculation Engine
    Task<Result<CalculateJewelleryPriceResponse>> CalculateItemPriceAsync(CalculateJewelleryPriceRequest request, CancellationToken cancellationToken = default);
    Task<Result<CalculateOldGoldExchangeResponse>> CalculateOldGoldExchangeAsync(CalculateOldGoldExchangeRequest request, CancellationToken cancellationToken = default);

    // 4. Old Gold Exchange / Scrap Buyback
    Task<Result<OldGoldExchangeVoucherDto>> CreateOldGoldVoucherAsync(CreateOldGoldExchangeRequest request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<OldGoldExchangeVoucherDto>>> GetOldGoldVouchersAsync(Guid? invoiceId = null, CancellationToken cancellationToken = default);

    // 5. Karigar Artisan Ledger
    Task<Result<IReadOnlyList<KarigarAccountDto>>> GetKarigarsAsync(CancellationToken cancellationToken = default);
    Task<Result<KarigarAccountDto>> CreateKarigarAsync(CreateKarigarAccountRequest request, CancellationToken cancellationToken = default);
    Task<Result<KarigarTransactionDto>> AddKarigarTransactionAsync(CreateKarigarTransactionRequest request, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<KarigarTransactionDto>>> GetKarigarTransactionsAsync(Guid karigarId, CancellationToken cancellationToken = default);

    // 6. Gold Savings Scheme (Kitty / 11+1)
    Task<Result<IReadOnlyList<GoldSavingsSchemeDto>>> GetKittySchemesAsync(string? status = null, CancellationToken cancellationToken = default);
    Task<Result<GoldSavingsSchemeDto>> CreateKittySchemeAsync(CreateGoldSavingsSchemeRequest request, CancellationToken cancellationToken = default);
    Task<Result<GoldSavingsInstallmentDto>> AddKittyInstallmentAsync(Guid schemeId, AddSchemeInstallmentRequest request, CancellationToken cancellationToken = default);
    Task<Result<GoldSavingsSchemeDto>> RedeemKittySchemeAsync(Guid schemeId, RedeemSchemeRequest request, CancellationToken cancellationToken = default);

    // 7. Girvi / Gold Loan
    Task<Result<IReadOnlyList<GirviLoanDto>>> GetGirviLoansAsync(string? status = null, CancellationToken cancellationToken = default);
    Task<Result<GirviLoanDto>> CreateGirviLoanAsync(CreateGirviLoanRequest request, CancellationToken cancellationToken = default);
    Task<Result<GirviLoanDto>> RedeemGirviLoanAsync(Guid loanId, RedeemGirviLoanRequest request, CancellationToken cancellationToken = default);
}
