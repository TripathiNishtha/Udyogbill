using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Sync;

public class OfflineSyncTests
{
    private (AppDbContext context, Guid tenantId, MockTenantContext tenantContext, MockCurrentUserContext userContext) SetupContext()
    {
        var tenantId = Guid.NewGuid();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantContext = new MockTenantContext
        {
            TenantId = tenantId,
            TenantCode = "TNT-TEST-001"
        };

        var userContext = new MockCurrentUserContext
        {
            TenantId = tenantId,
            IsSuperAdmin = false,
            IsTenantAdmin = true,
            UserId = Guid.NewGuid(),
            Email = "admin@citypharma.com"
        };

        var context = new AppDbContext(options, tenantContext);

        return (context, tenantId, tenantContext, userContext);
    }

    [Fact]
    public async Task PushOfflineData_ShouldCreateInvoicesAndPreventDuplicates()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new SyncService(context, tenantContext, userContext, auditService);

        var offlineInvoiceId = Guid.NewGuid();
        var pushRequest = new SyncPushRequest
        {
            Invoices = new List<OfflineSalesInvoiceSyncDto>
            {
                new()
                {
                    ClientOfflineId = offlineInvoiceId,
                    OfflineInvoiceNumber = "OFF-INV-2026-0001",
                    CustomerName = "Dr. Mehta Clinic",
                    SubTotal = 1000m,
                    TaxAmount = 180m,
                    TotalAmount = 1180m,
                    PaymentMode = PaymentMode.Cash,
                    PaymentStatus = PaymentStatus.FullyPaid,
                    Items = new List<OfflineSalesInvoiceItemSyncDto>
                    {
                        new()
                        {
                            ItemSku = "MED-001",
                            ItemName = "Paracetamol 650mg",
                            Quantity = 10,
                            UnitPrice = 100,
                            TaxRatePercent = 18,
                            TaxAmount = 180,
                            TotalAmount = 1180
                        }
                    }
                }
            }
        };

        // Act 1: Initial Push
        var result1 = await service.PushOfflineDataAsync(pushRequest);

        // Assert 1
        Assert.True(result1.IsSuccess);
        Assert.Single(result1.Data!.SyncedInvoices);
        Assert.Equal("SYNCED", result1.Data.SyncedInvoices[0].Status);

        var invoice = await context.SalesInvoices.FirstOrDefaultAsync(i => i.Id == offlineInvoiceId);
        Assert.NotNull(invoice);
        Assert.Equal("Dr. Mehta Clinic", invoice.CustomerName);
        Assert.Equal(1180m, invoice.TotalAmount);

        // Act 2: Duplicate Push (same client offline ID)
        var result2 = await service.PushOfflineDataAsync(pushRequest);

        // Assert 2: Idempotent - should not create duplicate
        Assert.True(result2.IsSuccess);
        Assert.Equal("ALREADY_SYNCED", result2.Data!.SyncedInvoices[0].Status);

        var count = await context.SalesInvoices.CountAsync(i => i.Id == offlineInvoiceId);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task PushOfflineData_ShouldCreateOfflineCustomers()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new SyncService(context, tenantContext, userContext, auditService);

        var customerOfflineId = Guid.NewGuid();
        var pushRequest = new SyncPushRequest
        {
            Customers = new List<OfflineCustomerSyncDto>
            {
                new()
                {
                    ClientOfflineId = customerOfflineId,
                    LegalName = "Sanjivani Chemist & Druggist",
                    Phone = "+919876543210",
                    GSTIN = "27AABCU9603R1ZM"
                }
            }
        };

        // Act
        var result = await service.PushOfflineDataAsync(pushRequest);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Single(result.Data!.SyncedCustomers);
        Assert.Equal("SYNCED", result.Data.SyncedCustomers[0].Status);

        var party = await context.Parties.FirstOrDefaultAsync(p => p.Id == customerOfflineId);
        Assert.NotNull(party);
        Assert.Equal("Sanjivani Chemist & Druggist", party.LegalName);
        Assert.Equal(PartyType.Customer, party.PartyType);
    }

    [Fact]
    public async Task PullDeltaData_ShouldReturnUpdatedCatalogItemsAndParties()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new SyncService(context, tenantContext, userContext, auditService);

        var uomId = Guid.NewGuid();
        context.UnitsOfMeasure.Add(new UnitOfMeasure
        {
            Id = uomId,
            TenantId = tenantId,
            Name = "Capsules",
            Code = "CAP"
        });

        var item = new Item
        {
            TenantId = tenantId,
            Sku = "SKU-AMOX-500",
            Name = "Amoxicillin 500mg Capsules",
            PrimaryUomId = uomId,
            SellingPrice = 150m,
            TaxRate = 12m,
            HSNCode = "30049099",
            IsActive = true
        };
        context.Items.Add(item);

        var party = new Party
        {
            TenantId = tenantId,
            LegalName = "LifeCare Multispeciality Hospital",
            PartyType = PartyType.Customer,
            IsActive = true
        };
        context.Parties.Add(party);
        await context.SaveChangesAsync();

        var pullRequest = new SyncPullRequest
        {
            LastSyncTimestampUtc = DateTime.UtcNow.AddHours(-1)
        };

        // Act
        var result = await service.PullDeltaDataAsync(pullRequest);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Contains(result.Data!.UpdatedItems, i => i.Sku == "SKU-AMOX-500");
        Assert.Contains(result.Data.UpdatedCustomers, c => c.LegalName == "LifeCare Multispeciality Hospital");
    }
}
