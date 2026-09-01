using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.Shared;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Sales;

public class QuotationServiceTests
{
    private (AppDbContext context, QuotationService service, Mock<ISalesService> mockSalesService, Guid tenantId, Guid branchId, Guid warehouseId, Guid partyId, Guid itemId, Guid uomId)
        CreateTestContext(string branchState = "27", string customerState = "27")
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: $"UdyogBill_Quotation_Test_{Guid.NewGuid()}")
            .Options;

        var tenantId = Guid.NewGuid();
        var branchId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();
        var partyId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var uomId = Guid.NewGuid();

        var tenantContext = new MockTenantContext
        {
            TenantId = tenantId,
            TenantCode = "TNT-PHARMA-001"
        };

        var userContext = new MockCurrentUserContext
        {
            TenantId = tenantId,
            IsSuperAdmin = false,
            IsTenantAdmin = true,
            Roles = new List<string> { "TenantAdmin" }
        };

        var context = new AppDbContext(options, tenantContext);

        // Seed Entities
        var branch = new TenantBranch
        {
            Id = branchId,
            TenantId = tenantId,
            BranchCode = "HO-01",
            BranchName = "Head Office Branch",
            State = "Maharashtra",
            StateCode = branchState,
            GSTIN = "27ABCDE1234F1Z5",
            IsActive = true
        };
        context.TenantBranches.Add(branch);

        var warehouse = new TenantWarehouse
        {
            Id = warehouseId,
            TenantId = tenantId,
            BranchId = branchId,
            WarehouseCode = "WH-01",
            WarehouseName = "Main Storage",
            IsActive = true
        };
        context.TenantWarehouses.Add(warehouse);

        var party = new Party
        {
            Id = partyId,
            TenantId = tenantId,
            Code = "CUST-001",
            LegalName = "Lifeline Super Specialty Clinic",
            PartyType = PartyType.Customer,
            GSTIN = $"{customerState}XYZPU9988K1Z2",
            IsActive = true,
            Addresses = new List<PartyAddress>
            {
                new PartyAddress
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    PartyId = partyId,
                    AddressType = AddressType.Billing,
                    AddressLine1 = "Plot 44, Medical Square",
                    City = "Nagpur",
                    State = "Maharashtra",
                    StateCode = customerState,
                    Pincode = "440010"
                }
            }
        };
        context.Parties.Add(party);

        var uom = new UnitOfMeasure
        {
            Id = uomId,
            TenantId = tenantId,
            Code = "BOX",
            Name = "Box of 10 Strips",
            IsActive = true
        };
        context.UnitsOfMeasure.Add(uom);

        var item = new Item
        {
            Id = itemId,
            TenantId = tenantId,
            Sku = "MED-AUG-625",
            Name = "Augmentin 625 Duo Tablet",
            HSNCode = "3004",
            PrimaryUomId = uomId,
            SellingPrice = 200m,
            MRP = 240m,
            TaxRate = 18m,
            IsActive = true
        };
        context.Items.Add(item);

        context.SaveChanges();

        var auditMock = new Mock<IAuditService>();
        var salesMock = new Mock<ISalesService>();

        var service = new QuotationService(context, userContext, auditMock.Object, salesMock.Object);

        return (context, service, salesMock, tenantId, branchId, warehouseId, partyId, itemId, uomId);
    }

    [Fact]
    public async Task CreateQuotationAsync_CalculatesTaxAndSavesQuotation()
    {
        // Arrange
        var (context, service, _, tenantId, branchId, _, partyId, itemId, uomId) = CreateTestContext("27", "27");

        var request = new CreateQuotationRequest
        {
            BranchId = branchId,
            PartyId = partyId,
            QuotationDate = DateTime.UtcNow,
            ValidUntilDate = DateTime.UtcNow.AddDays(15),
            QuotationDiscountPercent = 5,
            Notes = "Valid for 15 days from issue date.",
            Items = new List<CreateQuotationItemRequest>
            {
                new CreateQuotationItemRequest
                {
                    ItemId = itemId,
                    Quantity = 10,
                    UomId = uomId,
                    UnitPrice = 200m, // Gross: 2000
                    DiscountPercent = 0
                }
            }
        };

        // Act
        var result = await service.CreateQuotationAsync(request);

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeEmpty();

        var quotation = await context.Quotations.Include(q => q.Items).FirstOrDefaultAsync(q => q.Id == result.Data);
        quotation.Should().NotBeNull();
        quotation!.QuotationNumber.Should().StartWith("QT-");
        quotation.SubTotal.Should().Be(2000m);
        quotation.QuotationDiscountAmount.Should().Be(100m); // 5% of 2000
        quotation.TaxableAmount.Should().Be(1900m);
        quotation.CgstAmount.Should().Be(180m); // 9% of 2000
        quotation.SgstAmount.Should().Be(180m); // 9% of 2000
        quotation.IgstAmount.Should().Be(0m); // IntraState
        quotation.Status.Should().Be(QuotationStatus.Draft);
    }

    [Fact]
    public async Task ConvertQuotationToInvoiceAsync_CallsSalesServiceAndMarksConverted()
    {
        // Arrange
        var (context, service, salesMock, tenantId, branchId, warehouseId, partyId, itemId, uomId) = CreateTestContext("27", "27");

        var createReq = new CreateQuotationRequest
        {
            BranchId = branchId,
            PartyId = partyId,
            QuotationDate = DateTime.UtcNow,
            Items = new List<CreateQuotationItemRequest>
            {
                new CreateQuotationItemRequest
                {
                    ItemId = itemId,
                    Quantity = 5,
                    UomId = uomId,
                    UnitPrice = 200m,
                    DiscountPercent = 0
                }
            }
        };
        var createRes = await service.CreateQuotationAsync(createReq);
        var quotationId = createRes.Data;

        var mockInvoiceId = Guid.NewGuid();
        salesMock.Setup(s => s.CreateInvoiceAsync(It.IsAny<CreateSalesInvoiceRequest>(), It.IsAny<string?>(), default))
            .ReturnsAsync(Result<Guid>.Success(mockInvoiceId));

        var convertReq = new ConvertQuotationRequest
        {
            WarehouseId = warehouseId,
            InvoiceDate = DateTime.UtcNow,
            PrimaryPaymentMode = 3,
            PaidAmount = 0
        };

        // Act
        var convertRes = await service.ConvertQuotationToInvoiceAsync(quotationId, convertReq);

        // Assert
        convertRes.IsSuccess.Should().BeTrue();
        convertRes.Data.Should().Be(mockInvoiceId);

        var quotation = await context.Quotations.FirstOrDefaultAsync(q => q.Id == quotationId);
        quotation.Should().NotBeNull();
        quotation!.Status.Should().Be(QuotationStatus.ConvertedToInvoice);
        quotation.ConvertedInvoiceId.Should().Be(mockInvoiceId);
        quotation.ConvertedAtUtc.Should().NotBeNull();
    }
}
