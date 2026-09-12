using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Catalog;
using UdyogBill.Domain.Entities.Identity;
using UdyogBill.Domain.Entities.Subscriptions;
using UdyogBill.Domain.Entities.Tenants;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class TenantHierarchyService : ITenantHierarchyService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditService _auditService;

    public TenantHierarchyService(
        AppDbContext context,
        ITenantContext tenantContext,
        ICurrentUserContext currentUserContext,
        IPasswordHasher passwordHasher,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserContext = currentUserContext;
        _passwordHasher = passwordHasher;
        _auditService = auditService;
    }

    private Guid RequireTenantId()
    {
        var tenantId = _tenantContext.TenantId != Guid.Empty
            ? _tenantContext.TenantId
            : _currentUserContext.TenantId ?? Guid.Empty;

        if (tenantId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Active tenant context is required for this operation.");
        }

        return tenantId;
    }

    private async Task<Plan> GetActivePlanAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var activeSub = await _context.TenantSubscriptions
            .Include(s => s.Plan)
            .Where(s => s.TenantId == tenantId && !s.IsDeleted)
            .OrderByDescending(s => s.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (activeSub?.Plan != null)
        {
            return activeSub.Plan;
        }

        var defaultPlan = await _context.Plans
            .FirstOrDefaultAsync(p => p.Code == "STARTER" && !p.IsDeleted, cancellationToken);

        return defaultPlan ?? new Plan
        {
            Name = "Starter",
            MaxUsers = 3,
            MaxBranches = 1,
            MaxWarehouses = 2,
            MaxInvoicesPerMonth = 500
        };
    }

    #region Branch Management

    public async Task<Result<IReadOnlyList<BranchDetailsDto>>> GetBranchesAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var branches = await _context.TenantBranches
            .Where(b => b.TenantId == tenantId && !b.IsDeleted)
            .Include(b => b.Warehouses.Where(w => !w.IsDeleted))
            .OrderBy(b => b.BranchCode)
            .ToListAsync(cancellationToken);

        var dtos = branches.Select(b => new BranchDetailsDto(
            b.Id,
            b.TenantId,
            b.BranchCode,
            b.BranchName,
            b.GSTIN,
            b.AddressLine1,
            b.AddressLine2,
            b.City,
            b.State,
            b.StateCode,
            b.Pincode,
            b.Phone,
            b.Email,
            b.IsHeadOffice,
            b.IsActive,
            b.CreatedAtUtc,
            b.Warehouses.Select(w => new WarehouseDetailsDto(
                w.Id,
                w.TenantId,
                w.BranchId,
                b.BranchName,
                w.WarehouseCode,
                w.WarehouseName,
                w.Location,
                w.IsDefault,
                w.IsActive,
                w.CreatedAtUtc
            )).ToList()
        )).ToList();

        return Result<IReadOnlyList<BranchDetailsDto>>.Success(dtos);
    }

    public async Task<Result<BranchDetailsDto>> GetBranchByIdAsync(Guid branchId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var b = await _context.TenantBranches
            .Where(b => b.TenantId == tenantId && b.Id == branchId && !b.IsDeleted)
            .Include(b => b.Warehouses.Where(w => !w.IsDeleted))
            .FirstOrDefaultAsync(cancellationToken);

        if (b == null)
        {
            return Result<BranchDetailsDto>.Failure("Branch not found.", "NOT_FOUND");
        }

        var dto = new BranchDetailsDto(
            b.Id,
            b.TenantId,
            b.BranchCode,
            b.BranchName,
            b.GSTIN,
            b.AddressLine1,
            b.AddressLine2,
            b.City,
            b.State,
            b.StateCode,
            b.Pincode,
            b.Phone,
            b.Email,
            b.IsHeadOffice,
            b.IsActive,
            b.CreatedAtUtc,
            b.Warehouses.Select(w => new WarehouseDetailsDto(
                w.Id,
                w.TenantId,
                w.BranchId,
                b.BranchName,
                w.WarehouseCode,
                w.WarehouseName,
                w.Location,
                w.IsDefault,
                w.IsActive,
                w.CreatedAtUtc
            )).ToList()
        );

        return Result<BranchDetailsDto>.Success(dto);
    }

    public async Task<Result<Guid>> CreateBranchAsync(CreateBranchRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var plan = await GetActivePlanAsync(tenantId, cancellationToken);

        // Quota Check
        var currentCount = await _context.TenantBranches
            .CountAsync(b => b.TenantId == tenantId && !b.IsDeleted, cancellationToken);

        if (currentCount >= plan.MaxBranches)
        {
            return Result<Guid>.Failure(
                $"Branch limit ({plan.MaxBranches}) reached for current plan '{plan.Name}'. Please upgrade your subscription.",
                "QUOTA_EXCEEDED"
            );
        }

        var normalizedCode = request.BranchCode.Trim().ToUpperInvariant();
        var exists = await _context.TenantBranches
            .AnyAsync(b => b.TenantId == tenantId && b.BranchCode == normalizedCode && !b.IsDeleted, cancellationToken);

        if (exists)
        {
            return Result<Guid>.Failure($"Branch code '{normalizedCode}' already exists.", "CODE_ALREADY_EXISTS");
        }

        if (request.IsHeadOffice)
        {
            var otherHeadOffices = await _context.TenantBranches
                .Where(b => b.TenantId == tenantId && b.IsHeadOffice && !b.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var ho in otherHeadOffices)
            {
                ho.IsHeadOffice = false;
            }
        }

        var branch = new TenantBranch
        {
            TenantId = tenantId,
            BranchCode = normalizedCode,
            BranchName = request.BranchName.Trim(),
            GSTIN = request.GSTIN?.Trim().ToUpperInvariant(),
            AddressLine1 = request.AddressLine1?.Trim(),
            AddressLine2 = request.AddressLine2?.Trim(),
            City = request.City?.Trim(),
            State = request.State?.Trim(),
            StateCode = request.StateCode?.Trim(),
            Pincode = request.Pincode?.Trim(),
            Phone = request.Phone?.Trim(),
            Email = request.Email?.Trim(),
            IsHeadOffice = request.IsHeadOffice,
            IsActive = true
        };

        var defaultWarehouse = new TenantWarehouse
        {
            TenantId = tenantId,
            WarehouseCode = $"{normalizedCode}-MAIN",
            WarehouseName = $"{request.BranchName.Trim()} Main Warehouse",
            Location = "Primary Stock Floor",
            IsDefault = true,
            IsActive = true
        };
        branch.Warehouses.Add(defaultWarehouse);

        _context.TenantBranches.Add(branch);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateBranch",
            EntityName = "TenantBranch",
            EntityId = branch.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(request),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(branch.Id);
    }

    public async Task<Result> UpdateBranchAsync(Guid branchId, UpdateBranchRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var branch = await _context.TenantBranches
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == branchId && !b.IsDeleted, cancellationToken);

        if (branch == null)
        {
            return Result.Failure("Branch not found.", "NOT_FOUND");
        }

        if (request.IsHeadOffice && !branch.IsHeadOffice)
        {
            var otherHeadOffices = await _context.TenantBranches
                .Where(b => b.TenantId == tenantId && b.IsHeadOffice && b.Id != branchId && !b.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var ho in otherHeadOffices)
            {
                ho.IsHeadOffice = false;
            }
        }

        branch.BranchName = request.BranchName.Trim();
        branch.GSTIN = request.GSTIN?.Trim().ToUpperInvariant();
        branch.AddressLine1 = request.AddressLine1?.Trim();
        branch.AddressLine2 = request.AddressLine2?.Trim();
        branch.City = request.City?.Trim();
        branch.State = request.State?.Trim();
        branch.StateCode = request.StateCode?.Trim();
        branch.Pincode = request.Pincode?.Trim();
        branch.Phone = request.Phone?.Trim();
        branch.Email = request.Email?.Trim();
        branch.IsHeadOffice = request.IsHeadOffice;
        branch.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "UpdateBranch",
            EntityName = "TenantBranch",
            EntityId = branch.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(request),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result> DeleteBranchAsync(Guid branchId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var branch = await _context.TenantBranches
            .Include(b => b.Warehouses)
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == branchId && !b.IsDeleted, cancellationToken);

        if (branch == null)
        {
            return Result.Failure("Branch not found.", "NOT_FOUND");
        }

        if (branch.IsHeadOffice)
        {
            return Result.Failure("Cannot delete the Head Office branch.", "CANNOT_DELETE_HEAD_OFFICE");
        }

        branch.IsDeleted = true;
        branch.DeletedAtUtc = DateTimeOffset.UtcNow;
        branch.DeletedBy = _currentUserContext.UserId;

        foreach (var wh in branch.Warehouses)
        {
            wh.IsDeleted = true;
            wh.DeletedAtUtc = DateTimeOffset.UtcNow;
            wh.DeletedBy = _currentUserContext.UserId;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    #endregion

    #region Warehouse Management

    public async Task<Result<IReadOnlyList<WarehouseDetailsDto>>> GetWarehousesAsync(Guid? branchId = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.TenantWarehouses
            .Where(w => w.TenantId == tenantId && !w.IsDeleted)
            .Include(w => w.Branch);

        if (branchId.HasValue && branchId.Value != Guid.Empty)
        {
            query = query.Where(w => w.BranchId == branchId.Value).Include(w => w.Branch);
        }

        var items = await query
            .OrderBy(w => w.WarehouseCode)
            .Select(w => new WarehouseDetailsDto(
                w.Id,
                w.TenantId,
                w.BranchId,
                w.Branch.BranchName,
                w.WarehouseCode,
                w.WarehouseName,
                w.Location,
                w.IsDefault,
                w.IsActive,
                w.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<WarehouseDetailsDto>>.Success(items);
    }

    public async Task<Result<WarehouseDetailsDto>> GetWarehouseByIdAsync(Guid warehouseId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var w = await _context.TenantWarehouses
            .Where(w => w.TenantId == tenantId && w.Id == warehouseId && !w.IsDeleted)
            .Include(w => w.Branch)
            .FirstOrDefaultAsync(cancellationToken);

        if (w == null)
        {
            return Result<WarehouseDetailsDto>.Failure("Warehouse not found.", "NOT_FOUND");
        }

        var dto = new WarehouseDetailsDto(
            w.Id,
            w.TenantId,
            w.BranchId,
            w.Branch.BranchName,
            w.WarehouseCode,
            w.WarehouseName,
            w.Location,
            w.IsDefault,
            w.IsActive,
            w.CreatedAtUtc
        );

        return Result<WarehouseDetailsDto>.Success(dto);
    }

    public async Task<Result<Guid>> CreateWarehouseAsync(CreateWarehouseRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var plan = await GetActivePlanAsync(tenantId, cancellationToken);

        // Quota Check
        var currentCount = await _context.TenantWarehouses
            .CountAsync(w => w.TenantId == tenantId && !w.IsDeleted, cancellationToken);

        if (currentCount >= plan.MaxWarehouses)
        {
            return Result<Guid>.Failure(
                $"Warehouse limit ({plan.MaxWarehouses}) reached for current plan '{plan.Name}'. Please upgrade your subscription.",
                "QUOTA_EXCEEDED"
            );
        }

        var branch = await _context.TenantBranches
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.Id == request.BranchId && !b.IsDeleted, cancellationToken);

        if (branch == null)
        {
            return Result<Guid>.Failure("Branch not found.", "BRANCH_NOT_FOUND");
        }

        var normalizedCode = request.WarehouseCode.Trim().ToUpperInvariant();
        var exists = await _context.TenantWarehouses
            .AnyAsync(w => w.TenantId == tenantId && w.WarehouseCode == normalizedCode && !w.IsDeleted, cancellationToken);

        if (exists)
        {
            return Result<Guid>.Failure($"Warehouse code '{normalizedCode}' already exists.", "CODE_ALREADY_EXISTS");
        }

        if (request.IsDefault)
        {
            var otherDefaults = await _context.TenantWarehouses
                .Where(w => w.TenantId == tenantId && w.BranchId == request.BranchId && w.IsDefault && !w.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var od in otherDefaults)
            {
                od.IsDefault = false;
            }
        }

        var warehouse = new TenantWarehouse
        {
            TenantId = tenantId,
            BranchId = request.BranchId,
            WarehouseCode = normalizedCode,
            WarehouseName = request.WarehouseName.Trim(),
            Location = request.Location?.Trim(),
            IsDefault = request.IsDefault,
            IsActive = true
        };

        _context.TenantWarehouses.Add(warehouse);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateWarehouse",
            EntityName = "TenantWarehouse",
            EntityId = warehouse.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(request),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(warehouse.Id);
    }

    public async Task<Result> UpdateWarehouseAsync(Guid warehouseId, UpdateWarehouseRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var warehouse = await _context.TenantWarehouses
            .FirstOrDefaultAsync(w => w.TenantId == tenantId && w.Id == warehouseId && !w.IsDeleted, cancellationToken);

        if (warehouse == null)
        {
            return Result.Failure("Warehouse not found.", "NOT_FOUND");
        }

        if (request.IsDefault && !warehouse.IsDefault)
        {
            var otherDefaults = await _context.TenantWarehouses
                .Where(w => w.TenantId == tenantId && w.BranchId == warehouse.BranchId && w.IsDefault && w.Id != warehouseId && !w.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var od in otherDefaults)
            {
                od.IsDefault = false;
            }
        }

        warehouse.WarehouseName = request.WarehouseName.Trim();
        warehouse.Location = request.Location?.Trim();
        warehouse.IsDefault = request.IsDefault;
        warehouse.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "UpdateWarehouse",
            EntityName = "TenantWarehouse",
            EntityId = warehouse.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(request),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result> DeleteWarehouseAsync(Guid warehouseId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var warehouse = await _context.TenantWarehouses
            .FirstOrDefaultAsync(w => w.TenantId == tenantId && w.Id == warehouseId && !w.IsDeleted, cancellationToken);

        if (warehouse == null)
        {
            return Result.Failure("Warehouse not found.", "NOT_FOUND");
        }

        if (warehouse.IsDefault)
        {
            return Result.Failure("Cannot delete default branch warehouse.", "CANNOT_DELETE_DEFAULT");
        }

        warehouse.IsDeleted = true;
        warehouse.DeletedAtUtc = DateTimeOffset.UtcNow;
        warehouse.DeletedBy = _currentUserContext.UserId;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    #endregion

    #region Staff Users & RBAC

    public async Task<Result<PagedResult<StaffUserDto>>> GetStaffUsersAsync(int pageNumber, int pageSize, string? searchTerm = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.Users
            .Where(u => u.TenantId == tenantId && !u.IsDeleted)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.UserPermissions)
                .ThenInclude(up => up.Permission)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(term) ||
                u.Email.ToLower().Contains(term) ||
                (u.PhoneNumber != null && u.PhoneNumber.Contains(term)) ||
                (u.Designation != null && u.Designation.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var users = await query
            .OrderByDescending(u => u.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var dtos = users.Select(u => new StaffUserDto(
            u.Id,
            u.TenantId ?? Guid.Empty,
            u.Email,
            u.FullName,
            u.PhoneNumber,
            u.Designation,
            u.IsTenantAdmin,
            u.IsActive,
            u.LastLoginAtUtc,
            u.CreatedAtUtc,
            u.UserRoles.Select(ur => new RoleDto(
                ur.Role.Id,
                ur.Role.TenantId,
                ur.Role.Code,
                ur.Role.Name,
                ur.Role.Description,
                ur.Role.IsSystemRole,
                ur.Role.IsActive,
                new List<string>()
            )).ToList(),
            u.UserPermissions.Where(up => up.IsGranted).Select(up => up.Permission.Code).ToList()
        )).ToList();

        return Result<PagedResult<StaffUserDto>>.Success(PagedResult<StaffUserDto>.Create(dtos, pageNumber, pageSize, totalCount));
    }

    public async Task<Result<StaffUserDto>> GetStaffUserByIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var u = await _context.Users
            .Where(u => u.TenantId == tenantId && u.Id == userId && !u.IsDeleted)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.UserPermissions)
                .ThenInclude(up => up.Permission)
            .FirstOrDefaultAsync(cancellationToken);

        if (u == null)
        {
            return Result<StaffUserDto>.Failure("User not found.", "NOT_FOUND");
        }

        var dto = new StaffUserDto(
            u.Id,
            u.TenantId ?? Guid.Empty,
            u.Email,
            u.FullName,
            u.PhoneNumber,
            u.Designation,
            u.IsTenantAdmin,
            u.IsActive,
            u.LastLoginAtUtc,
            u.CreatedAtUtc,
            u.UserRoles.Select(ur => new RoleDto(
                ur.Role.Id,
                ur.Role.TenantId,
                ur.Role.Code,
                ur.Role.Name,
                ur.Role.Description,
                ur.Role.IsSystemRole,
                ur.Role.IsActive,
                new List<string>()
            )).ToList(),
            u.UserPermissions.Where(up => up.IsGranted).Select(up => up.Permission.Code).ToList()
        );

        return Result<StaffUserDto>.Success(dto);
    }

    public async Task<Result<Guid>> CreateStaffUserAsync(CreateStaffUserRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var plan = await GetActivePlanAsync(tenantId, cancellationToken);

        // Dynamic Quota Check (Core Included + Additional Users)
        var tenant = await _context.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        var allowedUsers = Math.Max(tenant?.MaxAllowedUsers ?? 2, plan.MaxUsers);

        var currentCount = await _context.Users
            .CountAsync(u => u.TenantId == tenantId && !u.IsDeleted, cancellationToken);

        if (currentCount >= allowedUsers)
        {
            return Result<Guid>.Failure(
                $"User limit ({currentCount}/{allowedUsers} users) reached. Please purchase an Additional User Add-on to invite more team members.",
                "QUOTA_EXCEEDED"
            );
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var exists = await _context.Users
            .AnyAsync(u => u.TenantId == tenantId && u.Email.ToLower() == normalizedEmail && !u.IsDeleted, cancellationToken);

        if (exists)
        {
            return Result<Guid>.Failure($"User with email '{normalizedEmail}' already exists in your organization.", "EMAIL_ALREADY_EXISTS");
        }

        var hash = _passwordHasher.HashPassword(request.Password, out var salt);

        var user = new User
        {
            TenantId = tenantId,
            Email = normalizedEmail,
            FullName = request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber?.Trim(),
            Designation = request.Designation?.Trim(),
            PasswordHash = hash,
            PasswordSalt = salt,
            IsSuperAdmin = false,
            IsTenantAdmin = false,
            IsActive = true
        };

        if (request.RoleIds != null && request.RoleIds.Count > 0)
        {
            var roles = await _context.Roles
                .Where(r => r.TenantId == tenantId && request.RoleIds.Contains(r.Id) && !r.IsDeleted)
                .ToListAsync(cancellationToken);

            foreach (var r in roles)
            {
                user.UserRoles.Add(new UserRole
                {
                    TenantId = tenantId,
                    RoleId = r.Id
                });
            }
        }

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateStaffUser",
            EntityName = "User",
            EntityId = user.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { user.Email, user.FullName, user.Designation }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(user.Id);
    }

    public async Task<Result> UpdateStaffUserAsync(Guid userId, UpdateStaffUserRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result.Failure("User not found.", "NOT_FOUND");
        }

        user.FullName = request.FullName.Trim();
        user.PhoneNumber = request.PhoneNumber?.Trim();
        user.Designation = request.Designation?.Trim();
        user.IsActive = request.IsActive;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "UpdateStaffUser",
            EntityName = "User",
            EntityId = user.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(request),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result> UpdateMyProfileAsync(UpdateMyProfileRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var userId = _currentUserContext.UserId;
        if (userId == null || userId == Guid.Empty)
        {
            return Result.Failure("Unauthorized.", "UNAUTHORIZED");
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId.Value && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result.Failure("User account not found.", "NOT_FOUND");
        }

        if (!string.IsNullOrWhiteSpace(request.CurrentPassword) || !string.IsNullOrWhiteSpace(request.NewPassword))
        {
            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            {
                return Result.Failure("Current password is required to set a new password.", "CURRENT_PASSWORD_REQUIRED");
            }
            var tenant = user.TenantId.HasValue
                ? await _context.Tenants.FirstOrDefaultAsync(t => t.Id == user.TenantId.Value, cancellationToken)
                : null;

            var isCurrentValid = _passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash, user.PasswordSalt);
            if (!isCurrentValid && tenant != null && !string.IsNullOrEmpty(tenant.AdminPassword) && string.Equals(request.CurrentPassword.Trim(), tenant.AdminPassword.Trim()))
            {
                isCurrentValid = true;
            }

            if (!isCurrentValid)
            {
                return Result.Failure("Current password entered is incorrect.", "INVALID_CURRENT_PASSWORD");
            }
            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            {
                return Result.Failure("New password must be at least 6 characters.", "PASSWORD_TOO_SHORT");
            }
            user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword, out var newSalt);
            user.PasswordSalt = newSalt;

            if (tenant != null && (user.IsTenantAdmin || string.Equals(user.Email, tenant.AdminEmail, StringComparison.OrdinalIgnoreCase)))
            {
                tenant.AdminPassword = request.NewPassword.Trim();
            }
        }

        if (!string.IsNullOrWhiteSpace(request.FullName))
        {
            user.FullName = request.FullName.Trim();
        }

        if (request.PhoneNumber != null)
        {
            user.PhoneNumber = request.PhoneNumber.Trim();
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> AssignUserRolesAsync(Guid userId, AssignUserRolesRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var user = await _context.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result.Failure("User not found.", "NOT_FOUND");
        }

        _context.UserRoles.RemoveRange(user.UserRoles);

        if (request.RoleIds != null && request.RoleIds.Count > 0)
        {
            var validRoleIds = await _context.Roles
                .Where(r => r.TenantId == tenantId && request.RoleIds.Contains(r.Id) && !r.IsDeleted)
                .Select(r => r.Id)
                .ToListAsync(cancellationToken);

            foreach (var rId in validRoleIds)
            {
                user.UserRoles.Add(new UserRole
                {
                    TenantId = tenantId,
                    UserId = user.Id,
                    RoleId = rId
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> UpdateUserPermissionsAsync(Guid userId, UpdateUserPermissionsRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var user = await _context.Users
            .Include(u => u.UserPermissions)
            .FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result.Failure("User not found.", "NOT_FOUND");
        }

        _context.UserPermissions.RemoveRange(user.UserPermissions);

        if (request.GrantedPermissionIds != null)
        {
            foreach (var pId in request.GrantedPermissionIds.Distinct())
            {
                user.UserPermissions.Add(new UserPermission
                {
                    UserId = user.Id,
                    PermissionId = pId,
                    IsGranted = true
                });
            }
        }

        if (request.RevokedPermissionIds != null)
        {
            foreach (var pId in request.RevokedPermissionIds.Distinct())
            {
                user.UserPermissions.Add(new UserPermission
                {
                    UserId = user.Id,
                    PermissionId = pId,
                    IsGranted = false
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> DeleteStaffUserAsync(Guid userId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Id == userId && !u.IsDeleted, cancellationToken);

        if (user == null)
        {
            return Result.Failure("User not found.", "NOT_FOUND");
        }

        if (user.IsTenantAdmin)
        {
            return Result.Failure("Cannot delete primary Tenant Administrator account.", "CANNOT_DELETE_ADMIN");
        }

        user.IsDeleted = true;
        user.DeletedAtUtc = DateTimeOffset.UtcNow;
        user.DeletedBy = _currentUserContext.UserId;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    #endregion

    #region Roles & Catalog Permissions

    public async Task<Result<IReadOnlyList<RoleDto>>> GetRolesAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var roles = await _context.Roles
            .Where(r => r.TenantId == tenantId && !r.IsDeleted)
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .OrderBy(r => r.Name)
            .ToListAsync(cancellationToken);

        var dtos = roles.Select(r => new RoleDto(
            r.Id,
            r.TenantId,
            r.Code,
            r.Name,
            r.Description,
            r.IsSystemRole,
            r.IsActive,
            r.RolePermissions.Select(rp => rp.Permission.Code).ToList()
        )).ToList();

        return Result<IReadOnlyList<RoleDto>>.Success(dtos);
    }

    public async Task<Result<Guid>> CreateRoleAsync(CreateRoleRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var normalizedCode = request.Code.Trim().ToUpperInvariant();

        var exists = await _context.Roles
            .AnyAsync(r => r.TenantId == tenantId && r.Code == normalizedCode && !r.IsDeleted, cancellationToken);

        if (exists)
        {
            return Result<Guid>.Failure($"Role with code '{normalizedCode}' already exists.", "CODE_ALREADY_EXISTS");
        }

        var role = new Role
        {
            TenantId = tenantId,
            Code = normalizedCode,
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            IsSystemRole = false,
            IsActive = true
        };

        if (request.PermissionIds != null && request.PermissionIds.Count > 0)
        {
            foreach (var pId in request.PermissionIds.Distinct())
            {
                role.RolePermissions.Add(new RolePermission
                {
                    PermissionId = pId
                });
            }
        }

        _context.Roles.Add(role);
        await _context.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(role.Id);
    }

    public async Task<Result> UpdateRoleAsync(Guid roleId, UpdateRoleRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var role = await _context.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.Id == roleId && !r.IsDeleted, cancellationToken);

        if (role == null)
        {
            return Result.Failure("Role not found.", "NOT_FOUND");
        }

        role.Name = request.Name.Trim();
        role.Description = request.Description.Trim();
        role.IsActive = request.IsActive;

        _context.RolePermissions.RemoveRange(role.RolePermissions);
        if (request.PermissionIds != null && request.PermissionIds.Count > 0)
        {
            foreach (var pId in request.PermissionIds.Distinct())
            {
                role.RolePermissions.Add(new RolePermission
                {
                    RoleId = role.Id,
                    PermissionId = pId
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result> DeleteRoleAsync(Guid roleId, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var role = await _context.Roles
            .FirstOrDefaultAsync(r => r.TenantId == tenantId && r.Id == roleId && !r.IsDeleted, cancellationToken);

        if (role == null)
        {
            return Result.Failure("Role not found.", "NOT_FOUND");
        }

        if (role.IsSystemRole)
        {
            return Result.Failure("System roles cannot be deleted.", "CANNOT_DELETE_SYSTEM_ROLE");
        }

        role.IsDeleted = true;
        role.DeletedAtUtc = DateTimeOffset.UtcNow;
        role.DeletedBy = _currentUserContext.UserId;

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<IReadOnlyList<PermissionGroupDto>>> GetAvailablePermissionsAsync(CancellationToken cancellationToken = default)
    {
        var permissions = await _context.Permissions
            .Include(p => p.Feature)
                .ThenInclude(f => f!.Module)
            .ToListAsync(cancellationToken);

        var groups = permissions
            .OrderBy(p => p.Feature?.Module?.DisplayOrder ?? 99)
                .ThenBy(p => p.Code)
            .GroupBy(p => new { 
                Code = p.Feature?.Module?.Code ?? p.Group?.ToUpperInvariant() ?? "GENERAL", 
                Name = p.Feature?.Module?.Name ?? p.Group ?? "General Permissions" 
            })
            .Select(g => new PermissionGroupDto(
                g.Key.Code,
                g.Key.Name,
                g.Select(p => new PermissionDto(
                    p.Id,
                    p.Code,
                    p.Name,
                    p.Description,
                    g.Key.Code,
                    g.Key.Name
                )).ToList()
            )).ToList();

        return Result<IReadOnlyList<PermissionGroupDto>>.Success(groups);
    }

    #endregion

    #region Settings & Quotas

    public async Task<Result<TenantDetailsDto>> GetBusinessProfileAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var t = await _context.Tenants
            .Include(t => t.Industry)
            .Include(t => t.Branches.Where(b => !b.IsDeleted))
                .ThenInclude(b => b.Warehouses.Where(w => !w.IsDeleted))
            .Include(t => t.IndustryConfigs.Where(c => !c.IsDeleted))
            .FirstOrDefaultAsync(t => t.Id == tenantId && !t.IsDeleted, cancellationToken);

        if (t == null)
        {
            return Result<TenantDetailsDto>.Failure("Tenant not found.", "NOT_FOUND");
        }

        var activeSub = await _context.TenantSubscriptions
            .Include(s => s.Plan)
            .Where(s => s.TenantId == tenantId && !s.IsDeleted)
            .OrderByDescending(s => s.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        var indConfig = t.IndustryConfigs.FirstOrDefault();
        TenantIndustryConfigDto? configDto = indConfig == null ? null : new TenantIndustryConfigDto(
            indConfig.IndustryId,
            t.Industry.Name,
            t.Industry.Code,
            indConfig.EnableBatchTracking,
            indConfig.EnableExpiryTracking,
            indConfig.EnableSerialTracking,
            indConfig.EnableMultiUnitConversion,
            indConfig.EnableSizeColorMatrix,
            indConfig.EnableRecipeBOM,
            indConfig.EnableScheduleH1DrugTracking,
            indConfig.EnableEWayBill,
            indConfig.EnableEInvoicing,
            indConfig.ConfigurationJson
        );

        var branchesDto = t.Branches.Select(b => new TenantBranchDto(
            b.Id,
            b.BranchCode,
            b.BranchName,
            b.GSTIN,
            b.City,
            b.State,
            b.IsHeadOffice,
            b.IsActive,
            b.Warehouses.Select(w => new TenantWarehouseDto(
                w.Id,
                w.BranchId,
                w.WarehouseCode,
                w.WarehouseName,
                w.Location,
                w.IsDefault,
                w.IsActive
            )).ToList()
        )).ToList();

        TenantSubscriptionSummaryDto? subDto = activeSub == null ? null : new TenantSubscriptionSummaryDto(
            activeSub.Id,
            activeSub.PlanId,
            activeSub.Plan.Name,
            activeSub.Plan.Code,
            activeSub.Status,
            activeSub.StartsAtUtc,
            activeSub.EndsAtUtc,
            activeSub.TrialEndsAtUtc,
            activeSub.AutoRenew,
            activeSub.EndsAtUtc > DateTimeOffset.UtcNow && activeSub.Status != SubscriptionStatus.Suspended
        );

        var details = new TenantDetailsDto(
            t.Id,
            t.Code,
            t.BusinessName,
            t.TradeName,
            t.IndustryId,
            t.Industry.Name,
            t.Industry.Code,
            t.Status,
            t.AdminEmail,
            t.PrimaryPhone,
            t.GSTIN,
            t.PAN,
            t.DrugLicenseNumber,
            t.FSSAINumber,
            t.TimeZone,
            t.CurrencyCode,
            t.IsActive,
            configDto,
            branchesDto,
            subDto,
            t.LogoUrl,
            t.UpiId,
            t.BankName,
            t.BankAccountNumber,
            t.BankIfsc,
            t.BankBranch,
            t.AddressLine1,
            t.AddressLine2,
            t.City,
            t.State,
            t.StateCode,
            t.Pincode,
            t.Email,
            t.Website,
            t.SmtpHost,
            t.SmtpPort,
            t.SmtpUsername,
            t.SmtpPassword,
            t.SmtpFromEmail,
            t.SmtpFromName,
            t.SmtpEnableSsl
        );

        return Result<TenantDetailsDto>.Success(details);
    }

    public async Task<Result> UpdateBusinessProfileAsync(UpdateBusinessProfileRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var tenant = await _context.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId && !t.IsDeleted, cancellationToken);

        if (tenant == null)
        {
            return Result.Failure("Tenant not found.", "NOT_FOUND");
        }

        tenant.BusinessName = request.BusinessName.Trim();
        tenant.TradeName = request.TradeName.Trim();
        tenant.PrimaryPhone = request.PrimaryPhone.Trim();
        tenant.GSTIN = request.GSTIN?.Trim().ToUpperInvariant();
        tenant.PAN = request.PAN?.Trim().ToUpperInvariant();
        tenant.DrugLicenseNumber = request.DrugLicenseNumber?.Trim();
        tenant.FSSAINumber = request.FSSAINumber?.Trim();
        tenant.TimeZone = request.TimeZone.Trim();
        tenant.CurrencyCode = request.CurrencyCode.Trim();
        tenant.UpiId = request.UpiId?.Trim();
        tenant.BankName = request.BankName?.Trim();
        tenant.BankAccountNumber = request.BankAccountNumber?.Trim();
        tenant.BankIfsc = request.BankIfsc?.Trim().ToUpperInvariant();
        tenant.BankBranch = request.BankBranch?.Trim();

        // Complete Registered Address
        tenant.AddressLine1 = request.AddressLine1?.Trim();
        tenant.AddressLine2 = request.AddressLine2?.Trim();
        tenant.City = request.City?.Trim();
        tenant.State = request.State?.Trim();
        tenant.StateCode = request.StateCode?.Trim();
        tenant.Pincode = request.Pincode?.Trim();
        tenant.Email = request.Email?.Trim();
        tenant.Website = request.Website?.Trim();

        // Outgoing Mail / SMTP Server Configuration
        tenant.SmtpHost = request.SmtpHost?.Trim();
        tenant.SmtpPort = request.SmtpPort;
        tenant.SmtpUsername = request.SmtpUsername?.Trim();
        if (!string.IsNullOrWhiteSpace(request.SmtpPassword))
        {
            tenant.SmtpPassword = request.SmtpPassword.Trim();
        }
        tenant.SmtpFromEmail = request.SmtpFromEmail?.Trim();
        tenant.SmtpFromName = request.SmtpFromName?.Trim();
        tenant.SmtpEnableSsl = request.SmtpEnableSsl;

        if (request.LogoUrl != null)
        {
            tenant.LogoUrl = request.LogoUrl;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "UpdateBusinessProfile",
            EntityName = "Tenant",
            EntityId = tenant.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(request),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result<bool>> SendTenantTestEmailAsync(SendTenantTestEmailRequest request, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var tenant = await _context.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId && !t.IsDeleted, cancellationToken);

        if (tenant == null)
        {
            return Result<bool>.Failure("Tenant not found.", "NOT_FOUND");
        }

        if (string.IsNullOrWhiteSpace(tenant.SmtpHost) || string.IsNullOrWhiteSpace(tenant.SmtpFromEmail))
        {
            return Result<bool>.Failure("SMTP Outgoing Mail Server is not configured. Please fill in SMTP Host and From Email.", "SMTP_NOT_CONFIGURED");
        }

        try
        {
            using var client = new System.Net.Mail.SmtpClient(tenant.SmtpHost, tenant.SmtpPort ?? 587)
            {
                EnableSsl = tenant.SmtpEnableSsl ?? true,
                Timeout = 10000
            };

            if (!string.IsNullOrWhiteSpace(tenant.SmtpUsername) && !string.IsNullOrWhiteSpace(tenant.SmtpPassword))
            {
                client.UseDefaultCredentials = false;
                client.Credentials = new System.Net.NetworkCredential(tenant.SmtpUsername, tenant.SmtpPassword);
            }

            var fromAddress = new System.Net.Mail.MailAddress(tenant.SmtpFromEmail, tenant.SmtpFromName ?? tenant.BusinessName);
            var toAddress = new System.Net.Mail.MailAddress(request.RecipientEmail);

            string subject = request.Subject ?? $"Test Email from {tenant.BusinessName} (UdyogBill Mailer)";
            string html = $@"
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'></head>
<body style='font-family: Arial, sans-serif; background-color: #0f172a; padding: 30px; color: #f8fafc;'>
  <div style='max-width: 550px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px;'>
    <div style='font-size: 18px; font-weight: bold; color: #10b981; margin-bottom: 6px;'>{tenant.BusinessName}</div>
    <h2 style='color: #ffffff; margin-top: 0;'>Outgoing SMTP Mailbox Verified!</h2>
    <p style='color: #94a3b8; font-size: 14px; line-height: 1.6;'>
      This email verifies that your store SMTP mail server is active and functioning properly. All future invoices, CA Packs, and statements sent via 'Send to Mail' will be dispatched from this mailbox.
    </p>
    <div style='background-color: #0f172a; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; color: #38bdf8; margin: 16px 0;'>
      Host: {tenant.SmtpHost} | Port: {tenant.SmtpPort ?? 587} | From: {tenant.SmtpFromEmail}
    </div>
    <p style='color: #64748b; font-size: 11px; margin-top: 24px; border-top: 1px solid #334155; pt: 12px;'>
      Dispatched via UdyogBill
    </p>
  </div>
</body>
</html>";

            using var message = new System.Net.Mail.MailMessage(fromAddress, toAddress)
            {
                Subject = subject,
                Body = html,
                IsBodyHtml = true
            };

            await client.SendMailAsync(message, cancellationToken);
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            return Result<bool>.Failure($"SMTP Connection Failed: {ex.Message}", "SMTP_SEND_FAILED");
        }
    }

    public async Task<Result<TenantIndustryConfigDto>> GetIndustryConfigAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var config = await _context.TenantIndustryConfigs
            .Include(c => c.Industry)
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && !c.IsDeleted, cancellationToken);

        if (config == null)
        {
            return Result<TenantIndustryConfigDto>.Failure("Industry configuration not found.", "NOT_FOUND");
        }

        var dto = new TenantIndustryConfigDto(
            config.IndustryId,
            config.Industry.Name,
            config.Industry.Code,
            config.EnableBatchTracking,
            config.EnableExpiryTracking,
            config.EnableSerialTracking,
            config.EnableMultiUnitConversion,
            config.EnableSizeColorMatrix,
            config.EnableRecipeBOM,
            config.EnableScheduleH1DrugTracking,
            config.EnableEWayBill,
            config.EnableEInvoicing,
            config.ConfigurationJson
        );

        return Result<TenantIndustryConfigDto>.Success(dto);
    }

    public async Task<Result> UpdateIndustryConfigAsync(UpdateTenantIndustryConfigRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var config = await _context.TenantIndustryConfigs
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && !c.IsDeleted, cancellationToken);

        if (config == null)
        {
            return Result.Failure("Industry configuration not found.", "NOT_FOUND");
        }

        config.EnableBatchTracking = request.EnableBatchTracking;
        config.EnableExpiryTracking = request.EnableExpiryTracking;
        config.EnableSerialTracking = request.EnableSerialTracking;
        config.EnableMultiUnitConversion = request.EnableMultiUnitConversion;
        config.EnableSizeColorMatrix = request.EnableSizeColorMatrix;
        config.EnableRecipeBOM = request.EnableRecipeBOM;
        config.EnableScheduleH1DrugTracking = request.EnableScheduleH1DrugTracking;
        config.EnableEWayBill = request.EnableEWayBill;
        config.EnableEInvoicing = request.EnableEInvoicing;
        config.ConfigurationJson = request.ConfigurationJson ?? "{}";

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Update,
            ActionName = "UpdateIndustryConfig",
            EntityName = "TenantIndustryConfig",
            EntityId = config.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(request),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result.Success();
    }

    public async Task<Result<TenantQuotaSummaryDto>> GetQuotaSummaryAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();
        var plan = await GetActivePlanAsync(tenantId, cancellationToken);

        var userCount = await _context.Users
            .CountAsync(u => u.TenantId == tenantId && !u.IsDeleted, cancellationToken);

        var branchCount = await _context.TenantBranches
            .CountAsync(b => b.TenantId == tenantId && !b.IsDeleted, cancellationToken);

        var warehouseCount = await _context.TenantWarehouses
            .CountAsync(w => w.TenantId == tenantId && !w.IsDeleted, cancellationToken);

        var activeSub = await _context.TenantSubscriptions
            .Where(s => s.TenantId == tenantId && !s.IsDeleted)
            .OrderByDescending(s => s.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        var summary = new TenantQuotaSummaryDto(
            userCount,
            plan.MaxUsers,
            branchCount,
            plan.MaxBranches,
            warehouseCount,
            plan.MaxWarehouses,
            0,
            plan.MaxInvoicesPerMonth,
            plan.Name,
            plan.Code,
            activeSub?.Status ?? SubscriptionStatus.Trial,
            activeSub?.EndsAtUtc ?? DateTimeOffset.UtcNow.AddDays(14),
            activeSub?.Status == SubscriptionStatus.Trial
        );

        return Result<TenantQuotaSummaryDto>.Success(summary);
    }

    #endregion
}
