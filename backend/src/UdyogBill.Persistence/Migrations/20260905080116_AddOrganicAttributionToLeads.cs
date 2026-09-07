using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganicAttributionToLeads : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ConversionStage",
                table: "Leads",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "ConvertedPaidAt",
                table: "Leads",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeviceType",
                table: "Leads",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IndustryCode",
                table: "Leads",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LandingPage",
                table: "Leads",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PaidAmount",
                table: "Leads",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReferrerUrl",
                table: "Leads",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SearchKeyword",
                table: "Leads",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "Leads",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "TrialStartedAt",
                table: "Leads",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmCampaign",
                table: "Leads",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmMedium",
                table: "Leads",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmSource",
                table: "Leads",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConversionStage",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "ConvertedPaidAt",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "DeviceType",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "IndustryCode",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "LandingPage",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "PaidAmount",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "ReferrerUrl",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "SearchKeyword",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "State",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "TrialStartedAt",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "UtmCampaign",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "UtmMedium",
                table: "Leads");

            migrationBuilder.DropColumn(
                name: "UtmSource",
                table: "Leads");
        }
    }
}
