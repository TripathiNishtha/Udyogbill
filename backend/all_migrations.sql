CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE add_ons (
        "Id" uuid NOT NULL,
        "Code" character varying(50) NOT NULL,
        "Name" character varying(150) NOT NULL,
        "Description" text NOT NULL,
        "Price" numeric(18,4) NOT NULL,
        "BillingCycle" integer NOT NULL,
        "AdditionalUsers" integer NOT NULL,
        "AdditionalBranches" integer NOT NULL,
        "AdditionalWarehouses" integer NOT NULL,
        "AdditionalInvoicesPerMonth" integer NOT NULL,
        "AdditionalStorageMb" integer NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_add_ons" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE audit_logs (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "UserId" uuid,
        "UserEmail" text,
        "Action" integer NOT NULL,
        "ActionName" character varying(100) NOT NULL,
        "EntityName" character varying(100) NOT NULL,
        "EntityId" character varying(100),
        "OldValuesJson" jsonb,
        "NewValuesJson" jsonb,
        "AffectedColumnsJson" jsonb,
        "IpAddress" character varying(45),
        "UserAgent" character varying(500),
        "CorrelationId" character varying(100),
        "TimestampUtc" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE industries (
        "Id" uuid NOT NULL,
        "Code" character varying(50) NOT NULL,
        "Name" character varying(200) NOT NULL,
        "Description" text NOT NULL,
        "Icon" text NOT NULL,
        "DisplayOrder" integer NOT NULL,
        "IsActive" boolean NOT NULL,
        "DefaultConfigJson" jsonb,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_industries" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE modules (
        "Id" uuid NOT NULL,
        "Code" character varying(50) NOT NULL,
        "Name" character varying(200) NOT NULL,
        "Description" text NOT NULL,
        "Icon" text NOT NULL,
        "DisplayOrder" integer NOT NULL,
        "IsCore" boolean NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_modules" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE plans (
        "Id" uuid NOT NULL,
        "Code" character varying(50) NOT NULL,
        "Name" character varying(150) NOT NULL,
        "Description" text NOT NULL,
        "BillingCycle" integer NOT NULL,
        "Price" numeric(18,4) NOT NULL,
        "SetupFee" numeric(18,4) NOT NULL,
        "TrialDays" integer NOT NULL,
        "MaxUsers" integer NOT NULL,
        "MaxBranches" integer NOT NULL,
        "MaxWarehouses" integer NOT NULL,
        "MaxInvoicesPerMonth" integer NOT NULL,
        "MaxStorageMb" integer NOT NULL,
        "MaxApiCallsPerDay" integer NOT NULL,
        "IsPopular" boolean NOT NULL,
        "IsActive" boolean NOT NULL,
        "DisplayOrder" integer NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_plans" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE roles (
        "Id" uuid NOT NULL,
        "Name" character varying(100) NOT NULL,
        "Code" character varying(100) NOT NULL,
        "Description" text NOT NULL,
        "IsSystemRole" boolean NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_roles" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE tenants (
        "Id" uuid NOT NULL,
        "Code" character varying(50) NOT NULL,
        "BusinessName" character varying(255) NOT NULL,
        "TradeName" character varying(255) NOT NULL,
        "IndustryId" uuid NOT NULL,
        "Status" integer NOT NULL,
        "AdminEmail" character varying(255) NOT NULL,
        "PrimaryPhone" character varying(50) NOT NULL,
        "GSTIN" character varying(50),
        "PAN" character varying(50),
        "DrugLicenseNumber" character varying(100),
        "FSSAINumber" character varying(100),
        "TimeZone" character varying(50) NOT NULL DEFAULT 'Asia/Kolkata',
        "CurrencyCode" character varying(10) NOT NULL DEFAULT 'INR',
        "CurrencySymbol" character varying(10) NOT NULL DEFAULT '₹',
        "IsActive" boolean NOT NULL,
        "SuspendedAtUtc" timestamp with time zone,
        "SuspensionReason" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_tenants" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_tenants_industries_IndustryId" FOREIGN KEY ("IndustryId") REFERENCES industries ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE features (
        "Id" uuid NOT NULL,
        "ModuleId" uuid NOT NULL,
        "Code" character varying(100) NOT NULL,
        "Name" character varying(200) NOT NULL,
        "Description" text NOT NULL,
        "FeatureType" integer NOT NULL,
        "IsActive" boolean NOT NULL,
        "DisplayOrder" integer NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_features" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_features_modules_ModuleId" FOREIGN KEY ("ModuleId") REFERENCES modules ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE industry_modules (
        "Id" uuid NOT NULL,
        "IndustryId" uuid NOT NULL,
        "ModuleId" uuid NOT NULL,
        "IsMandatory" boolean NOT NULL,
        "IsDefaultEnabled" boolean NOT NULL,
        CONSTRAINT "PK_industry_modules" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_industry_modules_industries_IndustryId" FOREIGN KEY ("IndustryId") REFERENCES industries ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_industry_modules_modules_ModuleId" FOREIGN KEY ("ModuleId") REFERENCES modules ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE tenant_subscriptions (
        "Id" uuid NOT NULL,
        "PlanId" uuid NOT NULL,
        "Status" integer NOT NULL,
        "StartsAtUtc" timestamp with time zone NOT NULL,
        "EndsAtUtc" timestamp with time zone NOT NULL,
        "TrialEndsAtUtc" timestamp with time zone,
        "CancelledAtUtc" timestamp with time zone,
        "CancellationReason" text,
        "AutoRenew" boolean NOT NULL,
        "PricePaid" numeric(18,4) NOT NULL,
        "CurrencyCode" character varying(10) NOT NULL DEFAULT 'INR',
        "PaymentGatewaySubscriptionId" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_tenant_subscriptions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_tenant_subscriptions_plans_PlanId" FOREIGN KEY ("PlanId") REFERENCES plans ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE tenant_branches (
        "Id" uuid NOT NULL,
        "BranchCode" character varying(50) NOT NULL,
        "BranchName" character varying(200) NOT NULL,
        "GSTIN" text,
        "AddressLine1" text,
        "AddressLine2" text,
        "City" text,
        "State" text,
        "StateCode" text,
        "Pincode" text,
        "Phone" text,
        "Email" text,
        "IsHeadOffice" boolean NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_tenant_branches" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_tenant_branches_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE tenant_industry_configs (
        "Id" uuid NOT NULL,
        "IndustryId" uuid NOT NULL,
        "ConfigurationJson" jsonb NOT NULL,
        "EnableBatchTracking" boolean NOT NULL,
        "EnableExpiryTracking" boolean NOT NULL,
        "EnableSerialTracking" boolean NOT NULL,
        "EnableMultiUnitConversion" boolean NOT NULL,
        "EnableSizeColorMatrix" boolean NOT NULL,
        "EnableRecipeBOM" boolean NOT NULL,
        "EnableScheduleH1DrugTracking" boolean NOT NULL,
        "EnableEWayBill" boolean NOT NULL,
        "EnableEInvoicing" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_tenant_industry_configs" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_tenant_industry_configs_industries_IndustryId" FOREIGN KEY ("IndustryId") REFERENCES industries ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_tenant_industry_configs_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE tenant_settings (
        "Id" uuid NOT NULL,
        "Category" character varying(100) NOT NULL,
        "Key" character varying(100) NOT NULL,
        "Value" text NOT NULL,
        "ValueType" text NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_tenant_settings" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_tenant_settings_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE users (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "Email" character varying(255) NOT NULL,
        "PasswordHash" text NOT NULL,
        "PasswordSalt" text NOT NULL,
        "FullName" character varying(200) NOT NULL,
        "PhoneNumber" text,
        "Designation" text,
        "IsSuperAdmin" boolean NOT NULL,
        "IsTenantAdmin" boolean NOT NULL,
        "IsActive" boolean NOT NULL,
        "EmailConfirmed" boolean NOT NULL,
        "PhoneNumberConfirmed" boolean NOT NULL,
        "TwoFactorEnabled" boolean NOT NULL,
        "TwoFactorSecret" text,
        "AccessFailedCount" integer NOT NULL,
        "LockoutEndUtc" timestamp with time zone,
        "LockoutEnabled" boolean NOT NULL,
        "LastLoginAtUtc" timestamp with time zone,
        "LastLoginIp" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_users" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_users_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE industry_features (
        "Id" uuid NOT NULL,
        "IndustryId" uuid NOT NULL,
        "FeatureId" uuid NOT NULL,
        "IsEnabledByDefault" boolean NOT NULL,
        "DefaultConfigJson" jsonb,
        CONSTRAINT "PK_industry_features" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_industry_features_features_FeatureId" FOREIGN KEY ("FeatureId") REFERENCES features ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_industry_features_industries_IndustryId" FOREIGN KEY ("IndustryId") REFERENCES industries ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE plan_entitlements (
        "Id" uuid NOT NULL,
        "PlanId" uuid NOT NULL,
        "FeatureId" uuid NOT NULL,
        "IsIncluded" boolean NOT NULL,
        "UsageLimit" integer,
        CONSTRAINT "PK_plan_entitlements" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_plan_entitlements_features_FeatureId" FOREIGN KEY ("FeatureId") REFERENCES features ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_plan_entitlements_plans_PlanId" FOREIGN KEY ("PlanId") REFERENCES plans ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE sub_features (
        "Id" uuid NOT NULL,
        "FeatureId" uuid NOT NULL,
        "Code" character varying(100) NOT NULL,
        "Name" character varying(200) NOT NULL,
        "Description" text NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_sub_features" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_sub_features_features_FeatureId" FOREIGN KEY ("FeatureId") REFERENCES features ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE tenant_subscription_add_ons (
        "Id" uuid NOT NULL,
        "TenantSubscriptionId" uuid NOT NULL,
        "AddOnId" uuid NOT NULL,
        "Quantity" integer NOT NULL,
        "UnitPrice" numeric(18,4) NOT NULL,
        "ExpiresAtUtc" timestamp with time zone NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_tenant_subscription_add_ons" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_tenant_subscription_add_ons_add_ons_AddOnId" FOREIGN KEY ("AddOnId") REFERENCES add_ons ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_tenant_subscription_add_ons_tenant_subscriptions_TenantSubs~" FOREIGN KEY ("TenantSubscriptionId") REFERENCES tenant_subscriptions ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE tenant_warehouses (
        "Id" uuid NOT NULL,
        "BranchId" uuid NOT NULL,
        "WarehouseCode" character varying(50) NOT NULL,
        "WarehouseName" character varying(200) NOT NULL,
        "Location" text,
        "IsDefault" boolean NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_tenant_warehouses" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_tenant_warehouses_tenant_branches_BranchId" FOREIGN KEY ("BranchId") REFERENCES tenant_branches ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_tenant_warehouses_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE refresh_tokens (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "TokenHash" character varying(256) NOT NULL,
        "ExpiresAtUtc" timestamp with time zone NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedByIp" text,
        "RevokedAtUtc" timestamp with time zone,
        "RevokedByIp" text,
        "ReplacedByTokenHash" text,
        "ReasonRevoked" text,
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_refresh_tokens_users_UserId" FOREIGN KEY ("UserId") REFERENCES users ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE user_roles (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "RoleId" uuid NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_user_roles_roles_RoleId" FOREIGN KEY ("RoleId") REFERENCES roles ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_users_UserId" FOREIGN KEY ("UserId") REFERENCES users ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE permissions (
        "Id" uuid NOT NULL,
        "FeatureId" uuid,
        "SubFeatureId" uuid,
        "Code" character varying(100) NOT NULL,
        "Name" character varying(200) NOT NULL,
        "Description" text NOT NULL,
        "Group" character varying(100) NOT NULL,
        "IsSystem" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_permissions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_permissions_features_FeatureId" FOREIGN KEY ("FeatureId") REFERENCES features ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_permissions_sub_features_SubFeatureId" FOREIGN KEY ("SubFeatureId") REFERENCES sub_features ("Id") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE role_permissions (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "RoleId" uuid NOT NULL,
        "PermissionId" uuid NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_role_permissions_permissions_PermissionId" FOREIGN KEY ("PermissionId") REFERENCES permissions ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_role_permissions_roles_RoleId" FOREIGN KEY ("RoleId") REFERENCES roles ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE TABLE user_permissions (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "PermissionId" uuid NOT NULL,
        "IsGranted" boolean NOT NULL,
        CONSTRAINT "PK_user_permissions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_user_permissions_permissions_PermissionId" FOREIGN KEY ("PermissionId") REFERENCES permissions ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_permissions_users_UserId" FOREIGN KEY ("UserId") REFERENCES users ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_add_ons_Code" ON add_ons ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_audit_logs_Action" ON audit_logs ("Action");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_audit_logs_TenantId_TimestampUtc" ON audit_logs ("TenantId", "TimestampUtc");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_audit_logs_UserId" ON audit_logs ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_features_Code" ON features ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_features_ModuleId" ON features ("ModuleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_industries_Code" ON industries ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_industry_features_FeatureId" ON industry_features ("FeatureId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_industry_features_IndustryId_FeatureId" ON industry_features ("IndustryId", "FeatureId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_industry_modules_IndustryId_ModuleId" ON industry_modules ("IndustryId", "ModuleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_industry_modules_ModuleId" ON industry_modules ("ModuleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_modules_Code" ON modules ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_permissions_Code" ON permissions ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_permissions_FeatureId" ON permissions ("FeatureId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_permissions_SubFeatureId" ON permissions ("SubFeatureId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_plan_entitlements_FeatureId" ON plan_entitlements ("FeatureId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_plan_entitlements_PlanId_FeatureId" ON plan_entitlements ("PlanId", "FeatureId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_plans_Code" ON plans ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_plans_DisplayOrder" ON plans ("DisplayOrder");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_plans_IsActive" ON plans ("IsActive");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_refresh_tokens_TokenHash" ON refresh_tokens ("TokenHash");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_refresh_tokens_UserId" ON refresh_tokens ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_role_permissions_PermissionId" ON role_permissions ("PermissionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_role_permissions_RoleId_PermissionId" ON role_permissions ("RoleId", "PermissionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_roles_TenantId_Code" ON roles ("TenantId", "Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_sub_features_Code" ON sub_features ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_sub_features_FeatureId" ON sub_features ("FeatureId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_tenant_branches_TenantId_BranchCode" ON tenant_branches ("TenantId", "BranchCode");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_tenant_branches_TenantId_IsActive" ON tenant_branches ("TenantId", "IsActive");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_tenant_industry_configs_IndustryId" ON tenant_industry_configs ("IndustryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_tenant_industry_configs_TenantId_IndustryId" ON tenant_industry_configs ("TenantId", "IndustryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_tenant_settings_TenantId_Category_Key" ON tenant_settings ("TenantId", "Category", "Key");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_tenant_subscription_add_ons_AddOnId" ON tenant_subscription_add_ons ("AddOnId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_tenant_subscription_add_ons_TenantSubscriptionId" ON tenant_subscription_add_ons ("TenantSubscriptionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_tenant_subscriptions_EndsAtUtc" ON tenant_subscriptions ("EndsAtUtc");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_tenant_subscriptions_PlanId" ON tenant_subscriptions ("PlanId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_tenant_subscriptions_TenantId_Status" ON tenant_subscriptions ("TenantId", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_tenant_warehouses_BranchId" ON tenant_warehouses ("BranchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_tenant_warehouses_TenantId_WarehouseCode" ON tenant_warehouses ("TenantId", "WarehouseCode");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_tenants_Code" ON tenants ("Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_tenants_CreatedAtUtc" ON tenants ("CreatedAtUtc");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_tenants_IndustryId" ON tenants ("IndustryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_tenants_IsActive" ON tenants ("IsActive");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_tenants_Status" ON tenants ("Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_user_permissions_PermissionId" ON user_permissions ("PermissionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_user_permissions_UserId_PermissionId" ON user_permissions ("UserId", "PermissionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_user_roles_RoleId" ON user_roles ("RoleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_user_roles_UserId_RoleId" ON user_roles ("UserId", "RoleId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_users_Email" ON users ("Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_users_IsActive" ON users ("IsActive");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE INDEX "IX_users_IsSuperAdmin" ON users ("IsSuperAdmin");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_users_TenantId_Email" ON users ("TenantId", "Email");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830171243_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260830171243_InitialCreate', '9.0.2');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    ALTER TABLE users ALTER COLUMN "TenantId" DROP NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE TABLE brands (
        "Id" uuid NOT NULL,
        "Code" character varying(50) NOT NULL,
        "Name" character varying(150) NOT NULL,
        "ManufacturerName" character varying(200),
        "Description" text,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_brands" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE TABLE categories (
        "Id" uuid NOT NULL,
        "ParentCategoryId" uuid,
        "Code" character varying(50) NOT NULL,
        "Name" character varying(150) NOT NULL,
        "Description" character varying(500),
        "DisplayOrder" integer NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_categories" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_categories_categories_ParentCategoryId" FOREIGN KEY ("ParentCategoryId") REFERENCES categories ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE TABLE units_of_measure (
        "Id" uuid NOT NULL,
        "Code" character varying(20) NOT NULL,
        "Name" character varying(100) NOT NULL,
        "Symbol" character varying(20) NOT NULL,
        "DecimalPlaces" integer NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_units_of_measure" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE TABLE items (
        "Id" uuid NOT NULL,
        "Sku" character varying(100) NOT NULL,
        "Name" character varying(250) NOT NULL,
        "ShortDescription" text,
        "Barcode" character varying(100),
        "ItemType" integer NOT NULL,
        "CategoryId" uuid,
        "BrandId" uuid,
        "PrimaryUomId" uuid NOT NULL,
        "SecondaryUomId" uuid,
        "ConversionRatio" numeric(18,4),
        "HSNCode" character varying(20),
        "TaxRate" numeric(5,2) NOT NULL,
        "CessRate" numeric(5,2) NOT NULL,
        "IsTaxInclusive" boolean NOT NULL,
        "PurchasePrice" numeric(18,4) NOT NULL,
        "SellingPrice" numeric(18,4) NOT NULL,
        "MRP" numeric(18,4) NOT NULL,
        "MinimumSellingPrice" numeric(18,4) NOT NULL,
        "MinimumStockAlert" numeric(18,4) NOT NULL,
        "MaximumStockAlert" numeric(18,4) NOT NULL,
        "ReorderQuantity" numeric(18,4) NOT NULL,
        "TrackBatches" boolean NOT NULL,
        "TrackSerialNumbers" boolean NOT NULL,
        "TrackVariants" boolean NOT NULL,
        "AttributesJson" jsonb NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_items" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_items_brands_BrandId" FOREIGN KEY ("BrandId") REFERENCES brands ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_items_categories_CategoryId" FOREIGN KEY ("CategoryId") REFERENCES categories ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_items_units_of_measure_PrimaryUomId" FOREIGN KEY ("PrimaryUomId") REFERENCES units_of_measure ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_items_units_of_measure_SecondaryUomId" FOREIGN KEY ("SecondaryUomId") REFERENCES units_of_measure ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE TABLE unit_conversions (
        "Id" uuid NOT NULL,
        "FromUomId" uuid NOT NULL,
        "ToUomId" uuid NOT NULL,
        "ConversionFactor" numeric(18,4) NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_unit_conversions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_unit_conversions_units_of_measure_FromUomId" FOREIGN KEY ("FromUomId") REFERENCES units_of_measure ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_unit_conversions_units_of_measure_ToUomId" FOREIGN KEY ("ToUomId") REFERENCES units_of_measure ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE TABLE item_batches (
        "Id" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "BatchNumber" character varying(100) NOT NULL,
        "ManufacturingDate" timestamp with time zone,
        "ExpiryDate" timestamp with time zone NOT NULL,
        "MRP" numeric(18,4) NOT NULL,
        "PurchaseRate" numeric(18,4) NOT NULL,
        "SaleRate" numeric(18,4) NOT NULL,
        "Barcode" character varying(100),
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_item_batches" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_item_batches_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE TABLE item_variants (
        "Id" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "VariantSku" character varying(100) NOT NULL,
        "VariantName" character varying(150) NOT NULL,
        "AttributesJson" jsonb NOT NULL,
        "PriceAdjustment" numeric(18,4) NOT NULL,
        "Barcode" character varying(100),
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_item_variants" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_item_variants_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE TABLE item_serial_numbers (
        "Id" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "BatchId" uuid,
        "WarehouseId" uuid NOT NULL,
        "SerialNumber" character varying(150) NOT NULL,
        "Status" character varying(50) NOT NULL,
        "WarrantyExpiresAt" timestamp with time zone,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_item_serial_numbers" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_item_serial_numbers_item_batches_BatchId" FOREIGN KEY ("BatchId") REFERENCES item_batches ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_item_serial_numbers_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_item_serial_numbers_tenant_warehouses_WarehouseId" FOREIGN KEY ("WarehouseId") REFERENCES tenant_warehouses ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE TABLE item_warehouse_stocks (
        "Id" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "WarehouseId" uuid NOT NULL,
        "BatchId" uuid,
        "CurrentQuantity" numeric(18,4) NOT NULL,
        "ReservedQuantity" numeric(18,4) NOT NULL,
        "ReorderLevel" numeric(18,4) NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_item_warehouse_stocks" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_item_warehouse_stocks_item_batches_BatchId" FOREIGN KEY ("BatchId") REFERENCES item_batches ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_item_warehouse_stocks_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_item_warehouse_stocks_tenant_warehouses_WarehouseId" FOREIGN KEY ("WarehouseId") REFERENCES tenant_warehouses ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE TABLE stock_movements (
        "Id" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "WarehouseId" uuid NOT NULL,
        "BatchId" uuid,
        "MovementType" integer NOT NULL,
        "Quantity" numeric(18,4) NOT NULL,
        "QuantityBefore" numeric(18,4) NOT NULL,
        "QuantityAfter" numeric(18,4) NOT NULL,
        "UnitCost" numeric(18,4) NOT NULL,
        "TotalCost" numeric(18,4) NOT NULL,
        "ReferenceDocumentType" character varying(100),
        "ReferenceDocumentId" uuid,
        "ReferenceDocumentNumber" character varying(100),
        "Notes" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_stock_movements" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_stock_movements_item_batches_BatchId" FOREIGN KEY ("BatchId") REFERENCES item_batches ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_stock_movements_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_stock_movements_tenant_warehouses_WarehouseId" FOREIGN KEY ("WarehouseId") REFERENCES tenant_warehouses ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE UNIQUE INDEX "IX_brands_TenantId_Code" ON brands ("TenantId", "Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_categories_ParentCategoryId" ON categories ("ParentCategoryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE UNIQUE INDEX "IX_categories_TenantId_Code" ON categories ("TenantId", "Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_item_batches_ItemId" ON item_batches ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_item_batches_TenantId_ExpiryDate" ON item_batches ("TenantId", "ExpiryDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE UNIQUE INDEX "IX_item_batches_TenantId_ItemId_BatchNumber" ON item_batches ("TenantId", "ItemId", "BatchNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_item_serial_numbers_BatchId" ON item_serial_numbers ("BatchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_item_serial_numbers_ItemId" ON item_serial_numbers ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE UNIQUE INDEX "IX_item_serial_numbers_TenantId_ItemId_SerialNumber" ON item_serial_numbers ("TenantId", "ItemId", "SerialNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_item_serial_numbers_WarehouseId" ON item_serial_numbers ("WarehouseId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_item_variants_ItemId" ON item_variants ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE UNIQUE INDEX "IX_item_variants_TenantId_ItemId_VariantSku" ON item_variants ("TenantId", "ItemId", "VariantSku");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_item_warehouse_stocks_BatchId" ON item_warehouse_stocks ("BatchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_item_warehouse_stocks_ItemId" ON item_warehouse_stocks ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE UNIQUE INDEX "IX_item_warehouse_stocks_TenantId_ItemId_WarehouseId_BatchId" ON item_warehouse_stocks ("TenantId", "ItemId", "WarehouseId", "BatchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_item_warehouse_stocks_WarehouseId" ON item_warehouse_stocks ("WarehouseId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_items_BrandId" ON items ("BrandId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_items_CategoryId" ON items ("CategoryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_items_PrimaryUomId" ON items ("PrimaryUomId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_items_SecondaryUomId" ON items ("SecondaryUomId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_items_TenantId_Barcode" ON items ("TenantId", "Barcode");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_items_TenantId_BrandId" ON items ("TenantId", "BrandId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_items_TenantId_CategoryId" ON items ("TenantId", "CategoryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE UNIQUE INDEX "IX_items_TenantId_Sku" ON items ("TenantId", "Sku");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_stock_movements_BatchId" ON stock_movements ("BatchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_stock_movements_ItemId" ON stock_movements ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_stock_movements_TenantId_CreatedAtUtc" ON stock_movements ("TenantId", "CreatedAtUtc");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_stock_movements_TenantId_ItemId_WarehouseId" ON stock_movements ("TenantId", "ItemId", "WarehouseId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_stock_movements_WarehouseId" ON stock_movements ("WarehouseId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_unit_conversions_FromUomId" ON unit_conversions ("FromUomId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE UNIQUE INDEX "IX_unit_conversions_TenantId_FromUomId_ToUomId" ON unit_conversions ("TenantId", "FromUomId", "ToUomId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE INDEX "IX_unit_conversions_ToUomId" ON unit_conversions ("ToUomId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    CREATE UNIQUE INDEX "IX_units_of_measure_TenantId_Code" ON units_of_measure ("TenantId", "Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830180531_AddInventoryCatalogEngine') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260830180531_AddInventoryCatalogEngine', '9.0.2');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830185917_AddPartyLedgerEngine') THEN
    CREATE TABLE parties (
        "Id" uuid NOT NULL,
        "Code" character varying(50) NOT NULL,
        "LegalName" character varying(200) NOT NULL,
        "TradeName" character varying(200),
        "ContactPersonName" character varying(150),
        "PartyType" integer NOT NULL,
        "CustomerType" integer,
        "SupplierType" integer,
        "Email" character varying(150),
        "PrimaryPhone" character varying(30),
        "Mobile" character varying(30),
        "SecondaryPhone" character varying(30),
        "Website" character varying(150),
        "GSTIN" character varying(20),
        "StateCode" character varying(5),
        "PAN" character varying(15),
        "TAN" character varying(20),
        "IsCompositionScheme" boolean NOT NULL,
        "DrugLicenseNumber1" character varying(100),
        "DrugLicenseNumber2" character varying(100),
        "FSSAINumber" character varying(50),
        "CreditLimit" numeric(18,4) NOT NULL,
        "CreditPeriodDays" integer NOT NULL,
        "IsCreditBlocked" boolean NOT NULL,
        "PriceTier" text,
        "OpeningBalance" numeric(18,4) NOT NULL,
        "OpeningBalanceType" integer NOT NULL,
        "OpeningBalanceDate" timestamp with time zone,
        "CurrentOutstandingBalance" numeric(18,4) NOT NULL,
        "AttributesJson" jsonb NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_parties" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830185917_AddPartyLedgerEngine') THEN
    CREATE TABLE party_addresses (
        "Id" uuid NOT NULL,
        "PartyId" uuid NOT NULL,
        "AddressType" integer NOT NULL,
        "Label" character varying(100),
        "AddressLine1" character varying(250) NOT NULL,
        "AddressLine2" character varying(250),
        "City" character varying(100) NOT NULL,
        "State" character varying(100) NOT NULL,
        "StateCode" character varying(5) NOT NULL,
        "Pincode" character varying(20) NOT NULL,
        "Country" character varying(100) NOT NULL,
        "ContactPerson" character varying(150),
        "ContactPhone" character varying(30),
        "IsDefault" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_party_addresses" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_party_addresses_parties_PartyId" FOREIGN KEY ("PartyId") REFERENCES parties ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830185917_AddPartyLedgerEngine') THEN
    CREATE TABLE party_ledger_entries (
        "Id" uuid NOT NULL,
        "PartyId" uuid NOT NULL,
        "TransactionDate" timestamp with time zone NOT NULL,
        "EntryType" integer NOT NULL,
        "DebitAmount" numeric(18,4) NOT NULL,
        "CreditAmount" numeric(18,4) NOT NULL,
        "RunningBalance" numeric(18,4) NOT NULL,
        "ReferenceDocumentType" character varying(100),
        "ReferenceDocumentId" uuid,
        "ReferenceDocumentNumber" character varying(100),
        "PaymentMode" character varying(50),
        "Description" character varying(500),
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_party_ledger_entries" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_party_ledger_entries_parties_PartyId" FOREIGN KEY ("PartyId") REFERENCES parties ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830185917_AddPartyLedgerEngine') THEN
    CREATE UNIQUE INDEX "IX_parties_TenantId_Code" ON parties ("TenantId", "Code");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830185917_AddPartyLedgerEngine') THEN
    CREATE INDEX "IX_parties_TenantId_GSTIN" ON parties ("TenantId", "GSTIN");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830185917_AddPartyLedgerEngine') THEN
    CREATE INDEX "IX_parties_TenantId_LegalName" ON parties ("TenantId", "LegalName");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830185917_AddPartyLedgerEngine') THEN
    CREATE INDEX "IX_parties_TenantId_Mobile" ON parties ("TenantId", "Mobile");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830185917_AddPartyLedgerEngine') THEN
    CREATE INDEX "IX_parties_TenantId_PartyType" ON parties ("TenantId", "PartyType");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830185917_AddPartyLedgerEngine') THEN
    CREATE INDEX "IX_party_addresses_PartyId" ON party_addresses ("PartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830185917_AddPartyLedgerEngine') THEN
    CREATE INDEX "IX_party_addresses_TenantId_PartyId" ON party_addresses ("TenantId", "PartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830185917_AddPartyLedgerEngine') THEN
    CREATE INDEX "IX_party_ledger_entries_PartyId" ON party_ledger_entries ("PartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830185917_AddPartyLedgerEngine') THEN
    CREATE INDEX "IX_party_ledger_entries_TenantId_PartyId_TransactionDate" ON party_ledger_entries ("TenantId", "PartyId", "TransactionDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830185917_AddPartyLedgerEngine') THEN
    CREATE INDEX "IX_party_ledger_entries_TenantId_TransactionDate" ON party_ledger_entries ("TenantId", "TransactionDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830185917_AddPartyLedgerEngine') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260830185917_AddPartyLedgerEngine', '9.0.2');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE TABLE sales_invoices (
        "Id" uuid NOT NULL,
        "InvoiceNumber" character varying(100) NOT NULL,
        "InvoiceType" integer NOT NULL,
        "Status" integer NOT NULL,
        "BranchId" uuid NOT NULL,
        "WarehouseId" uuid NOT NULL,
        "PartyId" uuid,
        "CustomerName" character varying(200) NOT NULL,
        "CustomerPhone" character varying(30),
        "CustomerEmail" character varying(150),
        "CustomerGSTIN" character varying(20),
        "CustomerPAN" character varying(15),
        "BillingAddress" character varying(500),
        "ShippingAddress" character varying(500),
        "BillingStateCode" character varying(5) NOT NULL,
        "ShippingStateCode" character varying(5) NOT NULL,
        "PlaceOfSupply" character varying(100) NOT NULL,
        "InvoiceDate" timestamp with time zone NOT NULL,
        "DueDate" timestamp with time zone,
        "TaxSupplyType" integer NOT NULL,
        "SubTotal" numeric(18,4) NOT NULL,
        "ItemDiscountTotal" numeric(18,4) NOT NULL,
        "InvoiceDiscountPercent" numeric(18,4) NOT NULL,
        "InvoiceDiscountAmount" numeric(18,4) NOT NULL,
        "TaxableAmount" numeric(18,4) NOT NULL,
        "CgstAmount" numeric(18,4) NOT NULL,
        "SgstAmount" numeric(18,4) NOT NULL,
        "IgstAmount" numeric(18,4) NOT NULL,
        "CessAmount" numeric(18,4) NOT NULL,
        "RoundOff" numeric(18,4) NOT NULL,
        "TotalAmount" numeric(18,4) NOT NULL,
        "PaidAmount" numeric(18,4) NOT NULL,
        "BalanceAmount" numeric(18,4) NOT NULL,
        "PrimaryPaymentMode" integer NOT NULL,
        "PaymentStatus" integer NOT NULL,
        "PaymentReferenceNumber" character varying(100),
        "Notes" character varying(1000),
        "TermsAndConditions" character varying(2000),
        "AttributesJson" jsonb NOT NULL,
        "IsCancelled" boolean NOT NULL,
        "CancellationReason" character varying(500),
        "CancelledAtUtc" timestamp with time zone,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_sales_invoices" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_sales_invoices_parties_PartyId" FOREIGN KEY ("PartyId") REFERENCES parties ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_sales_invoices_tenant_branches_BranchId" FOREIGN KEY ("BranchId") REFERENCES tenant_branches ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_sales_invoices_tenant_warehouses_WarehouseId" FOREIGN KEY ("WarehouseId") REFERENCES tenant_warehouses ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE TABLE sales_invoice_items (
        "Id" uuid NOT NULL,
        "InvoiceId" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "ItemSku" character varying(100) NOT NULL,
        "ItemName" character varying(200) NOT NULL,
        "HsnCode" character varying(20),
        "Barcode" character varying(100),
        "BatchId" uuid,
        "BatchNumber" character varying(100),
        "ExpiryDate" timestamp with time zone,
        "Quantity" numeric(18,4) NOT NULL,
        "UomId" uuid NOT NULL,
        "UomCode" character varying(20) NOT NULL,
        "UnitPrice" numeric(18,4) NOT NULL,
        "Mrp" numeric(18,4) NOT NULL,
        "PurchasePrice" numeric(18,4) NOT NULL,
        "DiscountPercent" numeric(18,4) NOT NULL,
        "DiscountAmount" numeric(18,4) NOT NULL,
        "TaxableAmount" numeric(18,4) NOT NULL,
        "GstRate" numeric(18,4) NOT NULL,
        "CgstRate" numeric(18,4) NOT NULL,
        "CgstAmount" numeric(18,4) NOT NULL,
        "SgstRate" numeric(18,4) NOT NULL,
        "SgstAmount" numeric(18,4) NOT NULL,
        "IgstRate" numeric(18,4) NOT NULL,
        "IgstAmount" numeric(18,4) NOT NULL,
        "CessRate" numeric(18,4) NOT NULL,
        "CessAmount" numeric(18,4) NOT NULL,
        "TotalAmount" numeric(18,4) NOT NULL,
        "AttributesJson" jsonb NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_sales_invoice_items" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_sales_invoice_items_item_batches_BatchId" FOREIGN KEY ("BatchId") REFERENCES item_batches ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_sales_invoice_items_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_sales_invoice_items_sales_invoices_InvoiceId" FOREIGN KEY ("InvoiceId") REFERENCES sales_invoices ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_sales_invoice_items_units_of_measure_UomId" FOREIGN KEY ("UomId") REFERENCES units_of_measure ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE TABLE sales_invoice_payments (
        "Id" uuid NOT NULL,
        "InvoiceId" uuid NOT NULL,
        "PaymentDate" timestamp with time zone NOT NULL,
        "Amount" numeric(18,4) NOT NULL,
        "PaymentMode" integer NOT NULL,
        "TransactionReference" character varying(100),
        "Notes" character varying(500),
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_sales_invoice_payments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_sales_invoice_payments_sales_invoices_InvoiceId" FOREIGN KEY ("InvoiceId") REFERENCES sales_invoices ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE INDEX "IX_sales_invoice_items_BatchId" ON sales_invoice_items ("BatchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE INDEX "IX_sales_invoice_items_InvoiceId" ON sales_invoice_items ("InvoiceId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE INDEX "IX_sales_invoice_items_ItemId" ON sales_invoice_items ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE INDEX "IX_sales_invoice_items_TenantId_InvoiceId" ON sales_invoice_items ("TenantId", "InvoiceId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE INDEX "IX_sales_invoice_items_TenantId_ItemId" ON sales_invoice_items ("TenantId", "ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE INDEX "IX_sales_invoice_items_UomId" ON sales_invoice_items ("UomId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE INDEX "IX_sales_invoice_payments_InvoiceId" ON sales_invoice_payments ("InvoiceId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE INDEX "IX_sales_invoice_payments_TenantId_InvoiceId" ON sales_invoice_payments ("TenantId", "InvoiceId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE INDEX "IX_sales_invoices_BranchId" ON sales_invoices ("BranchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE INDEX "IX_sales_invoices_PartyId" ON sales_invoices ("PartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE INDEX "IX_sales_invoices_TenantId_BranchId_InvoiceDate" ON sales_invoices ("TenantId", "BranchId", "InvoiceDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE INDEX "IX_sales_invoices_TenantId_InvoiceDate" ON sales_invoices ("TenantId", "InvoiceDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE UNIQUE INDEX "IX_sales_invoices_TenantId_InvoiceNumber" ON sales_invoices ("TenantId", "InvoiceNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE INDEX "IX_sales_invoices_TenantId_PartyId" ON sales_invoices ("TenantId", "PartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE INDEX "IX_sales_invoices_TenantId_Status" ON sales_invoices ("TenantId", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    CREATE INDEX "IX_sales_invoices_WarehouseId" ON sales_invoices ("WarehouseId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830190701_AddSalesInvoiceEngine') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260830190701_AddSalesInvoiceEngine', '9.0.2');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE TABLE purchase_orders (
        "Id" uuid NOT NULL,
        "OrderNumber" character varying(50) NOT NULL,
        "Status" integer NOT NULL,
        "BranchId" uuid NOT NULL,
        "WarehouseId" uuid NOT NULL,
        "PartyId" uuid NOT NULL,
        "SupplierName" character varying(200) NOT NULL,
        "SupplierPhone" character varying(30),
        "SupplierGSTIN" character varying(15),
        "SupplierAddress" character varying(500),
        "OrderDate" timestamp with time zone NOT NULL,
        "ExpectedDeliveryDate" timestamp with time zone,
        "TaxSupplyType" integer NOT NULL,
        "SupplierStateCode" character varying(10) NOT NULL,
        "PlaceOfSupply" character varying(100) NOT NULL,
        "SubTotal" numeric(18,4) NOT NULL,
        "DiscountTotal" numeric(18,4) NOT NULL,
        "TaxableAmount" numeric(18,4) NOT NULL,
        "CgstAmount" numeric(18,4) NOT NULL,
        "SgstAmount" numeric(18,4) NOT NULL,
        "IgstAmount" numeric(18,4) NOT NULL,
        "CessAmount" numeric(18,4) NOT NULL,
        "RoundOff" numeric(18,4) NOT NULL,
        "TotalAmount" numeric(18,4) NOT NULL,
        "Notes" text,
        "TermsAndConditions" text,
        "AttributesJson" jsonb NOT NULL,
        "IsCancelled" boolean NOT NULL,
        "CancellationReason" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_purchase_orders" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_purchase_orders_parties_PartyId" FOREIGN KEY ("PartyId") REFERENCES parties ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchase_orders_tenant_branches_BranchId" FOREIGN KEY ("BranchId") REFERENCES tenant_branches ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchase_orders_tenant_warehouses_WarehouseId" FOREIGN KEY ("WarehouseId") REFERENCES tenant_warehouses ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE TABLE goods_receipt_notes (
        "Id" uuid NOT NULL,
        "GrnNumber" character varying(50) NOT NULL,
        "Status" integer NOT NULL,
        "PurchaseOrderId" uuid,
        "BranchId" uuid NOT NULL,
        "WarehouseId" uuid NOT NULL,
        "PartyId" uuid NOT NULL,
        "SupplierName" character varying(200) NOT NULL,
        "DeliveryChallanNumber" character varying(100),
        "DeliveryChallanDate" timestamp with time zone,
        "ReceivedDate" timestamp with time zone NOT NULL,
        "ReceivedBy" character varying(100),
        "Remarks" text,
        "IsCancelled" boolean NOT NULL,
        "CancellationReason" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_goods_receipt_notes" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_goods_receipt_notes_parties_PartyId" FOREIGN KEY ("PartyId") REFERENCES parties ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_goods_receipt_notes_purchase_orders_PurchaseOrderId" FOREIGN KEY ("PurchaseOrderId") REFERENCES purchase_orders ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_goods_receipt_notes_tenant_branches_BranchId" FOREIGN KEY ("BranchId") REFERENCES tenant_branches ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_goods_receipt_notes_tenant_warehouses_WarehouseId" FOREIGN KEY ("WarehouseId") REFERENCES tenant_warehouses ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE TABLE purchase_order_items (
        "Id" uuid NOT NULL,
        "PurchaseOrderId" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "ItemSku" character varying(50) NOT NULL,
        "ItemName" character varying(200) NOT NULL,
        "HsnCode" character varying(20),
        "OrderQuantity" numeric(18,4) NOT NULL,
        "ReceivedQuantity" numeric(18,4) NOT NULL,
        "UomId" uuid NOT NULL,
        "UomCode" character varying(20) NOT NULL,
        "UnitPrice" numeric(18,4) NOT NULL,
        "DiscountPercent" numeric(5,2) NOT NULL,
        "DiscountAmount" numeric(18,4) NOT NULL,
        "TaxableAmount" numeric(18,4) NOT NULL,
        "GstRate" numeric(5,2) NOT NULL,
        "CgstRate" numeric(5,2) NOT NULL,
        "CgstAmount" numeric(18,4) NOT NULL,
        "SgstRate" numeric(5,2) NOT NULL,
        "SgstAmount" numeric(18,4) NOT NULL,
        "IgstRate" numeric(5,2) NOT NULL,
        "IgstAmount" numeric(18,4) NOT NULL,
        "CessRate" numeric(5,2) NOT NULL,
        "CessAmount" numeric(18,4) NOT NULL,
        "TotalAmount" numeric(18,4) NOT NULL,
        "AttributesJson" jsonb NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_purchase_order_items" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_purchase_order_items_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchase_order_items_purchase_orders_PurchaseOrderId" FOREIGN KEY ("PurchaseOrderId") REFERENCES purchase_orders ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_purchase_order_items_units_of_measure_UomId" FOREIGN KEY ("UomId") REFERENCES units_of_measure ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE TABLE purchase_bills (
        "Id" uuid NOT NULL,
        "BillNumber" character varying(50) NOT NULL,
        "VendorInvoiceNumber" character varying(100),
        "Status" integer NOT NULL,
        "PurchaseOrderId" uuid,
        "GoodsReceiptNoteId" uuid,
        "BranchId" uuid NOT NULL,
        "WarehouseId" uuid NOT NULL,
        "PartyId" uuid NOT NULL,
        "SupplierName" character varying(200) NOT NULL,
        "SupplierGSTIN" character varying(15),
        "SupplierAddress" character varying(500),
        "SupplierStateCode" character varying(10) NOT NULL,
        "PlaceOfSupply" character varying(100) NOT NULL,
        "BillDate" timestamp with time zone NOT NULL,
        "DueDate" timestamp with time zone,
        "TaxSupplyType" integer NOT NULL,
        "SubTotal" numeric(18,4) NOT NULL,
        "DiscountTotal" numeric(18,4) NOT NULL,
        "TaxableAmount" numeric(18,4) NOT NULL,
        "CgstAmount" numeric(18,4) NOT NULL,
        "SgstAmount" numeric(18,4) NOT NULL,
        "IgstAmount" numeric(18,4) NOT NULL,
        "CessAmount" numeric(18,4) NOT NULL,
        "RoundOff" numeric(18,4) NOT NULL,
        "TotalAmount" numeric(18,4) NOT NULL,
        "PaidAmount" numeric(18,4) NOT NULL,
        "BalanceAmount" numeric(18,4) NOT NULL,
        "PaymentStatus" integer NOT NULL,
        "PrimaryPaymentMode" integer NOT NULL,
        "Notes" text,
        "AttributesJson" jsonb NOT NULL,
        "IsCancelled" boolean NOT NULL,
        "CancellationReason" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_purchase_bills" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_purchase_bills_goods_receipt_notes_GoodsReceiptNoteId" FOREIGN KEY ("GoodsReceiptNoteId") REFERENCES goods_receipt_notes ("Id"),
        CONSTRAINT "FK_purchase_bills_parties_PartyId" FOREIGN KEY ("PartyId") REFERENCES parties ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchase_bills_purchase_orders_PurchaseOrderId" FOREIGN KEY ("PurchaseOrderId") REFERENCES purchase_orders ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_purchase_bills_tenant_branches_BranchId" FOREIGN KEY ("BranchId") REFERENCES tenant_branches ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchase_bills_tenant_warehouses_WarehouseId" FOREIGN KEY ("WarehouseId") REFERENCES tenant_warehouses ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE TABLE goods_receipt_note_items (
        "Id" uuid NOT NULL,
        "GoodsReceiptNoteId" uuid NOT NULL,
        "PurchaseOrderItemId" uuid,
        "ItemId" uuid NOT NULL,
        "ItemSku" character varying(50) NOT NULL,
        "ItemName" character varying(200) NOT NULL,
        "BatchId" uuid,
        "BatchNumber" character varying(100),
        "ManufacturingDate" timestamp with time zone,
        "ExpiryDate" timestamp with time zone,
        "ReceivedQuantity" numeric(18,4) NOT NULL,
        "AcceptedQuantity" numeric(18,4) NOT NULL,
        "RejectedQuantity" numeric(18,4) NOT NULL,
        "UomId" uuid NOT NULL,
        "UomCode" character varying(20) NOT NULL,
        "UnitCost" numeric(18,4) NOT NULL,
        "TotalCost" numeric(18,4) NOT NULL,
        "RejectionReason" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_goods_receipt_note_items" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_goods_receipt_note_items_goods_receipt_notes_GoodsReceiptNo~" FOREIGN KEY ("GoodsReceiptNoteId") REFERENCES goods_receipt_notes ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_goods_receipt_note_items_item_batches_BatchId" FOREIGN KEY ("BatchId") REFERENCES item_batches ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_goods_receipt_note_items_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_goods_receipt_note_items_purchase_order_items_PurchaseOrder~" FOREIGN KEY ("PurchaseOrderItemId") REFERENCES purchase_order_items ("Id"),
        CONSTRAINT "FK_goods_receipt_note_items_units_of_measure_UomId" FOREIGN KEY ("UomId") REFERENCES units_of_measure ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE TABLE purchase_bill_items (
        "Id" uuid NOT NULL,
        "PurchaseBillId" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "ItemSku" character varying(50) NOT NULL,
        "ItemName" character varying(200) NOT NULL,
        "HsnCode" character varying(20),
        "BatchId" uuid,
        "BatchNumber" character varying(100),
        "Quantity" numeric(18,4) NOT NULL,
        "UomId" uuid NOT NULL,
        "UomCode" character varying(20) NOT NULL,
        "UnitPrice" numeric(18,4) NOT NULL,
        "DiscountPercent" numeric(5,2) NOT NULL,
        "DiscountAmount" numeric(18,4) NOT NULL,
        "TaxableAmount" numeric(18,4) NOT NULL,
        "GstRate" numeric(5,2) NOT NULL,
        "CgstRate" numeric(5,2) NOT NULL,
        "CgstAmount" numeric(18,4) NOT NULL,
        "SgstRate" numeric(5,2) NOT NULL,
        "SgstAmount" numeric(18,4) NOT NULL,
        "IgstRate" numeric(5,2) NOT NULL,
        "IgstAmount" numeric(18,4) NOT NULL,
        "CessRate" numeric(5,2) NOT NULL,
        "CessAmount" numeric(18,4) NOT NULL,
        "TotalAmount" numeric(18,4) NOT NULL,
        "AttributesJson" jsonb NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_purchase_bill_items" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_purchase_bill_items_item_batches_BatchId" FOREIGN KEY ("BatchId") REFERENCES item_batches ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_purchase_bill_items_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchase_bill_items_purchase_bills_PurchaseBillId" FOREIGN KEY ("PurchaseBillId") REFERENCES purchase_bills ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_purchase_bill_items_units_of_measure_UomId" FOREIGN KEY ("UomId") REFERENCES units_of_measure ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE TABLE purchase_bill_payments (
        "Id" uuid NOT NULL,
        "PurchaseBillId" uuid NOT NULL,
        "PaymentDate" timestamp with time zone NOT NULL,
        "Amount" numeric(18,4) NOT NULL,
        "PaymentMode" integer NOT NULL,
        "TransactionReference" character varying(100),
        "BankName" character varying(100),
        "Notes" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_purchase_bill_payments" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_purchase_bill_payments_purchase_bills_PurchaseBillId" FOREIGN KEY ("PurchaseBillId") REFERENCES purchase_bills ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_goods_receipt_note_items_BatchId" ON goods_receipt_note_items ("BatchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_goods_receipt_note_items_GoodsReceiptNoteId" ON goods_receipt_note_items ("GoodsReceiptNoteId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_goods_receipt_note_items_ItemId" ON goods_receipt_note_items ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_goods_receipt_note_items_PurchaseOrderItemId" ON goods_receipt_note_items ("PurchaseOrderItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_goods_receipt_note_items_UomId" ON goods_receipt_note_items ("UomId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_goods_receipt_notes_BranchId" ON goods_receipt_notes ("BranchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_goods_receipt_notes_PartyId" ON goods_receipt_notes ("PartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_goods_receipt_notes_PurchaseOrderId" ON goods_receipt_notes ("PurchaseOrderId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE UNIQUE INDEX "IX_goods_receipt_notes_TenantId_GrnNumber" ON goods_receipt_notes ("TenantId", "GrnNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_goods_receipt_notes_TenantId_PurchaseOrderId" ON goods_receipt_notes ("TenantId", "PurchaseOrderId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_goods_receipt_notes_WarehouseId" ON goods_receipt_notes ("WarehouseId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_bill_items_BatchId" ON purchase_bill_items ("BatchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_bill_items_ItemId" ON purchase_bill_items ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_bill_items_PurchaseBillId" ON purchase_bill_items ("PurchaseBillId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_bill_items_UomId" ON purchase_bill_items ("UomId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_bill_payments_PurchaseBillId" ON purchase_bill_payments ("PurchaseBillId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_bill_payments_TenantId_PurchaseBillId_PaymentDate" ON purchase_bill_payments ("TenantId", "PurchaseBillId", "PaymentDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_bills_BranchId" ON purchase_bills ("BranchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_bills_GoodsReceiptNoteId" ON purchase_bills ("GoodsReceiptNoteId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_bills_PartyId" ON purchase_bills ("PartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_bills_PurchaseOrderId" ON purchase_bills ("PurchaseOrderId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE UNIQUE INDEX "IX_purchase_bills_TenantId_BillNumber" ON purchase_bills ("TenantId", "BillNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_bills_TenantId_PartyId_BillDate" ON purchase_bills ("TenantId", "PartyId", "BillDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_bills_WarehouseId" ON purchase_bills ("WarehouseId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_order_items_ItemId" ON purchase_order_items ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_order_items_PurchaseOrderId" ON purchase_order_items ("PurchaseOrderId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_order_items_UomId" ON purchase_order_items ("UomId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_orders_BranchId" ON purchase_orders ("BranchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_orders_PartyId" ON purchase_orders ("PartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE UNIQUE INDEX "IX_purchase_orders_TenantId_OrderNumber" ON purchase_orders ("TenantId", "OrderNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_orders_TenantId_PartyId_OrderDate" ON purchase_orders ("TenantId", "PartyId", "OrderDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    CREATE INDEX "IX_purchase_orders_WarehouseId" ON purchase_orders ("WarehouseId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830194118_AddPurchaseEngine') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260830194118_AddPurchaseEngine', '9.0.2');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830195822_AddQuotationsEngine') THEN
    CREATE TABLE quotations (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "QuotationNumber" character varying(50) NOT NULL,
        "Status" integer NOT NULL,
        "BranchId" uuid NOT NULL,
        "PartyId" uuid,
        "CustomerName" character varying(200) NOT NULL,
        "CustomerPhone" character varying(20),
        "CustomerEmail" character varying(150),
        "CustomerGSTIN" character varying(15),
        "BillingAddress" character varying(500),
        "ShippingAddress" character varying(500),
        "BillingStateCode" character varying(10) NOT NULL,
        "ShippingStateCode" character varying(10) NOT NULL,
        "PlaceOfSupply" character varying(100) NOT NULL,
        "QuotationDate" timestamp with time zone NOT NULL,
        "ValidUntilDate" timestamp with time zone,
        "TaxSupplyType" integer NOT NULL,
        "SubTotal" numeric(18,4) NOT NULL,
        "ItemDiscountTotal" numeric(18,4) NOT NULL,
        "QuotationDiscountPercent" numeric(18,4) NOT NULL,
        "QuotationDiscountAmount" numeric(18,4) NOT NULL,
        "TaxableAmount" numeric(18,4) NOT NULL,
        "CgstAmount" numeric(18,4) NOT NULL,
        "SgstAmount" numeric(18,4) NOT NULL,
        "IgstAmount" numeric(18,4) NOT NULL,
        "CessAmount" numeric(18,4) NOT NULL,
        "RoundOff" numeric(18,4) NOT NULL,
        "TotalAmount" numeric(18,4) NOT NULL,
        "ConvertedInvoiceId" uuid,
        "ConvertedAtUtc" timestamp with time zone,
        "Notes" character varying(1000),
        "TermsAndConditions" character varying(2000),
        "AttributesJson" jsonb NOT NULL,
        "IsCancelled" boolean NOT NULL,
        "CancellationReason" character varying(500),
        "CancelledAtUtc" timestamp with time zone,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_quotations" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_quotations_parties_PartyId" FOREIGN KEY ("PartyId") REFERENCES parties ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_quotations_sales_invoices_ConvertedInvoiceId" FOREIGN KEY ("ConvertedInvoiceId") REFERENCES sales_invoices ("Id") ON DELETE SET NULL,
        CONSTRAINT "FK_quotations_tenant_branches_BranchId" FOREIGN KEY ("BranchId") REFERENCES tenant_branches ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830195822_AddQuotationsEngine') THEN
    CREATE TABLE quotation_items (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "QuotationId" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "ItemSku" character varying(100) NOT NULL,
        "ItemName" character varying(200) NOT NULL,
        "HsnCode" character varying(20),
        "Quantity" numeric(18,4) NOT NULL,
        "UomId" uuid NOT NULL,
        "UnitPrice" numeric(18,4) NOT NULL,
        "DiscountPercent" numeric(18,4) NOT NULL,
        "DiscountAmount" numeric(18,4) NOT NULL,
        "TaxableAmount" numeric(18,4) NOT NULL,
        "GstRate" numeric(18,4) NOT NULL,
        "CgstRate" numeric(18,4) NOT NULL,
        "CgstAmount" numeric(18,4) NOT NULL,
        "SgstRate" numeric(18,4) NOT NULL,
        "SgstAmount" numeric(18,4) NOT NULL,
        "IgstRate" numeric(18,4) NOT NULL,
        "IgstAmount" numeric(18,4) NOT NULL,
        "CessRate" numeric(18,4) NOT NULL,
        "CessAmount" numeric(18,4) NOT NULL,
        "TotalAmount" numeric(18,4) NOT NULL,
        "AttributesJson" jsonb NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_quotation_items" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_quotation_items_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_quotation_items_quotations_QuotationId" FOREIGN KEY ("QuotationId") REFERENCES quotations ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_quotation_items_units_of_measure_UomId" FOREIGN KEY ("UomId") REFERENCES units_of_measure ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830195822_AddQuotationsEngine') THEN
    CREATE INDEX "IX_quotation_items_ItemId" ON quotation_items ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830195822_AddQuotationsEngine') THEN
    CREATE INDEX "IX_quotation_items_QuotationId" ON quotation_items ("QuotationId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830195822_AddQuotationsEngine') THEN
    CREATE INDEX "IX_quotation_items_UomId" ON quotation_items ("UomId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830195822_AddQuotationsEngine') THEN
    CREATE INDEX "IX_quotations_BranchId" ON quotations ("BranchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830195822_AddQuotationsEngine') THEN
    CREATE INDEX "IX_quotations_ConvertedInvoiceId" ON quotations ("ConvertedInvoiceId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830195822_AddQuotationsEngine') THEN
    CREATE INDEX "IX_quotations_PartyId" ON quotations ("PartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830195822_AddQuotationsEngine') THEN
    CREATE UNIQUE INDEX "IX_quotations_TenantId_QuotationNumber" ON quotations ("TenantId", "QuotationNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260830195822_AddQuotationsEngine') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260830195822_AddQuotationsEngine', '9.0.2');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    ALTER TABLE item_batches ADD "IsQuarantined" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    ALTER TABLE item_batches ADD "Ptr" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    ALTER TABLE item_batches ADD "Pts" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    ALTER TABLE item_batches ADD "QuarantinedStock" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    ALTER TABLE item_batches ADD "RackLocation" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    ALTER TABLE item_batches ADD "SupplierId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    ALTER TABLE add_ons ADD "AnnualPrice" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    CREATE TABLE "DoctorPrescribers" (
        "Id" uuid NOT NULL,
        "Code" text NOT NULL,
        "Name" text NOT NULL,
        "Qualification" text NOT NULL,
        "Specialization" text NOT NULL,
        "RegistrationNumber" text NOT NULL,
        "ClinicHospitalName" text NOT NULL,
        "Address" text NOT NULL,
        "City" text NOT NULL,
        "Mobile" text NOT NULL,
        "Email" text,
        "IncentivePercent" numeric NOT NULL,
        "AssignedMrName" text,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_DoctorPrescribers" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    CREATE TABLE "ExpiryReturnClaims" (
        "Id" uuid NOT NULL,
        "ClaimNumber" text NOT NULL,
        "SupplierId" uuid NOT NULL,
        "SupplierName" text NOT NULL,
        "ClaimDate" timestamp with time zone NOT NULL,
        "TotalClaimAmount" numeric NOT NULL,
        "Status" text NOT NULL,
        "SupplierCreditNoteNumber" text,
        "Notes" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_ExpiryReturnClaims" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    CREATE TABLE "PaymentGatewayConfigs" (
        "Id" uuid NOT NULL,
        "Provider" text NOT NULL,
        "KeyId" text NOT NULL,
        "KeySecret" text NOT NULL,
        "WebhookSecret" text,
        "Mode" text NOT NULL,
        "IsActive" boolean NOT NULL,
        "AdditionalSettingsJson" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_PaymentGatewayConfigs" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    CREATE TABLE "PlatformCompanyProfiles" (
        "Id" uuid NOT NULL,
        "LegalCompanyName" text NOT NULL,
        "ProductBrandName" text NOT NULL,
        "Tagline" text NOT NULL,
        "Gstin" text NOT NULL,
        "Pan" text NOT NULL,
        "State" text NOT NULL,
        "StateCode" text NOT NULL,
        "AddressLine1" text NOT NULL,
        "AddressLine2" text NOT NULL,
        "City" text NOT NULL,
        "Pincode" text NOT NULL,
        "SupportEmail" text NOT NULL,
        "SupportPhone" text NOT NULL,
        "Website" text NOT NULL,
        "BankName" text NOT NULL,
        "BankAccountNumber" text NOT NULL,
        "BankIfsc" text NOT NULL,
        "BankBranch" text NOT NULL,
        "UpiId" text,
        "UpiQrImageUrl" text,
        "LogoUrl" text,
        "SignatoryImageUrl" text,
        "AuthorizedSignatoryName" text NOT NULL,
        "AuthorizedSignatoryDesignation" text NOT NULL,
        "InvoicePrefix" text NOT NULL,
        "InvoiceTermsAndConditions" text NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_PlatformCompanyProfiles" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    CREATE TABLE "PlatformEmailConfigs" (
        "Id" uuid NOT NULL,
        "SmtpHost" text NOT NULL,
        "SmtpPort" integer NOT NULL,
        "SmtpUsername" text NOT NULL,
        "SmtpPassword" text NOT NULL,
        "FromEmail" text NOT NULL,
        "FromName" text NOT NULL,
        "ReplyToEmail" text,
        "EnableSsl" boolean NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_PlatformEmailConfigs" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    CREATE TABLE "PlatformPasswordResetOtps" (
        "Id" uuid NOT NULL,
        "Email" text NOT NULL,
        "OtpCode" text NOT NULL,
        "ExpiresAtUtc" timestamp with time zone NOT NULL,
        "IsUsed" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_PlatformPasswordResetOtps" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    CREATE TABLE "SaltMasters" (
        "Id" uuid NOT NULL,
        "SaltName" text NOT NULL,
        "TherapeuticCategory" text NOT NULL,
        "Description" text,
        "SideEffectsAlert" text,
        "IsHabitForming" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SaltMasters" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    CREATE TABLE "ScheduleH1RegisterEntries" (
        "Id" uuid NOT NULL,
        "InvoiceId" uuid NOT NULL,
        "InvoiceNumber" text NOT NULL,
        "SupplyDate" timestamp with time zone NOT NULL,
        "PatientName" text NOT NULL,
        "PatientAddressPhone" text NOT NULL,
        "PrescriberDoctorName" text NOT NULL,
        "PrescriberRegNumber" text NOT NULL,
        "DrugName" text NOT NULL,
        "BatchNumber" text NOT NULL,
        "QuantitySupplied" numeric NOT NULL,
        "ManufacturerName" text NOT NULL,
        "SignOffStatus" text NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_ScheduleH1RegisterEntries" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    CREATE TABLE "SubscriptionInvoices" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "InvoiceNumber" text NOT NULL,
        "InvoiceDate" timestamp with time zone NOT NULL,
        "TenantBusinessName" text NOT NULL,
        "TenantGstin" text,
        "TenantPan" text,
        "TenantBillingAddress" text,
        "TenantEmail" text,
        "TenantPhone" text,
        "ItemDescription" text NOT NULL,
        "PlanCode" text,
        "AddonCode" text,
        "BillingCycle" text NOT NULL,
        "DurationDays" integer NOT NULL,
        "SubTotal" numeric NOT NULL,
        "TaxRatePercent" numeric NOT NULL,
        "TaxAmount" numeric NOT NULL,
        "TotalAmount" numeric NOT NULL,
        "Currency" text NOT NULL,
        "IsInterState" boolean NOT NULL,
        "CgstRatePercent" numeric NOT NULL,
        "CgstAmount" numeric NOT NULL,
        "SgstRatePercent" numeric NOT NULL,
        "SgstAmount" numeric NOT NULL,
        "IgstRatePercent" numeric NOT NULL,
        "IgstAmount" numeric NOT NULL,
        "PlaceOfSupply" text,
        "SupplierLegalName" text,
        "SupplierGstin" text,
        "SupplierAddress" text,
        "SupplierStateCode" text,
        "SubscriberStateCode" text,
        "PaymentGateway" text NOT NULL,
        "GatewayOrderId" text,
        "GatewayPaymentId" text,
        "GatewaySignature" text,
        "PaymentStatus" text NOT NULL,
        "PaidAtUtc" timestamp with time zone,
        "Notes" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_SubscriptionInvoices" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    CREATE TABLE "ExpiryReturnClaimItems" (
        "Id" uuid NOT NULL,
        "ExpiryReturnClaimId" uuid NOT NULL,
        "ItemBatchId" uuid,
        "ItemName" text NOT NULL,
        "BatchNumber" text NOT NULL,
        "ExpiryDateMonthYear" text NOT NULL,
        "Quantity" numeric NOT NULL,
        "PurchaseRate" numeric NOT NULL,
        "ClaimAmount" numeric NOT NULL,
        "Reason" text NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_ExpiryReturnClaimItems" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ExpiryReturnClaimItems_ExpiryReturnClaims_ExpiryReturnClaim~" FOREIGN KEY ("ExpiryReturnClaimId") REFERENCES "ExpiryReturnClaims" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_ExpiryReturnClaimItems_item_batches_ItemBatchId" FOREIGN KEY ("ItemBatchId") REFERENCES item_batches ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    CREATE TABLE "ItemSaltCompositions" (
        "Id" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "SaltId" uuid NOT NULL,
        "Strength" text NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_ItemSaltCompositions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ItemSaltCompositions_SaltMasters_SaltId" FOREIGN KEY ("SaltId") REFERENCES "SaltMasters" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_ItemSaltCompositions_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    CREATE INDEX "IX_ExpiryReturnClaimItems_ExpiryReturnClaimId" ON "ExpiryReturnClaimItems" ("ExpiryReturnClaimId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    CREATE INDEX "IX_ExpiryReturnClaimItems_ItemBatchId" ON "ExpiryReturnClaimItems" ("ItemBatchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    CREATE INDEX "IX_ItemSaltCompositions_ItemId" ON "ItemSaltCompositions" ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    CREATE INDEX "IX_ItemSaltCompositions_SaltId" ON "ItemSaltCompositions" ("SaltId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260831185053_AddBankingAndExpenseEngine') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260831185053_AddBankingAndExpenseEngine', '9.0.2');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE tenants ADD "AddressLine1" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE tenants ADD "AddressLine2" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE tenants ADD "City" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE tenants ADD "Email" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE tenants ADD "Pincode" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE tenants ADD "SmtpEnableSsl" boolean;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE tenants ADD "SmtpFromEmail" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE tenants ADD "SmtpFromName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE tenants ADD "SmtpHost" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE tenants ADD "SmtpPassword" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE tenants ADD "SmtpPort" integer;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE tenants ADD "SmtpUsername" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE tenants ADD "State" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE tenants ADD "StateCode" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE tenants ADD "Website" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE "SubscriptionInvoices" ADD "InvoiceTermsAndConditions" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE "SubscriptionInvoices" ADD "SupplierBankAccountNumber" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE "SubscriptionInvoices" ADD "SupplierBankBranch" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE "SubscriptionInvoices" ADD "SupplierBankIfsc" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE "SubscriptionInvoices" ADD "SupplierBankName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE "SubscriptionInvoices" ADD "SupplierLogoUrl" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE "SubscriptionInvoices" ADD "SupplierSignatoryDesignation" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE "SubscriptionInvoices" ADD "SupplierSignatoryImageUrl" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE "SubscriptionInvoices" ADD "SupplierSignatoryName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE "SubscriptionInvoices" ADD "SupplierUpiId" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE sales_invoices ADD "EWayBillDate" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE sales_invoices ADD "EWayBillNumber" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE sales_invoices ADD "IsReverseCharge" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE sales_invoices ADD "LrDate" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE sales_invoices ADD "LrNumber" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE sales_invoices ADD "PoDate" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE sales_invoices ADD "PoNumber" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE sales_invoices ADD "TransporterId" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE sales_invoices ADD "TransporterName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE sales_invoices ADD "VehicleNumber" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    ALTER TABLE items ADD "TrackInventory" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE TABLE "AccountGroups" (
        "Id" uuid NOT NULL,
        "Code" text NOT NULL,
        "Name" text NOT NULL,
        "Category" text NOT NULL,
        "Nature" text NOT NULL,
        "ParentGroupId" uuid,
        "Description" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_AccountGroups" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE TABLE "Coupons" (
        "Id" uuid NOT NULL,
        "Code" text NOT NULL,
        "Description" text NOT NULL,
        "DiscountType" integer NOT NULL,
        "DiscountValue" numeric NOT NULL,
        "MinOrderAmount" numeric,
        "MaxDiscountAmount" numeric,
        "ApplicableType" integer NOT NULL,
        "MaxRedemptions" integer,
        "TimesRedeemed" integer NOT NULL,
        "ValidFromUtc" timestamp with time zone,
        "ValidUntilUtc" timestamp with time zone,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_Coupons" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE TABLE "JournalVouchers" (
        "Id" uuid NOT NULL,
        "VoucherNumber" text NOT NULL,
        "VoucherDate" timestamp with time zone NOT NULL,
        "VoucherType" text NOT NULL,
        "ReferenceNumber" text,
        "TotalDebit" numeric NOT NULL,
        "TotalCredit" numeric NOT NULL,
        "Narration" text NOT NULL,
        "CreatedByName" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_JournalVouchers" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE TABLE "PosHeldBills" (
        "Id" uuid NOT NULL,
        "HoldNumber" text NOT NULL,
        "CustomerName" text NOT NULL,
        "CustomerPhone" text,
        "TotalAmount" numeric NOT NULL,
        "ItemsCount" integer NOT NULL,
        "CartJson" text NOT NULL,
        "Notes" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_PosHeldBills" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE TABLE "PurchaseReturns" (
        "Id" uuid NOT NULL,
        "DebitNoteNumber" text NOT NULL,
        "ReturnDate" timestamp with time zone NOT NULL,
        "OriginalPurchaseBillId" uuid,
        "OriginalBillNumber" text,
        "PartyId" uuid NOT NULL,
        "SupplierName" text NOT NULL,
        "BranchId" uuid NOT NULL,
        "WarehouseId" uuid NOT NULL,
        "ReturnReason" text NOT NULL,
        "SubTotal" numeric NOT NULL,
        "TaxAmount" numeric NOT NULL,
        "TotalAmount" numeric NOT NULL,
        "Notes" text,
        "IsCancelled" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_PurchaseReturns" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_PurchaseReturns_parties_PartyId" FOREIGN KEY ("PartyId") REFERENCES parties ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_PurchaseReturns_purchase_bills_OriginalPurchaseBillId" FOREIGN KEY ("OriginalPurchaseBillId") REFERENCES purchase_bills ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE TABLE "SalesReturns" (
        "Id" uuid NOT NULL,
        "CreditNoteNumber" text NOT NULL,
        "ReturnDate" timestamp with time zone NOT NULL,
        "OriginalSalesInvoiceId" uuid,
        "OriginalInvoiceNumber" text,
        "PartyId" uuid NOT NULL,
        "CustomerName" text NOT NULL,
        "BranchId" uuid NOT NULL,
        "WarehouseId" uuid NOT NULL,
        "ReturnReason" text NOT NULL,
        "RestockToWarehouse" boolean NOT NULL,
        "SubTotal" numeric NOT NULL,
        "TaxAmount" numeric NOT NULL,
        "TotalAmount" numeric NOT NULL,
        "Notes" text,
        "IsCancelled" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SalesReturns" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SalesReturns_parties_PartyId" FOREIGN KEY ("PartyId") REFERENCES parties ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SalesReturns_sales_invoices_OriginalSalesInvoiceId" FOREIGN KEY ("OriginalSalesInvoiceId") REFERENCES sales_invoices ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE TABLE "StockTransfers" (
        "Id" uuid NOT NULL,
        "TransferNumber" text NOT NULL,
        "TransferDate" timestamp with time zone NOT NULL,
        "SourceWarehouseId" uuid NOT NULL,
        "DestinationWarehouseId" uuid NOT NULL,
        "Status" text NOT NULL,
        "VehicleNumber" text,
        "DriverName" text,
        "DispatchedDate" timestamp with time zone,
        "ReceivedDate" timestamp with time zone,
        "Notes" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_StockTransfers" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_StockTransfers_tenant_warehouses_DestinationWarehouseId" FOREIGN KEY ("DestinationWarehouseId") REFERENCES tenant_warehouses ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_StockTransfers_tenant_warehouses_SourceWarehouseId" FOREIGN KEY ("SourceWarehouseId") REFERENCES tenant_warehouses ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE TABLE "LedgerAccounts" (
        "Id" uuid NOT NULL,
        "AccountCode" text NOT NULL,
        "AccountName" text NOT NULL,
        "GroupId" uuid NOT NULL,
        "Category" text NOT NULL,
        "OpeningBalance" numeric NOT NULL,
        "BalanceType" text NOT NULL,
        "CurrentBalance" numeric NOT NULL,
        "IsSystemAccount" boolean NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_LedgerAccounts" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_LedgerAccounts_AccountGroups_GroupId" FOREIGN KEY ("GroupId") REFERENCES "AccountGroups" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE TABLE "CouponRedemptions" (
        "Id" uuid NOT NULL,
        "CouponId" uuid NOT NULL,
        "OrderReference" text NOT NULL,
        "OrderAmount" numeric NOT NULL,
        "DiscountAmount" numeric NOT NULL,
        "RedeemedAtUtc" timestamp with time zone NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_CouponRedemptions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_CouponRedemptions_Coupons_CouponId" FOREIGN KEY ("CouponId") REFERENCES "Coupons" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE TABLE "PurchaseReturnItems" (
        "Id" uuid NOT NULL,
        "PurchaseReturnId" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "ItemName" text NOT NULL,
        "ItemSku" text NOT NULL,
        "BatchId" uuid,
        "BatchNumber" text,
        "ReturnQuantity" numeric NOT NULL,
        "UnitPrice" numeric NOT NULL,
        "GstRate" numeric NOT NULL,
        "TotalAmount" numeric NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_PurchaseReturnItems" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_PurchaseReturnItems_PurchaseReturns_PurchaseReturnId" FOREIGN KEY ("PurchaseReturnId") REFERENCES "PurchaseReturns" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_PurchaseReturnItems_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE TABLE "SalesReturnItems" (
        "Id" uuid NOT NULL,
        "SalesReturnId" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "ItemName" text NOT NULL,
        "ItemSku" text NOT NULL,
        "BatchId" uuid,
        "BatchNumber" text,
        "ReturnQuantity" numeric NOT NULL,
        "UnitPrice" numeric NOT NULL,
        "GstRate" numeric NOT NULL,
        "TotalAmount" numeric NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SalesReturnItems" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SalesReturnItems_SalesReturns_SalesReturnId" FOREIGN KEY ("SalesReturnId") REFERENCES "SalesReturns" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SalesReturnItems_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE TABLE "StockTransferItems" (
        "Id" uuid NOT NULL,
        "StockTransferId" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "ItemName" text NOT NULL,
        "ItemSku" text NOT NULL,
        "BatchId" uuid,
        "BatchNumber" text,
        "TransferQuantity" numeric NOT NULL,
        "ReceivedQuantity" numeric,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_StockTransferItems" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_StockTransferItems_StockTransfers_StockTransferId" FOREIGN KEY ("StockTransferId") REFERENCES "StockTransfers" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_StockTransferItems_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE TABLE "JournalVoucherLegs" (
        "Id" uuid NOT NULL,
        "JournalVoucherId" uuid NOT NULL,
        "AccountId" uuid NOT NULL,
        "DebitAmount" numeric NOT NULL,
        "CreditAmount" numeric NOT NULL,
        "Narration" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_JournalVoucherLegs" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_JournalVoucherLegs_JournalVouchers_JournalVoucherId" FOREIGN KEY ("JournalVoucherId") REFERENCES "JournalVouchers" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_JournalVoucherLegs_LedgerAccounts_AccountId" FOREIGN KEY ("AccountId") REFERENCES "LedgerAccounts" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_CouponRedemptions_CouponId" ON "CouponRedemptions" ("CouponId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_JournalVoucherLegs_AccountId" ON "JournalVoucherLegs" ("AccountId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_JournalVoucherLegs_JournalVoucherId" ON "JournalVoucherLegs" ("JournalVoucherId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_LedgerAccounts_GroupId" ON "LedgerAccounts" ("GroupId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_PurchaseReturnItems_ItemId" ON "PurchaseReturnItems" ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_PurchaseReturnItems_PurchaseReturnId" ON "PurchaseReturnItems" ("PurchaseReturnId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_PurchaseReturns_OriginalPurchaseBillId" ON "PurchaseReturns" ("OriginalPurchaseBillId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_PurchaseReturns_PartyId" ON "PurchaseReturns" ("PartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_PurchaseReturns_TenantId_ReturnDate_PartyId" ON "PurchaseReturns" ("TenantId", "ReturnDate", "PartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_SalesReturnItems_ItemId" ON "SalesReturnItems" ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_SalesReturnItems_SalesReturnId" ON "SalesReturnItems" ("SalesReturnId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_SalesReturns_OriginalSalesInvoiceId" ON "SalesReturns" ("OriginalSalesInvoiceId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_SalesReturns_PartyId" ON "SalesReturns" ("PartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_SalesReturns_TenantId_ReturnDate_PartyId" ON "SalesReturns" ("TenantId", "ReturnDate", "PartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_StockTransferItems_ItemId" ON "StockTransferItems" ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_StockTransferItems_StockTransferId" ON "StockTransferItems" ("StockTransferId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_StockTransfers_DestinationWarehouseId" ON "StockTransfers" ("DestinationWarehouseId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_StockTransfers_SourceWarehouseId" ON "StockTransfers" ("SourceWarehouseId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    CREATE INDEX "IX_StockTransfers_TenantId_TransferDate_Status" ON "StockTransfers" ("TenantId", "TransferDate", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260901190333_InitialProductionSetup') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260901190333_InitialProductionSetup', '9.0.2');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "ActiveIndustryModule" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "AiScansLimit" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "AiScansUsed" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "IndustryActivatedAtUtc" timestamp with time zone NOT NULL DEFAULT '0001-01-01 00:00:00+00';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "IndustryModuleStatus" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "IndustryTypeCode" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "IsAiAddonActive" boolean NOT NULL DEFAULT false;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "MaxAllowedUsers" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS "VariantId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE "SalesReturnItems" ADD COLUMN IF NOT EXISTS "VariantId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS "VariantId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE "PurchaseReturnItems" ADD COLUMN IF NOT EXISTS "VariantId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE purchase_bill_items ADD COLUMN IF NOT EXISTS "VariantId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE item_warehouse_stocks ADD COLUMN IF NOT EXISTS "VariantId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE items ALTER COLUMN "TaxRate" TYPE numeric(18,4);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    ALTER TABLE items ALTER COLUMN "CessRate" TYPE numeric(18,4);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN

    CREATE TABLE IF NOT EXISTS "IdempotentRequests" (
        "Id" uuid NOT NULL,
        "IdempotencyKey" text NOT NULL,
        "RequestPath" text NOT NULL,
        "HttpMethod" text NOT NULL,
        "RequestHash" text NOT NULL,
        "StatusCode" integer NOT NULL,
        "ResponseBody" text NOT NULL,
        "ExpiresAtUtc" timestamp with time zone NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid NULL,
        "UpdatedAtUtc" timestamp with time zone NULL,
        "UpdatedBy" uuid NULL,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone NULL,
        "DeletedBy" uuid NULL,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_IdempotentRequests" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN

    CREATE TABLE IF NOT EXISTS "Leads" (
        "Id" uuid NOT NULL,
        "Name" text NOT NULL,
        "BusinessName" text NOT NULL,
        "Mobile" text NOT NULL,
        "Email" text NOT NULL,
        "City" text NOT NULL,
        "BusinessType" text NOT NULL,
        "Message" text NOT NULL,
        "Source" text NOT NULL,
        "Status" text NOT NULL,
        "CreatedAt" timestamp with time zone NOT NULL,
        "ContactedAt" timestamp with time zone NULL,
        "Notes" text NOT NULL,
        CONSTRAINT "PK_Leads" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN

    CREATE TABLE IF NOT EXISTS "PlatformCommercialConfigs" (
        "Id" uuid NOT NULL,
        "CoreAnnualPrice" numeric NOT NULL,
        "CoreBiennialPrice" numeric NOT NULL,
        "IncludedUsers" integer NOT NULL,
        "SingleUserAnnualPrice" numeric NOT NULL,
        "FiveUserPackAnnualPrice" numeric NOT NULL,
        "AiProAnnualPrice" numeric NOT NULL,
        "AiProMonthlyScanLimit" integer NOT NULL,
        "GstRatePercent" numeric NOT NULL,
        "IsActive" boolean NOT NULL,
        "LastUpdatedByEmail" text NULL,
        "Notes" text NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid NULL,
        "UpdatedAtUtc" timestamp with time zone NULL,
        "UpdatedBy" uuid NULL,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone NULL,
        "DeletedBy" uuid NULL,
        CONSTRAINT "PK_PlatformCommercialConfigs" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    CREATE INDEX IF NOT EXISTS "IX_stock_movements_VariantId" ON stock_movements ("VariantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "IX_SalesReturns_TenantId_CreditNoteNumber" ON "SalesReturns" ("TenantId", "CreditNoteNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    CREATE INDEX IF NOT EXISTS "IX_SalesReturnItems_VariantId" ON "SalesReturnItems" ("VariantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    CREATE INDEX IF NOT EXISTS "IX_sales_invoice_items_VariantId" ON sales_invoice_items ("VariantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "IX_PurchaseReturns_TenantId_DebitNoteNumber" ON "PurchaseReturns" ("TenantId", "DebitNoteNumber");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    CREATE INDEX IF NOT EXISTS "IX_PurchaseReturnItems_VariantId" ON "PurchaseReturnItems" ("VariantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    CREATE INDEX IF NOT EXISTS "IX_purchase_bill_items_VariantId" ON purchase_bill_items ("VariantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    DROP INDEX IF EXISTS "IX_item_warehouse_stocks_TenantId_ItemId_WarehouseId_BatchId";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    DROP INDEX IF EXISTS "IX_item_warehouse_stocks_TenantId_ItemId_VariantId_WarehouseId~" ;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    DROP INDEX IF EXISTS "IX_item_warehouse_stocks_TenantId_ItemId_VariantId_WarehouseId_BatchId";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "IX_item_warehouse_stocks_TenantId_ItemId_VariantId_WarehouseId_BatchId" ON item_warehouse_stocks ("TenantId", "ItemId", "VariantId", "WarehouseId", "BatchId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    CREATE INDEX IF NOT EXISTS "IX_item_warehouse_stocks_VariantId" ON item_warehouse_stocks ("VariantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "IX_IdempotentRequests_TenantId_IdempotencyKey" ON "IdempotentRequests" ("TenantId", "IdempotencyKey");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN

    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_item_warehouse_stocks_item_variants_VariantId') THEN
            ALTER TABLE item_warehouse_stocks ADD CONSTRAINT "FK_item_warehouse_stocks_item_variants_VariantId" FOREIGN KEY ("VariantId") REFERENCES item_variants ("Id") ON DELETE CASCADE;
        END IF;
    END $$;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN

    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_purchase_bill_items_item_variants_VariantId') THEN
            ALTER TABLE purchase_bill_items ADD CONSTRAINT "FK_purchase_bill_items_item_variants_VariantId" FOREIGN KEY ("VariantId") REFERENCES item_variants ("Id") ON DELETE SET NULL;
        END IF;
    END $$;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN

    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_PurchaseReturnItems_item_variants_VariantId') THEN
            ALTER TABLE "PurchaseReturnItems" ADD CONSTRAINT "FK_PurchaseReturnItems_item_variants_VariantId" FOREIGN KEY ("VariantId") REFERENCES item_variants ("Id");
        END IF;
    END $$;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN

    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_sales_invoice_items_item_variants_VariantId') THEN
            ALTER TABLE sales_invoice_items ADD CONSTRAINT "FK_sales_invoice_items_item_variants_VariantId" FOREIGN KEY ("VariantId") REFERENCES item_variants ("Id") ON DELETE RESTRICT;
        END IF;
    END $$;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN

    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_SalesReturnItems_item_variants_VariantId') THEN
            ALTER TABLE "SalesReturnItems" ADD CONSTRAINT "FK_SalesReturnItems_item_variants_VariantId" FOREIGN KEY ("VariantId") REFERENCES item_variants ("Id");
        END IF;
    END $$;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN

    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_stock_movements_item_variants_VariantId') THEN
            ALTER TABLE stock_movements ADD CONSTRAINT "FK_stock_movements_item_variants_VariantId" FOREIGN KEY ("VariantId") REFERENCES item_variants ("Id") ON DELETE SET NULL;
        END IF;
    END $$;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260904174649_AddZeroBreakRemediationV2') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260904174649_AddZeroBreakRemediationV2', '9.0.2');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260905080116_AddOrganicAttributionToLeads') THEN
    ALTER TABLE "Leads" ADD "ConversionStage" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260905080116_AddOrganicAttributionToLeads') THEN
    ALTER TABLE "Leads" ADD "ConvertedPaidAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260905080116_AddOrganicAttributionToLeads') THEN
    ALTER TABLE "Leads" ADD "DeviceType" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260905080116_AddOrganicAttributionToLeads') THEN
    ALTER TABLE "Leads" ADD "IndustryCode" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260905080116_AddOrganicAttributionToLeads') THEN
    ALTER TABLE "Leads" ADD "LandingPage" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260905080116_AddOrganicAttributionToLeads') THEN
    ALTER TABLE "Leads" ADD "PaidAmount" numeric;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260905080116_AddOrganicAttributionToLeads') THEN
    ALTER TABLE "Leads" ADD "ReferrerUrl" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260905080116_AddOrganicAttributionToLeads') THEN
    ALTER TABLE "Leads" ADD "SearchKeyword" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260905080116_AddOrganicAttributionToLeads') THEN
    ALTER TABLE "Leads" ADD "State" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260905080116_AddOrganicAttributionToLeads') THEN
    ALTER TABLE "Leads" ADD "TrialStartedAt" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260905080116_AddOrganicAttributionToLeads') THEN
    ALTER TABLE "Leads" ADD "UtmCampaign" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260905080116_AddOrganicAttributionToLeads') THEN
    ALTER TABLE "Leads" ADD "UtmMedium" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260905080116_AddOrganicAttributionToLeads') THEN
    ALTER TABLE "Leads" ADD "UtmSource" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260905080116_AddOrganicAttributionToLeads') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260905080116_AddOrganicAttributionToLeads', '9.0.2');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    ALTER TABLE tenants ADD "IsPharmaSfaActive" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    ALTER TABLE tenants ADD "MaxAllowedManagerUsers" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    ALTER TABLE tenants ADD "MaxAllowedMrUsers" integer NOT NULL DEFAULT 0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    ALTER TABLE "PlatformCommercialConfigs" ADD "ManagerSeatAnnualPrice" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    ALTER TABLE "PlatformCommercialConfigs" ADD "ManagerSeatMonthlyPrice" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    ALTER TABLE "PlatformCommercialConfigs" ADD "MrSeatAnnualPrice" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    ALTER TABLE "PlatformCommercialConfigs" ADD "MrSeatMonthlyPrice" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    ALTER TABLE "PlatformCommercialConfigs" ADD "PharmaSfaAnnualBasePrice" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    ALTER TABLE "PlatformCommercialConfigs" ADD "PharmaSfaMonthlyBasePrice" numeric NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaExpenseClaims" (
        "Id" uuid NOT NULL,
        "ClaimNumber" text NOT NULL,
        "MrUserId" uuid NOT NULL,
        "Month" integer NOT NULL,
        "Year" integer NOT NULL,
        "TotalClaimAmount" numeric NOT NULL,
        "ApprovedAmount" numeric NOT NULL,
        "Status" text NOT NULL,
        "ApprovedByUserId" uuid,
        "ApprovedAtUtc" timestamp with time zone,
        "Remarks" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaExpenseClaims" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaExpenseClaims_users_MrUserId" FOREIGN KEY ("MrUserId") REFERENCES users ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaMrTargets" (
        "Id" uuid NOT NULL,
        "MrUserId" uuid NOT NULL,
        "Month" integer NOT NULL,
        "Year" integer NOT NULL,
        "TargetSalesAmount" numeric NOT NULL,
        "AchievedSalesAmount" numeric NOT NULL,
        "TargetDoctorCalls" integer NOT NULL,
        "AchievedDoctorCalls" integer NOT NULL,
        "TargetChemistCalls" integer NOT NULL,
        "AchievedChemistCalls" integer NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaMrTargets" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaMrTargets_users_MrUserId" FOREIGN KEY ("MrUserId") REFERENCES users ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaPobOrders" (
        "Id" uuid NOT NULL,
        "OrderNumber" text NOT NULL,
        "MrUserId" uuid NOT NULL,
        "CustomerPartyId" uuid NOT NULL,
        "TargetStockistPartyId" uuid,
        "OrderDate" timestamp with time zone NOT NULL,
        "SubTotal" numeric NOT NULL,
        "TaxAmount" numeric NOT NULL,
        "GrandTotal" numeric NOT NULL,
        "Status" text NOT NULL,
        "ConvertedSalesInvoiceId" uuid,
        "ClientOfflineId" text,
        "Remarks" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaPobOrders" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaPobOrders_parties_CustomerPartyId" FOREIGN KEY ("CustomerPartyId") REFERENCES parties ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SfaPobOrders_parties_TargetStockistPartyId" FOREIGN KEY ("TargetStockistPartyId") REFERENCES parties ("Id"),
        CONSTRAINT "FK_SfaPobOrders_sales_invoices_ConvertedSalesInvoiceId" FOREIGN KEY ("ConvertedSalesInvoiceId") REFERENCES sales_invoices ("Id"),
        CONSTRAINT "FK_SfaPobOrders_users_MrUserId" FOREIGN KEY ("MrUserId") REFERENCES users ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaSampleChallans" (
        "Id" uuid NOT NULL,
        "ChallanNumber" text NOT NULL,
        "MrUserId" uuid NOT NULL,
        "DispatchedDate" timestamp with time zone NOT NULL,
        "AcknowledgedDate" timestamp with time zone,
        "Status" text NOT NULL,
        "Remarks" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaSampleChallans" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaSampleChallans_users_MrUserId" FOREIGN KEY ("MrUserId") REFERENCES users ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaSampleStocks" (
        "Id" uuid NOT NULL,
        "MrUserId" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "BatchNumber" text NOT NULL,
        "ExpiryMonthYear" text NOT NULL,
        "QuantityAllocated" numeric NOT NULL,
        "QuantityDistributed" numeric NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaSampleStocks" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaSampleStocks_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SfaSampleStocks_users_MrUserId" FOREIGN KEY ("MrUserId") REFERENCES users ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaTerritories" (
        "Id" uuid NOT NULL,
        "Code" text NOT NULL,
        "Name" text NOT NULL,
        "Type" integer NOT NULL,
        "ParentTerritoryId" uuid,
        "State" text,
        "City" text,
        "CoveredPincodes" text,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaTerritories" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaTerritories_SfaTerritories_ParentTerritoryId" FOREIGN KEY ("ParentTerritoryId") REFERENCES "SfaTerritories" ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaTourPlans" (
        "Id" uuid NOT NULL,
        "MrUserId" uuid NOT NULL,
        "Month" integer NOT NULL,
        "Year" integer NOT NULL,
        "Status" integer NOT NULL,
        "ReviewedByUserId" uuid,
        "ReviewedAtUtc" timestamp with time zone,
        "ManagerRemarks" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaTourPlans" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaTourPlans_users_MrUserId" FOREIGN KEY ("MrUserId") REFERENCES users ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaExpenseClaimItems" (
        "Id" uuid NOT NULL,
        "ExpenseClaimId" uuid NOT NULL,
        "ExpenseDate" timestamp with time zone NOT NULL,
        "ExpenseType" text NOT NULL,
        "Amount" numeric NOT NULL,
        "KmsTravelled" numeric NOT NULL,
        "FromLocation" text,
        "ToLocation" text,
        "ReceiptAttachmentUrl" text,
        "Notes" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaExpenseClaimItems" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaExpenseClaimItems_SfaExpenseClaims_ExpenseClaimId" FOREIGN KEY ("ExpenseClaimId") REFERENCES "SfaExpenseClaims" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaPobOrderItems" (
        "Id" uuid NOT NULL,
        "PobOrderId" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "Quantity" numeric NOT NULL,
        "FreeQuantity" numeric NOT NULL,
        "UnitPrice" numeric NOT NULL,
        "DiscountPercent" numeric NOT NULL,
        "TaxRatePercent" numeric NOT NULL,
        "TotalAmount" numeric NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaPobOrderItems" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaPobOrderItems_SfaPobOrders_PobOrderId" FOREIGN KEY ("PobOrderId") REFERENCES "SfaPobOrders" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SfaPobOrderItems_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaSampleChallanItems" (
        "Id" uuid NOT NULL,
        "SampleChallanId" uuid NOT NULL,
        "ItemId" uuid NOT NULL,
        "BatchNumber" text NOT NULL,
        "ExpiryMonthYear" text NOT NULL,
        "Quantity" numeric NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaSampleChallanItems" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaSampleChallanItems_SfaSampleChallans_SampleChallanId" FOREIGN KEY ("SampleChallanId") REFERENCES "SfaSampleChallans" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SfaSampleChallanItems_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaChemists" (
        "Id" uuid NOT NULL,
        "Code" text NOT NULL,
        "ShopName" text NOT NULL,
        "ContactPerson" text NOT NULL,
        "DrugLicenseNumber" text NOT NULL,
        "GSTIN" text,
        "Mobile" text NOT NULL,
        "Email" text,
        "Address" text NOT NULL,
        "City" text NOT NULL,
        "State" text,
        "Pincode" text,
        "TerritoryId" uuid,
        "AssignedMrUserId" uuid,
        "PreferredStockistPartyId" uuid,
        "PotentialCategory" text NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaChemists" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaChemists_SfaTerritories_TerritoryId" FOREIGN KEY ("TerritoryId") REFERENCES "SfaTerritories" ("Id"),
        CONSTRAINT "FK_SfaChemists_parties_PreferredStockistPartyId" FOREIGN KEY ("PreferredStockistPartyId") REFERENCES parties ("Id"),
        CONSTRAINT "FK_SfaChemists_users_AssignedMrUserId" FOREIGN KEY ("AssignedMrUserId") REFERENCES users ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaDoctors" (
        "Id" uuid NOT NULL,
        "Code" text NOT NULL,
        "Name" text NOT NULL,
        "Specialty" text NOT NULL,
        "Qualification" text NOT NULL,
        "RegistrationNumber" text NOT NULL,
        "ClinicHospitalName" text NOT NULL,
        "Address" text NOT NULL,
        "City" text NOT NULL,
        "State" text,
        "Pincode" text,
        "Mobile" text NOT NULL,
        "Email" text,
        "TerritoryId" uuid,
        "AssignedMrUserId" uuid,
        "Classification" text NOT NULL,
        "VisitFrequencyPerMonth" integer NOT NULL,
        "EstimatedMonthlyPotential" numeric NOT NULL,
        "DateOfBirth" timestamp with time zone,
        "WeddingAnniversary" timestamp with time zone,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaDoctors" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaDoctors_SfaTerritories_TerritoryId" FOREIGN KEY ("TerritoryId") REFERENCES "SfaTerritories" ("Id"),
        CONSTRAINT "FK_SfaDoctors_users_AssignedMrUserId" FOREIGN KEY ("AssignedMrUserId") REFERENCES users ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaEmployeeProfiles" (
        "Id" uuid NOT NULL,
        "UserId" uuid NOT NULL,
        "EmployeeCode" text NOT NULL,
        "DesignationRole" integer NOT NULL,
        "DesignationTitle" text NOT NULL,
        "TerritoryId" uuid,
        "ReportingToUserId" uuid,
        "HeadquarterCity" text NOT NULL,
        "JoiningDate" timestamp with time zone NOT NULL,
        "DailyAllowanceRate" numeric NOT NULL,
        "MonthlyExpenseLimit" numeric NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaEmployeeProfiles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaEmployeeProfiles_SfaTerritories_TerritoryId" FOREIGN KEY ("TerritoryId") REFERENCES "SfaTerritories" ("Id"),
        CONSTRAINT "FK_SfaEmployeeProfiles_users_ReportingToUserId" FOREIGN KEY ("ReportingToUserId") REFERENCES users ("Id"),
        CONSTRAINT "FK_SfaEmployeeProfiles_users_UserId" FOREIGN KEY ("UserId") REFERENCES users ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaSalesAttributions" (
        "Id" uuid NOT NULL,
        "SalesInvoiceId" uuid NOT NULL,
        "InvoiceNumber" text NOT NULL,
        "InvoiceDate" timestamp with time zone NOT NULL,
        "StockistPartyId" uuid NOT NULL,
        "MrUserId" uuid NOT NULL,
        "ManagerUserId" uuid,
        "TerritoryId" uuid,
        "InvoiceTotalAmount" numeric NOT NULL,
        "TaxableAmount" numeric NOT NULL,
        "AttributedAtUtc" timestamp with time zone NOT NULL,
        "AttributionMethod" text NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaSalesAttributions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaSalesAttributions_SfaTerritories_TerritoryId" FOREIGN KEY ("TerritoryId") REFERENCES "SfaTerritories" ("Id"),
        CONSTRAINT "FK_SfaSalesAttributions_parties_StockistPartyId" FOREIGN KEY ("StockistPartyId") REFERENCES parties ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SfaSalesAttributions_sales_invoices_SalesInvoiceId" FOREIGN KEY ("SalesInvoiceId") REFERENCES sales_invoices ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SfaSalesAttributions_users_ManagerUserId" FOREIGN KEY ("ManagerUserId") REFERENCES users ("Id"),
        CONSTRAINT "FK_SfaSalesAttributions_users_MrUserId" FOREIGN KEY ("MrUserId") REFERENCES users ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaStockistAllocations" (
        "Id" uuid NOT NULL,
        "StockistPartyId" uuid NOT NULL,
        "MrUserId" uuid NOT NULL,
        "TerritoryId" uuid,
        "EffectiveFrom" timestamp with time zone NOT NULL,
        "EffectiveTo" timestamp with time zone,
        "AllocationType" text NOT NULL,
        "IsActive" boolean NOT NULL,
        "Notes" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaStockistAllocations" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaStockistAllocations_SfaTerritories_TerritoryId" FOREIGN KEY ("TerritoryId") REFERENCES "SfaTerritories" ("Id"),
        CONSTRAINT "FK_SfaStockistAllocations_parties_StockistPartyId" FOREIGN KEY ("StockistPartyId") REFERENCES parties ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SfaStockistAllocations_users_MrUserId" FOREIGN KEY ("MrUserId") REFERENCES users ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaTourPlanItems" (
        "Id" uuid NOT NULL,
        "TourPlanId" uuid NOT NULL,
        "PlanDate" timestamp with time zone NOT NULL,
        "RouteOrBeatName" text NOT NULL,
        "TerritoryId" uuid,
        "PlannedDoctorCalls" integer NOT NULL,
        "PlannedChemistCalls" integer NOT NULL,
        "PlannedStockistCalls" integer NOT NULL,
        "TargetDoctorIdsJson" text,
        "Remarks" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaTourPlanItems" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaTourPlanItems_SfaTerritories_TerritoryId" FOREIGN KEY ("TerritoryId") REFERENCES "SfaTerritories" ("Id"),
        CONSTRAINT "FK_SfaTourPlanItems_SfaTourPlans_TourPlanId" FOREIGN KEY ("TourPlanId") REFERENCES "SfaTourPlans" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaDailyCallReports" (
        "Id" uuid NOT NULL,
        "DcrNumber" text NOT NULL,
        "DcrDate" timestamp with time zone NOT NULL,
        "MrUserId" uuid NOT NULL,
        "TourPlanItemId" uuid,
        "AttendanceStatus" text NOT NULL,
        "WorkType" text NOT NULL,
        "AccompaniedByUserId" uuid,
        "TerritoryId" uuid,
        "RouteOrArea" text NOT NULL,
        "DayStartTimeUtc" timestamp with time zone,
        "DayEndTimeUtc" timestamp with time zone,
        "StartLatitude" double precision,
        "StartLongitude" double precision,
        "EndLatitude" double precision,
        "EndLongitude" double precision,
        "TotalDoctorsVisited" integer NOT NULL,
        "TotalChemistsVisited" integer NOT NULL,
        "TotalStockistsVisited" integer NOT NULL,
        "TotalPobBookedAmount" numeric NOT NULL,
        "Status" integer NOT NULL,
        "ReviewedByUserId" uuid,
        "ReviewedAtUtc" timestamp with time zone,
        "ManagerRemarks" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaDailyCallReports" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaDailyCallReports_SfaTerritories_TerritoryId" FOREIGN KEY ("TerritoryId") REFERENCES "SfaTerritories" ("Id"),
        CONSTRAINT "FK_SfaDailyCallReports_SfaTourPlanItems_TourPlanItemId" FOREIGN KEY ("TourPlanItemId") REFERENCES "SfaTourPlanItems" ("Id"),
        CONSTRAINT "FK_SfaDailyCallReports_users_AccompaniedByUserId" FOREIGN KEY ("AccompaniedByUserId") REFERENCES users ("Id"),
        CONSTRAINT "FK_SfaDailyCallReports_users_MrUserId" FOREIGN KEY ("MrUserId") REFERENCES users ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaDcrChemistVisits" (
        "Id" uuid NOT NULL,
        "DailyCallReportId" uuid NOT NULL,
        "ChemistId" uuid NOT NULL,
        "VisitTimeUtc" timestamp with time zone NOT NULL,
        "Latitude" double precision,
        "Longitude" double precision,
        "IsGpsVerified" boolean NOT NULL,
        "PobOrderBooked" boolean NOT NULL,
        "PobOrderAmount" numeric NOT NULL,
        "Feedback" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaDcrChemistVisits" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaDcrChemistVisits_SfaChemists_ChemistId" FOREIGN KEY ("ChemistId") REFERENCES "SfaChemists" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SfaDcrChemistVisits_SfaDailyCallReports_DailyCallReportId" FOREIGN KEY ("DailyCallReportId") REFERENCES "SfaDailyCallReports" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaDcrDoctorVisits" (
        "Id" uuid NOT NULL,
        "DailyCallReportId" uuid NOT NULL,
        "DoctorId" uuid NOT NULL,
        "VisitTimeUtc" timestamp with time zone NOT NULL,
        "Latitude" double precision,
        "Longitude" double precision,
        "IsGpsVerified" boolean NOT NULL,
        "ProductsDetailedJson" text,
        "SamplesGivenJson" text,
        "GiftsGivenJson" text,
        "DoctorFeedback" text,
        "NextVisitDate" timestamp with time zone,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaDcrDoctorVisits" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaDcrDoctorVisits_SfaDailyCallReports_DailyCallReportId" FOREIGN KEY ("DailyCallReportId") REFERENCES "SfaDailyCallReports" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SfaDcrDoctorVisits_SfaDoctors_DoctorId" FOREIGN KEY ("DoctorId") REFERENCES "SfaDoctors" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE TABLE "SfaDcrStockistVisits" (
        "Id" uuid NOT NULL,
        "DailyCallReportId" uuid NOT NULL,
        "StockistPartyId" uuid NOT NULL,
        "VisitTimeUtc" timestamp with time zone NOT NULL,
        "PaymentCollectedAmount" numeric NOT NULL,
        "ChequeOrUpiRef" text,
        "OutstandingReviewRemarks" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaDcrStockistVisits" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaDcrStockistVisits_SfaDailyCallReports_DailyCallReportId" FOREIGN KEY ("DailyCallReportId") REFERENCES "SfaDailyCallReports" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SfaDcrStockistVisits_parties_StockistPartyId" FOREIGN KEY ("StockistPartyId") REFERENCES parties ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaChemists_AssignedMrUserId" ON "SfaChemists" ("AssignedMrUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaChemists_PreferredStockistPartyId" ON "SfaChemists" ("PreferredStockistPartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaChemists_TerritoryId" ON "SfaChemists" ("TerritoryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaDailyCallReports_AccompaniedByUserId" ON "SfaDailyCallReports" ("AccompaniedByUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaDailyCallReports_MrUserId" ON "SfaDailyCallReports" ("MrUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaDailyCallReports_TerritoryId" ON "SfaDailyCallReports" ("TerritoryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaDailyCallReports_TourPlanItemId" ON "SfaDailyCallReports" ("TourPlanItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaDcrChemistVisits_ChemistId" ON "SfaDcrChemistVisits" ("ChemistId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaDcrChemistVisits_DailyCallReportId" ON "SfaDcrChemistVisits" ("DailyCallReportId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaDcrDoctorVisits_DailyCallReportId" ON "SfaDcrDoctorVisits" ("DailyCallReportId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaDcrDoctorVisits_DoctorId" ON "SfaDcrDoctorVisits" ("DoctorId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaDcrStockistVisits_DailyCallReportId" ON "SfaDcrStockistVisits" ("DailyCallReportId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaDcrStockistVisits_StockistPartyId" ON "SfaDcrStockistVisits" ("StockistPartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaDoctors_AssignedMrUserId" ON "SfaDoctors" ("AssignedMrUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaDoctors_TerritoryId" ON "SfaDoctors" ("TerritoryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaEmployeeProfiles_ReportingToUserId" ON "SfaEmployeeProfiles" ("ReportingToUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaEmployeeProfiles_TerritoryId" ON "SfaEmployeeProfiles" ("TerritoryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaEmployeeProfiles_UserId" ON "SfaEmployeeProfiles" ("UserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaExpenseClaimItems_ExpenseClaimId" ON "SfaExpenseClaimItems" ("ExpenseClaimId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaExpenseClaims_MrUserId" ON "SfaExpenseClaims" ("MrUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaMrTargets_MrUserId" ON "SfaMrTargets" ("MrUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaPobOrderItems_ItemId" ON "SfaPobOrderItems" ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaPobOrderItems_PobOrderId" ON "SfaPobOrderItems" ("PobOrderId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaPobOrders_ConvertedSalesInvoiceId" ON "SfaPobOrders" ("ConvertedSalesInvoiceId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaPobOrders_CustomerPartyId" ON "SfaPobOrders" ("CustomerPartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaPobOrders_MrUserId" ON "SfaPobOrders" ("MrUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaPobOrders_TargetStockistPartyId" ON "SfaPobOrders" ("TargetStockistPartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaSalesAttributions_ManagerUserId" ON "SfaSalesAttributions" ("ManagerUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaSalesAttributions_MrUserId" ON "SfaSalesAttributions" ("MrUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaSalesAttributions_SalesInvoiceId" ON "SfaSalesAttributions" ("SalesInvoiceId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaSalesAttributions_StockistPartyId" ON "SfaSalesAttributions" ("StockistPartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaSalesAttributions_TerritoryId" ON "SfaSalesAttributions" ("TerritoryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaSampleChallanItems_ItemId" ON "SfaSampleChallanItems" ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaSampleChallanItems_SampleChallanId" ON "SfaSampleChallanItems" ("SampleChallanId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaSampleChallans_MrUserId" ON "SfaSampleChallans" ("MrUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaSampleStocks_ItemId" ON "SfaSampleStocks" ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaSampleStocks_MrUserId" ON "SfaSampleStocks" ("MrUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaStockistAllocations_MrUserId" ON "SfaStockistAllocations" ("MrUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaStockistAllocations_StockistPartyId" ON "SfaStockistAllocations" ("StockistPartyId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaStockistAllocations_TerritoryId" ON "SfaStockistAllocations" ("TerritoryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaTerritories_ParentTerritoryId" ON "SfaTerritories" ("ParentTerritoryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaTourPlanItems_TerritoryId" ON "SfaTourPlanItems" ("TerritoryId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaTourPlanItems_TourPlanId" ON "SfaTourPlanItems" ("TourPlanId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    CREATE INDEX "IX_SfaTourPlans_MrUserId" ON "SfaTourPlans" ("MrUserId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906052346_AddPharmaSfaAddonSuite') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260906052346_AddPharmaSfaAddonSuite', '9.0.2');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906110348_AddPharmaSfaSprint4Entities') THEN

                    -- Tour Plan Items
                    ALTER TABLE "SfaTourPlanItems" ADD COLUMN IF NOT EXISTS "ActivityType" text NOT NULL DEFAULT '';
                    ALTER TABLE "SfaTourPlanItems" ADD COLUMN IF NOT EXISTS "BeatId" uuid;
                    ALTER TABLE "SfaTourPlanItems" ADD COLUMN IF NOT EXISTS "PatchId" uuid;

                    -- Expense Claims
                    ALTER TABLE "SfaExpenseClaims" ADD COLUMN IF NOT EXISTS "AccountsVerifiedAtUtc" timestamp with time zone;
                    ALTER TABLE "SfaExpenseClaims" ADD COLUMN IF NOT EXISTS "AccountsVerifiedByUserId" uuid;
                    ALTER TABLE "SfaExpenseClaims" ADD COLUMN IF NOT EXISTS "DisbursedAtUtc" timestamp with time zone;
                    ALTER TABLE "SfaExpenseClaims" ADD COLUMN IF NOT EXISTS "PaymentMode" text;
                    ALTER TABLE "SfaExpenseClaims" ADD COLUMN IF NOT EXISTS "PaymentReferenceNumber" text;

                    -- Expense Claim Items
                    ALTER TABLE "SfaExpenseClaimItems" ADD COLUMN IF NOT EXISTS "DailyAllowanceAmount" numeric NOT NULL DEFAULT 0.0;
                    ALTER TABLE "SfaExpenseClaimItems" ADD COLUMN IF NOT EXISTS "TravelAllowanceAmount" numeric NOT NULL DEFAULT 0.0;
                    ALTER TABLE "SfaExpenseClaimItems" ADD COLUMN IF NOT EXISTS "WorkType" text NOT NULL DEFAULT '';

                    -- Employee Profiles
                    ALTER TABLE "SfaEmployeeProfiles" ADD COLUMN IF NOT EXISTS "AppVersion" text;
                    ALTER TABLE "SfaEmployeeProfiles" ADD COLUMN IF NOT EXISTS "DeviceId" text;
                    ALTER TABLE "SfaEmployeeProfiles" ADD COLUMN IF NOT EXISTS "DivisionId" uuid;
                    ALTER TABLE "SfaEmployeeProfiles" ADD COLUMN IF NOT EXISTS "Email" text;
                    ALTER TABLE "SfaEmployeeProfiles" ADD COLUMN IF NOT EXISTS "EmergencyContact" text;
                    ALTER TABLE "SfaEmployeeProfiles" ADD COLUMN IF NOT EXISTS "Gender" text;
                    ALTER TABLE "SfaEmployeeProfiles" ADD COLUMN IF NOT EXISTS "Mobile" text;
                    ALTER TABLE "SfaEmployeeProfiles" ADD COLUMN IF NOT EXISTS "MonthlyTargetAmount" numeric NOT NULL DEFAULT 0.0;
                    ALTER TABLE "SfaEmployeeProfiles" ADD COLUMN IF NOT EXISTS "PatchId" uuid;
                    ALTER TABLE "SfaEmployeeProfiles" ADD COLUMN IF NOT EXISTS "ReportingAbmUserId" uuid;
                    ALTER TABLE "SfaEmployeeProfiles" ADD COLUMN IF NOT EXISTS "ReportingRsmUserId" uuid;
                    ALTER TABLE "SfaEmployeeProfiles" ADD COLUMN IF NOT EXISTS "ReportingZsmUserId" uuid;

                    -- Doctors
                    ALTER TABLE "SfaDoctors" ADD COLUMN IF NOT EXISTS "BeatId" uuid;
                    ALTER TABLE "SfaDoctors" ADD COLUMN IF NOT EXISTS "DivisionId" uuid;
                    ALTER TABLE "SfaDoctors" ADD COLUMN IF NOT EXISTS "GeoFenceRadiusMeters" numeric NOT NULL DEFAULT 0.0;
                    ALTER TABLE "SfaDoctors" ADD COLUMN IF NOT EXISTS "Latitude" numeric NOT NULL DEFAULT 0.0;
                    ALTER TABLE "SfaDoctors" ADD COLUMN IF NOT EXISTS "Longitude" numeric NOT NULL DEFAULT 0.0;
                    ALTER TABLE "SfaDoctors" ADD COLUMN IF NOT EXISTS "PatchId" uuid;
                    ALTER TABLE "SfaDoctors" ADD COLUMN IF NOT EXISTS "PreferredVisitTime" text;
                    ALTER TABLE "SfaDoctors" ADD COLUMN IF NOT EXISTS "VisitFrequencyPerMonth" integer NOT NULL DEFAULT 0;

                    -- Chemists
                    ALTER TABLE "SfaChemists" ADD COLUMN IF NOT EXISTS "BeatId" uuid;
                    ALTER TABLE "SfaChemists" ADD COLUMN IF NOT EXISTS "DivisionId" uuid;
                    ALTER TABLE "SfaChemists" ADD COLUMN IF NOT EXISTS "PatchId" uuid;
                    ALTER TABLE "SfaChemists" ADD COLUMN IF NOT EXISTS "PreferredVisitDay" text;

                    -- Divisions
                    CREATE TABLE IF NOT EXISTS "SfaDivisions" (
                        "Id" uuid NOT NULL PRIMARY KEY,
                        "Code" text NOT NULL,
                        "Name" text NOT NULL,
                        "Description" text,
                        "IsActive" boolean NOT NULL DEFAULT true,
                        "CreatedAtUtc" timestamp with time zone NOT NULL,
                        "CreatedBy" uuid,
                        "UpdatedAtUtc" timestamp with time zone,
                        "UpdatedBy" uuid,
                        "IsDeleted" boolean NOT NULL DEFAULT false,
                        "DeletedAtUtc" timestamp with time zone,
                        "DeletedBy" uuid,
                        "TenantId" uuid NOT NULL
                    );

                    -- Doctor Allocation Histories
                    CREATE TABLE IF NOT EXISTS "SfaDoctorAllocationHistories" (
                        "Id" uuid NOT NULL PRIMARY KEY,
                        "DoctorId" uuid NOT NULL,
                        "PreviousMrUserId" uuid,
                        "NewMrUserId" uuid NOT NULL,
                        "AllocatedByUserId" uuid NOT NULL,
                        "AllocatedAtUtc" timestamp with time zone NOT NULL,
                        "Reason" text,
                        "TenantId" uuid NOT NULL
                    );

                    -- Expense Policies
                    CREATE TABLE IF NOT EXISTS "SfaExpensePolicies" (
                        "Id" uuid NOT NULL PRIMARY KEY,
                        "PolicyName" text NOT NULL,
                        "HqDailyAllowance" numeric NOT NULL DEFAULT 0.0,
                        "ExHqDailyAllowance" numeric NOT NULL DEFAULT 0.0,
                        "OutstationDailyAllowance" numeric NOT NULL DEFAULT 0.0,
                        "RatePerKmTwoWheeler" numeric NOT NULL DEFAULT 0.0,
                        "RatePerKmFourWheeler" numeric NOT NULL DEFAULT 0.0,
                        "HotelAllowancePerNight" numeric NOT NULL DEFAULT 0.0,
                        "MaxMonthlyExpenseLimit" numeric NOT NULL DEFAULT 0.0,
                        "IsActive" boolean NOT NULL DEFAULT true,
                        "CreatedAtUtc" timestamp with time zone NOT NULL,
                        "CreatedBy" uuid,
                        "UpdatedAtUtc" timestamp with time zone,
                        "UpdatedBy" uuid,
                        "IsDeleted" boolean NOT NULL DEFAULT false,
                        "DeletedAtUtc" timestamp with time zone,
                        "DeletedBy" uuid,
                        "TenantId" uuid NOT NULL
                    );

                    -- Patches
                    CREATE TABLE IF NOT EXISTS "SfaPatches" (
                        "Id" uuid NOT NULL PRIMARY KEY,
                        "TerritoryId" uuid NOT NULL,
                        "Name" text NOT NULL,
                        "Code" text NOT NULL,
                        "HeadquartersTown" text,
                        "IsActive" boolean NOT NULL DEFAULT true,
                        "CreatedAtUtc" timestamp with time zone NOT NULL,
                        "CreatedBy" uuid,
                        "UpdatedAtUtc" timestamp with time zone,
                        "UpdatedBy" uuid,
                        "IsDeleted" boolean NOT NULL DEFAULT false,
                        "DeletedAtUtc" timestamp with time zone,
                        "DeletedBy" uuid,
                        "TenantId" uuid NOT NULL
                    );

                    -- User Hierarchies
                    CREATE TABLE IF NOT EXISTS "SfaUserHierarchies" (
                        "Id" uuid NOT NULL PRIMARY KEY,
                        "UserId" uuid NOT NULL,
                        "Designation" text NOT NULL,
                        "HeadquartersTown" text,
                        "ReportsToUserId" uuid,
                        "AbmUserId" uuid,
                        "RsmUserId" uuid,
                        "ZsmUserId" uuid,
                        "TerritoryId" uuid,
                        "IsActive" boolean NOT NULL DEFAULT true,
                        "CreatedAtUtc" timestamp with time zone NOT NULL,
                        "CreatedBy" uuid,
                        "UpdatedAtUtc" timestamp with time zone,
                        "UpdatedBy" uuid,
                        "IsDeleted" boolean NOT NULL DEFAULT false,
                        "DeletedAtUtc" timestamp with time zone,
                        "DeletedBy" uuid,
                        "TenantId" uuid NOT NULL
                    );

                    -- Beats
                    CREATE TABLE IF NOT EXISTS "SfaBeats" (
                        "Id" uuid NOT NULL PRIMARY KEY,
                        "PatchId" uuid NOT NULL,
                        "Name" text NOT NULL,
                        "Code" text NOT NULL,
                        "ScheduleDayOfWeek" text,
                        "IsActive" boolean NOT NULL DEFAULT true,
                        "CreatedAtUtc" timestamp with time zone NOT NULL,
                        "CreatedBy" uuid,
                        "UpdatedAtUtc" timestamp with time zone,
                        "UpdatedBy" uuid,
                        "IsDeleted" boolean NOT NULL DEFAULT false,
                        "DeletedAtUtc" timestamp with time zone,
                        "DeletedBy" uuid,
                        "TenantId" uuid NOT NULL
                    );
                
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906110348_AddPharmaSfaSprint4Entities') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260906110348_AddPharmaSfaSprint4Entities', '9.0.2');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906113420_AddPharmaSfaSprint5CommercialSchemesAndSecondarySales') THEN
    ALTER TABLE "SfaUserHierarchies" ADD "IsActive" boolean NOT NULL DEFAULT FALSE;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906113420_AddPharmaSfaSprint5CommercialSchemesAndSecondarySales') THEN
    ALTER TABLE "SfaPobOrders" ADD "ExpectedDeliveryDate" timestamp with time zone;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906113420_AddPharmaSfaSprint5CommercialSchemesAndSecondarySales') THEN
    ALTER TABLE "SfaPobOrders" ADD "StockistFulfillmentStatus" text NOT NULL DEFAULT '';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906113420_AddPharmaSfaSprint5CommercialSchemesAndSecondarySales') THEN
    ALTER TABLE "SfaPobOrders" ADD "StockistRemarks" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906113420_AddPharmaSfaSprint5CommercialSchemesAndSecondarySales') THEN
    ALTER TABLE "SfaPobOrderItems" ADD "AppliedSchemeId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906113420_AddPharmaSfaSprint5CommercialSchemesAndSecondarySales') THEN
    ALTER TABLE "SfaPobOrderItems" ADD "AppliedSchemeName" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906113420_AddPharmaSfaSprint5CommercialSchemesAndSecondarySales') THEN
    CREATE TABLE "SfaSchemeMasters" (
        "Id" uuid NOT NULL,
        "SchemeCode" text NOT NULL,
        "SchemeName" text NOT NULL,
        "DivisionId" uuid,
        "ItemId" uuid,
        "SchemeType" integer NOT NULL,
        "ValidFromUtc" timestamp with time zone NOT NULL,
        "ValidToUtc" timestamp with time zone NOT NULL,
        "MinimumOrderQuantity" numeric NOT NULL,
        "MinimumOrderValue" numeric,
        "IsActive" boolean NOT NULL,
        "Description" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaSchemeMasters" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaSchemeMasters_SfaDivisions_DivisionId" FOREIGN KEY ("DivisionId") REFERENCES "SfaDivisions" ("Id"),
        CONSTRAINT "FK_SfaSchemeMasters_items_ItemId" FOREIGN KEY ("ItemId") REFERENCES items ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906113420_AddPharmaSfaSprint5CommercialSchemesAndSecondarySales') THEN
    CREATE TABLE "SfaSchemeSlabs" (
        "Id" uuid NOT NULL,
        "SchemeMasterId" uuid NOT NULL,
        "MinQuantity" numeric NOT NULL,
        "MaxQuantity" numeric,
        "FreeQuantity" numeric NOT NULL,
        "DiscountPercent" numeric NOT NULL,
        "FlatDiscountAmount" numeric NOT NULL,
        "FreeItemId" uuid,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_SfaSchemeSlabs" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_SfaSchemeSlabs_SfaSchemeMasters_SchemeMasterId" FOREIGN KEY ("SchemeMasterId") REFERENCES "SfaSchemeMasters" ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_SfaSchemeSlabs_items_FreeItemId" FOREIGN KEY ("FreeItemId") REFERENCES items ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906113420_AddPharmaSfaSprint5CommercialSchemesAndSecondarySales') THEN
    CREATE INDEX "IX_SfaSchemeMasters_DivisionId" ON "SfaSchemeMasters" ("DivisionId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906113420_AddPharmaSfaSprint5CommercialSchemesAndSecondarySales') THEN
    CREATE INDEX "IX_SfaSchemeMasters_ItemId" ON "SfaSchemeMasters" ("ItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906113420_AddPharmaSfaSprint5CommercialSchemesAndSecondarySales') THEN
    CREATE INDEX "IX_SfaSchemeSlabs_FreeItemId" ON "SfaSchemeSlabs" ("FreeItemId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906113420_AddPharmaSfaSprint5CommercialSchemesAndSecondarySales') THEN
    CREATE INDEX "IX_SfaSchemeSlabs_SchemeMasterId" ON "SfaSchemeSlabs" ("SchemeMasterId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260906113420_AddPharmaSfaSprint5CommercialSchemesAndSecondarySales') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260906113420_AddPharmaSfaSprint5CommercialSchemesAndSecondarySales', '9.0.2');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    ALTER TABLE purchase_order_items ADD "CashDiscountPercent" numeric(5,2) NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    ALTER TABLE purchase_order_items ADD "FreeQuantity" numeric(18,4) NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    ALTER TABLE purchase_order_items ADD "SchemeDiscountPercent" numeric(5,2) NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    ALTER TABLE purchase_bill_items ADD "CashDiscountPercent" numeric(5,2) NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    ALTER TABLE purchase_bill_items ADD "FreeQuantity" numeric(18,4) NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    ALTER TABLE purchase_bill_items ADD "SchemeDiscountPercent" numeric(5,2) NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    ALTER TABLE "Leads" ADD "CitySlug" text;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    ALTER TABLE "Leads" ADD "TenantId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    ALTER TABLE goods_receipt_note_items ADD "AcceptedFreeQuantity" numeric(18,4) NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    ALTER TABLE goods_receipt_note_items ADD "ReceivedFreeQuantity" numeric(18,4) NOT NULL DEFAULT 0.0;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    CREATE TABLE "ReferralProgramConfigs" (
        "Id" uuid NOT NULL,
        "IsEnabled" boolean NOT NULL,
        "RewardType" integer NOT NULL,
        "DefaultRewardAmount" numeric NOT NULL,
        "PayoutScheduleDays" integer NOT NULL,
        "MinimumPayoutThreshold" numeric NOT NULL,
        "TermsAndConditions" text NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_ReferralProgramConfigs" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    CREATE TABLE "TenantReferralConversions" (
        "Id" uuid NOT NULL,
        "ReferrerTenantId" uuid NOT NULL,
        "RefereeTenantId" uuid NOT NULL,
        "ReferralCodeUsed" text NOT NULL,
        "RegistrationDateUtc" timestamp with time zone NOT NULL,
        "Status" integer NOT NULL,
        "FirstPaidDateUtc" timestamp with time zone,
        "SubscriptionInvoiceId" uuid,
        "SubscriptionAmount" numeric,
        "CommissionRewardAmount" numeric NOT NULL,
        "ScheduledPayoutDateUtc" timestamp with time zone,
        "PaidAtUtc" timestamp with time zone,
        "PayoutReference" text,
        "PayoutMode" text,
        "AdminNotes" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_TenantReferralConversions" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_TenantReferralConversions_tenants_RefereeTenantId" FOREIGN KEY ("RefereeTenantId") REFERENCES tenants ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_TenantReferralConversions_tenants_ReferrerTenantId" FOREIGN KEY ("ReferrerTenantId") REFERENCES tenants ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    CREATE TABLE "TenantReferralProfiles" (
        "Id" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        "ReferralCode" text NOT NULL,
        "CustomRewardAmount" numeric,
        "UpiId" text,
        "BankName" text,
        "BankAccountNumber" text,
        "BankIfsc" text,
        "AccountHolderName" text,
        "TotalReferralsCount" integer NOT NULL,
        "PaidConversionsCount" integer NOT NULL,
        "TotalEarnedAmount" numeric NOT NULL,
        "TotalPaidOutAmount" numeric NOT NULL,
        "PendingBalanceAmount" numeric NOT NULL,
        "IsActive" boolean NOT NULL,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        CONSTRAINT "PK_TenantReferralProfiles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_TenantReferralProfiles_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    CREATE INDEX "IX_TenantReferralConversions_RefereeTenantId" ON "TenantReferralConversions" ("RefereeTenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    CREATE INDEX "IX_TenantReferralConversions_ReferrerTenantId" ON "TenantReferralConversions" ("ReferrerTenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    CREATE INDEX "IX_TenantReferralProfiles_TenantId" ON "TenantReferralProfiles" ("TenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908082615_AddProcurementFreeQuantityAndDiscounts') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908082615_AddProcurementFreeQuantityAndDiscounts', '9.0.2');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    DROP INDEX "IX_stock_movements_TenantId_ItemId_WarehouseId_CreatedAtUtc";
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    ALTER TABLE sales_invoices ADD "BrokerId" uuid;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE TABLE brokers (
        "Id" uuid NOT NULL,
        "BrokerCode" character varying(50) NOT NULL,
        "FullName" character varying(200) NOT NULL,
        "Mobile" character varying(30),
        "Email" character varying(150),
        "Address" character varying(300),
        "PAN" character varying(15),
        "GSTIN" character varying(20),
        "CommissionBasis" integer NOT NULL,
        "DefaultCommissionRate" numeric(18,4) NOT NULL,
        "TdsPercent" numeric(5,2) NOT NULL,
        "AccrualTrigger" integer NOT NULL,
        "CurrentPayableBalance" numeric(18,4) NOT NULL,
        "IsActive" boolean NOT NULL,
        "Notes" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_brokers" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE TABLE cheque_registers (
        "Id" uuid NOT NULL,
        "Direction" integer NOT NULL,
        "Status" integer NOT NULL,
        "PartyId" uuid NOT NULL,
        "PartyName" character varying(200) NOT NULL,
        "ChequeNumber" character varying(50) NOT NULL,
        "BankName" character varying(150) NOT NULL,
        "BranchName" character varying(150),
        "Amount" numeric(18,4) NOT NULL,
        "ChequeDate" timestamp with time zone NOT NULL,
        "ReceivedDate" timestamp with time zone NOT NULL,
        "DepositDate" timestamp with time zone,
        "PresentationDate" timestamp with time zone,
        "ClearingDate" timestamp with time zone,
        "BouncedDate" timestamp with time zone,
        "BankAccountId" uuid,
        "ReferenceDocumentType" text,
        "ReferenceDocumentId" uuid,
        "ReferenceDocumentNumber" text,
        "BounceReason" text,
        "BounceChargesAmount" numeric(18,4) NOT NULL,
        "IsBounceChargeBilledToParty" boolean NOT NULL,
        "Remarks" text,
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_cheque_registers" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_cheque_registers_BankAccounts_BankAccountId" FOREIGN KEY ("BankAccountId") REFERENCES "BankAccounts" ("Id") ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE TABLE broker_commission_entries (
        "Id" uuid NOT NULL,
        "BrokerId" uuid NOT NULL,
        "SalesInvoiceId" uuid,
        "SalesInvoiceNumber" character varying(100),
        "TransactionDate" timestamp with time zone NOT NULL,
        "PartyId" uuid,
        "PartyName" character varying(200),
        "BaseAmount" numeric(18,4) NOT NULL,
        "CommissionRate" numeric(18,4) NOT NULL,
        "GrossCommissionAmount" numeric(18,4) NOT NULL,
        "TdsAmount" numeric(18,4) NOT NULL,
        "NetCommissionPayable" numeric(18,4) NOT NULL,
        "Status" integer NOT NULL,
        "PaidDate" timestamp with time zone,
        "PaymentReference" character varying(100),
        "Notes" character varying(500),
        "CreatedAtUtc" timestamp with time zone NOT NULL,
        "CreatedBy" uuid,
        "UpdatedAtUtc" timestamp with time zone,
        "UpdatedBy" uuid,
        "IsDeleted" boolean NOT NULL,
        "DeletedAtUtc" timestamp with time zone,
        "DeletedBy" uuid,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_broker_commission_entries" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_broker_commission_entries_brokers_BrokerId" FOREIGN KEY ("BrokerId") REFERENCES brokers ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE INDEX "IX_sales_invoices_BrokerId" ON sales_invoices ("BrokerId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE INDEX "IX_sales_invoices_TenantId_BrokerId" ON sales_invoices ("TenantId", "BrokerId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE INDEX "IX_broker_commission_entries_BrokerId" ON broker_commission_entries ("BrokerId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE INDEX "IX_broker_commission_entries_TenantId_BrokerId_TransactionDate" ON broker_commission_entries ("TenantId", "BrokerId", "TransactionDate");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE INDEX "IX_broker_commission_entries_TenantId_SalesInvoiceId" ON broker_commission_entries ("TenantId", "SalesInvoiceId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE INDEX "IX_broker_commission_entries_TenantId_Status" ON broker_commission_entries ("TenantId", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE UNIQUE INDEX "IX_brokers_TenantId_BrokerCode" ON brokers ("TenantId", "BrokerCode");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE INDEX "IX_brokers_TenantId_FullName" ON brokers ("TenantId", "FullName");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE INDEX "IX_brokers_TenantId_Mobile" ON brokers ("TenantId", "Mobile");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE INDEX "IX_cheque_registers_BankAccountId" ON cheque_registers ("BankAccountId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE INDEX "IX_cheque_registers_TenantId_ChequeDate_Status" ON cheque_registers ("TenantId", "ChequeDate", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE INDEX "IX_cheque_registers_TenantId_ChequeNumber_BankName" ON cheque_registers ("TenantId", "ChequeNumber", "BankName");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    CREATE INDEX "IX_cheque_registers_TenantId_PartyId_Status" ON cheque_registers ("TenantId", "PartyId", "Status");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    ALTER TABLE sales_invoices ADD CONSTRAINT "FK_sales_invoices_brokers_BrokerId" FOREIGN KEY ("BrokerId") REFERENCES brokers ("Id") ON DELETE SET NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908083547_AddChequeRegisterAndBrokerEngine') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908083547_AddChequeRegisterAndBrokerEngine', '9.0.2');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908113703_AddAnalyticsConfig') THEN
    CREATE TABLE "AnalyticsConfigs" (
        "Id" integer GENERATED BY DEFAULT AS IDENTITY,
        "Ga4PropertyId" text NOT NULL,
        "Ga4ServiceAccountJson" text NOT NULL,
        "GscSiteUrl" text NOT NULL,
        "GscServiceAccountJson" text NOT NULL,
        "IsGa4Enabled" boolean NOT NULL,
        "IsGscEnabled" boolean NOT NULL,
        "UpdatedAt" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_AnalyticsConfigs" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260908113703_AddAnalyticsConfig') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260908113703_AddAnalyticsConfig', '9.0.2');
    END IF;
END $EF$;
COMMIT;

