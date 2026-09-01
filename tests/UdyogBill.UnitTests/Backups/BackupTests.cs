using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Backups;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Backups;

public class BackupTests
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
            TenantCode = "TNT-BACKUP-001"
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
    public async Task TriggerBackup_ShouldCreateValidJsonSnapshotAndChecksum()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new BackupService(context, tenantContext, userContext, auditService);

        var party = new Party
        {
            TenantId = tenantId,
            LegalName = "Apex Hospital",
            PartyType = PartyType.Customer
        };
        context.Parties.Add(party);

        var invoice = new SalesInvoice
        {
            TenantId = tenantId,
            InvoiceNumber = "INV-2026-8811",
            CustomerName = "Apex Hospital",
            TotalAmount = 5400m
        };
        context.SalesInvoices.Add(invoice);
        await context.SaveChangesAsync();

        var request = new TriggerBackupRequest
        {
            BackupType = BackupType.TenantDataOnly,
            StorageProvider = StorageProvider.LocalStorage
        };

        // Act
        var result = await service.TriggerBackupAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.True(result.Data.FileSizeBytes > 0);
        Assert.False(string.IsNullOrEmpty(result.Data.ChecksumSha256));
        Assert.Equal(BackupStatus.Completed, result.Data.Status);
        Assert.True(File.Exists(result.Data.FilePath));
    }

    [Fact]
    public async Task UpdateScheduleConfig_ShouldSaveCloudSettings()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new BackupService(context, tenantContext, userContext, auditService);

        var request = new UpdateBackupScheduleConfigRequest
        {
            IsAutoBackupEnabled = true,
            Frequency = BackupScheduleFrequency.Daily,
            ScheduledTimeUtc = new TimeSpan(3, 30, 0),
            StorageProvider = StorageProvider.AwsS3,
            S3BucketName = "udyogbill-enterprise-backups",
            S3Region = "ap-south-1",
            S3AccessKey = "AKIAEXAMPLE12345",
            RetentionCount = 45
        };

        // Act
        var result = await service.UpdateScheduleConfigAsync(request);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(StorageProvider.AwsS3, result.Data!.StorageProvider);
        Assert.Equal("udyogbill-enterprise-backups", result.Data.S3BucketName);
        Assert.Equal(45, result.Data.RetentionCount);
    }

    [Fact]
    public async Task GetSystemHealth_ShouldReturnLiveDiagnostics()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new BackupService(context, tenantContext, userContext, auditService);

        // Act
        var result = await service.GetSystemHealthAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.True(result.Data.MemoryUsedMb > 0);
        Assert.True(result.Data.DatabaseSizeBytes > 0);
        Assert.Equal("HEALTHY", result.Data.HealthStatus);
    }

    [Fact]
    public async Task VerifyBackupIntegrity_ShouldValidateSha256Checksum()
    {
        // Arrange
        var (context, tenantId, tenantContext, userContext) = SetupContext();
        var auditService = new MockAuditService();
        var service = new BackupService(context, tenantContext, userContext, auditService);

        var backupResult = await service.TriggerBackupAsync(new TriggerBackupRequest());
        Assert.True(backupResult.IsSuccess);

        // Act
        var verifyResult = await service.VerifyBackupIntegrityAsync(backupResult.Data!.Id);

        // Assert
        Assert.True(verifyResult.IsSuccess);
        Assert.True(verifyResult.Data!.IsChecksumValid);
        Assert.True(verifyResult.Data.CanRestoreSafely);
        Assert.Equal(backupResult.Data.ChecksumSha256, verifyResult.Data.ActualChecksumSha256);
    }
}
