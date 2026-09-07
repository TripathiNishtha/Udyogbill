namespace UdyogBill.Shared.Constants;

public static class Roles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string TenantAdmin = "TenantAdmin";
    public const string TenantManager = "TenantManager";
    public const string TenantAccountant = "TenantAccountant";
    public const string TenantStaff = "TenantStaff";
    public const string TenantCashier = "TenantCashier";
}

public static class Claims
{
    public const string TenantId = "tenant_id";
    public const string UserId = "user_id";
    public const string Email = "email";
    public const string FullName = "full_name";
    public const string IsSuperAdmin = "is_super_admin";
    public const string IsTenantAdmin = "is_tenant_admin";
    public const string IndustryId = "industry_id";
    public const string Permission = "permission";
}

public static class Permissions
{
    // Tenant Administration
    public const string TenantView = "tenant.view";
    public const string TenantManage = "tenant.manage";
    public const string TenantSettings = "tenant.settings";

    // User & Role Management
    public const string UsersView = "users.view";
    public const string UsersCreate = "users.create";
    public const string UsersEdit = "users.edit";
    public const string UsersDelete = "users.delete";
    public const string RolesManage = "roles.manage";

    // Branches & Warehouses
    public const string BranchesManage = "branches.manage";
    public const string WarehousesManage = "warehouses.manage";

    // Industry & Modules
    public const string IndustryView = "industry.view";
    public const string ModulesView = "modules.view";

    // Common Core Business Permissions (Foundation)
    public const string SalesView = "sales.view";
    public const string SalesCreate = "sales.create";
    public const string SalesCancel = "sales.cancel";
    public const string SalesReturn = "sales.return";
    public const string QuotationsManage = "quotations.manage";

    public const string PurchaseView = "purchase.view";
    public const string PurchaseCreate = "purchase.create";
    public const string PurchaseCancel = "purchase.cancel";
    public const string PurchaseReturn = "purchase.return";

    public const string InventoryView = "inventory.view";
    public const string InventoryManage = "inventory.manage";
    public const string InventoryTransfer = "inventory.transfer";
    public const string InventoryAdjust = "inventory.adjust";

    public const string PartiesView = "parties.view";
    public const string PartiesManage = "parties.manage";

    public const string BankingView = "banking.view";
    public const string BankingManage = "banking.manage";
    public const string AccountsManage = "accounts.manage";

    public const string LogisticsView = "logistics.view";
    public const string LogisticsManage = "logistics.manage";

    public const string ReportsView = "reports.view";
    public const string ReportsExport = "reports.export";

    // AI Copilot & Assistant
    public const string AiAssistantUse = "ai_assistant.use";
}
