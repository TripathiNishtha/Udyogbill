using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPharmaSfaSprint4Entities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                -- Tour Plan Items
                ALTER TABLE ""SfaTourPlanItems"" ADD COLUMN IF NOT EXISTS ""ActivityType"" text NOT NULL DEFAULT '';
                ALTER TABLE ""SfaTourPlanItems"" ADD COLUMN IF NOT EXISTS ""BeatId"" uuid;
                ALTER TABLE ""SfaTourPlanItems"" ADD COLUMN IF NOT EXISTS ""PatchId"" uuid;

                -- Expense Claims
                ALTER TABLE ""SfaExpenseClaims"" ADD COLUMN IF NOT EXISTS ""AccountsVerifiedAtUtc"" timestamp with time zone;
                ALTER TABLE ""SfaExpenseClaims"" ADD COLUMN IF NOT EXISTS ""AccountsVerifiedByUserId"" uuid;
                ALTER TABLE ""SfaExpenseClaims"" ADD COLUMN IF NOT EXISTS ""DisbursedAtUtc"" timestamp with time zone;
                ALTER TABLE ""SfaExpenseClaims"" ADD COLUMN IF NOT EXISTS ""PaymentMode"" text;
                ALTER TABLE ""SfaExpenseClaims"" ADD COLUMN IF NOT EXISTS ""PaymentReferenceNumber"" text;

                -- Expense Claim Items
                ALTER TABLE ""SfaExpenseClaimItems"" ADD COLUMN IF NOT EXISTS ""DailyAllowanceAmount"" numeric NOT NULL DEFAULT 0.0;
                ALTER TABLE ""SfaExpenseClaimItems"" ADD COLUMN IF NOT EXISTS ""TravelAllowanceAmount"" numeric NOT NULL DEFAULT 0.0;
                ALTER TABLE ""SfaExpenseClaimItems"" ADD COLUMN IF NOT EXISTS ""WorkType"" text NOT NULL DEFAULT '';

                -- Employee Profiles
                ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""AppVersion"" text;
                ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""DeviceId"" text;
                ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""DivisionId"" uuid;
                ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""Email"" text;
                ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""EmergencyContact"" text;
                ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""Gender"" text;
                ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""Mobile"" text;
                ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""MonthlyTargetAmount"" numeric NOT NULL DEFAULT 0.0;
                ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""PatchId"" uuid;
                ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""ReportingAbmUserId"" uuid;
                ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""ReportingRsmUserId"" uuid;
                ALTER TABLE ""SfaEmployeeProfiles"" ADD COLUMN IF NOT EXISTS ""ReportingZsmUserId"" uuid;

                -- Doctors
                ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""BeatId"" uuid;
                ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""DivisionId"" uuid;
                ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""GeoFenceRadiusMeters"" numeric NOT NULL DEFAULT 0.0;
                ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""Latitude"" numeric NOT NULL DEFAULT 0.0;
                ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""Longitude"" numeric NOT NULL DEFAULT 0.0;
                ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""PatchId"" uuid;
                ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""PreferredVisitTime"" text;
                ALTER TABLE ""SfaDoctors"" ADD COLUMN IF NOT EXISTS ""VisitFrequencyPerMonth"" integer NOT NULL DEFAULT 0;

                -- Chemists
                ALTER TABLE ""SfaChemists"" ADD COLUMN IF NOT EXISTS ""BeatId"" uuid;
                ALTER TABLE ""SfaChemists"" ADD COLUMN IF NOT EXISTS ""DivisionId"" uuid;
                ALTER TABLE ""SfaChemists"" ADD COLUMN IF NOT EXISTS ""PatchId"" uuid;
                ALTER TABLE ""SfaChemists"" ADD COLUMN IF NOT EXISTS ""PreferredVisitDay"" text;

                -- Divisions
                CREATE TABLE IF NOT EXISTS ""SfaDivisions"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""Code"" text NOT NULL,
                    ""Name"" text NOT NULL,
                    ""Description"" text,
                    ""IsActive"" boolean NOT NULL DEFAULT true,
                    ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                    ""CreatedBy"" uuid,
                    ""UpdatedAtUtc"" timestamp with time zone,
                    ""UpdatedBy"" uuid,
                    ""IsDeleted"" boolean NOT NULL DEFAULT false,
                    ""DeletedAtUtc"" timestamp with time zone,
                    ""DeletedBy"" uuid,
                    ""TenantId"" uuid NOT NULL
                );

                -- Doctor Allocation Histories
                CREATE TABLE IF NOT EXISTS ""SfaDoctorAllocationHistories"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""DoctorId"" uuid NOT NULL,
                    ""PreviousMrUserId"" uuid,
                    ""NewMrUserId"" uuid NOT NULL,
                    ""AllocatedByUserId"" uuid NOT NULL,
                    ""AllocatedAtUtc"" timestamp with time zone NOT NULL,
                    ""Reason"" text,
                    ""TenantId"" uuid NOT NULL
                );

                -- Expense Policies
                CREATE TABLE IF NOT EXISTS ""SfaExpensePolicies"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""PolicyName"" text NOT NULL,
                    ""HqDailyAllowance"" numeric NOT NULL DEFAULT 0.0,
                    ""ExHqDailyAllowance"" numeric NOT NULL DEFAULT 0.0,
                    ""OutstationDailyAllowance"" numeric NOT NULL DEFAULT 0.0,
                    ""RatePerKmTwoWheeler"" numeric NOT NULL DEFAULT 0.0,
                    ""RatePerKmFourWheeler"" numeric NOT NULL DEFAULT 0.0,
                    ""HotelAllowancePerNight"" numeric NOT NULL DEFAULT 0.0,
                    ""MaxMonthlyExpenseLimit"" numeric NOT NULL DEFAULT 0.0,
                    ""IsActive"" boolean NOT NULL DEFAULT true,
                    ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                    ""CreatedBy"" uuid,
                    ""UpdatedAtUtc"" timestamp with time zone,
                    ""UpdatedBy"" uuid,
                    ""IsDeleted"" boolean NOT NULL DEFAULT false,
                    ""DeletedAtUtc"" timestamp with time zone,
                    ""DeletedBy"" uuid,
                    ""TenantId"" uuid NOT NULL
                );

                -- Patches
                CREATE TABLE IF NOT EXISTS ""SfaPatches"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""TerritoryId"" uuid NOT NULL,
                    ""Name"" text NOT NULL,
                    ""Code"" text NOT NULL,
                    ""HeadquartersTown"" text,
                    ""IsActive"" boolean NOT NULL DEFAULT true,
                    ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                    ""CreatedBy"" uuid,
                    ""UpdatedAtUtc"" timestamp with time zone,
                    ""UpdatedBy"" uuid,
                    ""IsDeleted"" boolean NOT NULL DEFAULT false,
                    ""DeletedAtUtc"" timestamp with time zone,
                    ""DeletedBy"" uuid,
                    ""TenantId"" uuid NOT NULL
                );

                -- User Hierarchies
                CREATE TABLE IF NOT EXISTS ""SfaUserHierarchies"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""UserId"" uuid NOT NULL,
                    ""Designation"" text NOT NULL,
                    ""HeadquartersTown"" text,
                    ""ReportsToUserId"" uuid,
                    ""AbmUserId"" uuid,
                    ""RsmUserId"" uuid,
                    ""ZsmUserId"" uuid,
                    ""TerritoryId"" uuid,
                    ""IsActive"" boolean NOT NULL DEFAULT true,
                    ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                    ""CreatedBy"" uuid,
                    ""UpdatedAtUtc"" timestamp with time zone,
                    ""UpdatedBy"" uuid,
                    ""IsDeleted"" boolean NOT NULL DEFAULT false,
                    ""DeletedAtUtc"" timestamp with time zone,
                    ""DeletedBy"" uuid,
                    ""TenantId"" uuid NOT NULL
                );

                -- Beats
                CREATE TABLE IF NOT EXISTS ""SfaBeats"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""PatchId"" uuid NOT NULL,
                    ""Name"" text NOT NULL,
                    ""Code"" text NOT NULL,
                    ""ScheduleDayOfWeek"" text,
                    ""IsActive"" boolean NOT NULL DEFAULT true,
                    ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                    ""CreatedBy"" uuid,
                    ""UpdatedAtUtc"" timestamp with time zone,
                    ""UpdatedBy"" uuid,
                    ""IsDeleted"" boolean NOT NULL DEFAULT false,
                    ""DeletedAtUtc"" timestamp with time zone,
                    ""DeletedBy"" uuid,
                    ""TenantId"" uuid NOT NULL
                );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DROP TABLE IF EXISTS ""SfaUserHierarchies"";
                DROP TABLE IF EXISTS ""SfaExpensePolicies"";
            ");
        }
    }
}
