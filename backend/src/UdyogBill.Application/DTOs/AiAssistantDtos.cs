using System;
using System.Collections.Generic;

namespace UdyogBill.Application.DTOs;

public record AssistantQueryRequest(
    string QueryText,
    string? ContextUrl = null,
    string? LanguagePreference = "hinglish"
);

public record AssistantQueryResponse(
    string AnswerText,
    string IntentType,
    string? DirectNavigationUrl,
    string? NavigationButtonText,
    object? LiveMetrics,
    List<string> SuggestedFollowUps
);

public record TodayCollectionsSummary(
    DateTime Date,
    decimal TotalAmount,
    decimal CashAmount,
    decimal DigitalAmount,
    int TotalTransactions
);

public record PayablesSummary(
    decimal TotalPayableAmount,
    int TotalPendingSuppliers,
    List<PartyBalanceSummary> TopSuppliers
);

public record ReceivablesSummary(
    decimal TotalReceivableAmount,
    int TotalPendingCustomers,
    List<PartyBalanceSummary> TopCustomers
);

public record PartyBalanceSummary(
    string PartyName,
    string? Mobile,
    decimal OutstandingBalance
);

public record LowStockAlertItem(
    string ItemName,
    string Sku,
    decimal CurrentStock,
    decimal MinimumStockAlert,
    string Unit
);

public record ExpiringBatchItem(
    string ItemName,
    string Sku,
    string BatchNumber,
    DateTime ExpiryDate,
    decimal Quantity,
    int DaysUntilExpiry
);

public record QuickPromptGroup(
    string Category,
    List<string> Prompts
);
