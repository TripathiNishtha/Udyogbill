using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/tenant/jewellery")]
public class JewelleryController : BaseApiController
{
    private readonly IJewelleryService _jewelleryService;

    public JewelleryController(IJewelleryService jewelleryService)
    {
        _jewelleryService = jewelleryService;
    }

    #region 1. Daily Metal Rate Board

    [HttpGet("rates/today")]
    [ProducesResponseType(typeof(DailyMetalRateDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTodayRate(CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.GetTodayRateAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("rates")]
    [ProducesResponseType(typeof(DailyMetalRateDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetDailyRate(
        [FromBody] SetDailyMetalRateRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.SetDailyRateAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("rates/history")]
    [ProducesResponseType(typeof(IReadOnlyList<DailyMetalRateDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRateHistory(
        [FromQuery] int days = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.GetRateHistoryAsync(days, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region 2. Jewellery Item Attributes

    [HttpGet("items/{itemId:guid}/attributes")]
    [ProducesResponseType(typeof(JewelleryItemAttributeDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetItemAttribute(
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.GetItemAttributeAsync(itemId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("items/attributes")]
    [ProducesResponseType(typeof(JewelleryItemAttributeDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveItemAttribute(
        [FromBody] SaveJewelleryItemAttributeRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.SaveItemAttributeAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region 3. 0% Error Calculation Engine

    [HttpPost("calculate/price")]
    [ProducesResponseType(typeof(CalculateJewelleryPriceResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> CalculateItemPrice(
        [FromBody] CalculateJewelleryPriceRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.CalculateItemPriceAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("calculate/old-gold")]
    [ProducesResponseType(typeof(CalculateOldGoldExchangeResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> CalculateOldGoldExchange(
        [FromBody] CalculateOldGoldExchangeRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.CalculateOldGoldExchangeAsync(request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region 4. Old Gold Exchange / Scrap Buyback Vouchers

    [HttpPost("old-gold/vouchers")]
    [ProducesResponseType(typeof(OldGoldExchangeVoucherDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateOldGoldVoucher(
        [FromBody] CreateOldGoldExchangeRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.CreateOldGoldVoucherAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("old-gold/vouchers")]
    [ProducesResponseType(typeof(IReadOnlyList<OldGoldExchangeVoucherDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOldGoldVouchers(
        [FromQuery] Guid? invoiceId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.GetOldGoldVouchersAsync(invoiceId, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region 5. Karigar Artisan Ledger

    [HttpGet("karigars")]
    [ProducesResponseType(typeof(IReadOnlyList<KarigarAccountDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetKarigars(CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.GetKarigarsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("karigars")]
    [ProducesResponseType(typeof(KarigarAccountDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateKarigar(
        [FromBody] CreateKarigarAccountRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.CreateKarigarAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("karigars/transactions")]
    [ProducesResponseType(typeof(KarigarTransactionDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AddKarigarTransaction(
        [FromBody] CreateKarigarTransactionRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.AddKarigarTransactionAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("karigars/{karigarId:guid}/transactions")]
    [ProducesResponseType(typeof(IReadOnlyList<KarigarTransactionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetKarigarTransactions(
        Guid karigarId,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.GetKarigarTransactionsAsync(karigarId, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region 6. Gold Savings Scheme (Kitty / 11+1)

    [HttpGet("kitty-schemes")]
    [ProducesResponseType(typeof(IReadOnlyList<GoldSavingsSchemeDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetKittySchemes(
        [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.GetKittySchemesAsync(status, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("kitty-schemes")]
    [ProducesResponseType(typeof(GoldSavingsSchemeDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateKittyScheme(
        [FromBody] CreateGoldSavingsSchemeRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.CreateKittySchemeAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("kitty-schemes/{schemeId:guid}/installments")]
    [ProducesResponseType(typeof(GoldSavingsInstallmentDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> AddKittyInstallment(
        Guid schemeId,
        [FromBody] AddSchemeInstallmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.AddKittyInstallmentAsync(schemeId, request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("kitty-schemes/{schemeId:guid}/redeem")]
    [ProducesResponseType(typeof(GoldSavingsSchemeDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RedeemKittyScheme(
        Guid schemeId,
        [FromBody] RedeemSchemeRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.RedeemKittySchemeAsync(schemeId, request, cancellationToken);
        return HandleResult(result);
    }

    #endregion

    #region 7. Girvi / Gold Loan

    [HttpGet("girvi-loans")]
    [ProducesResponseType(typeof(IReadOnlyList<GirviLoanDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGirviLoans(
        [FromQuery] string? status = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.GetGirviLoansAsync(status, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("girvi-loans")]
    [ProducesResponseType(typeof(GirviLoanDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateGirviLoan(
        [FromBody] CreateGirviLoanRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.CreateGirviLoanAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("girvi-loans/{loanId:guid}/redeem")]
    [ProducesResponseType(typeof(GirviLoanDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RedeemGirviLoan(
        Guid loanId,
        [FromBody] RedeemGirviLoanRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _jewelleryService.RedeemGirviLoanAsync(loanId, request, cancellationToken);
        return HandleResult(result);
    }

    #endregion
}
