using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class SyncService : ISyncService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;

    public SyncService(
        AppDbContext context,
        ITenantContext tenantContext,
        ICurrentUserContext currentUserContext,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserContext = currentUserContext;
        _auditService = auditService;
    }

    private Guid RequireTenantId()
    {
        var tenantId = _tenantContext.TenantId != Guid.Empty
            ? _tenantContext.TenantId
            : _currentUserContext.TenantId ?? Guid.Empty;

        if (tenantId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Active tenant context is required.");
        }

        return tenantId;
    }

    public async Task<Result<SyncPushResultDto>> PushOfflineDataAsync(SyncPushRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var result = new SyncPushResultDto();

        var defaultBranch = await _context.TenantBranches
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && !b.IsDeleted, cancellationToken);
        var defaultWarehouse = await _context.TenantWarehouses
            .FirstOrDefaultAsync(w => w.TenantId == tenantId && !w.IsDeleted, cancellationToken);
        var defaultUom = await _context.UnitsOfMeasure
            .FirstOrDefaultAsync(u => u.TenantId == tenantId && !u.IsDeleted, cancellationToken);
        var firstItem = await _context.Items
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && !i.IsDeleted, cancellationToken);

        // 1. Process Offline Customers
        foreach (var cust in request.Customers)
        {
            if (cust.ClientOfflineId == Guid.Empty)
            {
                cust.ClientOfflineId = Guid.NewGuid();
            }

            var existingParty = await _context.Parties
                .FirstOrDefaultAsync(p => p.TenantId == tenantId && (p.Id == cust.ClientOfflineId || (p.LegalName == cust.LegalName && !p.IsDeleted)), cancellationToken);

            if (existingParty != null)
            {
                result.SyncedCustomers.Add(new SyncedRecordDto
                {
                    ClientOfflineId = cust.ClientOfflineId,
                    ServerId = existingParty.Id,
                    ServerAssignedNumber = existingParty.LegalName,
                    Status = "ALREADY_SYNCED"
                });
            }
            else
            {
                var party = new Party
                {
                    Id = cust.ClientOfflineId,
                    TenantId = tenantId,
                    LegalName = cust.LegalName.Trim(),
                    PartyType = PartyType.Customer,
                    PrimaryPhone = cust.Phone,
                    Mobile = cust.Phone,
                    GSTIN = cust.GSTIN?.ToUpperInvariant(),
                    IsActive = true
                };

                _context.Parties.Add(party);
                result.SyncedCustomers.Add(new SyncedRecordDto
                {
                    ClientOfflineId = cust.ClientOfflineId,
                    ServerId = party.Id,
                    ServerAssignedNumber = party.LegalName,
                    Status = "SYNCED"
                });
            }
        }

        // 2. Process Offline Invoices
        foreach (var inv in request.Invoices)
        {
            if (inv.ClientOfflineId == Guid.Empty)
            {
                inv.ClientOfflineId = Guid.NewGuid();
            }

            var existingInvoice = await _context.SalesInvoices
                .FirstOrDefaultAsync(i => i.TenantId == tenantId && (i.Id == inv.ClientOfflineId || (i.InvoiceNumber == inv.OfflineInvoiceNumber && !i.IsDeleted)), cancellationToken);

            if (existingInvoice != null)
            {
                result.SyncedInvoices.Add(new SyncedRecordDto
                {
                    ClientOfflineId = inv.ClientOfflineId,
                    ServerId = existingInvoice.Id,
                    ServerAssignedNumber = existingInvoice.InvoiceNumber,
                    Status = "ALREADY_SYNCED"
                });
                continue;
            }

            var invoiceNumber = inv.OfflineInvoiceNumber;
            if (string.IsNullOrWhiteSpace(invoiceNumber) || invoiceNumber.StartsWith("OFF-"))
            {
                var count = await _context.SalesInvoices.CountAsync(i => i.TenantId == tenantId, cancellationToken);
                invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMM}-{(count + 1):D4}";
            }

            var taxAmount = inv.TaxAmount > 0 ? inv.TaxAmount : (inv.TotalAmount - inv.SubTotal);
            var halfTax = taxAmount / 2;

            var newInvoice = new SalesInvoice
            {
                Id = inv.ClientOfflineId,
                TenantId = tenantId,
                BranchId = defaultBranch?.Id ?? Guid.Empty,
                WarehouseId = defaultWarehouse?.Id ?? Guid.Empty,
                InvoiceNumber = invoiceNumber,
                InvoiceDate = inv.InvoiceDateUtc,
                PartyId = inv.PartyId,
                CustomerName = string.IsNullOrWhiteSpace(inv.CustomerName) ? "Cash Customer" : inv.CustomerName.Trim(),
                CustomerGSTIN = inv.CustomerGSTIN?.ToUpperInvariant(),
                CustomerPhone = inv.CustomerPhone,
                SubTotal = inv.SubTotal > 0 ? inv.SubTotal : (inv.TotalAmount - inv.TaxAmount),
                TaxableAmount = inv.SubTotal > 0 ? inv.SubTotal : (inv.TotalAmount - inv.TaxAmount),
                CgstAmount = halfTax,
                SgstAmount = halfTax,
                TotalAmount = inv.TotalAmount,
                PrimaryPaymentMode = inv.PaymentMode,
                PaymentStatus = inv.PaymentStatus,
                Notes = $"[Synced from Offline Queue] {inv.Notes}"
            };

            foreach (var line in inv.Items)
            {
                var lineTax = line.TaxAmount > 0 ? line.TaxAmount : (line.TotalAmount - (line.Quantity * line.UnitPrice));
                var lineHalfTax = lineTax / 2;
                var targetItemId = (line.ItemId.HasValue && line.ItemId.Value != Guid.Empty)
                    ? line.ItemId.Value
                    : (firstItem?.Id ?? Guid.Empty);

                newInvoice.Items.Add(new SalesInvoiceItem
                {
                    TenantId = tenantId,
                    InvoiceId = newInvoice.Id,
                    ItemId = targetItemId,
                    UomId = defaultUom?.Id ?? Guid.Empty,
                    UomCode = defaultUom?.Code ?? "PCS",
                    ItemSku = line.ItemSku,
                    ItemName = line.ItemName,
                    HsnCode = line.HsnCode,
                    Quantity = line.Quantity,
                    UnitPrice = line.UnitPrice,
                    GstRate = line.TaxRatePercent,
                    CgstAmount = lineHalfTax,
                    SgstAmount = lineHalfTax,
                    TotalAmount = line.TotalAmount > 0 ? line.TotalAmount : (line.Quantity * line.UnitPrice + lineTax),
                    BatchNumber = line.BatchNumber,
                    ExpiryDate = line.ExpiryDate
                });
            }

            _context.SalesInvoices.Add(newInvoice);

            result.SyncedInvoices.Add(new SyncedRecordDto
            {
                ClientOfflineId = inv.ClientOfflineId,
                ServerId = newInvoice.Id,
                ServerAssignedNumber = newInvoice.InvoiceNumber,
                Status = "SYNCED"
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        if (result.TotalSyncedCount > 0)
        {
            await _auditService.LogAsync(new AuditLog
            {
                TenantId = tenantId,
                UserId = _currentUserContext.UserId,
                UserEmail = _currentUserContext.Email,
                Action = AuditActionType.Create,
                ActionName = "OfflineSyncPush",
                EntityName = "SyncBatch",
                EntityId = Guid.NewGuid().ToString(),
                NewValuesJson = JsonSerializer.Serialize(new { InvoicesSynced = result.SyncedInvoices.Count, CustomersSynced = result.SyncedCustomers.Count }),
                IpAddress = ipAddress
            }, cancellationToken);
        }

        return Result<SyncPushResultDto>.Success(result);
    }

    public async Task<Result<SyncPullResultDto>> PullDeltaDataAsync(SyncPullRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var itemQuery = _context.Items
            .Include(i => i.PrimaryUom)
            .Include(i => i.WarehouseStocks)
            .Where(i => i.TenantId == tenantId && !i.IsDeleted);

        var partyQuery = _context.Parties
            .Where(p => p.TenantId == tenantId && !p.IsDeleted && p.PartyType == PartyType.Customer);

        if (request.LastSyncTimestampUtc.HasValue)
        {
            var since = new DateTimeOffset(DateTime.SpecifyKind(request.LastSyncTimestampUtc.Value, DateTimeKind.Utc));
            itemQuery = itemQuery.Where(i => i.CreatedAtUtc >= since || (i.UpdatedAtUtc.HasValue && i.UpdatedAtUtc.Value >= since));
            partyQuery = partyQuery.Where(p => p.CreatedAtUtc >= since || (p.UpdatedAtUtc.HasValue && p.UpdatedAtUtc.Value >= since));
        }

        var itemsList = await itemQuery
            .OrderBy(i => i.Name)
            .Take(1000)
            .ToListAsync(cancellationToken);

        var items = itemsList.Select(i => new CatalogItemSyncDto
        {
            Id = i.Id,
            Sku = i.Sku,
            Name = i.Name,
            Barcode = i.Barcode,
            HsnCode = i.HSNCode,
            SellingPrice = i.SellingPrice,
            Mrp = i.MRP,
            TaxRatePercent = i.TaxRate,
            CurrentStock = i.WarehouseStocks?.Sum(w => w.CurrentQuantity) ?? 0,
            UnitName = i.PrimaryUom?.Name ?? "PCS",
            IsActive = i.IsActive,
            UpdatedAtUtc = (i.UpdatedAtUtc ?? i.CreatedAtUtc).UtcDateTime
        }).ToList();

        var partiesList = await partyQuery
            .OrderBy(p => p.LegalName)
            .Take(1000)
            .ToListAsync(cancellationToken);

        var parties = partiesList.Select(p => new CustomerPartySyncDto
        {
            Id = p.Id,
            LegalName = p.LegalName,
            Phone = p.PrimaryPhone ?? p.Mobile,
            GSTIN = p.GSTIN,
            CurrentBalance = p.CurrentOutstandingBalance,
            IsActive = p.IsActive,
            UpdatedAtUtc = (p.UpdatedAtUtc ?? p.CreatedAtUtc).UtcDateTime
        }).ToList();

        return Result<SyncPullResultDto>.Success(new SyncPullResultDto
        {
            UpdatedItems = items,
            UpdatedCustomers = parties,
            ServerTimestampUtc = DateTime.UtcNow
        });
    }

    public async Task<Result<SyncStatusDto>> GetSyncStatusAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var totalItems = await _context.Items.CountAsync(i => i.TenantId == tenantId && !i.IsDeleted, cancellationToken);
        var totalCustomers = await _context.Parties.CountAsync(p => p.TenantId == tenantId && !p.IsDeleted && p.PartyType == PartyType.Customer, cancellationToken);
        var totalInvoices = await _context.SalesInvoices.CountAsync(i => i.TenantId == tenantId && !i.IsDeleted, cancellationToken);

        return Result<SyncStatusDto>.Success(new SyncStatusDto
        {
            ServerTimeUtc = DateTime.UtcNow,
            TotalCatalogItems = totalItems,
            TotalCustomers = totalCustomers,
            TotalInvoices = totalInvoices,
            IsHealthy = true
        });
    }
}
