using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IBankingAndExpenseService
{
    // Bank Accounts
    Task<Result<IReadOnlyList<BankAccountDto>>> GetBankAccountsAsync(CancellationToken cancellationToken = default);
    Task<Result<BankAccountDto>> GetBankAccountByIdAsync(Guid accountId, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateBankAccountAsync(CreateBankAccountRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> UpdateBankAccountAsync(Guid accountId, UpdateBankAccountRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> DeleteBankAccountAsync(Guid accountId, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Payment Vouchers (Receipts & Payments)
    Task<Result<PaymentReceiptVoucherDto>> RecordCustomerReceiptAsync(RecordPaymentReceiptRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<PaymentReceiptVoucherDto>> RecordVendorPaymentAsync(RecordVendorPaymentRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Expense Categories & Vouchers
    Task<Result<IReadOnlyList<ExpenseCategoryDto>>> GetExpenseCategoriesAsync(CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateExpenseCategoryAsync(CreateExpenseCategoryRequest request, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<ExpenseVoucherDto>>> GetExpenseVouchersAsync(int pageNumber = 1, int pageSize = 25, Guid? categoryId = null, DateTime? fromDate = null, DateTime? toDate = null, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateExpenseVoucherAsync(CreateExpenseVoucherRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);

    // POS Cash Drawer
    Task<Result<CashDrawerSessionDto>> GetCurrentCashDrawerSessionAsync(CancellationToken cancellationToken = default);
    Task<Result<CashDrawerSessionDto>> OpenCashDrawerSessionAsync(OpenCashDrawerRequest request, CancellationToken cancellationToken = default);
    Task<Result<CashDrawerSessionDto>> CloseCashDrawerSessionAsync(CloseCashDrawerRequest request, CancellationToken cancellationToken = default);

    // Financial Cash Flow Analytics
    Task<Result<BankingCashFlowSummaryDto>> GetBankingCashFlowSummaryAsync(CancellationToken cancellationToken = default);
}
