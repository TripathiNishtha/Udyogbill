using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDoctorAndChemistApprovalWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApprovalStatus",
                table: "SfaDoctors",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ChangeRemarks",
                table: "SfaDoctors",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeleteApprovalLevel",
                table: "SfaDoctors",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsLocked",
                table: "SfaDoctors",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ApprovalStatus",
                table: "SfaChemists",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ChangeRemarks",
                table: "SfaChemists",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeleteApprovalLevel",
                table: "SfaChemists",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsLocked",
                table: "SfaChemists",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ApprovalStatus",
                table: "DoctorPrescribers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ChangeRemarks",
                table: "DoctorPrescribers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeleteApprovalLevel",
                table: "DoctorPrescribers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsLocked",
                table: "DoctorPrescribers",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApprovalStatus",
                table: "SfaDoctors");

            migrationBuilder.DropColumn(
                name: "ChangeRemarks",
                table: "SfaDoctors");

            migrationBuilder.DropColumn(
                name: "DeleteApprovalLevel",
                table: "SfaDoctors");

            migrationBuilder.DropColumn(
                name: "IsLocked",
                table: "SfaDoctors");

            migrationBuilder.DropColumn(
                name: "ApprovalStatus",
                table: "SfaChemists");

            migrationBuilder.DropColumn(
                name: "ChangeRemarks",
                table: "SfaChemists");

            migrationBuilder.DropColumn(
                name: "DeleteApprovalLevel",
                table: "SfaChemists");

            migrationBuilder.DropColumn(
                name: "IsLocked",
                table: "SfaChemists");

            migrationBuilder.DropColumn(
                name: "ApprovalStatus",
                table: "DoctorPrescribers");

            migrationBuilder.DropColumn(
                name: "ChangeRemarks",
                table: "DoctorPrescribers");

            migrationBuilder.DropColumn(
                name: "DeleteApprovalLevel",
                table: "DoctorPrescribers");

            migrationBuilder.DropColumn(
                name: "IsLocked",
                table: "DoctorPrescribers");
        }
    }
}
