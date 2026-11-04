using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Security;

public class DistributedConcurrencyLockingTests
{
    private (DbContextOptions<AppDbContext> dbOptions, Guid tenantId, Guid branchId, Guid warehouseId, MockTenantContext tenantContext, MockCurrentUserContext userContext) CreateSharedContextOptions()
    {
        var dbName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var branchId = Guid.NewGuid();
        var warehouseId = Guid.NewGuid();

        var tenantContext = new MockTenantContext
        {
            TenantId = tenantId,
            TenantCode = "TNT-LOCK-001"
        };

        var userContext = new MockCurrentUserContext
        {
            TenantId = tenantId,
            IsSuperAdmin = false,
            IsTenantAdmin = true,
            Roles = new List<string> { "TenantAdmin" }
        };

        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        // Seed initial tenant entities
        using (var seedContext = new AppDbContext(dbOptions, tenantContext))
        {
            seedContext.TenantBranches.Add(new TenantBranch
            {
                Id = branchId,
                TenantId = tenantId,
                BranchName = "Lock Test Branch",
                BranchCode = "BR-LOCK",
                State = "Maharashtra",
                StateCode = "27"
            });

            seedContext.TenantWarehouses.Add(new TenantWarehouse
            {
                Id = warehouseId,
                TenantId = tenantId,
                BranchId = branchId,
                WarehouseName = "Lock Test Warehouse",
                WarehouseCode = "WH-LOCK"
            });

            seedContext.SaveChanges();
        }

        return (dbOptions, tenantId, branchId, warehouseId, tenantContext, userContext);
    }

    [Fact]
    public async Task RecordInvoicePayment_ConcurrentRequests_ShouldSerializeAndPreventOverpayment()
    {
        // Arrange
        var (dbOptions, tenantId, branchId, warehouseId, tenantContext, userContext) = CreateSharedContextOptions();

        var invoiceId = Guid.NewGuid();
        using (var setupContext = new AppDbContext(dbOptions, tenantContext))
        {
            var invoice = new SalesInvoice
            {
                Id = invoiceId,
                TenantId = tenantId,
                BranchId = branchId,
                WarehouseId = warehouseId,
                InvoiceNumber = "INV-CONCURRENCY-5000",
                InvoiceDate = DateTime.UtcNow,
                CustomerName = "Concurrency Test Customer",
                TotalAmount = 5000m,
                PaidAmount = 0m,
                BalanceAmount = 5000m,
                PaymentStatus = PaymentStatus.Unpaid,
                Status = InvoiceStatus.Issued
            };
            setupContext.SalesInvoices.Add(invoice);
            await setupContext.SaveChangesAsync();
        }

        // Two distinct SalesService instances simulating two concurrent API instances/threads
        using var context1 = new AppDbContext(dbOptions, tenantContext);
        using var context2 = new AppDbContext(dbOptions, tenantContext);

        var auditService1 = new MockAuditService();
        var auditService2 = new MockAuditService();

        var service1 = new SalesService(context1, tenantContext, userContext, auditService1);
        var service2 = new SalesService(context2, tenantContext, userContext, auditService2);

        var paymentReq1 = new RecordInvoicePaymentRequest(
            InvoiceId: invoiceId,
            PaymentDate: DateTime.UtcNow,
            Amount: 5000m,
            PaymentMode: PaymentMode.BankTransfer,
            TransactionReference: "TXN-CONC-001"
        );

        var paymentReq2 = new RecordInvoicePaymentRequest(
            InvoiceId: invoiceId,
            PaymentDate: DateTime.UtcNow,
            Amount: 5000m,
            PaymentMode: PaymentMode.UPI,
            TransactionReference: "TXN-CONC-002"
        );

        // Act: Execute both payment requests concurrently
        var task1 = service1.RecordInvoicePaymentAsync(paymentReq1);
        var task2 = service2.RecordInvoicePaymentAsync(paymentReq2);

        var results = await Task.WhenAll(task1, task2);

        // Assert
        var successfulPayments = results.Where(r => r.IsSuccess).ToList();
        var failedPayments = results.Where(r => !r.IsSuccess).ToList();

        // Exactly one payment must succeed and one must be rejected as already fully paid
        successfulPayments.Should().HaveCount(1, "Only one ₹5,000 payment must be accepted for a ₹5,000 balance invoice.");
        failedPayments.Should().HaveCount(1, "The second concurrent payment must be rejected to prevent overpayment.");
        failedPayments[0].ErrorCode.Should().Be("ALREADY_PAID");

        // Verify final invoice state in database
        using var verifyContext = new AppDbContext(dbOptions, tenantContext);
        var finalInvoice = await verifyContext.SalesInvoices
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.Id == invoiceId);

        finalInvoice.Should().NotBeNull();
        finalInvoice!.PaidAmount.Should().Be(5000m, "PaidAmount must exactly equal invoice total and NOT double-pay to 10,000.");
        finalInvoice.BalanceAmount.Should().Be(0m, "BalanceAmount must be 0 and cannot go negative.");
        finalInvoice.PaymentStatus.Should().Be(PaymentStatus.FullyPaid);
        finalInvoice.Status.Should().Be(InvoiceStatus.Paid);
        finalInvoice.Payments.Should().HaveCount(1, "Only one payment entity should be recorded.");
    }

    [Fact]
    public async Task RecordInvoicePayment_ConcurrentPartialPayments_ShouldSerializeAndCapBalance()
    {
        // Arrange
        var (dbOptions, tenantId, branchId, warehouseId, tenantContext, userContext) = CreateSharedContextOptions();

        var invoiceId = Guid.NewGuid();
        using (var setupContext = new AppDbContext(dbOptions, tenantContext))
        {
            var invoice = new SalesInvoice
            {
                Id = invoiceId,
                TenantId = tenantId,
                BranchId = branchId,
                WarehouseId = warehouseId,
                InvoiceNumber = "INV-CONCURRENCY-7000",
                InvoiceDate = DateTime.UtcNow,
                CustomerName = "Partial Test Customer",
                TotalAmount = 7000m,
                PaidAmount = 0m,
                BalanceAmount = 7000m,
                PaymentStatus = PaymentStatus.Unpaid,
                Status = InvoiceStatus.Issued
            };
            setupContext.SalesInvoices.Add(invoice);
            await setupContext.SaveChangesAsync();
        }

        // Three concurrent payment attempts: 3,000 + 3,000 + 3,000 = 9,000 (exceeds 7,000)
        using var context1 = new AppDbContext(dbOptions, tenantContext);
        using var context2 = new AppDbContext(dbOptions, tenantContext);
        using var context3 = new AppDbContext(dbOptions, tenantContext);

        var service1 = new SalesService(context1, tenantContext, userContext, new MockAuditService());
        var service2 = new SalesService(context2, tenantContext, userContext, new MockAuditService());
        var service3 = new SalesService(context3, tenantContext, userContext, new MockAuditService());

        var req1 = new RecordInvoicePaymentRequest(invoiceId, DateTime.UtcNow, 3000m, PaymentMode.Cash);
        var req2 = new RecordInvoicePaymentRequest(invoiceId, DateTime.UtcNow, 3000m, PaymentMode.Cash);
        var req3 = new RecordInvoicePaymentRequest(invoiceId, DateTime.UtcNow, 3000m, PaymentMode.Cash);

        // Act
        var results = await Task.WhenAll(
            service1.RecordInvoicePaymentAsync(req1),
            service2.RecordInvoicePaymentAsync(req2),
            service3.RecordInvoicePaymentAsync(req3)
        );

        // Assert: All three attempts finish without deadlock or exception
        results.All(r => r.IsSuccess).Should().BeTrue("All payments succeed (the third is automatically capped to the remaining 1,000 balance).");

        using var verifyContext = new AppDbContext(dbOptions, tenantContext);
        var finalInvoice = await verifyContext.SalesInvoices
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.Id == invoiceId);

        finalInvoice.Should().NotBeNull();
        finalInvoice!.PaidAmount.Should().Be(7000m, "PaidAmount must not exceed invoice TotalAmount of 7,000.");
        finalInvoice.BalanceAmount.Should().Be(0m, "BalanceAmount must not go negative.");
        finalInvoice.PaymentStatus.Should().Be(PaymentStatus.FullyPaid);

        var sumPayments = finalInvoice.Payments.Sum(p => p.Amount);
        sumPayments.Should().Be(7000m, "Total recorded payments must sum exactly to 7,000.");
    }

    [Fact]
    public async Task RecordInvoicePayment_WhenCancelled_ShouldRejectPayment()
    {
        // Arrange
        var (dbOptions, tenantId, branchId, warehouseId, tenantContext, userContext) = CreateSharedContextOptions();

        var invoiceId = Guid.NewGuid();
        using (var setupContext = new AppDbContext(dbOptions, tenantContext))
        {
            var invoice = new SalesInvoice
            {
                Id = invoiceId,
                TenantId = tenantId,
                BranchId = branchId,
                WarehouseId = warehouseId,
                InvoiceNumber = "INV-CANCELLED-001",
                InvoiceDate = DateTime.UtcNow,
                CustomerName = "Cancelled Customer",
                TotalAmount = 2000m,
                PaidAmount = 0m,
                BalanceAmount = 2000m,
                PaymentStatus = PaymentStatus.Unpaid,
                Status = InvoiceStatus.Cancelled,
                IsCancelled = true
            };
            setupContext.SalesInvoices.Add(invoice);
            await setupContext.SaveChangesAsync();
        }

        using var context = new AppDbContext(dbOptions, tenantContext);
        var service = new SalesService(context, tenantContext, userContext, new MockAuditService());

        var req = new RecordInvoicePaymentRequest(invoiceId, DateTime.UtcNow, 500m, PaymentMode.Cash);

        // Act
        var result = await service.RecordInvoicePaymentAsync(req);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("INVOICE_CANCELLED");
    }

    [Fact]
    public async Task RecordInvoicePayment_WhenNotFound_ShouldReturnNotFound()
    {
        // Arrange
        var (dbOptions, tenantId, _, _, tenantContext, userContext) = CreateSharedContextOptions();

        using var context = new AppDbContext(dbOptions, tenantContext);
        var service = new SalesService(context, tenantContext, userContext, new MockAuditService());

        var nonExistentId = Guid.NewGuid();
        var req = new RecordInvoicePaymentRequest(nonExistentId, DateTime.UtcNow, 100m, PaymentMode.Cash);

        // Act
        var result = await service.RecordInvoicePaymentAsync(req);

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.ErrorCode.Should().Be("NOT_FOUND");
    }
}
