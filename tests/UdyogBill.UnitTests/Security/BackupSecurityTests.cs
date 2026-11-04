using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using UdyogBill.Api.Controllers;
using UdyogBill.Api.Filters;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Backups;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Persistence.Services;
using UdyogBill.Shared.Constants;
using UdyogBill.UnitTests.SuperAdmin;
using Xunit;

namespace UdyogBill.UnitTests.Security;

public class BackupSecurityTests
{
    private (AppDbContext context, Guid tenantId, MockTenantContext tenantContext, MockCurrentUserContext userContext, Mock<IConfiguration> mockConfig, BackupService service) SetupBackupService(string masterKey = "Server_Super_Secret_Backup_Master_Key_2026_Minimum_256_Bits!")
    {
        var tenantId = Guid.NewGuid();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var tenantContext = new MockTenantContext
        {
            TenantId = tenantId,
            TenantCode = "TNT-SECURE-VAULT"
        };

        var userContext = new MockCurrentUserContext
        {
            TenantId = tenantId,
            IsSuperAdmin = false,
            IsTenantAdmin = true,
            UserId = Guid.NewGuid(),
            Email = "admin@securevault.com"
        };

        var mockAudit = new MockAuditService();
        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Backup:MasterEncryptionKey"]).Returns(masterKey);

        var context = new AppDbContext(options, tenantContext);
        var service = new BackupService(context, tenantContext, userContext, mockAudit, mockConfig.Object);

        return (context, tenantId, tenantContext, userContext, mockConfig, service);
    }

    [Fact]
    public async Task BackupEncryption_DecryptWithTenantIdAlone_ShouldFail()
    {
        var masterKey = "HighlySecretProductionMasterKeyThatAttackerDoesNotHave!";
        var (context, tenantId, _, _, _, service) = SetupBackupService(masterKey);

        // Seed customer party data
        context.Parties.Add(new Party
        {
            TenantId = tenantId,
            LegalName = "Confidential Client Alpha",
            PartyType = PartyType.Customer
        });
        await context.SaveChangesAsync();

        // Generate encrypted backup with hardened key
        var result = await service.TriggerBackupAsync(new TriggerBackupRequest());
        result.IsSuccess.Should().BeTrue();

        var jobEntity = await context.BackupJobs.FirstAsync(j => j.Id == result.Data!.Id);
        var encryptedFileBytes = await File.ReadAllBytesAsync(jobEntity.FilePath);

        // Attacker derives key solely using public Tenant ID (legacy derivation)
        var attackerDerivedKey = BackupService.DeriveLegacyKey(tenantId);

        // Attacker attempts AES-GCM decryption with legacy key
        var magic = new byte[] { (byte)'U', (byte)'B', (byte)'E', (byte)'N', (byte)'C', (byte)'1' };
        var headerLen = magic.Length;
        var nonceLen = AesGcm.NonceByteSizes.MaxSize;
        var tagLen = AesGcm.TagByteSizes.MaxSize;

        var nonce = new byte[nonceLen];
        Array.Copy(encryptedFileBytes, headerLen, nonce, 0, nonceLen);

        var tag = new byte[tagLen];
        Array.Copy(encryptedFileBytes, headerLen + nonceLen, tag, 0, tagLen);

        var cipherLen = encryptedFileBytes.Length - headerLen - nonceLen - tagLen;
        var cipherBytes = new byte[cipherLen];
        Array.Copy(encryptedFileBytes, headerLen + nonceLen + tagLen, cipherBytes, 0, cipherLen);

        var decryptedAttempt = new byte[cipherLen];

        // Decryption attempt MUST throw CryptographicException due to authentication tag failure
        var act = () =>
        {
            using var aesGcm = new AesGcm(attackerDerivedKey, tagLen);
            aesGcm.Decrypt(nonce, cipherBytes, tag, decryptedAttempt);
        };

        act.Should().Throw<CryptographicException>("Backup encrypted with server master key cannot be decrypted using tenant ID alone.");
    }

    [Fact]
    public async Task BackupEncryption_DecryptWithCorrectServerKey_ShouldSucceed()
    {
        var masterKey = "ValidProductionServerMasterKeyMinimum256BitsLong!";
        var (context, tenantId, _, _, _, service) = SetupBackupService(masterKey);

        context.Parties.Add(new Party
        {
            TenantId = tenantId,
            LegalName = "Genuine Client Beta",
            PartyType = PartyType.Customer
        });
        await context.SaveChangesAsync();

        var result = await service.TriggerBackupAsync(new TriggerBackupRequest());
        result.IsSuccess.Should().BeTrue();

        // Restore using the authorized service
        var restoreResult = await service.RestoreBackupAsync(result.Data!.Id);
        restoreResult.IsSuccess.Should().BeTrue();
        restoreResult.Data!.CanRestoreSafely.Should().BeTrue();
    }

    [Fact]
    public async Task BackupJobDto_ShouldNotExposePhysicalServerPath()
    {
        var (context, _, _, _, _, service) = SetupBackupService();

        var triggerResult = await service.TriggerBackupAsync(new TriggerBackupRequest());
        triggerResult.IsSuccess.Should().BeTrue();

        // Verify trigger response
        triggerResult.Data!.FilePath.Should().BeNull("Server file path must not be disclosed in trigger response.");

        // Verify list jobs response
        var jobsResult = await service.GetBackupJobsAsync();
        jobsResult.IsSuccess.Should().BeTrue();
        jobsResult.Data.Should().NotBeEmpty();
        jobsResult.Data!.All(j => j.FilePath == null).Should().BeTrue("All BackupJobDtos must have null FilePath to prevent directory disclosure.");
    }

    [Fact]
    public async Task TenantBackupController_WithoutSettingsManagePermission_ShouldReturn403()
    {
        // Simulate a cashier with only Sales permissions (no SettingsManage / tenant.settings)
        var cashierUserContext = new MockCurrentUserContext
        {
            TenantId = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            IsSuperAdmin = false,
            IsTenantAdmin = false,
            Roles = new List<string> { "Cashier" },
            Permissions = new List<string> { Permissions.SalesCreate, Permissions.SalesView }
        };

        var filter = new RequirePermissionFilter(cashierUserContext, new[] { Permissions.SettingsManage });

        var actionContext = new ActionContext(
            new DefaultHttpContext(),
            new RouteData(),
            new ActionDescriptor()
        );

        var executingContext = new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?>(),
            new object()
        );

        var nextCalled = false;
        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult<ActionExecutedContext>(null!);
        };

        // Act
        await filter.OnActionExecutionAsync(executingContext, next);

        // Assert
        nextCalled.Should().BeFalse("Unauthorized user must not reach controller action.");
        executingContext.Result.Should().BeOfType<ObjectResult>();
        var objectResult = (ObjectResult)executingContext.Result!;
        objectResult.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task TenantBackupController_WithSettingsManagePermission_ShouldAllow()
    {
        // Simulate a staff member with explicit SettingsManage permission
        var adminStaffContext = new MockCurrentUserContext
        {
            TenantId = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            IsSuperAdmin = false,
            IsTenantAdmin = false,
            Roles = new List<string> { "OperationsManager" },
            Permissions = new List<string> { Permissions.SettingsManage }
        };

        var filter = new RequirePermissionFilter(adminStaffContext, new[] { Permissions.SettingsManage });

        var actionContext = new ActionContext(
            new DefaultHttpContext(),
            new RouteData(),
            new ActionDescriptor()
        );

        var executingContext = new ActionExecutingContext(
            actionContext,
            new List<IFilterMetadata>(),
            new Dictionary<string, object?>(),
            new object()
        );

        var nextCalled = false;
        ActionExecutionDelegate next = () =>
        {
            nextCalled = true;
            return Task.FromResult<ActionExecutedContext>(null!);
        };

        // Act
        await filter.OnActionExecutionAsync(executingContext, next);

        // Assert
        nextCalled.Should().BeTrue("User with SettingsManage permission must be allowed through.");
        executingContext.Result.Should().BeNull();
    }
}
