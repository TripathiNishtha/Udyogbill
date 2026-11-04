using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Inventory;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Persistence.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IAuditService _auditService;
    private readonly IPlatformEmailService _emailService;
    private readonly IReferralService _referralService;

    public AuthService(
        AppDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator,
        IAuditService auditService,
        IPlatformEmailService emailService,
        IReferralService referralService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
        _auditService = auditService;
        _emailService = emailService;
        _referralService = referralService;
    }

    public async Task<Result<LoginResponse>> LoginAsync(LoginRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        // 1. Fetch user (ignoring tenant filter since login occurs prior to tenant context establishment)
        User? user = null;
        if (normalizedEmail == "demo")
        {
            user = await _context.Users
                .IgnoreQueryFilters()
                .Include(u => u.Tenant)
                    .ThenInclude(t => t!.Industry)
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .OrderByDescending(u => u.Email.ToLower() == "demo@udyogbill.com" ? 4 : (u.Email.ToLower() == "rajesh@apexpharma.com" ? 3 : (u.Email.ToLower() == "suresh@citypharma.com" ? 2 : 1)))
                .FirstOrDefaultAsync(u => !u.IsDeleted && (
                    u.Email.ToLower() == "demo@udyogbill.com" ||
                    u.Email.ToLower() == "rajesh@apexpharma.com" ||
                    u.Email.ToLower() == "suresh@citypharma.com" ||
                    u.Email.ToLower() == "demo" ||
                    (u.IsTenantAdmin && u.TenantId != null)
                ), cancellationToken);
        }
        else if (normalizedEmail == "superadmin")
        {
            user = await _context.Users
                .IgnoreQueryFilters()
                .Include(u => u.Tenant)
                    .ThenInclude(t => t!.Industry)
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .OrderByDescending(u => u.Email.ToLower() == "superadmin@udyogbill.com" ? 2 : 1)
                .FirstOrDefaultAsync(u => !u.IsDeleted && (
                    u.IsSuperAdmin ||
                    u.Email.ToLower() == "superadmin@udyogbill.com" ||
                    u.Email.ToLower() == "admin@udyogbill.com" ||
                    u.Email.ToLower() == "superadmin"
                ), cancellationToken);
        }
        else
        {
            user = await _context.Users
                .IgnoreQueryFilters()
                .Include(u => u.Tenant)
                    .ThenInclude(t => t!.Industry)
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => !u.IsDeleted && (
                    u.Email.ToLower() == normalizedEmail ||
                    (u.PhoneNumber != null && u.PhoneNumber == normalizedEmail)
                ), cancellationToken);
        }

        if (user == null)
        {
            return Result<LoginResponse>.Failure("Invalid email or password.", "INVALID_CREDENTIALS");
        }

        if (!user.IsActive)
        {
            return Result<LoginResponse>.Failure("Account is deactivated. Please contact your administrator.", "ACCOUNT_DEACTIVATED");
        }

        if (!user.IsSuperAdmin && user.Tenant != null && (user.Tenant.Status == TenantStatus.Suspended || !user.Tenant.IsActive))
        {
            return Result<LoginResponse>.Failure("Your store account has been suspended by administration. Please contact support@udyogbill.com.", "TENANT_SUSPENDED");
        }

        // Account Lockout check (Do NOT verify password if account is currently locked)
        if (user.LockoutEnabled && user.LockoutEndUtc.HasValue && user.LockoutEndUtc.Value > DateTimeOffset.UtcNow)
        {
            var remainingMinutes = Math.Max(1, (int)Math.Ceiling((user.LockoutEndUtc.Value - DateTimeOffset.UtcNow).TotalMinutes));
            return Result<LoginResponse>.Failure(
                $"Account is temporarily locked due to multiple failed login attempts. Please try again after {remainingMinutes} minute(s).",
                "ACCOUNT_LOCKED"
            );
        }

        // 2. Strict PBKDF2 HMAC-SHA512 password verification
        var isPasswordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash, user.PasswordSalt);

        if (!isPasswordValid)
        {
            if (user.LockoutEndUtc.HasValue && user.LockoutEndUtc.Value <= DateTimeOffset.UtcNow)
            {
                // Previous lockout expired; reset failed attempts counter for this new cycle
                user.AccessFailedCount = 1;
                user.LockoutEndUtc = null;
            }
            else
            {
                user.AccessFailedCount++;
            }

            var isLockedNow = false;
            if (user.LockoutEnabled && user.AccessFailedCount >= 5)
            {
                user.LockoutEndUtc = DateTimeOffset.UtcNow.AddMinutes(15);
                isLockedNow = true;
            }

            await _context.SaveChangesAsync(cancellationToken);

            await _auditService.LogAsync(new AuditLog
            {
                TenantId = user.TenantId ?? Guid.Empty,
                UserId = user.Id,
                UserEmail = user.Email,
                Action = AuditActionType.FailedLogin,
                ActionName = isLockedNow ? "AccountLocked" : "FailedLogin",
                EntityName = "User",
                EntityId = user.Id.ToString(),
                IpAddress = ipAddress
            }, cancellationToken);

            if (isLockedNow)
            {
                return Result<LoginResponse>.Failure(
                    "Account has been temporarily locked for 15 minutes due to multiple failed login attempts.",
                    "ACCOUNT_LOCKED"
                );
            }

            return Result<LoginResponse>.Failure("Invalid email or password.", "INVALID_CREDENTIALS");
        }

        // 3. Reset failed attempts & update login timestamp
        user.AccessFailedCount = 0;
        user.LockoutEndUtc = null;
        user.LastLoginAtUtc = DateTimeOffset.UtcNow;
        user.LastLoginIp = ipAddress;

        // 4. Resolve Roles & Permissions
        var roles = user.IsSuperAdmin 
            ? new List<string> { Roles.SuperAdmin }
            : user.UserRoles.Select(ur => ur.Role.Name).ToList();

        if (user.IsTenantAdmin && !roles.Contains(Roles.TenantAdmin))
        {
            roles.Add(Roles.TenantAdmin);
        }

        if (!user.IsSuperAdmin && user.TenantId == null)
        {
            var isSalesRep = await _context.InternalSalesReps
                .AsNoTracking()
                .AnyAsync(r => r.UserId == user.Id, cancellationToken);
            if (isSalesRep)
            {
                if (!roles.Contains("SalesRep")) roles.Add("SalesRep");
                if (!string.IsNullOrWhiteSpace(user.Designation) && !roles.Contains(user.Designation))
                {
                    roles.Add(user.Designation);
                }
            }
        }

        var permissions = new List<string>();
        if (!user.IsSuperAdmin)
        {
            var roleIds = user.UserRoles.Select(ur => ur.RoleId).ToList();
            var rolePermissions = await _context.RolePermissions
                .IgnoreQueryFilters()
                .Where(rp => roleIds.Contains(rp.RoleId))
                .Include(rp => rp.Permission)
                .Select(rp => rp.Permission.Code)
                .ToListAsync(cancellationToken);

            permissions.AddRange(rolePermissions);
        }

        // 5. Generate Tokens
        var accessToken = _jwtTokenGenerator.GenerateAccessToken(
            user,
            roles,
            permissions,
            user.TenantId,
            user.Tenant?.Code);

        var (refreshToken, refreshTokenHash, refreshExpiresAt) = _jwtTokenGenerator.GenerateRefreshToken(ipAddress);

        var refreshTokenEntity = new RefreshToken
        {
            TenantId = user.TenantId ?? Guid.Empty,
            UserId = user.Id,
            TokenHash = refreshTokenHash,
            ExpiresAtUtc = refreshExpiresAt,
            CreatedByIp = ipAddress
        };

        _context.RefreshTokens.Add(refreshTokenEntity);
        await _context.SaveChangesAsync(cancellationToken);

        bool isReadOnly = false;
        if (user.TenantId.HasValue && user.TenantId.Value != Guid.Empty && !user.IsSuperAdmin)
        {
            var now = DateTimeOffset.UtcNow;
            var sub = await _context.TenantSubscriptions
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.TenantId == user.TenantId.Value && !s.IsDeleted, cancellationToken);
            if (sub != null)
            {
                if (sub.Status == SubscriptionStatus.Active)
                {
                    isReadOnly = sub.EndsAtUtc < now;
                }
                else if (sub.Status == SubscriptionStatus.Trial)
                {
                    var expiry = sub.TrialEndsAtUtc ?? sub.EndsAtUtc;
                    isReadOnly = expiry < now;
                }
                else
                {
                    isReadOnly = true;
                }
            }
            else if (user.Tenant != null)
            {
                isReadOnly = user.Tenant.CreatedAtUtc.AddDays(14) < now;
            }
        }

        var userDto = new AuthUserDto(
            user.Id,
            user.Email,
            user.FullName,
            user.IsSuperAdmin,
            user.IsTenantAdmin,
            user.TenantId == Guid.Empty ? null : user.TenantId,
            user.Tenant?.Code,
            user.Tenant?.BusinessName,
            user.Tenant?.Industry?.Code,
            roles,
            permissions,
            user.Tenant?.LogoUrl,
            isReadOnly
        );

        return Result<LoginResponse>.Success(new LoginResponse(accessToken, refreshToken, DateTimeOffset.UtcNow.AddHours(1), userDto));
    }

    public async Task<Result<LoginResponse>> RefreshTokenAsync(RefreshTokenRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return Result<LoginResponse>.Failure("Refresh token is required.", "INVALID_TOKEN");
        }

        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.RefreshToken))).ToLowerInvariant();
        var existingToken = await _context.RefreshTokens
            .IgnoreQueryFilters()
            .Include(rt => rt.User)
                .ThenInclude(u => u.Tenant)
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, cancellationToken);

        if (existingToken == null || !existingToken.IsActive)
        {
            return Result<LoginResponse>.Failure("Invalid, expired, or revoked refresh token.", "INVALID_TOKEN");
        }

        var user = existingToken.User;
        if (user == null || user.IsDeleted || !user.IsActive)
        {
            return Result<LoginResponse>.Failure("User account is inactive or disabled.", "ACCOUNT_DISABLED");
        }

        if (!user.IsSuperAdmin && user.Tenant != null && (user.Tenant.Status == TenantStatus.Suspended || !user.Tenant.IsActive))
        {
            return Result<LoginResponse>.Failure("Your store account has been suspended by administration. Please contact support@udyogbill.com.", "TENANT_SUSPENDED");
        }

        // Token Rotation: Invalidate existing token and issue new pair
        var (newRefreshToken, newRefreshTokenHash, newExpiresAt) = _jwtTokenGenerator.GenerateRefreshToken(ipAddress);
        existingToken.RevokedAtUtc = DateTimeOffset.UtcNow;
        existingToken.RevokedByIp = ipAddress;
        existingToken.ReplacedByTokenHash = newRefreshTokenHash;
        existingToken.ReasonRevoked = "Rotated on session refresh";

        var newRefreshTokenEntity = new RefreshToken
        {
            TenantId = existingToken.TenantId,
            UserId = user.Id,
            TokenHash = newRefreshTokenHash,
            ExpiresAtUtc = newExpiresAt,
            CreatedByIp = ipAddress
        };
        _context.RefreshTokens.Add(newRefreshTokenEntity);

        // Fetch user roles and permissions
        var roles = await _context.UserRoles
            .IgnoreQueryFilters()
            .Where(ur => ur.UserId == user.Id)
            .Join(_context.Roles.IgnoreQueryFilters(), ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
            .ToListAsync(cancellationToken);

        var permissions = await _context.UserRoles
            .IgnoreQueryFilters()
            .Where(ur => ur.UserId == user.Id)
            .Join(_context.RolePermissions.IgnoreQueryFilters(), ur => ur.RoleId, rp => rp.RoleId, (ur, rp) => rp.Permission)
            .Select(p => p.Name)
            .Distinct()
            .ToListAsync(cancellationToken);

        var newAccessToken = _jwtTokenGenerator.GenerateAccessToken(
            user,
            roles,
            permissions,
            user.TenantId,
            user.Tenant?.Code
        );

        await _context.SaveChangesAsync(cancellationToken);

        var userDto = new AuthUserDto(
            user.Id,
            user.Email,
            user.FullName,
            user.IsSuperAdmin,
            user.IsTenantAdmin,
            user.TenantId == Guid.Empty ? null : user.TenantId,
            user.Tenant?.Code,
            user.Tenant?.BusinessName,
            user.Tenant?.Industry?.Code,
            roles,
            permissions,
            user.Tenant?.LogoUrl,
            false
        );

        return Result<LoginResponse>.Success(new LoginResponse(newAccessToken, newRefreshToken, DateTimeOffset.UtcNow.AddHours(1), userDto));
    }

    public async Task<Result<Guid>> RegisterTenantAsync(RegisterTenantRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.AdminEmail.Trim().ToLowerInvariant();

        var existingUser = await _context.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Email.ToLower() == normalizedEmail && !u.IsDeleted, cancellationToken);

        if (existingUser)
        {
            return Result<Guid>.Failure("A user with this email address is already registered.", "EMAIL_ALREADY_EXISTS");
        }

        var industry = await _context.Industries.FirstOrDefaultAsync(i => i.Id == request.IndustryId, cancellationToken);
        if (industry == null)
        {
            return Result<Guid>.Failure("Specified industry was not found.", "INVALID_INDUSTRY");
        }

        var defaultPlan = await _context.Plans.FirstOrDefaultAsync(p => p.Code == "STARTER" && p.IsActive, cancellationToken)
            ?? await _context.Plans.FirstOrDefaultAsync(p => p.IsActive, cancellationToken);

        if (defaultPlan == null)
        {
            return Result<Guid>.Failure("No active subscription plan configured.", "PLAN_NOT_CONFIGURED");
        }

        // Generate sequential tenant code
        var tenantCount = await _context.Tenants.IgnoreQueryFilters().CountAsync(cancellationToken) + 1001;
        var tenantCode = $"TNT-{industry.Code}-{tenantCount}";

        // 1. Create Tenant with Modular Industry Pack Auto-Activation
        var normalizedIndustry = IndustryTypeCodes.Normalize(industry.Code);
        var industryDescriptor = IndustryModuleRegistry.GetDescriptor(normalizedIndustry);

        string? apparelSubType = null;
        if (normalizedIndustry == IndustryTypeCodes.Garments)
        {
            var raw = request.ApparelSubType?.Trim().ToUpperInvariant();
            apparelSubType = (raw == "SHOES" || raw == "BOTH" || raw == "GARMENTS") ? raw : "GARMENTS";
        }

        string? hardwareSubType = null;
        if (normalizedIndustry == IndustryTypeCodes.Hardware)
        {
            var rawHw = request.HardwareSubType?.Trim().ToUpperInvariant();
            hardwareSubType = (rawHw == "PAINTS" || rawHw == "HARDWARE" || rawHw == "BOTH") ? rawHw : "BOTH";
        }

        var tenant = new Tenant
        {
            Code = tenantCode,
            BusinessName = request.BusinessName.Trim(),
            TradeName = string.IsNullOrWhiteSpace(request.TradeName) ? request.BusinessName.Trim() : request.TradeName.Trim(),
            IndustryId = industry.Id,
            IndustryTypeCode = normalizedIndustry,
            ActiveIndustryModule = normalizedIndustry,
            ApparelSubType = apparelSubType,
            HardwareSubType = hardwareSubType,
            IndustryModuleStatus = IndustryModuleStatus.Active,
            IndustryActivatedAtUtc = DateTimeOffset.UtcNow,
            MaxAllowedUsers = 2,
            Status = TenantStatus.Trial,
            AdminEmail = normalizedEmail,
            PrimaryPhone = request.PrimaryPhone.Trim(),
            AdminPassword = null,
            GSTIN = request.GSTIN?.Trim(),
            DrugLicenseNumber = request.DrugLicenseNumber?.Trim(),
            FSSAINumber = request.FSSAINumber?.Trim(),
            SmtpPort = 587,
            SmtpEnableSsl = true,
            IsAiAddonActive = false,
            AiScansLimit = 500,
            AiScansUsed = 0,
            IsActive = true
        };

        _context.Tenants.Add(tenant);

        // 2. Create Tenant Admin User
        var passwordHash = _passwordHasher.HashPassword(request.AdminPassword, out var salt);
        var adminUser = new User
        {
            TenantId = tenant.Id,
            Email = normalizedEmail,
            FullName = request.AdminFullName.Trim(),
            PhoneNumber = request.PrimaryPhone.Trim(),
            PasswordHash = passwordHash,
            PasswordSalt = salt,
            IsSuperAdmin = false,
            IsTenantAdmin = true,
            IsActive = true,
            EmailConfirmed = true
        };

        _context.Users.Add(adminUser);

        // 3. Create Default Tenant Admin Role
        var adminRole = new Role
        {
            TenantId = tenant.Id,
            Name = "Tenant Administrator",
            Code = "TENANT_ADMIN",
            Description = "Full administrator access for this tenant organization",
            IsSystemRole = true,
            IsActive = true
        };

        _context.Roles.Add(adminRole);

        _context.UserRoles.Add(new UserRole
        {
            TenantId = tenant.Id,
            User = adminUser,
            Role = adminRole
        });

        // 4. Create Default Head Office Branch & Main Warehouse
        var headOfficeBranch = new TenantBranch
        {
            TenantId = tenant.Id,
            BranchCode = "HO-01",
            BranchName = "Head Office",
            IsHeadOffice = true,
            IsActive = true,
            GSTIN = request.GSTIN?.Trim()
        };

        _context.TenantBranches.Add(headOfficeBranch);

        var mainWarehouse = new TenantWarehouse
        {
            TenantId = tenant.Id,
            Branch = headOfficeBranch,
            WarehouseCode = "MAIN-01",
            WarehouseName = "Main Storage Warehouse",
            IsDefault = true,
            IsActive = true
        };

        _context.TenantWarehouses.Add(mainWarehouse);

        // 5. Create Tenant Industry Configuration with Canonical Industry Defaults
        var industryConfig = new TenantIndustryConfig
        {
            TenantId = tenant.Id,
            IndustryId = industry.Id,
            EnableBatchTracking = industryDescriptor.EnableBatchTracking,
            EnableExpiryTracking = industryDescriptor.EnableExpiryTracking,
            EnableSerialTracking = industryDescriptor.EnableSerialTracking,
            EnableMultiUnitConversion = industryDescriptor.EnableMultiUnitConversion,
            EnableSizeColorMatrix = industryDescriptor.EnableSizeColorMatrix,
            EnableRecipeBOM = industryDescriptor.EnableRecipeBOM,
            EnableScheduleH1DrugTracking = industryDescriptor.EnableScheduleH1DrugTracking,
            EnableEWayBill = industryDescriptor.EnableEWayBill,
            EnableEInvoicing = industryDescriptor.EnableEInvoicing,
            ConfigurationJson = "{}"
        };

        _context.TenantIndustryConfigs.Add(industryConfig);

        // 6. Create 14-Day Trial Subscription
        var subscription = new TenantSubscription
        {
            TenantId = tenant.Id,
            PlanId = defaultPlan.Id,
            Status = SubscriptionStatus.Trial,
            StartsAtUtc = DateTimeOffset.UtcNow,
            EndsAtUtc = DateTimeOffset.UtcNow.AddDays(defaultPlan.TrialDays),
            TrialEndsAtUtc = DateTimeOffset.UtcNow.AddDays(defaultPlan.TrialDays),
            AutoRenew = true,
            PricePaid = 0m
        };

        _context.TenantSubscriptions.Add(subscription);

        // 7. Seed Industry-Specific Default Units of Measure (UOM)
        var defaultUoms = IndustryStandardUoms.GetForIndustry(normalizedIndustry);
        foreach (var uomDef in defaultUoms)
        {
            _context.UnitsOfMeasure.Add(new UnitOfMeasure
            {
                TenantId = tenant.Id,
                Code = uomDef.Code,
                Name = uomDef.Name,
                Symbol = uomDef.Symbol,
                DecimalPlaces = uomDef.DecimalPlaces,
                IsActive = true
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Record referral connection if referral code was used
        if (!string.IsNullOrWhiteSpace(request.ReferralCode))
        {
            try
            {
                await _referralService.RecordTenantRegistrationReferralAsync(tenant.Id, request.ReferralCode, cancellationToken);
            }
            catch
            {
                // Non-blocking for registration flow
            }
        }

        _ = _emailService.SendWelcomeEmailAsync(
            normalizedEmail,
            request.BusinessName.Trim(),
            request.AdminFullName.Trim(),
            tenantCode,
            cancellationToken
        );

        return Result<Guid>.Success(tenant.Id);
    }

    public async Task<Result> RevokeTokenAsync(string refreshToken, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return Result.Success();
        }

        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken))).ToLowerInvariant();
        var tokenEntity = await _context.RefreshTokens
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash && !rt.RevokedAtUtc.HasValue, cancellationToken);

        if (tokenEntity != null)
        {
            tokenEntity.RevokedAtUtc = DateTimeOffset.UtcNow;
            tokenEntity.RevokedByIp = ipAddress;
            tokenEntity.ReasonRevoked = "User explicitly logged out";
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Result.Success();
    }
}
