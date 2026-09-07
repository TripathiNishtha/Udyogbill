using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Persistence.Services;

public class TenantAssistantService : ITenantAssistantService
{
    private readonly AppDbContext _context;

    public TenantAssistantService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Result<AssistantQueryResponse>> ProcessQueryAsync(
        AssistantQueryRequest request,
        Guid tenantId,
        Guid userId,
        bool isTenantAdmin,
        List<string> userPermissions,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.QueryText))
        {
            return Result<AssistantQueryResponse>.Failure("Query text cannot be empty.", "INVALID_QUERY");
        }

        var cleanQuery = request.QueryText.Trim().ToLowerInvariant();

        // Security check: Check if user has permission to use the assistant
        if (!isTenantAdmin && !userPermissions.Contains(Permissions.AiAssistantUse))
        {
            return Result<AssistantQueryResponse>.Success(new AssistantQueryResponse(
                "Aapko UdyogMitra AI Assistant use karne ki anumati nahi hai. Kripya apne business admin se sampark karein.",
                "permission_denied",
                null,
                null,
                null,
                new List<string>()
            ));
        }

        // 1. TODAY'S COLLECTIONS & PAYMENTS
        if (cleanQuery.Contains("payment") || cleanQuery.Contains("collection") || cleanQuery.Contains("aaj kitna") || cleanQuery.Contains("kamai") || cleanQuery.Contains("cash kitna") || cleanQuery.Contains("paise aaye"))
        {
            if (!isTenantAdmin && !userPermissions.Contains(Permissions.SalesView) && !userPermissions.Contains(Permissions.BankingView) && !userPermissions.Contains(Permissions.ReportsView))
            {
                return Result<AssistantQueryResponse>.Success(new AssistantQueryResponse(
                    "Aapko financial collections ya payments ka hisaab dekhne ki anumati nahi hai.",
                    "permission_denied",
                    null,
                    null,
                    null,
                    new List<string>()
                ));
            }

            var collections = await GetTodayCollectionsAsync(tenantId, cancellationToken);
            var ans = $"Aaj aapki dukaan par kul **₹{collections.TotalAmount:N2}** collect hue hain ({collections.TotalTransactions} transactions).\n\n" +
                      $"• **Cash:** ₹{collections.CashAmount:N2}\n" +
                      $"• **Online / UPI / Bank:** ₹{collections.DigitalAmount:N2}";

            return Result<AssistantQueryResponse>.Success(new AssistantQueryResponse(
                ans,
                "live_analytics",
                "/app/reports/sales",
                "Detailed Sales Report Dekhein",
                collections,
                new List<string> { "Suppliers ko kitna due dena hai?", "Grahak se kitna lena hai?", "Low stock items dikhao" }
            ));
        }

        // 2. SUPPLIER PAYABLES (DUE TO PARTIES)
        if (cleanQuery.Contains("party ko dena") || cleanQuery.Contains("supplier") || cleanQuery.Contains("vendor") || cleanQuery.Contains("due dena") || cleanQuery.Contains("kitna due hai") || cleanQuery.Contains("kisko kitna"))
        {
            if (!isTenantAdmin && !userPermissions.Contains(Permissions.PartiesView) && !userPermissions.Contains(Permissions.BankingView))
            {
                return Result<AssistantQueryResponse>.Success(new AssistantQueryResponse(
                    "Aapko supplier payables dekhne ki anumati nahi hai.",
                    "permission_denied",
                    null,
                    null,
                    null,
                    new List<string>()
                ));
            }

            var payables = await GetPayablesSummaryAsync(tenantId, cancellationToken);
            var topListText = string.Join("\n", payables.TopSuppliers.Select(s => $"• **{s.PartyName}:** ₹{s.OutstandingBalance:N2}"));
            if (string.IsNullOrEmpty(topListText)) topListText = "• Koi pending dues nahi hain.";

            var ans = $"Aapko apne suppliers/vendors ko kul **₹{payables.TotalPayableAmount:N2}** dene hain ({payables.TotalPendingSuppliers} suppliers pending).\n\n" +
                      $"**Top Pending Suppliers:**\n{topListText}";

            return Result<AssistantQueryResponse>.Success(new AssistantQueryResponse(
                ans,
                "live_analytics",
                "/app/parties/suppliers",
                "Suppliers Ledger Kholein",
                payables,
                new List<string> { "Customer se kitna lena hai?", "Aaj ka collection kitna hua?", "Purchase bill banayein" }
            ));
        }

        // 3. CUSTOMER RECEIVABLES (UDHARI / LENA HAI)
        if (cleanQuery.Contains("lena hai") || cleanQuery.Contains("customer due") || cleanQuery.Contains("grahak") || cleanQuery.Contains("receivable") || cleanQuery.Contains("udhari") || cleanQuery.Contains("debtor"))
        {
            if (!isTenantAdmin && !userPermissions.Contains(Permissions.PartiesView))
            {
                return Result<AssistantQueryResponse>.Success(new AssistantQueryResponse(
                    "Aapko customer receivables dekhne ki anumati nahi hai.",
                    "permission_denied",
                    null,
                    null,
                    null,
                    new List<string>()
                ));
            }

            var receivables = await GetReceivablesSummaryAsync(tenantId, cancellationToken);
            var topCustText = string.Join("\n", receivables.TopCustomers.Select(c => $"• **{c.PartyName}:** ₹{c.OutstandingBalance:N2}"));
            if (string.IsNullOrEmpty(topCustText)) topCustText = "• Sabhi customers ka hisaab clear hai.";

            var ans = $"Aapko market/customers se kul **₹{receivables.TotalReceivableAmount:N2}** lene hain ({receivables.TotalPendingCustomers} grahak pending).\n\n" +
                      $"**Top Outstanding Customers:**\n{topCustText}";

            return Result<AssistantQueryResponse>.Success(new AssistantQueryResponse(
                ans,
                "live_analytics",
                "/app/parties/customers",
                "Customers Ledger Kholein",
                receivables,
                new List<string> { "Suppliers ko kitna dena hai?", "Aaj kitna payment aaya?", "Invoice banayein" }
            ));
        }

        // 4. LOW STOCK ALERTS
        if (cleanQuery.Contains("low stock") || cleanQuery.Contains("stock khatam") || cleanQuery.Contains("maal khatam") || cleanQuery.Contains("shortage") || cleanQuery.Contains("reorder"))
        {
            var lowStock = await GetLowStockItemsAsync(tenantId, cancellationToken);
            var listText = string.Join("\n", lowStock.Take(5).Select(i => $"• **{i.ItemName}** ({i.Sku}) — Bacha: **{i.CurrentStock} {i.Unit}** (Min alert: {i.MinimumStockAlert})"));
            if (string.IsNullOrEmpty(listText)) listText = "• Sabhi items ka stock safe level par hai!";

            var ans = $"Kul **{lowStock.Count} items** ka stock low chal raha hai:\n\n{listText}";

            return Result<AssistantQueryResponse>.Success(new AssistantQueryResponse(
                ans,
                "live_analytics",
                "/app/inventory/items",
                "Product Stock Check Karein",
                lowStock,
                new List<string> { "Purchase bill add karein", "Dawa kab expire ho rahi hai?" }
            ));
        }

        // 5. EXPIRING BATCHES (PHARMA / FMCG)
        if (cleanQuery.Contains("expiry") || cleanQuery.Contains("expire") || cleanQuery.Contains("dawa expire") || cleanQuery.Contains("batch"))
        {
            var expiring = await GetExpiringBatchesAsync(tenantId, 60, cancellationToken);
            var listText = string.Join("\n", expiring.Take(5).Select(b => $"• **{b.ItemName}** (Batch: {b.BatchNumber}) — Exp: {b.ExpiryDate:dd MMM yyyy} ({b.DaysUntilExpiry} din bache)"));
            if (string.IsNullOrEmpty(listText)) listText = "• Agle 60 dino me koi dawa/item expire nahi ho rahi hai.";

            var ans = $"Agle 60 dino me **{expiring.Count} batches** expire hone wale hain:\n\n{listText}";

            return Result<AssistantQueryResponse>.Success(new AssistantQueryResponse(
                ans,
                "live_analytics",
                "/app/reports/stock",
                "Expiry Report Kholein",
                expiring,
                new List<string> { "Low stock items dikhao", "Invoice kaise banaye?" }
            ));
        }

        // 6. HOW-TO: INVOICE CREATION
        if (cleanQuery.Contains("invoice") || cleanQuery.Contains("bill kaise") || cleanQuery.Contains("new invoice") || cleanQuery.Contains("bill banana"))
        {
            var ans = "UdyogBill me naya Sales Bill banana behad aasan hai:\n\n" +
                      "1. Left menu me **Sales** par click karein aur **+ New Invoice** chunein.\n" +
                      "2. Grahak (Customer) ka naam select karein ya naya mobile number enter karein.\n" +
                      "3. Item name ya barcode scan karein, Quantity dalein aur Batch select karein.\n" +
                      "4. Niche **Save & Print Bill** (A4 ya Thermal) par click karein!";

            return Result<AssistantQueryResponse>.Success(new AssistantQueryResponse(
                ans,
                "navigation",
                "/app/sales/invoices/create",
                "Invoice Banayein (Create Now)",
                null,
                new List<string> { "POS counter billing kaise karein?", "Aaj kitna payment aaya?" }
            ));
        }

        // 7. HOW-TO: POS QUICK BILLING
        if (cleanQuery.Contains("pos") || cleanQuery.Contains("counter") || cleanQuery.Contains("thermal") || cleanQuery.Contains("retail"))
        {
            var ans = "Fast Retail Counter ke liye **POS Billing** use karein:\n\n" +
                      "1. Left menu me **POS / Retail Counter** par click karein.\n" +
                      "2. Barcode scanner se items scan karte jayein.\n" +
                      "3. F8 press karke Cash, UPI, ya Split payment select karein.\n" +
                      "4. 2-inch ya 3-inch Thermal printer se turant slip nikal jayegi.";

            return Result<AssistantQueryResponse>.Success(new AssistantQueryResponse(
                ans,
                "navigation",
                "/app/sales/pos",
                "POS Counter Kholein",
                null,
                new List<string> { "Invoice kaise banaye?", "Thermal print template kahan set karein?" }
            ));
        }

        // 8. HOW-TO: DATA MIGRATION & MASTER EXCEL
        if (cleanQuery.Contains("excel") || cleanQuery.Contains("migration") || cleanQuery.Contains("purana data") || cleanQuery.Contains("marg data") || cleanQuery.Contains("tally"))
        {
            var ans = "Aap apne purane software ka 100% data hamare **Master Multi-Sheet Excel Template** ke zariye 1-click me daal sakte hain:\n\n" +
                      "1. Hamara pre-formatted Excel workbook (.xlsx) download karein jisme 7 dedicated sheets hain (Customers, Suppliers, Products, Batches, Ledgers, Invoices).\n" +
                      "2. Apne purane software ka data usme paste karein.\n" +
                      "3. **Settings -> Migration -> Universal Multi-Sheet Migrator** me upload kar dein.\n" +
                      "• Zero data loss ke sath saare batches aur opening balances auto-import ho jayenge!";

            return Result<AssistantQueryResponse>.Success(new AssistantQueryResponse(
                ans,
                "navigation",
                "/app/settings/migration/universal",
                "Universal Migrator Kholein",
                null,
                new List<string> { "Product catalog dekhein", "Master Excel Template download karein" }
            ));
        }

        // 9. HOW-TO: GST & REPORTS
        if (cleanQuery.Contains("gst") || cleanQuery.Contains("gstr") || cleanQuery.Contains("ca pack") || cleanQuery.Contains("tax report"))
        {
            var ans = "GSTR-1, GSTR-3B aur CA Pack reports ke liye:\n\n" +
                      "1. Left menu me **Reports & Analytics** par jayein.\n" +
                      "2. **GST Compliance Hub** ya **CA Audit Pack** par click karein.\n" +
                      "3. Date range chunein aur 1-Click me Excel ya JSON download karein!";

            return Result<AssistantQueryResponse>.Success(new AssistantQueryResponse(
                ans,
                "navigation",
                "/app/reports/gst",
                "GST Reports Kholein",
                null,
                new List<string> { "Sales report dekhein", "Aaj kitna collection hua?" }
            ));
        }

        // 10. HOW-TO: PRODUCT & BATCH CREATION
        if (cleanQuery.Contains("product") || cleanQuery.Contains("item add") || cleanQuery.Contains("naya item") || cleanQuery.Contains("uom"))
        {
            var ans = "Naya product ya dawa add karne ke liye:\n\n" +
                      "1. Left menu me **Products & Inventory** -> **Item Catalog** par jayein.\n" +
                      "2. Upar **+ Add Product** button dabayein.\n" +
                      "3. Name, SKU, Primary UOM (Strip, Kg, Pkt, etc.) aur Tax% bharein.\n" +
                      "4. Niche **Opening Stock Inward** me Batch Number, Expiry Date aur Opening Qty dalein aur Save karein!";

            return Result<AssistantQueryResponse>.Success(new AssistantQueryResponse(
                ans,
                "navigation",
                "/app/inventory/items",
                "Product Catalog Kholein",
                null,
                new List<string> { "Master Excel Template se bulk import karein", "Low stock items dikhao" }
            ));
        }

        // DEFAULT COURTEOUS ASSISTANT RESPONSE
        var defaultAns = "Namaste! Main aapka **UdyogMitra Assistant** hoon.\n\n" +
                         "Main aapki software me in cheezon me madad kar sakta hoon:\n" +
                         "• **Live Hisaab:** *'Aaj kitna payment aaya?'*, *'Party ko kitna due dena hai?'*\n" +
                         "• **Stock & Expiry:** *'Low stock items dikhao'*, *'Konsi dawa expire ho rahi hai?'*\n" +
                         "• **Software Guide:** *'Invoice kaise banaye?'*, *'POS billing kaise karein?'*, *'Purana data Excel se kaise dalein?'*\n\n" +
                         "Aap niche diye gaye kisi bhi button par click karke shuru kar sakte hain!";

        return Result<AssistantQueryResponse>.Success(new AssistantQueryResponse(
            defaultAns,
            "general_help",
            "/app/dashboard",
            "Dashboard Par Jayein",
            null,
            new List<string> { "Aaj kitna payment aaya?", "Suppliers ko kitna due dena hai?", "Invoice kaise banaye?", "Purana data Excel se kaise dalein?" }
        ));
    }

    public async Task<Result<List<QuickPromptGroup>>> GetQuickPromptsAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var groups = new List<QuickPromptGroup>
        {
            new QuickPromptGroup("Hisaab-Kitab (Live Figures)", new List<string>
            {
                "Aaj kitna payment aaya?",
                "Suppliers ko kitna due dena hai?",
                "Grahak se kitna paisa lena hai?"
            }),
            new QuickPromptGroup("Stock & Dawa Alerts", new List<string>
            {
                "Konsi item low stock chal rahi hai?",
                "Agle mahine konsi dawa expire ho rahi hai?"
            }),
            new QuickPromptGroup("Kaam Kaise Karein (Help)", new List<string>
            {
                "Naya invoice kaise banaye?",
                "Fast retail POS counter kaise use karein?",
                "Purane software ka Excel data kaise import karein?",
                "GSTR-1 report kahan se niklegi?"
            })
        };

        return await Task.FromResult(Result<List<QuickPromptGroup>>.Success(groups));
    }

    // --- Deterministic Live Database Calculations ---

    private async Task<TodayCollectionsSummary> GetTodayCollectionsAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var todayUtc = DateTime.UtcNow.Date;
        var tomorrowUtc = todayUtc.AddDays(1);

        var payments = await _context.SalesInvoicePayments
            .AsNoTracking()
            .Where(p => p.Invoice.TenantId == tenantId && p.PaymentDate >= todayUtc && p.PaymentDate < tomorrowUtc && !p.IsDeleted)
            .ToListAsync(cancellationToken);

        var total = payments.Sum(p => p.Amount);
        var cash = payments.Where(p => p.PaymentMode == PaymentMode.Cash).Sum(p => p.Amount);
        var digital = payments.Where(p => p.PaymentMode != PaymentMode.Cash).Sum(p => p.Amount);

        return new TodayCollectionsSummary(todayUtc, total, cash, digital, payments.Count);
    }

    private async Task<PayablesSummary> GetPayablesSummaryAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var suppliers = await _context.Parties
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId && !p.IsDeleted && (p.PartyType == PartyType.Supplier || p.PartyType == PartyType.Both))
            .ToListAsync(cancellationToken);

        // Positive CurrentOutstandingBalance on supplier or Credit balance indicates payable
        var pendingSuppliers = suppliers.Where(s => s.CurrentOutstandingBalance > 0 || s.OpeningBalance > 0).ToList();
        var totalPayable = pendingSuppliers.Sum(s => s.CurrentOutstandingBalance > 0 ? s.CurrentOutstandingBalance : s.OpeningBalance);

        var topSuppliers = pendingSuppliers
            .OrderByDescending(s => s.CurrentOutstandingBalance > 0 ? s.CurrentOutstandingBalance : s.OpeningBalance)
            .Take(3)
            .Select(s => new PartyBalanceSummary(s.LegalName, s.Mobile, s.CurrentOutstandingBalance > 0 ? s.CurrentOutstandingBalance : s.OpeningBalance))
            .ToList();

        return new PayablesSummary(totalPayable, pendingSuppliers.Count, topSuppliers);
    }

    private async Task<ReceivablesSummary> GetReceivablesSummaryAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var customers = await _context.Parties
            .AsNoTracking()
            .Where(p => p.TenantId == tenantId && !p.IsDeleted && (p.PartyType == PartyType.Customer || p.PartyType == PartyType.Both))
            .ToListAsync(cancellationToken);

        var pendingCustomers = customers.Where(c => c.CurrentOutstandingBalance > 0 || c.OpeningBalance > 0).ToList();
        var totalReceivable = pendingCustomers.Sum(c => c.CurrentOutstandingBalance > 0 ? c.CurrentOutstandingBalance : c.OpeningBalance);

        var topCustomers = pendingCustomers
            .OrderByDescending(c => c.CurrentOutstandingBalance > 0 ? c.CurrentOutstandingBalance : c.OpeningBalance)
            .Take(3)
            .Select(c => new PartyBalanceSummary(c.LegalName, c.Mobile, c.CurrentOutstandingBalance > 0 ? c.CurrentOutstandingBalance : c.OpeningBalance))
            .ToList();

        return new ReceivablesSummary(totalReceivable, pendingCustomers.Count, topCustomers);
    }

    private async Task<List<LowStockAlertItem>> GetLowStockItemsAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var items = await _context.Items
            .AsNoTracking()
            .Include(i => i.PrimaryUom)
            .Where(i => i.TenantId == tenantId && !i.IsDeleted && i.TrackInventory && i.MinimumStockAlert > 0)
            .ToListAsync(cancellationToken);

        var itemIds = items.Select(i => i.Id).ToList();

        var stocks = await _context.ItemWarehouseStocks
            .AsNoTracking()
            .Where(s => s.TenantId == tenantId && itemIds.Contains(s.ItemId))
            .GroupBy(s => s.ItemId)
            .Select(g => new { ItemId = g.Key, TotalStock = g.Sum(x => x.CurrentQuantity) })
            .ToListAsync(cancellationToken);

        var stockMap = stocks.ToDictionary(s => s.ItemId, s => s.TotalStock);

        var lowStockList = new List<LowStockAlertItem>();
        foreach (var it in items)
        {
            var curStock = stockMap.TryGetValue(it.Id, out var qty) ? qty : 0;
            if (curStock <= it.MinimumStockAlert)
            {
                lowStockList.Add(new LowStockAlertItem(it.Name, it.Sku, curStock, it.MinimumStockAlert, it.PrimaryUom?.Code ?? "Units"));
            }
        }

        return lowStockList.OrderBy(x => x.CurrentStock).ToList();
    }

    private async Task<List<ExpiringBatchItem>> GetExpiringBatchesAsync(Guid tenantId, int daysAhead, CancellationToken cancellationToken)
    {
        var todayUtc = DateTime.UtcNow.Date;
        var thresholdDate = todayUtc.AddDays(daysAhead);

        var batches = await _context.ItemBatches
            .AsNoTracking()
            .Include(b => b.Item)
            .Where(b => b.TenantId == tenantId && !b.IsDeleted && b.ExpiryDate >= todayUtc && b.ExpiryDate <= thresholdDate)
            .OrderBy(b => b.ExpiryDate)
            .Take(10)
            .ToListAsync(cancellationToken);

        var batchIds = batches.Select(b => b.Id).ToList();

        var batchStocks = await _context.ItemWarehouseStocks
            .AsNoTracking()
            .Where(s => s.TenantId == tenantId && s.BatchId.HasValue && batchIds.Contains(s.BatchId.Value))
            .GroupBy(s => s.BatchId!.Value)
            .Select(g => new { BatchId = g.Key, Qty = g.Sum(x => x.CurrentQuantity) })
            .ToListAsync(cancellationToken);

        var stockMap = batchStocks.ToDictionary(s => s.BatchId, s => s.Qty);

        return batches.Select(b => new ExpiringBatchItem(
            b.Item?.Name ?? "Item",
            b.Item?.Sku ?? "",
            b.BatchNumber,
            b.ExpiryDate,
            stockMap.TryGetValue(b.Id, out var q) ? q : 0,
            (b.ExpiryDate.Date - todayUtc).Days
        )).ToList();
    }
}
