using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReferralTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Use raw SQL with IF NOT EXISTS so this migration applies cleanly
            // even if the tables were already created by a prior operation.
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""ReferralProgramConfigs"" (
                    ""Id"" uuid NOT NULL,
                    ""IsEnabled"" boolean NOT NULL,
                    ""RewardType"" integer NOT NULL,
                    ""DefaultRewardAmount"" numeric NOT NULL,
                    ""PayoutScheduleDays"" integer NOT NULL,
                    ""MinimumPayoutThreshold"" numeric NOT NULL,
                    ""TermsAndConditions"" text NOT NULL,
                    ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                    ""CreatedBy"" uuid,
                    ""UpdatedAtUtc"" timestamp with time zone,
                    ""UpdatedBy"" uuid,
                    ""IsDeleted"" boolean NOT NULL,
                    ""DeletedAtUtc"" timestamp with time zone,
                    ""DeletedBy"" uuid,
                    CONSTRAINT ""PK_ReferralProgramConfigs"" PRIMARY KEY (""Id"")
                );
            ");

            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""TenantReferralProfiles"" (
                    ""Id"" uuid NOT NULL,
                    ""TenantId"" uuid NOT NULL,
                    ""ReferralCode"" text NOT NULL,
                    ""CustomRewardAmount"" numeric,
                    ""UpiId"" text,
                    ""BankName"" text,
                    ""BankAccountNumber"" text,
                    ""BankIfsc"" text,
                    ""AccountHolderName"" text,
                    ""TotalReferralsCount"" integer NOT NULL,
                    ""PaidConversionsCount"" integer NOT NULL,
                    ""TotalEarnedAmount"" numeric NOT NULL,
                    ""TotalPaidOutAmount"" numeric NOT NULL,
                    ""PendingBalanceAmount"" numeric NOT NULL,
                    ""IsActive"" boolean NOT NULL,
                    ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                    ""CreatedBy"" uuid,
                    ""UpdatedAtUtc"" timestamp with time zone,
                    ""UpdatedBy"" uuid,
                    ""IsDeleted"" boolean NOT NULL,
                    ""DeletedAtUtc"" timestamp with time zone,
                    ""DeletedBy"" uuid,
                    CONSTRAINT ""PK_TenantReferralProfiles"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_TenantReferralProfiles_tenants_TenantId"" FOREIGN KEY (""TenantId"")
                        REFERENCES tenants (""Id"") ON DELETE CASCADE
                );
            ");

            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""TenantReferralConversions"" (
                    ""Id"" uuid NOT NULL,
                    ""ReferrerTenantId"" uuid NOT NULL,
                    ""RefereeTenantId"" uuid NOT NULL,
                    ""ReferralCodeUsed"" text NOT NULL,
                    ""RegistrationDateUtc"" timestamp with time zone NOT NULL,
                    ""Status"" integer NOT NULL,
                    ""FirstPaidDateUtc"" timestamp with time zone,
                    ""SubscriptionInvoiceId"" uuid,
                    ""SubscriptionAmount"" numeric,
                    ""CommissionRewardAmount"" numeric NOT NULL,
                    ""ScheduledPayoutDateUtc"" timestamp with time zone,
                    ""PaidAtUtc"" timestamp with time zone,
                    ""PayoutReference"" text,
                    ""PayoutMode"" text,
                    ""AdminNotes"" text,
                    ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                    ""CreatedBy"" uuid,
                    ""UpdatedAtUtc"" timestamp with time zone,
                    ""UpdatedBy"" uuid,
                    ""IsDeleted"" boolean NOT NULL,
                    ""DeletedAtUtc"" timestamp with time zone,
                    ""DeletedBy"" uuid,
                    CONSTRAINT ""PK_TenantReferralConversions"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_TenantReferralConversions_tenants_RefereeTenantId"" FOREIGN KEY (""RefereeTenantId"")
                        REFERENCES tenants (""Id"") ON DELETE CASCADE,
                    CONSTRAINT ""FK_TenantReferralConversions_tenants_ReferrerTenantId"" FOREIGN KEY (""ReferrerTenantId"")
                        REFERENCES tenants (""Id"") ON DELETE CASCADE
                );
            ");

            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_TenantReferralProfiles_TenantId"" ON ""TenantReferralProfiles"" (""TenantId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_TenantReferralConversions_RefereeTenantId"" ON ""TenantReferralConversions"" (""RefereeTenantId"");");
            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_TenantReferralConversions_ReferrerTenantId"" ON ""TenantReferralConversions"" (""ReferrerTenantId"");");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "TenantReferralConversions");
            migrationBuilder.DropTable(name: "TenantReferralProfiles");
            migrationBuilder.DropTable(name: "ReferralProgramConfigs");
        }
    }
}
