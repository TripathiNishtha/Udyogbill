using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class PlatformSettingsService : IPlatformSettingsService
{
    private readonly AppDbContext _context;
    private readonly IPlatformEmailService _emailService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ILogger<PlatformSettingsService> _logger;

    public PlatformSettingsService(
        AppDbContext context,
        IPlatformEmailService emailService,
        IPasswordHasher passwordHasher,
        ILogger<PlatformSettingsService> logger)
    {
        _context = context;
        _emailService = emailService;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    #region SuperAdmin Company Profile

    public async Task<Result<PlatformCompanyProfileDto>> GetCompanyProfileAsync(CancellationToken cancellationToken = default)
    {
        var profile = await _context.PlatformCompanyProfiles
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(cancellationToken);

        if (profile == null)
        {
            profile = new PlatformCompanyProfile();
            _context.PlatformCompanyProfiles.Add(profile);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var dto = new PlatformCompanyProfileDto(
            LegalCompanyName: profile.LegalCompanyName,
            ProductBrandName: profile.ProductBrandName,
            Tagline: profile.Tagline,
            Gstin: profile.Gstin,
            Pan: profile.Pan,
            State: profile.State,
            StateCode: profile.StateCode,
            AddressLine1: profile.AddressLine1,
            AddressLine2: profile.AddressLine2,
            City: profile.City,
            Pincode: profile.Pincode,
            SupportEmail: profile.SupportEmail,
            SupportPhone: profile.SupportPhone,
            Website: profile.Website,
            BankName: profile.BankName,
            BankAccountNumber: profile.BankAccountNumber,
            BankIfsc: profile.BankIfsc,
            BankBranch: profile.BankBranch,
            UpiId: profile.UpiId,
            UpiQrImageUrl: profile.UpiQrImageUrl,
            LogoUrl: profile.LogoUrl,
            SignatoryImageUrl: profile.SignatoryImageUrl,
            AuthorizedSignatoryName: profile.AuthorizedSignatoryName,
            AuthorizedSignatoryDesignation: profile.AuthorizedSignatoryDesignation,
            InvoicePrefix: profile.InvoicePrefix,
            NextInvoiceSequence: profile.NextInvoiceSequence > 0 ? profile.NextInvoiceSequence : 1,
            InvoiceTermsAndConditions: profile.InvoiceTermsAndConditions,
            EnableGstAutoFill: profile.EnableGstAutoFill,
            SandboxApiKey: profile.SandboxApiKey,
            SandboxApiSecret: profile.SandboxApiSecret
        );

        return Result<PlatformCompanyProfileDto>.Success(dto);
    }

    public async Task<Result> UpdateCompanyProfileAsync(UpdatePlatformCompanyProfileRequest request, CancellationToken cancellationToken = default)
    {
        var profile = await _context.PlatformCompanyProfiles
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(cancellationToken);

        if (profile == null)
        {
            profile = new PlatformCompanyProfile();
            _context.PlatformCompanyProfiles.Add(profile);
        }

        profile.LegalCompanyName = request.LegalCompanyName?.Trim() ?? profile.LegalCompanyName;
        profile.ProductBrandName = request.ProductBrandName?.Trim() ?? profile.ProductBrandName;
        profile.Tagline = request.Tagline?.Trim() ?? profile.Tagline;
        profile.Gstin = request.Gstin?.Trim().ToUpperInvariant() ?? profile.Gstin;
        profile.Pan = request.Pan?.Trim().ToUpperInvariant() ?? profile.Pan;
        profile.State = request.State?.Trim() ?? profile.State;
        profile.StateCode = request.StateCode?.Trim() ?? profile.StateCode;
        profile.AddressLine1 = request.AddressLine1?.Trim() ?? profile.AddressLine1;
        profile.AddressLine2 = request.AddressLine2?.Trim() ?? profile.AddressLine2;
        profile.City = request.City?.Trim() ?? profile.City;
        profile.Pincode = request.Pincode?.Trim() ?? profile.Pincode;
        profile.SupportEmail = request.SupportEmail?.Trim() ?? profile.SupportEmail;
        profile.SupportPhone = request.SupportPhone?.Trim() ?? profile.SupportPhone;
        profile.Website = request.Website?.Trim() ?? profile.Website;
        profile.BankName = request.BankName?.Trim() ?? profile.BankName;
        profile.BankAccountNumber = request.BankAccountNumber?.Trim() ?? profile.BankAccountNumber;
        profile.BankIfsc = request.BankIfsc?.Trim().ToUpperInvariant() ?? profile.BankIfsc;
        profile.BankBranch = request.BankBranch?.Trim() ?? profile.BankBranch;
        profile.UpiId = request.UpiId?.Trim() ?? profile.UpiId;
        profile.UpiQrImageUrl = request.UpiQrImageUrl?.Trim();
        profile.LogoUrl = request.LogoUrl?.Trim();
        profile.SignatoryImageUrl = request.SignatoryImageUrl?.Trim();
        profile.AuthorizedSignatoryName = request.AuthorizedSignatoryName?.Trim() ?? profile.AuthorizedSignatoryName;
        profile.AuthorizedSignatoryDesignation = request.AuthorizedSignatoryDesignation?.Trim() ?? profile.AuthorizedSignatoryDesignation;
        profile.InvoicePrefix = request.InvoicePrefix?.Trim() ?? profile.InvoicePrefix;
        if (request.NextInvoiceSequence.HasValue && request.NextInvoiceSequence.Value > 0)
        {
            profile.NextInvoiceSequence = request.NextInvoiceSequence.Value;
        }
        profile.InvoiceTermsAndConditions = request.InvoiceTermsAndConditions ?? profile.InvoiceTermsAndConditions;

        if (request.EnableGstAutoFill.HasValue)
        {
            profile.EnableGstAutoFill = request.EnableGstAutoFill.Value;
        }
        if (request.SandboxApiKey != null)
        {
            profile.SandboxApiKey = request.SandboxApiKey.Trim();
        }
        if (request.SandboxApiSecret != null)
        {
            profile.SandboxApiSecret = request.SandboxApiSecret.Trim();
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    #endregion

    #region SuperAdmin Email Settings

    public async Task<Result<PlatformEmailConfigDto>> GetEmailConfigAsync(CancellationToken cancellationToken = default)
    {
        var config = await _context.PlatformEmailConfigs
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(cancellationToken);

        if (config == null)
        {
            config = new PlatformEmailConfig();
            _context.PlatformEmailConfigs.Add(config);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var dto = new PlatformEmailConfigDto(
            SmtpHost: config.SmtpHost,
            SmtpPort: config.SmtpPort,
            SmtpUsername: config.SmtpUsername,
            FromEmail: config.FromEmail,
            FromName: config.FromName,
            ReplyToEmail: config.ReplyToEmail,
            EnableSsl: config.EnableSsl,
            IsActive: config.IsActive,
            HasPassword: !string.IsNullOrWhiteSpace(config.SmtpPassword)
        );

        return Result<PlatformEmailConfigDto>.Success(dto);
    }

    public async Task<Result> UpdateEmailConfigAsync(UpdatePlatformEmailConfigRequest request, CancellationToken cancellationToken = default)
    {
        var config = await _context.PlatformEmailConfigs
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(cancellationToken);

        if (config == null)
        {
            config = new PlatformEmailConfig();
            _context.PlatformEmailConfigs.Add(config);
        }

        config.SmtpHost = request.SmtpHost.Trim();
        config.SmtpPort = request.SmtpPort;
        config.SmtpUsername = request.SmtpUsername.Trim();
        if (!string.IsNullOrWhiteSpace(request.SmtpPassword))
        {
            config.SmtpPassword = request.SmtpPassword.Trim();
        }
        config.FromEmail = request.FromEmail.Trim();
        config.FromName = request.FromName.Trim();
        config.ReplyToEmail = request.ReplyToEmail?.Trim();
        config.EnableSsl = request.EnableSsl;
        config.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> SendTestEmailAsync(SendTestEmailRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RecipientEmail))
            return Result.Failure("Recipient email is required.", "VALIDATION_FAILED");

        var success = await _emailService.SendTestEmailAsync(request.RecipientEmail.Trim(), cancellationToken);
        if (!success)
            return Result.Failure("Failed to dispatch test email. Please verify SMTP host, port, and credentials.", "SMTP_ERROR");

        return Result.Success();
    }

    #endregion

    #region Bulk Broadcast Mailer

    public async Task<Result<BroadcastEmailResultDto>> BroadcastEmailAsync(BroadcastEmailRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Subject) || string.IsNullOrWhiteSpace(request.BodyHtml))
            return Result<BroadcastEmailResultDto>.Failure("Subject and message body are required.", "VALIDATION_FAILED");

        var query = _context.Tenants
            .IgnoreQueryFilters()
            .Where(t => t.IsActive && !t.IsDeleted)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.TargetPlanCode))
        {
            var plan = await _context.Plans.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Code == request.TargetPlanCode, cancellationToken);
            if (plan != null)
            {
                var subTenantIds = await _context.TenantSubscriptions
                    .IgnoreQueryFilters()
                    .Where(s => s.PlanId == plan.Id)
                    .Select(s => s.TenantId)
                    .ToListAsync(cancellationToken);

                query = query.Where(t => subTenantIds.Contains(t.Id));
            }
        }

        var targetTenants = await query.ToListAsync(cancellationToken);
        int successCount = 0;
        int failCount = 0;

        foreach (var tenant in targetTenants)
        {
            if (string.IsNullOrWhiteSpace(tenant.AdminEmail)) continue;

            string personalizedBody = request.BodyHtml
                .Replace("{BusinessName}", tenant.BusinessName)
                .Replace("{TradeName}", tenant.TradeName)
                .Replace("{TenantCode}", tenant.Code);

            try
            {
                var ok = await _emailService.SendEmailAsync(
                    tenant.AdminEmail,
                    tenant.BusinessName,
                    request.Subject,
                    personalizedBody,
                    cancellationToken
                );

                if (ok) successCount++;
                else failCount++;
            }
            catch
            {
                failCount++;
            }
        }

        var result = new BroadcastEmailResultDto(
            TotalTargeted: targetTenants.Count,
            SuccessfullySent: successCount,
            FailedCount: failCount
        );

        return Result<BroadcastEmailResultDto>.Success(result);
    }

    #endregion

    #region Password Reset via OTP

    public async Task<Result> SendForgotPasswordOtpAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            // Security best practice: return success even if user does not exist to avoid email enumeration
            return Result.Success();
        }

        // Generate 6-digit numeric OTP
        string otpCode = RandomNumberGenerator.GetInt32(100000, 999999).ToString();

        // Expire older unused OTPs for this email
        var olderOtps = await _context.PlatformPasswordResetOtps
            .IgnoreQueryFilters()
            .Where(o => o.Email == normalizedEmail && !o.IsUsed)
            .ToListAsync(cancellationToken);

        foreach (var old in olderOtps)
        {
            old.IsUsed = true;
        }

        _context.PlatformPasswordResetOtps.Add(new PlatformPasswordResetOtp
        {
            Email = normalizedEmail,
            OtpCode = otpCode,
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(15),
            IsUsed = false
        });

        await _context.SaveChangesAsync(cancellationToken);

        // Dispatch Email
        await _emailService.SendPasswordResetOtpAsync(user.Email, user.FullName, otpCode, cancellationToken);

        _logger.LogInformation("Password reset OTP generated and sent to {Email}", user.Email);
        return Result.Success();
    }

    public async Task<Result> ResetPasswordWithOtpAsync(ResetPasswordWithOtpRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var otpCode = request.OtpCode.Trim();

        var otpRecord = await _context.PlatformPasswordResetOtps
            .IgnoreQueryFilters()
            .Where(o => o.Email == normalizedEmail && o.OtpCode == otpCode && !o.IsUsed && o.ExpiresAtUtc > DateTimeOffset.UtcNow)
            .OrderByDescending(o => o.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (otpRecord == null)
        {
            return Result.Failure("Invalid or expired OTP verification code.", "INVALID_OTP");
        }

        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result.Failure("User account not found.", "NOT_FOUND");
        }

        // Hash new password with salt
        var passwordHash = _passwordHasher.HashPassword(request.NewPassword.Trim(), out var salt);
        user.PasswordHash = passwordHash;
        user.PasswordSalt = salt;
        user.UpdatedAtUtc = DateTimeOffset.UtcNow;

        // Mark OTP as used
        otpRecord.IsUsed = true;

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Password successfully reset for user {Email}", user.Email);

        return Result.Success();
    }

    #endregion
}
