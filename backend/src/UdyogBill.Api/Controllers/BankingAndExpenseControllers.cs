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
[Route("api/v1/tenant/banking")]
public class TenantBankingController : BaseApiController
{
    private readonly IBankingAndExpenseService _bankingService;

    public TenantBankingController(IBankingAndExpenseService bankingService)
    {
        _bankingService = bankingService;
    }

    [HttpGet("accounts")]
    [ProducesResponseType(typeof(IReadOnlyList<BankAccountDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAccounts(CancellationToken cancellationToken)
    {
        var result = await _bankingService.GetBankAccountsAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("accounts/{id:guid}")]
    [ProducesResponseType(typeof(BankAccountDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAccountById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _bankingService.GetBankAccountByIdAsync(id, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("accounts")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateAccount([FromBody] CreateBankAccountRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _bankingService.CreateBankAccountAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("accounts/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateAccount(Guid id, [FromBody] UpdateBankAccountRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _bankingService.UpdateBankAccountAsync(id, request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpDelete("accounts/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteAccount(Guid id, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _bankingService.DeleteBankAccountAsync(id, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("summary")]
    [ProducesResponseType(typeof(BankingCashFlowSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCashFlowSummary(CancellationToken cancellationToken)
    {
        var result = await _bankingService.GetBankingCashFlowSummaryAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("vouchers/receipt")]
    [ProducesResponseType(typeof(PaymentReceiptVoucherDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RecordCustomerReceipt([FromBody] RecordPaymentReceiptRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _bankingService.RecordCustomerReceiptAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("vouchers/payment")]
    [ProducesResponseType(typeof(PaymentReceiptVoucherDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RecordVendorPayment([FromBody] RecordVendorPaymentRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _bankingService.RecordVendorPaymentAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
[Route("api/v1/tenant/expenses")]
public class TenantExpensesController : BaseApiController
{
    private readonly IBankingAndExpenseService _bankingService;

    public TenantExpensesController(IBankingAndExpenseService bankingService)
    {
        _bankingService = bankingService;
    }

    [HttpGet("categories")]
    [ProducesResponseType(typeof(IReadOnlyList<ExpenseCategoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories(CancellationToken cancellationToken)
    {
        var result = await _bankingService.GetExpenseCategoriesAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("categories")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateCategory([FromBody] CreateExpenseCategoryRequest request, CancellationToken cancellationToken)
    {
        var result = await _bankingService.CreateExpenseCategoryAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<ExpenseVoucherDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetExpenses(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _bankingService.GetExpenseVouchersAsync(pageNumber, pageSize, categoryId, fromDate, toDate, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateExpense([FromBody] CreateExpenseVoucherRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _bankingService.CreateExpenseVoucherAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }
}

[Authorize]
[Route("api/v1/tenant/cash-drawer")]
public class TenantCashDrawerController : BaseApiController
{
    private readonly IBankingAndExpenseService _bankingService;

    public TenantCashDrawerController(IBankingAndExpenseService bankingService)
    {
        _bankingService = bankingService;
    }

    [HttpGet("session")]
    [ProducesResponseType(typeof(CashDrawerSessionDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCurrentSession(CancellationToken cancellationToken)
    {
        var result = await _bankingService.GetCurrentCashDrawerSessionAsync(cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("session/open")]
    [ProducesResponseType(typeof(CashDrawerSessionDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> OpenSession([FromBody] OpenCashDrawerRequest request, CancellationToken cancellationToken)
    {
        var result = await _bankingService.OpenCashDrawerSessionAsync(request, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("session/close")]
    [ProducesResponseType(typeof(CashDrawerSessionDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> CloseSession([FromBody] CloseCashDrawerRequest request, CancellationToken cancellationToken)
    {
        var result = await _bankingService.CloseCashDrawerSessionAsync(request, cancellationToken);
        return HandleResult(result);
    }
}
