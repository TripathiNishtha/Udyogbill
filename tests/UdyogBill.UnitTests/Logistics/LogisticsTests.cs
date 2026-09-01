using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Logistics;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Logistics;

public class LogisticsTests
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
            Email = "dispatch@citypharma.com"
        };

        var context = new AppDbContext(options, tenantContext);

        return (context, tenantId, tenantContext, userContext);
    }

    [Fact]
    public async Task GetTransporters_ShouldSeedDefaultTransporter()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new LogisticsService(context, tenantContext, userContext, auditService);

        // Act
        var result = await service.GetTransportersAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(result.Data!.Count >= 1);
        Assert.Equal("VRL Logistics & Express Cargo", result.Data[0].LegalName);
        Assert.Equal("MH-04-TR-9988", result.Data[0].DefaultVehicleNumber);
    }

    [Fact]
    public async Task CreateTransporter_ShouldSaveTransporter()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new LogisticsService(context, tenantContext, userContext, auditService);

        var request = new CreateTransporterRequest(
            TransporterId: "TRP-TCI-02",
            LegalName: "TCI Express Ltd",
            TransporterGstin: "27AAACT1234F1Z3",
            ContactPerson: "Sunil Verma",
            Mobile: "+919820011223",
            DefaultVehicleNumber: "MH-02-EE-4455",
            DefaultTransportMode: TransportMode.Road
        );

        // Act
        var result = await service.CreateTransporterAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        var transporter = await context.Transporters.FirstOrDefaultAsync(t => t.Id == result.Data);
        Assert.NotNull(transporter);
        Assert.Equal("TCI Express Ltd", transporter.LegalName);
        Assert.Equal("27AAACT1234F1Z3", transporter.TransporterGstin);
    }

    [Fact]
    public async Task CreateChallanFromInvoice_ShouldCopyCustomerAndLineItems()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new LogisticsService(context, tenantContext, userContext, auditService);

        var customer = new Party
        {
            TenantId = tenantId,
            Code = "CUST-001",
            LegalName = "Apollo Hospitals Ltd",
            PartyType = PartyType.Customer
        };
        customer.Addresses.Add(new PartyAddress
        {
            TenantId = tenantId,
            AddressLine1 = "Plot 12, Sector 18",
            City = "Navi Mumbai",
            State = "Maharashtra",
            Pincode = "400705",
            AddressType = AddressType.Shipping
        });
        context.Parties.Add(customer);

        var invoice = new SalesInvoice
        {
            TenantId = tenantId,
            InvoiceNumber = "INV-2026-0044",
            CustomerName = "Apollo Hospitals Ltd",
            PartyId = customer.Id,
            TotalAmount = 62000m,
            Items = new List<SalesInvoiceItem>
            {
                new() { TenantId = tenantId, ItemSku = "MED-001", ItemName = "Paracetamol 650mg", Quantity = 100, UnitPrice = 30 },
                new() { TenantId = tenantId, ItemSku = "MED-002", ItemName = "Azithromycin 500mg", Quantity = 50, UnitPrice = 120 }
            }
        };
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        // Act
        var result = await service.CreateChallanFromInvoiceAsync(invoice.Id, vehicleNumber: "MH-04-AB-9911");

        // Assert
        Assert.True(result.IsSuccess);
        var challan = await context.DeliveryChallans.Include(c => c.Items).FirstOrDefaultAsync(c => c.Id == result.Data);
        Assert.NotNull(challan);
        Assert.Equal("DC-2026-0044", challan.ChallanNumber);
        Assert.Equal("Apollo Hospitals Ltd", challan.CustomerName);
        Assert.Equal("MH-04-AB-9911", challan.VehicleNumber);
        Assert.Equal(2, challan.Items.Count);
        Assert.Equal(DispatchStatus.PendingDispatch, challan.DispatchStatus);
    }

    [Fact]
    public async Task UpdateDispatchStatus_ShouldUpdateStatusAndTimestamps()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new LogisticsService(context, tenantContext, userContext, auditService);

        var customer = new Party { TenantId = tenantId, Code = "CUST-002", LegalName = "Fortis Care", PartyType = PartyType.Customer };
        context.Parties.Add(customer);

        var challan = new DeliveryChallan
        {
            TenantId = tenantId,
            ChallanNumber = "DC-TEST-001",
            CustomerPartyId = customer.Id,
            CustomerName = "Fortis Care",
            DispatchStatus = DispatchStatus.PendingDispatch
        };
        context.DeliveryChallans.Add(challan);
        await context.SaveChangesAsync();

        // Act 1: Dispatch
        var dispatchResult = await service.UpdateDispatchStatusAsync(challan.Id, new UpdateDispatchStatusRequest(DispatchStatus.Dispatched, "Driver departed"));
        Assert.True(dispatchResult.IsSuccess);
        Assert.Equal(DispatchStatus.Dispatched, dispatchResult.Data!.DispatchStatus);
        Assert.NotNull(dispatchResult.Data.DispatchedAtUtc);

        // Act 2: Deliver with POD
        var deliverResult = await service.UpdateDispatchStatusAsync(challan.Id, new UpdateDispatchStatusRequest(DispatchStatus.Delivered, "Signed POD received", "https://cdn.udyogbill.com/pod/123.jpg"));
        Assert.True(deliverResult.IsSuccess);
        Assert.Equal(DispatchStatus.Delivered, deliverResult.Data!.DispatchStatus);
        Assert.NotNull(deliverResult.Data.DeliveredAtUtc);
        Assert.Equal("https://cdn.udyogbill.com/pod/123.jpg", deliverResult.Data.ProofOfDeliveryUrl);
    }

    [Fact]
    public async Task GenerateEWayBill_ShouldGenerate12DigitNumberAndValidUntil()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new LogisticsService(context, tenantContext, userContext, auditService);

        var customer = new Party { TenantId = tenantId, Code = "CUST-003", LegalName = "Manipal Hospitals", GSTIN = "27AAACM1234F1Z8", PartyType = PartyType.Customer };
        context.Parties.Add(customer);

        var invoice = new SalesInvoice
        {
            TenantId = tenantId,
            InvoiceNumber = "INV-2026-0099",
            CustomerName = "Manipal Hospitals",
            PartyId = customer.Id,
            TotalAmount = 85000m
        };
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        var request = new GenerateEWayBillRequest(
            DeliveryChallanId: null,
            SalesInvoiceId: invoice.Id,
            VehicleNumber: "MH-04-TR-9988",
            DistanceKm: 350
        );

        // Act
        var result = await service.GenerateEWayBillAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.StartsWith("311", result.Data!.EWayBillNumber);
        Assert.Equal(12, result.Data.EWayBillNumber.Length);
        Assert.Equal(85000m, result.Data.TotalInvoiceValue);
        Assert.True(result.Data.ValidUntilUtc > result.Data.GeneratedAtUtc);
        Assert.Contains("MH-04-TR-9988", result.Data.NicJsonPayload);
    }
}
