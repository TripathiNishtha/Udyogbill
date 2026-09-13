using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UdyogBill.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUniversalHrmSuite : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "item_warehouse_stocks",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.CreateTable(
                name: "HrmEmployeeProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeCode = table.Column<string>(type: "text", nullable: false),
                    Department = table.Column<string>(type: "text", nullable: false),
                    Designation = table.Column<string>(type: "text", nullable: false),
                    WorkMode = table.Column<int>(type: "integer", nullable: false),
                    DefaultStationType = table.Column<int>(type: "integer", nullable: false),
                    ReportingManagerUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    HeadquarterCity = table.Column<string>(type: "text", nullable: false),
                    SfaDivisionId = table.Column<Guid>(type: "uuid", nullable: true),
                    SfaTerritoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    PanNumber = table.Column<string>(type: "text", nullable: false),
                    AadhaarNumber = table.Column<string>(type: "text", nullable: false),
                    UanNumber = table.Column<string>(type: "text", nullable: false),
                    EsicNumber = table.Column<string>(type: "text", nullable: false),
                    BankName = table.Column<string>(type: "text", nullable: false),
                    BankAccountNumber = table.Column<string>(type: "text", nullable: false),
                    BankIfscCode = table.Column<string>(type: "text", nullable: false),
                    BankBranchName = table.Column<string>(type: "text", nullable: false),
                    OfficeLatitude = table.Column<double>(type: "double precision", nullable: true),
                    OfficeLongitude = table.Column<double>(type: "double precision", nullable: true),
                    OfficeGeofenceRadiusMeters = table.Column<int>(type: "integer", nullable: false),
                    OfficeWifiSsid = table.Column<string>(type: "text", nullable: true),
                    JoiningDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResignationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HrmEmployeeProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HrmEmployeeProfiles_users_ReportingManagerUserId",
                        column: x => x.ReportingManagerUserId,
                        principalTable: "users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_HrmEmployeeProfiles_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HrmLeaveTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    AnnualQuotaDays = table.Column<decimal>(type: "numeric", nullable: false),
                    IsPaid = table.Column<bool>(type: "boolean", nullable: false),
                    AllowCarryForward = table.Column<bool>(type: "boolean", nullable: false),
                    MaxCarryForwardDays = table.Column<decimal>(type: "numeric", nullable: false),
                    RequiresMedicalCertificate = table.Column<bool>(type: "boolean", nullable: false),
                    MinNoticeDays = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HrmLeaveTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HrmPayrollCycles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    BatchTitle = table.Column<string>(type: "text", nullable: false),
                    TotalEmployeesProcessed = table.Column<int>(type: "integer", nullable: false),
                    TotalGrossPayout = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalNetPayout = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalPfContribution = table.Column<decimal>(type: "numeric", nullable: false),
                    TotalEsicContribution = table.Column<decimal>(type: "numeric", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    FinalizedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DisbursedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HrmPayrollCycles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HrmStationPolicies",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Designation = table.Column<string>(type: "text", nullable: false),
                    StationType = table.Column<int>(type: "integer", nullable: false),
                    DailyAllowanceRate = table.Column<decimal>(type: "numeric", nullable: false),
                    BikeRatePerKm = table.Column<decimal>(type: "numeric", nullable: false),
                    CarRatePerKm = table.Column<decimal>(type: "numeric", nullable: false),
                    HotelStayMaxLimit = table.Column<decimal>(type: "numeric", nullable: false),
                    RequiresReceiptAboveAmount = table.Column<bool>(type: "boolean", nullable: false),
                    ReceiptThresholdAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HrmStationPolicies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HrmAttendanceLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    AttendanceDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PunchInTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PunchOutTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    WorkModeAtPunch = table.Column<int>(type: "integer", nullable: false),
                    PunchInLatitude = table.Column<double>(type: "double precision", nullable: true),
                    PunchInLongitude = table.Column<double>(type: "double precision", nullable: true),
                    IsPunchInGeofenceVerified = table.Column<bool>(type: "boolean", nullable: false),
                    PunchInAddress = table.Column<string>(type: "text", nullable: true),
                    PunchOutLatitude = table.Column<double>(type: "double precision", nullable: true),
                    PunchOutLongitude = table.Column<double>(type: "double precision", nullable: true),
                    PunchOutAddress = table.Column<string>(type: "text", nullable: true),
                    BatteryPercentage = table.Column<int>(type: "integer", nullable: false),
                    SelfieImageUrl = table.Column<string>(type: "text", nullable: true),
                    TotalWorkHours = table.Column<double>(type: "double precision", nullable: false),
                    LateMinutes = table.Column<int>(type: "integer", nullable: false),
                    IsLateMark = table.Column<bool>(type: "boolean", nullable: false),
                    AssociatedDcrId = table.Column<Guid>(type: "uuid", nullable: true),
                    Remarks = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HrmAttendanceLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HrmAttendanceLogs_HrmEmployeeProfiles_EmployeeProfileId",
                        column: x => x.EmployeeProfileId,
                        principalTable: "HrmEmployeeProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HrmExpenseClaims",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClaimDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Category = table.Column<string>(type: "text", nullable: false),
                    StationType = table.Column<int>(type: "integer", nullable: false),
                    ClaimedDistanceKm = table.Column<decimal>(type: "numeric", nullable: false),
                    ClaimedAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    ApprovedAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    ReceiptAttachmentUrl = table.Column<string>(type: "text", nullable: true),
                    SfaDailyCallReportId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ApprovedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovalRemarks = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HrmExpenseClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HrmExpenseClaims_HrmEmployeeProfiles_EmployeeProfileId",
                        column: x => x.EmployeeProfileId,
                        principalTable: "HrmEmployeeProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HrmExpenseClaims_users_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "HrmSalaryStructures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    MonthlyGrossSalary = table.Column<decimal>(type: "numeric", nullable: false),
                    BasicSalary = table.Column<decimal>(type: "numeric", nullable: false),
                    HouseRentAllowance = table.Column<decimal>(type: "numeric", nullable: false),
                    ConveyanceAllowance = table.Column<decimal>(type: "numeric", nullable: false),
                    SpecialAllowance = table.Column<decimal>(type: "numeric", nullable: false),
                    IsPfApplicable = table.Column<bool>(type: "boolean", nullable: false),
                    IsEsicApplicable = table.Column<bool>(type: "boolean", nullable: false),
                    IsProfessionalTaxApplicable = table.Column<bool>(type: "boolean", nullable: false),
                    EstimatedMonthlyTds = table.Column<decimal>(type: "numeric", nullable: false),
                    CurrentOutstandingAdvance = table.Column<decimal>(type: "numeric", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HrmSalaryStructures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HrmSalaryStructures_HrmEmployeeProfiles_EmployeeProfileId",
                        column: x => x.EmployeeProfileId,
                        principalTable: "HrmEmployeeProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HrmLeaveApplications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    LeaveTypeId = table.Column<Guid>(type: "uuid", nullable: false),
                    FromDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ToDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalDays = table.Column<decimal>(type: "numeric", nullable: false),
                    IsHalfDay = table.Column<bool>(type: "boolean", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ManagerRemarks = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HrmLeaveApplications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HrmLeaveApplications_HrmEmployeeProfiles_EmployeeProfileId",
                        column: x => x.EmployeeProfileId,
                        principalTable: "HrmEmployeeProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HrmLeaveApplications_HrmLeaveTypes_LeaveTypeId",
                        column: x => x.LeaveTypeId,
                        principalTable: "HrmLeaveTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HrmLeaveApplications_users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "HrmLeaveBalances",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    LeaveTypeId = table.Column<Guid>(type: "uuid", nullable: false),
                    CalendarYear = table.Column<int>(type: "integer", nullable: false),
                    TotalAllocatedDays = table.Column<decimal>(type: "numeric", nullable: false),
                    CarriedForwardDays = table.Column<decimal>(type: "numeric", nullable: false),
                    UsedDays = table.Column<decimal>(type: "numeric", nullable: false),
                    PendingApprovalDays = table.Column<decimal>(type: "numeric", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HrmLeaveBalances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HrmLeaveBalances_HrmEmployeeProfiles_EmployeeProfileId",
                        column: x => x.EmployeeProfileId,
                        principalTable: "HrmEmployeeProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HrmLeaveBalances_HrmLeaveTypes_LeaveTypeId",
                        column: x => x.LeaveTypeId,
                        principalTable: "HrmLeaveTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HrmPayslips",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PayrollCycleId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeProfileId = table.Column<Guid>(type: "uuid", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    Year = table.Column<int>(type: "integer", nullable: false),
                    CalendarDaysInMonth = table.Column<int>(type: "integer", nullable: false),
                    PayableDays = table.Column<decimal>(type: "numeric", nullable: false),
                    LossOfPayDays = table.Column<decimal>(type: "numeric", nullable: false),
                    BasicEarned = table.Column<decimal>(type: "numeric", nullable: false),
                    HraEarned = table.Column<decimal>(type: "numeric", nullable: false),
                    ConveyanceEarned = table.Column<decimal>(type: "numeric", nullable: false),
                    SpecialAllowanceEarned = table.Column<decimal>(type: "numeric", nullable: false),
                    SalesIncentiveEarned = table.Column<decimal>(type: "numeric", nullable: false),
                    ReimbursedExpensesEarned = table.Column<decimal>(type: "numeric", nullable: false),
                    EmployeePfDeduction = table.Column<decimal>(type: "numeric", nullable: false),
                    EmployeeEsicDeduction = table.Column<decimal>(type: "numeric", nullable: false),
                    ProfessionalTaxDeduction = table.Column<decimal>(type: "numeric", nullable: false),
                    TdsDeduction = table.Column<decimal>(type: "numeric", nullable: false),
                    SalaryAdvanceRecovery = table.Column<decimal>(type: "numeric", nullable: false),
                    IsDisbursed = table.Column<bool>(type: "boolean", nullable: false),
                    DisbursedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PaymentReferenceTransactionId = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HrmPayslips", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HrmPayslips_HrmEmployeeProfiles_EmployeeProfileId",
                        column: x => x.EmployeeProfileId,
                        principalTable: "HrmEmployeeProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HrmPayslips_HrmPayrollCycles_PayrollCycleId",
                        column: x => x.PayrollCycleId,
                        principalTable: "HrmPayrollCycles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HrmAttendanceLogs_EmployeeProfileId",
                table: "HrmAttendanceLogs",
                column: "EmployeeProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_HrmEmployeeProfiles_ReportingManagerUserId",
                table: "HrmEmployeeProfiles",
                column: "ReportingManagerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_HrmEmployeeProfiles_UserId",
                table: "HrmEmployeeProfiles",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_HrmExpenseClaims_ApprovedByUserId",
                table: "HrmExpenseClaims",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_HrmExpenseClaims_EmployeeProfileId",
                table: "HrmExpenseClaims",
                column: "EmployeeProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_HrmLeaveApplications_EmployeeProfileId",
                table: "HrmLeaveApplications",
                column: "EmployeeProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_HrmLeaveApplications_LeaveTypeId",
                table: "HrmLeaveApplications",
                column: "LeaveTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_HrmLeaveApplications_ReviewedByUserId",
                table: "HrmLeaveApplications",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_HrmLeaveBalances_EmployeeProfileId",
                table: "HrmLeaveBalances",
                column: "EmployeeProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_HrmLeaveBalances_LeaveTypeId",
                table: "HrmLeaveBalances",
                column: "LeaveTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_HrmPayslips_EmployeeProfileId",
                table: "HrmPayslips",
                column: "EmployeeProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_HrmPayslips_PayrollCycleId",
                table: "HrmPayslips",
                column: "PayrollCycleId");

            migrationBuilder.CreateIndex(
                name: "IX_HrmSalaryStructures_EmployeeProfileId",
                table: "HrmSalaryStructures",
                column: "EmployeeProfileId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HrmAttendanceLogs");

            migrationBuilder.DropTable(
                name: "HrmExpenseClaims");

            migrationBuilder.DropTable(
                name: "HrmLeaveApplications");

            migrationBuilder.DropTable(
                name: "HrmLeaveBalances");

            migrationBuilder.DropTable(
                name: "HrmPayslips");

            migrationBuilder.DropTable(
                name: "HrmSalaryStructures");

            migrationBuilder.DropTable(
                name: "HrmStationPolicies");

            migrationBuilder.DropTable(
                name: "HrmLeaveTypes");

            migrationBuilder.DropTable(
                name: "HrmPayrollCycles");

            migrationBuilder.DropTable(
                name: "HrmEmployeeProfiles");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "item_warehouse_stocks");
        }
    }
}
