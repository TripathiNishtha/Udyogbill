using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface ITenantHierarchyService
{
    // Branches
    Task<Result<IReadOnlyList<BranchDetailsDto>>> GetBranchesAsync(CancellationToken cancellationToken = default);
    Task<Result<BranchDetailsDto>> GetBranchByIdAsync(Guid branchId, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateBranchAsync(CreateBranchRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> UpdateBranchAsync(Guid branchId, UpdateBranchRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> DeleteBranchAsync(Guid branchId, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Warehouses
    Task<Result<IReadOnlyList<WarehouseDetailsDto>>> GetWarehousesAsync(Guid? branchId = null, CancellationToken cancellationToken = default);
    Task<Result<WarehouseDetailsDto>> GetWarehouseByIdAsync(Guid warehouseId, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateWarehouseAsync(CreateWarehouseRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> UpdateWarehouseAsync(Guid warehouseId, UpdateWarehouseRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> DeleteWarehouseAsync(Guid warehouseId, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Staff Users & RBAC
    Task<Result<PagedResult<StaffUserDto>>> GetStaffUsersAsync(int pageNumber, int pageSize, string? searchTerm = null, CancellationToken cancellationToken = default);
    Task<Result<StaffUserDto>> GetStaffUserByIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateStaffUserAsync(CreateStaffUserRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> UpdateStaffUserAsync(Guid userId, UpdateStaffUserRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> UpdateMyProfileAsync(UpdateMyProfileRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> AssignUserRolesAsync(Guid userId, AssignUserRolesRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> UpdateUserPermissionsAsync(Guid userId, UpdateUserPermissionsRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> DeleteStaffUserAsync(Guid userId, string? ipAddress = null, CancellationToken cancellationToken = default);

    // Roles & Catalog Permissions
    Task<Result<IReadOnlyList<RoleDto>>> GetRolesAsync(CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateRoleAsync(CreateRoleRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> UpdateRoleAsync(Guid roleId, UpdateRoleRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result> DeleteRoleAsync(Guid roleId, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<PermissionGroupDto>>> GetAvailablePermissionsAsync(CancellationToken cancellationToken = default);

    // Settings & Quotas
    Task<Result<TenantDetailsDto>> GetBusinessProfileAsync(CancellationToken cancellationToken = default);
    Task<Result> UpdateBusinessProfileAsync(UpdateBusinessProfileRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<bool>> SendTenantTestEmailAsync(SendTenantTestEmailRequest request, CancellationToken cancellationToken = default);
    Task<Result<TenantIndustryConfigDto>> GetIndustryConfigAsync(CancellationToken cancellationToken = default);
    Task<Result> UpdateIndustryConfigAsync(UpdateTenantIndustryConfigRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<TenantQuotaSummaryDto>> GetQuotaSummaryAsync(CancellationToken cancellationToken = default);
}
