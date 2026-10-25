using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.SalesForce;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class InternalSalesForceService : IInternalSalesForceService
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly ILogger<InternalSalesForceService> _logger;

    public InternalSalesForceService(
        AppDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator,
        ILogger<InternalSalesForceService> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
        _logger = logger;
    }

    // ==========================================
    // 1. SALES REPS & HIERARCHY
    // ==========================================

    public async Task<Result<IReadOnlyList<InternalSalesRepDto>>> GetSalesRepsAsync(
        string? city = null,
        SalesRoleTier? tier = null,
        bool activeOnly = true,
        CancellationToken ct = default)
    {
        var query = _context.InternalSalesReps
            .Include(r => r.ReportingTo)
            .Include(r => r.Subordinates)
            .AsNoTracking();

        if (activeOnly) query = query.Where(r => r.IsActive);
        if (!string.IsNullOrWhiteSpace(city)) query = query.Where(r => r.City.ToLower() == city.Trim().ToLower());
        if (tier.HasValue) query = query.Where(r => r.RoleTier == tier.Value);

        var list = await query
            .OrderBy(r => r.RoleTier)
            .ThenBy(r => r.FullName)
            .Select(r => new InternalSalesRepDto(
                r.Id,
                r.UserId,
                r.RepCode,
                r.FullName,
                r.Mobile,
                r.Email,
                r.MonthlyTarget,
                r.RoleTier,
                r.RoleTier.ToString(),
                r.ReportingToId,
                r.ReportingTo != null ? r.ReportingTo.FullName : null,
                r.City,
                r.Region,
                r.Zone,
                r.IsActive,
                r.Subordinates.Count,
                r.CreatedAtUtc
            ))
            .ToListAsync(ct);

        return Result<IReadOnlyList<InternalSalesRepDto>>.Success(list);
    }

    public async Task<Result<InternalSalesRepDto>> GetSalesRepByIdAsync(Guid id, CancellationToken ct = default)
    {
        var r = await _context.InternalSalesReps
            .Include(x => x.ReportingTo)
            .Include(x => x.Subordinates)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (r == null) return Result<InternalSalesRepDto>.Failure("Sales Representative not found.");

        return Result<InternalSalesRepDto>.Success(new InternalSalesRepDto(
            r.Id,
            r.UserId,
            r.RepCode,
            r.FullName,
            r.Mobile,
            r.Email,
            r.MonthlyTarget,
            r.RoleTier,
            r.RoleTier.ToString(),
            r.ReportingToId,
            r.ReportingTo != null ? r.ReportingTo.FullName : null,
            r.City,
            r.Region,
            r.Zone,
            r.IsActive,
            r.Subordinates.Count,
            r.CreatedAtUtc
        ));
    }

    public async Task<Result<InternalSalesRepDto>> CreateSalesRepAsync(CreateSalesRepRequest req, CancellationToken ct = default)
    {
        var mobile = req.ResolvedMobile;
        if (string.IsNullOrWhiteSpace(mobile))
            return Result<InternalSalesRepDto>.Failure("Mobile number is required.");

        if (await _context.InternalSalesReps.AnyAsync(r => r.Mobile == mobile, ct))
            return Result<InternalSalesRepDto>.Failure("A sales representative with this mobile already exists.");

        var email = !string.IsNullOrWhiteSpace(req.Email) ? req.Email.Trim().ToLower() : $"{mobile}@sales.udyogbill.com";
        var passwordHash = _passwordHasher.HashPassword(string.IsNullOrWhiteSpace(req.Password) ? "Sales@123" : req.Password, out var salt);

        // Platform level user check or create
        var user = await _context.Users.FirstOrDefaultAsync(u => u.PhoneNumber == mobile || u.Email == email, ct);
        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                TenantId = null,
                Email = email,
                PhoneNumber = mobile,
                PasswordHash = passwordHash,
                PasswordSalt = salt,
                FullName = req.FullName.Trim(),
                Designation = req.RoleTier.ToString(),
                IsActive = true,
                EmailConfirmed = true,
                PhoneNumberConfirmed = true
            };
            _context.Users.Add(user);
        }
        else
        {
            user.FullName = req.FullName.Trim();
            user.Designation = req.RoleTier.ToString();
            user.PasswordHash = passwordHash;
            user.PasswordSalt = salt;
            user.IsActive = true;
        }

        // Generate unique Rep Code e.g. "UB-KAN-01"
        var city = !string.IsNullOrWhiteSpace(req.City) ? req.City.Trim() : "Kanpur";
        var region = !string.IsNullOrWhiteSpace(req.Region) ? req.Region.Trim() : "North";
        var zone = !string.IsNullOrWhiteSpace(req.Zone) ? req.Zone.Trim() : "UP Central";
        var cityPrefix = city.Length >= 3 ? city.Substring(0, 3).ToUpper() : "SAL";
        var countInCity = await _context.InternalSalesReps.CountAsync(r => r.City.ToLower() == city.ToLower(), ct) + 1;
        var repCode = $"UB-{cityPrefix}-{countInCity:D2}";

        var defaultTarget = req.RoleTier == SalesRoleTier.FSE ? 200000.00m : req.RoleTier == SalesRoleTier.ASM ? 100000.00m : 50000.00m;
        var assignedTarget = req.MonthlyTarget.HasValue && req.MonthlyTarget.Value > 0 ? req.MonthlyTarget.Value : defaultTarget;

        var rep = new InternalSalesRep
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            RepCode = repCode,
            FullName = req.FullName.Trim(),
            Mobile = mobile,
            Email = email,
            MonthlyTarget = assignedTarget,
            RoleTier = req.RoleTier,
            ReportingToId = req.ReportingToId,
            City = city,
            Region = region,
            Zone = zone,
            IsActive = true
        };
        _context.InternalSalesReps.Add(rep);

        // Auto-allocate initial monthly quota
        var now = DateTime.UtcNow;
        var quota = new SalesQuotaAllocation
        {
            Id = Guid.NewGuid(),
            RepId = rep.Id,
            Month = now.Month,
            Year = now.Year,
            IndividualTarget = assignedTarget,
            TotalTarget = assignedTarget
        };
        _context.SalesQuotaAllocations.Add(quota);

        await _context.SaveChangesAsync(ct);

        return await GetSalesRepByIdAsync(rep.Id, ct);
    }

    public async Task<Result<InternalSalesRepDto>> UpdateSalesRepAsync(Guid id, UpdateSalesRepRequest req, CancellationToken ct = default)
    {
        var rep = await _context.InternalSalesReps.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (rep == null) return Result<InternalSalesRepDto>.Failure("Sales Representative not found.");

        var mobile = req.ResolvedMobile;
        if (!string.IsNullOrWhiteSpace(mobile)) rep.Mobile = mobile;
        rep.FullName = req.FullName.Trim();
        if (!string.IsNullOrWhiteSpace(req.Email)) rep.Email = req.Email.Trim().ToLower();
        rep.RoleTier = req.RoleTier;
        rep.ReportingToId = req.ReportingToId;
        if (!string.IsNullOrWhiteSpace(req.City)) rep.City = req.City.Trim();
        if (!string.IsNullOrWhiteSpace(req.Region)) rep.Region = req.Region.Trim();
        if (!string.IsNullOrWhiteSpace(req.Zone)) rep.Zone = req.Zone.Trim();
        if (req.MonthlyTarget.HasValue && req.MonthlyTarget.Value > 0)
        {
            rep.MonthlyTarget = req.MonthlyTarget.Value;
        }
        rep.IsActive = req.IsActive;

        await _context.SaveChangesAsync(ct);
        return await GetSalesRepByIdAsync(rep.Id, ct);
    }

    public async Task<Result<bool>> UpdateRepMonthlyTargetAsync(Guid repId, decimal newTarget, CancellationToken ct = default)
    {
        var rep = await _context.InternalSalesReps.FirstOrDefaultAsync(r => r.Id == repId, ct);
        if (rep == null) return Result<bool>.Failure("Sales Representative not found.");

        rep.MonthlyTarget = newTarget;

        var now = DateTime.UtcNow;
        var quota = await _context.SalesQuotaAllocations
            .FirstOrDefaultAsync(q => q.RepId == repId && q.Month == now.Month && q.Year == now.Year, ct);

        if (quota != null)
        {
            quota.IndividualTarget = newTarget;
            quota.TotalTarget = newTarget + quota.TeamRollupTarget;
        }
        else
        {
            _context.SalesQuotaAllocations.Add(new SalesQuotaAllocation
            {
                Id = Guid.NewGuid(),
                RepId = repId,
                Month = now.Month,
                Year = now.Year,
                IndividualTarget = newTarget,
                TotalTarget = newTarget
            });
        }

        await _context.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    public async Task<Result<object>> GetHierarchyTreeAsync(int month, int year, CancellationToken ct = default)
    {
        var reps = await _context.InternalSalesReps
            .Include(r => r.QuotaAllocations.Where(q => q.Month == month && q.Year == year))
            .AsNoTracking()
            .ToListAsync(ct);

        var roots = reps.Where(r => r.ReportingToId == null).ToList();

        object BuildNode(InternalSalesRep node)
        {
            var quota = node.QuotaAllocations.FirstOrDefault();
            var subs = reps.Where(r => r.ReportingToId == node.Id).ToList();

            return new
            {
                node.Id,
                node.RepCode,
                node.FullName,
                node.RoleTier,
                RoleTierName = node.RoleTier.ToString(),
                node.City,
                node.Region,
                node.Zone,
                Target = quota?.TotalTarget ?? 0,
                Achieved = quota?.AchievedRevenue ?? 0,
                Gap = Math.Max(0, (quota?.TotalTarget ?? 0) - (quota?.AchievedRevenue ?? 0)),
                AchievedPct = (quota?.TotalTarget > 0) ? Math.Round((quota.AchievedRevenue / quota.TotalTarget) * 100, 1) : 0,
                Subordinates = subs.Select(BuildNode).ToList()
            };
        }

        var tree = roots.Select(BuildNode).ToList();
        return Result<object>.Success(tree);
    }

    // ==========================================
    // 2. HARDWARE DEVICE BINDING & ZERO-TRUST
    // ==========================================

    public async Task<Result<HardwareDeviceDto>> RegisterDeviceAsync(RegisterDeviceRequest req, string ipAddress, CancellationToken ct = default)
    {
        var rep = await _context.InternalSalesReps.FirstOrDefaultAsync(r => r.Mobile == req.Mobile.Trim(), ct);
        if (rep == null) return Result<HardwareDeviceDto>.Failure("No sales representative found with this mobile number.");

        var fingerprint = req.DeviceFingerprint.Trim();
        var existingDevice = await _context.HardwareDeviceRegistries
            .Include(d => d.Rep)
            .FirstOrDefaultAsync(d => d.DeviceFingerprint == fingerprint, ct);

        if (existingDevice != null)
        {
            // If already bound to another rep -> HARD BLOCK
            if (existingDevice.RepId != Guid.Empty && existingDevice.RepId != rep.Id)
            {
                existingDevice.FailedTamperAttempts++;
                await _context.SaveChangesAsync(ct);
                return Result<HardwareDeviceDto>.Failure("This phone is permanently locked to another sales representative. Contact Super Admin.");
            }

            // Update metadata
            existingDevice.LastKnownIp = ipAddress;
            existingDevice.AppVersion = req.AppVersion;
            existingDevice.OsVersion = req.OsVersion;
            await _context.SaveChangesAsync(ct);

            return Result<HardwareDeviceDto>.Success(MapDeviceDto(existingDevice));
        }

        // Check if rep already has an active bound device
        var repHasActiveBound = await _context.HardwareDeviceRegistries
            .AnyAsync(d => d.RepId == rep.Id && d.Status == DeviceBindingStatus.ActiveBound, ct);

        // If FIRST TIME (no prior active device), automatically approve!
        var newDevice = new HardwareDeviceRegistry
        {
            Id = Guid.NewGuid(),
            RepId = rep.Id,
            DeviceFingerprint = fingerprint,
            DeviceModel = req.DeviceModel,
            DeviceBrand = req.DeviceBrand,
            OsVersion = req.OsVersion,
            AppVersion = req.AppVersion,
            Status = !repHasActiveBound ? DeviceBindingStatus.ActiveBound : DeviceBindingStatus.PendingApproval,
            ApprovedAtUtc = !repHasActiveBound ? DateTimeOffset.UtcNow : null,
            LastKnownIp = ipAddress,
            InstallationToken = Guid.NewGuid().ToString("N")
        };
        _context.HardwareDeviceRegistries.Add(newDevice);
        await _context.SaveChangesAsync(ct);

        return Result<HardwareDeviceDto>.Success(new HardwareDeviceDto(
            newDevice.Id,
            rep.Id,
            rep.RepCode,
            rep.FullName,
            rep.City,
            newDevice.DeviceFingerprint,
            newDevice.DeviceModel,
            newDevice.DeviceBrand,
            newDevice.OsVersion,
            newDevice.AppVersion,
            newDevice.Status,
            newDevice.Status.ToString(),
            null,
            newDevice.ApprovedAtUtc,
            null,
            ipAddress,
            0,
            newDevice.CreatedAtUtc
        ));
    }

    public async Task<Result<IReadOnlyList<HardwareDeviceDto>>> GetPendingDevicesAsync(CancellationToken ct = default)
    {
        var devices = await _context.HardwareDeviceRegistries
            .Include(d => d.Rep)
            .Where(d => d.Status == DeviceBindingStatus.PendingApproval)
            .OrderByDescending(d => d.CreatedAtUtc)
            .Select(d => MapDeviceDto(d))
            .ToListAsync(ct);

        return Result<IReadOnlyList<HardwareDeviceDto>>.Success(devices);
    }

    public async Task<Result<HardwareDeviceDto>> ApproveDeviceAsync(Guid deviceId, ApproveDeviceRequest req, Guid superAdminUserId, CancellationToken ct = default)
    {
        var device = await _context.HardwareDeviceRegistries
            .Include(d => d.Rep)
            .FirstOrDefaultAsync(d => d.Id == deviceId, ct);

        if (device == null) return Result<HardwareDeviceDto>.Failure("Device record not found.");

        if (req.AssignToRepId.HasValue && req.AssignToRepId.Value != Guid.Empty)
        {
            device.RepId = req.AssignToRepId.Value;
        }

        device.Status = DeviceBindingStatus.ActiveBound;
        device.ApprovedByUserId = superAdminUserId;
        device.ApprovedAtUtc = DateTimeOffset.UtcNow;
        device.FailedTamperAttempts = 0;

        await _context.SaveChangesAsync(ct);
        return Result<HardwareDeviceDto>.Success(MapDeviceDto(device));
    }

    public async Task<Result<bool>> RevokeDeviceAsync(Guid deviceId, Guid superAdminUserId, CancellationToken ct = default)
    {
        var device = await _context.HardwareDeviceRegistries.FirstOrDefaultAsync(d => d.Id == deviceId, ct);
        if (device == null) return Result<bool>.Failure("Device record not found.");

        device.Status = DeviceBindingStatus.Revoked;
        await _context.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    public async Task<Result<bool>> ValidateDeviceAccessAsync(string deviceFingerprint, Guid userId, CancellationToken ct = default)
    {
        var device = await _context.HardwareDeviceRegistries
            .Include(d => d.Rep)
            .FirstOrDefaultAsync(d => d.DeviceFingerprint == deviceFingerprint.Trim(), ct);

        if (device == null) return Result<bool>.Failure("Unregistered hardware device.");
        if (device.Status != DeviceBindingStatus.ActiveBound) return Result<bool>.Failure($"Device is {device.Status}. Super Admin approval required.");
        if (device.Rep.UserId != userId) return Result<bool>.Failure("Hardware device is locked to another user.");

        device.LastLoginAtUtc = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    public async Task<Result<RepLoginResponseDto>> LoginRepAsync(RepLoginRequest req, CancellationToken ct = default)
    {
        var mobile = req.MobileNumber.Trim();
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.PhoneNumber == mobile || u.Email == mobile, ct);

        if (user == null)
            return Result<RepLoginResponseDto>.Failure("Invalid mobile number or credentials.");

        if (!_passwordHasher.VerifyPassword(req.Password, user.PasswordHash, user.PasswordSalt))
            return Result<RepLoginResponseDto>.Failure("Invalid password.");

        var rep = await _context.InternalSalesReps
            .FirstOrDefaultAsync(r => r.UserId == user.Id && r.IsActive, ct);

        if (rep == null)
            return Result<RepLoginResponseDto>.Failure("No active sales representative account associated with this user.");

        // Check if this rep already has an active bound device
        var repActiveBoundDevice = await _context.HardwareDeviceRegistries
            .FirstOrDefaultAsync(d => d.RepId == rep.Id && d.Status == DeviceBindingStatus.ActiveBound, ct);

        var currentDevice = await _context.HardwareDeviceRegistries
            .FirstOrDefaultAsync(d => d.DeviceFingerprint == req.DeviceFingerprint.Trim(), ct);

        if (currentDevice != null && currentDevice.Status == DeviceBindingStatus.Revoked)
        {
            return Result<RepLoginResponseDto>.Failure("Access from this mobile device has been revoked by Super Admin.");
        }

        // If the hardware device is already bound to ANOTHER rep -> HARD BLOCK
        if (currentDevice != null && currentDevice.RepId != Guid.Empty && currentDevice.RepId != rep.Id && currentDevice.Status == DeviceBindingStatus.ActiveBound)
        {
            return Result<RepLoginResponseDto>.Failure("⚠️ Security Lock: This mobile phone is already registered to another sales executive. Multiple accounts on a single phone are prohibited.");
        }

        if (repActiveBoundDevice == null)
        {
            // FIRST TIME LOGIN FOR THIS REP: NO APPROVAL REQUIRED!
            // First time jis device me login karega wo IMEI/fingerprint auto-bound ho jayega!
            if (currentDevice == null)
            {
                currentDevice = new HardwareDeviceRegistry
                {
                    Id = Guid.NewGuid(),
                    RepId = rep.Id,
                    DeviceFingerprint = req.DeviceFingerprint.Trim(),
                    DeviceModel = req.DeviceModel ?? "Field Handset",
                    DeviceBrand = req.DeviceBrand ?? "Android",
                    OsVersion = req.OsVersion ?? "Android",
                    AppVersion = req.AppVersion ?? "v2.1",
                    Status = DeviceBindingStatus.ActiveBound,
                    ApprovedAtUtc = DateTimeOffset.UtcNow,
                    LastLoginAtUtc = DateTimeOffset.UtcNow,
                    InstallationToken = Guid.NewGuid().ToString("N")
                };
                _context.HardwareDeviceRegistries.Add(currentDevice);
            }
            else
            {
                currentDevice.RepId = rep.Id;
                currentDevice.Status = DeviceBindingStatus.ActiveBound;
                currentDevice.ApprovedAtUtc = DateTimeOffset.UtcNow;
                currentDevice.LastLoginAtUtc = DateTimeOffset.UtcNow;
                if (!string.IsNullOrWhiteSpace(req.DeviceModel)) currentDevice.DeviceModel = req.DeviceModel;
                if (!string.IsNullOrWhiteSpace(req.DeviceBrand)) currentDevice.DeviceBrand = req.DeviceBrand;
                if (!string.IsNullOrWhiteSpace(req.OsVersion)) currentDevice.OsVersion = req.OsVersion;
                if (!string.IsNullOrWhiteSpace(req.AppVersion)) currentDevice.AppVersion = req.AppVersion;
            }
        }
        else
        {
            // Rep ALREADY has an active bound device
            if (currentDevice == null || currentDevice.Id != repActiveBoundDevice.Id)
            {
                // This rep is attempting to log into a NEW / SECOND / DIFFERENT phone!
                // Subsequent login requires Super Admin approval!
                if (currentDevice == null)
                {
                    currentDevice = new HardwareDeviceRegistry
                    {
                        Id = Guid.NewGuid(),
                        RepId = rep.Id,
                        DeviceFingerprint = req.DeviceFingerprint.Trim(),
                        DeviceModel = req.DeviceModel ?? "New Handset",
                        DeviceBrand = req.DeviceBrand ?? "Android",
                        OsVersion = req.OsVersion ?? "Android",
                        AppVersion = req.AppVersion ?? "v2.1",
                        Status = DeviceBindingStatus.PendingApproval,
                        InstallationToken = Guid.NewGuid().ToString("N")
                    };
                    _context.HardwareDeviceRegistries.Add(currentDevice);
                    await _context.SaveChangesAsync(ct);
                }
                return Result<RepLoginResponseDto>.Failure($"⚠️ Security Lock: Aapka account pehle se doosre mobile ({(repActiveBoundDevice.DeviceModel ?? "Bound Device")}) me active hai. Naye mobile me login karne ke liye Super Admin approval chahiye.");
            }

            if (currentDevice.Status == DeviceBindingStatus.PendingApproval)
            {
                return Result<RepLoginResponseDto>.Failure("Device is pending Super Admin approval. Please contact management.");
            }

            currentDevice.LastLoginAtUtc = DateTimeOffset.UtcNow;
        }

        await _context.SaveChangesAsync(ct);

        var token = _jwtTokenGenerator.GenerateAccessToken(user, new[] { "SalesRep" }, Array.Empty<string>(), null, null);

        return Result<RepLoginResponseDto>.Success(new RepLoginResponseDto(
            token,
            rep.Id,
            rep.RepCode,
            rep.FullName,
            rep.City,
            rep.RoleTier
        ));
    }

    private static HardwareDeviceDto MapDeviceDto(HardwareDeviceRegistry d) =>
        new(
            d.Id,
            d.RepId,
            d.Rep?.RepCode ?? "N/A",
            d.Rep?.FullName ?? "N/A",
            d.Rep?.City ?? "N/A",
            d.DeviceFingerprint,
            d.DeviceModel,
            d.DeviceBrand,
            d.OsVersion,
            d.AppVersion,
            d.Status,
            d.Status.ToString(),
            d.ApprovedByUserId,
            d.ApprovedAtUtc,
            d.LastLoginAtUtc,
            d.LastKnownIp,
            d.FailedTamperAttempts,
            d.CreatedAtUtc
        );

    // ==========================================
    // 3. PRODUCT CATALOG
    // ==========================================

    public async Task<Result<IReadOnlyList<CompanyProductCatalogDto>>> GetProductCatalogAsync(bool activeOnly = true, CancellationToken ct = default)
    {
        var query = _context.CompanyProductCatalogs.AsNoTracking();
        if (activeOnly) query = query.Where(p => p.IsActive);

        var list = await query
            .OrderBy(p => p.DisplayOrder)
            .ThenBy(p => p.Name)
            .Select(p => new CompanyProductCatalogDto(
                p.Id,
                p.ProductCode,
                p.Name,
                p.Category,
                p.PricingModel,
                p.PricingModel.ToString(),
                p.BasePrice,
                p.MinPrice,
                p.MaxPrice,
                p.DefaultRepIncentivePct,
                p.IsActive,
                p.DisplayOrder
            ))
            .ToListAsync(ct);

        return Result<IReadOnlyList<CompanyProductCatalogDto>>.Success(list);
    }

    public async Task<Result<CompanyProductCatalogDto>> CreateProductAsync(CreateCompanyProductRequest req, CancellationToken ct = default)
    {
        var code = req.ProductCode.Trim().ToUpper();
        if (await _context.CompanyProductCatalogs.AnyAsync(p => p.ProductCode == code, ct))
            return Result<CompanyProductCatalogDto>.Failure("Product with this code already exists.");

        var prod = new CompanyProductCatalog
        {
            Id = Guid.NewGuid(),
            ProductCode = code,
            Name = req.Name.Trim(),
            Category = req.Category.Trim(),
            PricingModel = req.PricingModel,
            BasePrice = req.BasePrice,
            MinPrice = req.MinPrice,
            MaxPrice = req.MaxPrice,
            DefaultRepIncentivePct = req.DefaultRepIncentivePct,
            DisplayOrder = req.DisplayOrder,
            IsActive = true
        };
        _context.CompanyProductCatalogs.Add(prod);
        await _context.SaveChangesAsync(ct);

        return Result<CompanyProductCatalogDto>.Success(new CompanyProductCatalogDto(
            prod.Id,
            prod.ProductCode,
            prod.Name,
            prod.Category,
            prod.PricingModel,
            prod.PricingModel.ToString(),
            prod.BasePrice,
            prod.MinPrice,
            prod.MaxPrice,
            prod.DefaultRepIncentivePct,
            prod.IsActive,
            prod.DisplayOrder
        ));
    }

    public async Task<Result<CompanyProductCatalogDto>> UpdateProductAsync(Guid id, UpdateCompanyProductRequest req, CancellationToken ct = default)
    {
        var prod = await _context.CompanyProductCatalogs.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (prod == null) return Result<CompanyProductCatalogDto>.Failure("Product not found.");

        prod.Name = req.Name.Trim();
        prod.Category = req.Category.Trim();
        prod.PricingModel = req.PricingModel;
        prod.BasePrice = req.BasePrice;
        prod.MinPrice = req.MinPrice;
        prod.MaxPrice = req.MaxPrice;
        prod.DefaultRepIncentivePct = req.DefaultRepIncentivePct;
        prod.IsActive = req.IsActive;
        prod.DisplayOrder = req.DisplayOrder;

        await _context.SaveChangesAsync(ct);
        return Result<CompanyProductCatalogDto>.Success(new CompanyProductCatalogDto(
            prod.Id,
            prod.ProductCode,
            prod.Name,
            prod.Category,
            prod.PricingModel,
            prod.PricingModel.ToString(),
            prod.BasePrice,
            prod.MinPrice,
            prod.MaxPrice,
            prod.DefaultRepIncentivePct,
            prod.IsActive,
            prod.DisplayOrder
        ));
    }

    public async Task<Result<bool>> DeleteProductAsync(Guid id, CancellationToken ct = default)
    {
        var prod = await _context.CompanyProductCatalogs.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (prod == null) return Result<bool>.Failure("Product not found.");

        var hasVisits = await _context.FieldShopVisitProducts.AnyAsync(vp => vp.ProductId == id, ct);
        if (hasVisits)
        {
            prod.IsActive = false;
            prod.IsDeleted = true;
            prod.DeletedAtUtc = DateTimeOffset.UtcNow;
        }
        else
        {
            _context.CompanyProductCatalogs.Remove(prod);
        }

        await _context.SaveChangesAsync(ct);
        return Result<bool>.Success(true);
    }

    // ==========================================
    // 4. QUOTAS & REP COCKPIT
    // ==========================================

    public async Task<Result<IReadOnlyList<SalesQuotaDto>>> GetQuotasAsync(int month, int year, string? city = null, CancellationToken ct = default)
    {
        var query = _context.SalesQuotaAllocations
            .Include(q => q.Rep)
            .Where(q => q.Month == month && q.Year == year)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(q => q.Rep.City.ToLower() == city.Trim().ToLower());

        var list = await query
            .OrderByDescending(q => q.AchievedRevenue)
            .Select(q => new SalesQuotaDto(
                q.Id,
                q.RepId,
                q.Rep.FullName,
                q.Rep.RepCode,
                q.Rep.City,
                q.Month,
                q.Year,
                q.IndividualTarget,
                q.TeamRollupTarget,
                q.TotalTarget,
                q.AchievedRevenue,
                q.AchievedBillingRev,
                q.AchievedEcommerceRev,
                q.AchievedCustomProjectRev,
                Math.Max(0, q.TotalTarget - q.AchievedRevenue),
                q.TotalTarget > 0 ? Math.Round((q.AchievedRevenue / q.TotalTarget) * 100, 1) : 0,
                q.NewSalesCount,
                q.RenewalsDueCount,
                q.RenewalsClosedCount,
                q.RenewalsDueCount > 0 ? Math.Round(((decimal)q.RenewalsClosedCount / q.RenewalsDueCount) * 100, 1) : 0,
                q.IsLocked
            ))
            .ToListAsync(ct);

        return Result<IReadOnlyList<SalesQuotaDto>>.Success(list);
    }

    public async Task<Result<SalesQuotaDto>> AllocateQuotaAsync(AllocateQuotaRequest req, CancellationToken ct = default)
    {
        var quota = await _context.SalesQuotaAllocations
            .Include(q => q.Rep)
            .FirstOrDefaultAsync(q => q.RepId == req.RepId && q.Month == req.Month && q.Year == req.Year, ct);

        if (quota == null)
        {
            quota = new SalesQuotaAllocation
            {
                Id = Guid.NewGuid(),
                RepId = req.RepId,
                Month = req.Month,
                Year = req.Year,
                IndividualTarget = req.IndividualTarget,
                TeamRollupTarget = req.TeamRollupTarget,
                TotalTarget = req.IndividualTarget + req.TeamRollupTarget
            };
            _context.SalesQuotaAllocations.Add(quota);
        }
        else
        {
            quota.IndividualTarget = req.IndividualTarget;
            quota.TeamRollupTarget = req.TeamRollupTarget;
            quota.TotalTarget = req.IndividualTarget + req.TeamRollupTarget;
        }

        await _context.SaveChangesAsync(ct);
        var res = await GetQuotasAsync(req.Month, req.Year, ct: ct);
        var item = res.Data?.FirstOrDefault(q => q.Id == quota.Id);
        if (item == null) return Result<SalesQuotaDto>.Failure("Failed to retrieve updated quota.");
        return Result<SalesQuotaDto>.Success(item);
    }

    public async Task<Result<RepCockpitSummaryDto>> GetRepCockpitAsync(Guid repUserId, CancellationToken ct = default)
    {
        var rep = await _context.InternalSalesReps
            .Include(r => r.QuotaAllocations)
            .FirstOrDefaultAsync(r => r.UserId == repUserId, ct);

        if (rep == null) return Result<RepCockpitSummaryDto>.Failure("Sales Representative not found.");

        var now = DateTime.UtcNow;
        var daysInMonth = DateTime.DaysInMonth(now.Year, now.Month);
        var daysLeft = Math.Max(1, daysInMonth - now.Day);

        var quota = rep.QuotaAllocations.FirstOrDefault(q => q.Month == now.Month && q.Year == now.Year)
                    ?? new SalesQuotaAllocation { TotalTarget = 200000.00m, IndividualTarget = 200000.00m };

        var gap = Math.Max(0, quota.TotalTarget - quota.AchievedRevenue);
        var runRate = daysLeft > 0 ? Math.Round(gap / daysLeft, 2) : 0;
        var achievedPct = quota.TotalTarget > 0 ? Math.Round((quota.AchievedRevenue / quota.TotalTarget) * 100, 1) : 0;

        // Estimated commission (5% base on closed revenue)
        var commission = Math.Round(quota.AchievedRevenue * 0.05m, 2);

        // Today's visits stats
        var todayStart = DateTime.UtcNow.Date;
        var todayVisits = await _context.FieldShopVisits
            .Where(v => v.RepId == rep.Id && v.CreatedAtUtc >= todayStart)
            .ToListAsync(ct);

        var plannedToday = 15; // Standard 15 visits beat quota
        var doneToday = todayVisits.Count;
        var demosToday = todayVisits.Count(v => v.VisitOutcome == VisitOutcome.Pitched || v.VisitOutcome == VisitOutcome.WarmFollowup);
        var trialsToday = todayVisits.Count(v => v.VisitOutcome == VisitOutcome.TrialActivated);

        // Next 30 days renewals due for this rep
        var next30Days = DateTimeOffset.UtcNow.AddDays(30);
        var renewalsDueCount = await _context.TenantSubscriptions
            .CountAsync(s => s.EndsAtUtc <= next30Days && s.Status == Domain.Enums.SubscriptionStatus.Active, ct);

        return Result<RepCockpitSummaryDto>.Success(new RepCockpitSummaryDto(
            rep.Id,
            rep.RepCode,
            rep.FullName,
            rep.City,
            rep.RoleTier,
            now.Month,
            now.Year,
            daysLeft,
            quota.TotalTarget,
            quota.AchievedRevenue,
            gap,
            achievedPct,
            runRate,
            commission,
            plannedToday,
            doneToday,
            demosToday,
            trialsToday,
            renewalsDueCount,
            renewalsDueCount * 4999.00m
        ));
    }

    // ==========================================
    // 5. FIELD SHOP VISITS
    // ==========================================

    public async Task<Result<FieldShopVisitDto>> PunchVisitAsync(Guid repUserId, PunchVisitRequest req, CancellationToken ct = default)
    {
        var rep = await _context.InternalSalesReps.FirstOrDefaultAsync(r => r.UserId == repUserId, ct);
        if (rep == null) return Result<FieldShopVisitDto>.Failure("Sales representative not found.");

        // Anti-Fraud Safeguards
        if (req.IsMockGpsDetected)
        {
            _logger.LogWarning("MOCK GPS DETECTED for Rep {RepCode} at Shop {Shop}", rep.RepCode, req.ShopName);
        }
        if (req.IsVpnDetected)
        {
            _logger.LogWarning("VPN DETECTED for Rep {RepCode} at Shop {Shop}", rep.RepCode, req.ShopName);
        }

        var visit = new FieldShopVisit
        {
            Id = Guid.NewGuid(),
            RepId = rep.Id,
            ShopName = req.ShopName.Trim(),
            OwnerName = req.OwnerName.Trim(),
            OwnerMobile = req.OwnerMobile.Trim(),
            ShopCategory = req.ShopCategory.Trim(),
            CurrentSoftware = req.CurrentSoftware?.Trim(),
            Address = req.Address.Trim(),
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            IsMockGpsDetected = req.IsMockGpsDetected,
            IsVpnDetected = req.IsVpnDetected,
            VisitOutcome = req.VisitOutcome,
            TotalQuotedAmount = req.TotalQuotedAmount,
            NextFollowupAt = req.NextFollowupAt,
            Notes = req.Notes?.Trim(),
            IsCustomProjectLead = req.IsCustomProjectLead,
            ProjectScopeSummary = req.ProjectScopeSummary?.Trim(),
            StorefrontImageUrl = req.StorefrontImageUrl?.Trim()
        };
        _context.FieldShopVisits.Add(visit);

        if (req.Products != null && req.Products.Count > 0)
        {
            foreach (var p in req.Products)
            {
                var vp = new FieldShopVisitProduct
                {
                    Id = Guid.NewGuid(),
                    VisitId = visit.Id,
                    ProductId = p.ProductId,
                    QuotedPrice = p.QuotedPrice,
                    DealStatus = p.DealStatus,
                    ClientInterestLevel = p.ClientInterestLevel
                };
                _context.FieldShopVisitProducts.Add(vp);
            }
        }

        await _context.SaveChangesAsync(ct);
        return await GetVisitByIdAsync(visit.Id, ct);
    }

    public async Task<Result<PagedResult<FieldShopVisitDto>>> GetVisitsAsync(
        Guid? repId = null,
        string? city = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken ct = default)
    {
        var query = _context.FieldShopVisits
            .Include(v => v.Rep)
            .Include(v => v.ProductsPitched).ThenInclude(p => p.Product)
            .AsNoTracking();

        if (repId.HasValue && repId.Value != Guid.Empty) query = query.Where(v => v.RepId == repId.Value);
        if (!string.IsNullOrWhiteSpace(city)) query = query.Where(v => v.Rep.City.ToLower() == city.Trim().ToLower());
        if (fromDate.HasValue) query = query.Where(v => v.CreatedAtUtc >= fromDate.Value.ToUniversalTime());
        if (toDate.HasValue) query = query.Where(v => v.CreatedAtUtc <= toDate.Value.ToUniversalTime());

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(v => v.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(v => MapVisitDto(v))
            .ToListAsync(ct);

        return Result<PagedResult<FieldShopVisitDto>>.Success(new PagedResult<FieldShopVisitDto>(
            items,
            pageNumber,
            pageSize,
            total
        ));
    }

    private async Task<Result<FieldShopVisitDto>> GetVisitByIdAsync(Guid visitId, CancellationToken ct)
    {
        var v = await _context.FieldShopVisits
            .Include(x => x.Rep)
            .Include(x => x.ProductsPitched).ThenInclude(p => p.Product)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == visitId, ct);

        if (v == null) return Result<FieldShopVisitDto>.Failure("Visit not found.");
        return Result<FieldShopVisitDto>.Success(MapVisitDto(v));
    }

    private static FieldShopVisitDto MapVisitDto(FieldShopVisit v) =>
        new(
            v.Id,
            v.RepId,
            v.Rep?.FullName ?? "N/A",
            v.ShopName,
            v.OwnerName,
            v.OwnerMobile,
            v.ShopCategory,
            v.CurrentSoftware,
            v.Address,
            v.Latitude,
            v.Longitude,
            v.IsMockGpsDetected,
            v.IsVpnDetected,
            v.VisitOutcome,
            v.VisitOutcome.ToString(),
            v.TotalQuotedAmount,
            v.NextFollowupAt,
            v.Notes,
            v.IsCustomProjectLead,
            v.ProjectScopeSummary,
            v.StorefrontImageUrl,
            v.CreatedAtUtc,
            v.ProductsPitched.Select(p => new FieldShopVisitProductDto(
                p.Id,
                p.ProductId,
                p.Product?.ProductCode ?? "N/A",
                p.Product?.Name ?? "N/A",
                p.Product?.Category ?? "N/A",
                p.QuotedPrice,
                p.DealStatus,
                p.ClientInterestLevel
            )).ToList()
        );

    // ==========================================
    // 6. ATTRIBUTION & DISPUTE RESOLVER
    // ==========================================

    public async Task<Result<SubscriptionAttributionLogDto>> AssignSubscriptionToRepAsync(
        Guid subscriptionId,
        Guid tenantId,
        AssignSubscriptionToRepRequest req,
        Guid superAdminUserId,
        CancellationToken ct = default)
    {
        var rep = await _context.InternalSalesReps.FirstOrDefaultAsync(r => r.Id == req.AssignedRepId, ct);
        if (rep == null) return Result<SubscriptionAttributionLogDto>.Failure("Target sales representative not found.");

        var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == superAdminUserId, ct);
        var adminName = !string.IsNullOrWhiteSpace(adminUser?.FullName) ? adminUser.FullName : "Super Admin";

        var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.Id == tenantId, ct);
        var tenantName = tenant?.BusinessName ?? "Tenant Account";

        var now = DateTime.UtcNow;

        // 1. Log Dispute Override to Audit Trail
        var log = new SubscriptionAttributionAuditLog
        {
            Id = Guid.NewGuid(),
            SubscriptionId = subscriptionId,
            TenantId = tenantId,
            AssignedRepId = rep.Id,
            AssignedByUserId = superAdminUserId,
            AttributionMethod = "SUPERADMIN_MANUAL_OVERRIDE",
            ProofDocumentNotes = req.ReasonNotes.Trim(),
            RevenueAmount = req.RevenueAmount,
            IsRenewal = req.IsRenewal
        };
        _context.SubscriptionAttributionAuditLogs.Add(log);

        // 2. Atomically Credit Quota Allocation of the Sales Rep
        var quota = await _context.SalesQuotaAllocations
            .FirstOrDefaultAsync(q => q.RepId == rep.Id && q.Month == now.Month && q.Year == now.Year, ct);

        if (quota == null)
        {
            quota = new SalesQuotaAllocation
            {
                Id = Guid.NewGuid(),
                RepId = rep.Id,
                Month = now.Month,
                Year = now.Year,
                IndividualTarget = 200000.00m,
                TotalTarget = 200000.00m
            };
            _context.SalesQuotaAllocations.Add(quota);
        }

        quota.AchievedRevenue += req.RevenueAmount;
        quota.AchievedBillingRev += req.RevenueAmount;
        if (req.IsRenewal) quota.RenewalsClosedCount++;
        else quota.NewSalesCount++;

        // 3. Atomically Rollup to Manager (ASM) if exists
        if (rep.ReportingToId.HasValue)
        {
            var managerQuota = await _context.SalesQuotaAllocations
                .FirstOrDefaultAsync(q => q.RepId == rep.ReportingToId.Value && q.Month == now.Month && q.Year == now.Year, ct);

            if (managerQuota != null)
            {
                managerQuota.AchievedRevenue += req.RevenueAmount;
                managerQuota.AchievedBillingRev += req.RevenueAmount;
            }
        }

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Super Admin {Admin} assigned subscription {SubId} (₹{Amount}) to Rep {RepCode}",
            adminName, subscriptionId, req.RevenueAmount, rep.RepCode);

        return Result<SubscriptionAttributionLogDto>.Success(new SubscriptionAttributionLogDto(
            log.Id,
            log.SubscriptionId,
            log.TenantId,
            tenantName,
            rep.Id,
            rep.RepCode,
            rep.FullName,
            rep.City,
            superAdminUserId,
            adminName,
            log.AttributionMethod,
            log.ProofDocumentNotes,
            log.RevenueAmount,
            log.IsRenewal,
            log.CreatedAtUtc
        ));
    }

    public async Task<Result<PagedResult<SubscriptionAttributionLogDto>>> GetAttributionAuditLogsAsync(
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken ct = default)
    {
        var query = _context.SubscriptionAttributionAuditLogs
            .Include(a => a.AssignedRep)
            .AsNoTracking();

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(a => a.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new SubscriptionAttributionLogDto(
                a.Id,
                a.SubscriptionId,
                a.TenantId,
                "Tenant Account",
                a.AssignedRepId,
                a.AssignedRep.RepCode,
                a.AssignedRep.FullName,
                a.AssignedRep.City,
                a.AssignedByUserId,
                "Super Admin",
                a.AttributionMethod,
                a.ProofDocumentNotes,
                a.RevenueAmount,
                a.IsRenewal,
                a.CreatedAtUtc
            ))
            .ToListAsync(ct);

        return Result<PagedResult<SubscriptionAttributionLogDto>>.Success(new PagedResult<SubscriptionAttributionLogDto>(
            items,
            pageNumber,
            pageSize,
            total
        ));
    }

    // ==========================================
    // 7. REVIEW EXCEL/CSV EXPORT
    // ==========================================

    public async Task<Result<byte[]>> ExportWeeklyReviewExcelCsvAsync(string? city, int month, int year, CancellationToken ct = default)
    {
        var quotasRes = await GetQuotasAsync(month, year, city, ct);
        var quotas = quotasRes.Data ?? Array.Empty<SalesQuotaDto>();

        var sb = new StringBuilder();
        sb.AppendLine("City,Rep_Code,Rep_Name,Monthly_Target,Total_Closed_Rev,New_Sales_Count,New_Sales_Rev,Renewals_Due,Renewed_Count,Renewal_Rev,Renewal_Rate_Pct,Gap_Amount,Achieved_Pct,Run_Rate_Status");

        foreach (var q in quotas)
        {
            var status = q.AchievedPct >= 80 ? "On Track" : q.AchievedPct >= 50 ? "Borderline" : "Lagging / Critical";
            var renewalRev = q.RenewalsClosedCount * 4999.00m;
            var newRev = Math.Max(0, q.AchievedRevenue - renewalRev);

            sb.AppendLine($"\"{q.City}\",\"{q.RepCode}\",\"{q.RepName}\",{q.TotalTarget},{q.AchievedRevenue},{q.NewSalesCount},{newRev},{q.RenewalsDueCount},{q.RenewalsClosedCount},{renewalRev},{q.RenewalRatePct}%,{q.GapAmount},{q.AchievedPct}%,\"{status}\"");
        }

        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return Result<byte[]>.Success(bytes);
    }
}
