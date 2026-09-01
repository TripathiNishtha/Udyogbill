using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Backups;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Printing;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.E2E;

public class MasterSystemIntegrationTests
{
    private (AppDbContext context, Guid tenantId, Guid branchId, Guid warehouseId, Guid uomId, MockTenantContext tenantContext, MockCurrentUserContext userContext) SetupMasterContext()
    {
        var tenantId = Guid.NewGuid();
        var branchId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var uomId = Guid.NewGuid();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantContext = new MockTenantContext
        {
            TenantId = tenantId,
            TenantCode = "TNT-ENTERPRISE-001"
        };

        var userContext = new MockCurrentUserContext
        {
            TenantId = tenantId,
            IsSuperAdmin = false,
            IsTenantAdmin = true,
            UserId = Guid.NewGuid(),
            Email = "director@enterprise.com"
        };

        var context = new AppDbContext(options, tenantContext);

        // Branch & Warehouse
        context.TenantBranches.Add(new TenantBranch
        {
            Id = branchId,
            TenantId = tenantId,
            BranchName = "Mumbai Central Distribution Hub",
            BranchCode = "MUM-01",
            State = "Maharashtra",
            StateCode = "27",
            GSTIN = "27AAACE1234F1Z8"
        });

        context.TenantWarehouses.Add(new TenantWarehouse
        {
            Id = warehouseId,
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseName = "Bulk Storage Depo A",
            WarehouseCode = "WH-MUM-A"
        });

        // UOM
        context.UnitsOfMeasure.Add(new UnitOfMeasure
        {
            Id = uomId,
            TenantId = tenantId,
            Name = "Strips",
            Code = "STRP"
        });

        return (context, tenantId, branchId, warehouseId, uomId, tenantContext, userContext);
    }

    [Fact]
    public async Task MasterEndToEndEnterpriseFlow_ShouldExecuteSeamlessly()
    {
        // 1. Arrange Master Context & Services
        var (context, tenantId, branchId, warehouseId, uomId, tenantContext, userContext) = SetupMasterContext();
        var auditService = new MockAuditService();

        var printTemplateService = new PrintTemplateService(context, tenantContext, userContext, auditService);
        var syncService = new SyncService(context, tenantContext, userContext, auditService);
        var backupService = new BackupService(context, tenantContext, userContext, auditService);

        // 2. Catalog & Inventory Setup
        var itemId = Guid.NewGuid();
        var item = new Item
        {
            Id = itemId,
            TenantId = tenantId,
            Sku = "MED-MET-500",
            Name = "Metformin 500mg SR Tablets",
            PrimaryUomId = uomId,
            SellingPrice = 60m,
            PurchasePrice = 35m,
            MRP = 75m,
            TaxRate = 12m,
            HSNCode = "30049099",
            TrackBatches = true,
            IsActive = true
        };
        context.Items.Add(item);

        // 3. Customer & Party Setup
        var customerId = Guid.NewGuid();
        var customer = new Party
        {
            Id = customerId,
            TenantId = tenantId,
            LegalName = "Apex Multispeciality Hospital",
            PartyType = PartyType.Customer,
            GSTIN = "27AABCA5566G1Z2",
            StateCode = "27",
            PrimaryPhone = "+919876543210",
            CreditLimit = 500000m,
            IsActive = true
        };
        context.Parties.Add(customer);
        await context.SaveChangesAsync();

        // 4. Sales Invoice Creation
        var invoiceId = Guid.NewGuid();
        var salesInvoice = new SalesInvoice
        {
            Id = invoiceId,
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseId = warehouseId,
            PartyId = customerId,
            InvoiceNumber = "INV-2026-9901",
            InvoiceDate = DateTime.UtcNow,
            CustomerName = "Apex Multispeciality Hospital",
            CustomerGSTIN = "27AABCA5566G1Z2",
            SubTotal = 6000m,
            TaxableAmount = 6000m,
            CgstAmount = 360m,
            SgstAmount = 360m,
            TotalAmount = 6720m,
            PrimaryPaymentMode = PaymentMode.BankTransfer,
            PaymentStatus = PaymentStatus.FullyPaid
        };

        salesInvoice.Items.Add(new SalesInvoiceItem
        {
            TenantId = tenantId,
            InvoiceId = invoiceId,
            ItemId = itemId,
            UomId = uomId,
            UomCode = "STRP",
            ItemSku = "MED-MET-500",
            ItemName = "Metformin 500mg SR Tablets",
            HsnCode = "30049099",
            Quantity = 100m,
            UnitPrice = 60m,
            GstRate = 12m,
            CgstAmount = 360m,
            SgstAmount = 360m,
            TotalAmount = 6720m,
            BatchNumber = "BATCH-MET-889"
        });

        context.SalesInvoices.Add(salesInvoice);
        await context.SaveChangesAsync();

        // 5. Verify Print Template Studio Rendering
        var templatesResult = await printTemplateService.GetTemplatesAsync();
        Assert.True(templatesResult.IsSuccess);
        Assert.NotEmpty(templatesResult.Data!);

        var defaultTemplate = templatesResult.Data!.First();
        var renderResult = await printTemplateService.RenderPreviewAsync(new RenderPrintPreviewRequest
        {
            TemplateId = defaultTemplate.Id,
            InvoiceId = invoiceId
        });
        Assert.True(renderResult.IsSuccess);
        Assert.Contains("Apex Multispeciality Hospital", renderResult.Data!.RenderedHtml);
        Assert.Contains("INV-2026-9901", renderResult.Data.RenderedHtml);

        // 6. Verify Offline-First Outbox Synchronization & Idempotency
        var offlineInvId = Guid.NewGuid();
        var offlinePush = new SyncPushRequest
        {
            Invoices = new List<OfflineSalesInvoiceSyncDto>
            {
                new()
                {
                    ClientOfflineId = offlineInvId,
                    OfflineInvoiceNumber = "OFF-INV-2026-7788",
                    CustomerName = "Apollo Healthcare",
                    TotalAmount = 1500m,
                    SubTotal = 1250m,
                    TaxAmount = 250m,
                    Items = new List<OfflineSalesInvoiceItemSyncDto>
                    {
                        new()
                        {
                            ItemSku = "MED-MET-500",
                            ItemName = "Metformin 500mg SR Tablets",
                            Quantity = 20,
                            UnitPrice = 60,
                            TaxRatePercent = 12,
                            TotalAmount = 1344
                        }
                    }
                }
            }
        };

        var syncResult = await syncService.PushOfflineDataAsync(offlinePush);
        Assert.True(syncResult.IsSuccess);
        Assert.Single(syncResult.Data!.SyncedInvoices);
        Assert.Equal("SYNCED", syncResult.Data.SyncedInvoices[0].Status);

        // Re-push for idempotency check
        var dupSyncResult = await syncService.PushOfflineDataAsync(offlinePush);
        Assert.True(dupSyncResult.IsSuccess);
        Assert.Equal("ALREADY_SYNCED", dupSyncResult.Data!.SyncedInvoices[0].Status);

        // 7. Verify Data Backup Snapshot & Checksum Integrity
        var backupResult = await backupService.TriggerBackupAsync(new TriggerBackupRequest
        {
            BackupType = BackupType.TenantDataOnly,
            StorageProvider = StorageProvider.LocalStorage
        });
        Assert.True(backupResult.IsSuccess);
        Assert.True(backupResult.Data!.FileSizeBytes > 0);
        Assert.False(string.IsNullOrEmpty(backupResult.Data.ChecksumSha256));

        var integrityResult = await backupService.VerifyBackupIntegrityAsync(backupResult.Data.Id);
        Assert.True(integrityResult.IsSuccess);
        Assert.True(integrityResult.Data!.IsChecksumValid);
        Assert.True(integrityResult.Data.CanRestoreSafely);
        Assert.True(integrityResult.Data.TotalInvoicesInArchive >= 2);

        // 8. Verify System Telemetry Diagnostics
        var healthResult = await backupService.GetSystemHealthAsync();
        Assert.True(healthResult.IsSuccess);
        Assert.Equal("HEALTHY", healthResult.Data!.HealthStatus);
        Assert.True(healthResult.Data.TotalBackupsAvailable >= 1);
    }
}
