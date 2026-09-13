using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.HRM;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class HrmService : IHrmService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;

    public HrmService(AppDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    #region 1. Employee Profile & Hierarchy

    public async Task<Result<IReadOnlyList<HrmEmployeeProfileDto>>> GetEmployeeProfilesAsync(
        HrmWorkMode? workMode = null,
        string? department = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.HrmEmployeeProfiles
            .AsNoTracking()
            .Include(x => x.User)
            .Include(x => x.ReportingManagerUser)
            .AsQueryable();

        if (workMode.HasValue)
            query = query.Where(x => x.WorkMode == workMode.Value);

        if (!string.IsNullOrWhiteSpace(department))
            query = query.Where(x => x.Department == department);

        var list = await query
            .OrderBy(x => x.EmployeeCode)
            .Select(x => new HrmEmployeeProfileDto(
                x.Id,
                x.UserId,
                x.User.FullName,
                x.User.Email,
                x.User.PhoneNumber,
                x.EmployeeCode,
                x.Department,
                x.Designation,
                x.WorkMode,
                x.DefaultStationType,
                x.ReportingManagerUserId,
                x.ReportingManagerUser != null ? x.ReportingManagerUser.FullName : null,
                x.HeadquarterCity,
                x.SfaDivisionId,
                x.SfaTerritoryId,
                x.PanNumber,
                x.AadhaarNumber,
                x.UanNumber,
                x.EsicNumber,
                x.BankName,
                x.BankAccountNumber,
                x.BankIfscCode,
                x.BankBranchName,
                x.OfficeLatitude,
                x.OfficeLongitude,
                x.OfficeGeofenceRadiusMeters,
                x.OfficeWifiSsid,
                x.JoiningDate,
                x.IsActive
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<HrmEmployeeProfileDto>>.Success(list);
    }

    public async Task<Result<HrmEmployeeProfileDto>> GetEmployeeProfileByIdAsync(
        Guid profileId,
        CancellationToken cancellationToken = default)
    {
        var x = await _db.HrmEmployeeProfiles
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.ReportingManagerUser)
            .FirstOrDefaultAsync(p => p.Id == profileId, cancellationToken);

        if (x == null)
            return Result<HrmEmployeeProfileDto>.Failure("Employee profile not found.");

        var dto = new HrmEmployeeProfileDto(
            x.Id,
            x.UserId,
            x.User.FullName,
            x.User.Email,
            x.User.PhoneNumber,
            x.EmployeeCode,
            x.Department,
            x.Designation,
            x.WorkMode,
            x.DefaultStationType,
            x.ReportingManagerUserId,
            x.ReportingManagerUser != null ? x.ReportingManagerUser.FullName : null,
            x.HeadquarterCity,
            x.SfaDivisionId,
            x.SfaTerritoryId,
            x.PanNumber,
            x.AadhaarNumber,
            x.UanNumber,
            x.EsicNumber,
            x.BankName,
            x.BankAccountNumber,
            x.BankIfscCode,
            x.BankBranchName,
            x.OfficeLatitude,
            x.OfficeLongitude,
            x.OfficeGeofenceRadiusMeters,
            x.OfficeWifiSsid,
            x.JoiningDate,
            x.IsActive
        );

        return Result<HrmEmployeeProfileDto>.Success(dto);
    }

    public async Task<Result<HrmEmployeeProfileDto>> GetEmployeeProfileByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var x = await _db.HrmEmployeeProfiles
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.ReportingManagerUser)
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        if (x == null)
            return Result<HrmEmployeeProfileDto>.Failure("Employee profile for user not found.");

        var dto = new HrmEmployeeProfileDto(
            x.Id,
            x.UserId,
            x.User.FullName,
            x.User.Email,
            x.User.PhoneNumber,
            x.EmployeeCode,
            x.Department,
            x.Designation,
            x.WorkMode,
            x.DefaultStationType,
            x.ReportingManagerUserId,
            x.ReportingManagerUser != null ? x.ReportingManagerUser.FullName : null,
            x.HeadquarterCity,
            x.SfaDivisionId,
            x.SfaTerritoryId,
            x.PanNumber,
            x.AadhaarNumber,
            x.UanNumber,
            x.EsicNumber,
            x.BankName,
            x.BankAccountNumber,
            x.BankIfscCode,
            x.BankBranchName,
            x.OfficeLatitude,
            x.OfficeLongitude,
            x.OfficeGeofenceRadiusMeters,
            x.OfficeWifiSsid,
            x.JoiningDate,
            x.IsActive
        );

        return Result<HrmEmployeeProfileDto>.Success(dto);
    }

    public async Task<Result<Guid>> CreateOrUpdateEmployeeProfileAsync(
        CreateOrUpdateHrmEmployeeRequest request,
        CancellationToken cancellationToken = default)
    {
        HrmEmployeeProfile? profile = null;

        if (request.ProfileId.HasValue)
        {
            profile = await _db.HrmEmployeeProfiles
                .FirstOrDefaultAsync(x => x.Id == request.ProfileId.Value, cancellationToken);
        }
        else
        {
            profile = await _db.HrmEmployeeProfiles
                .FirstOrDefaultAsync(x => x.UserId == request.UserId, cancellationToken);
        }

        if (profile == null)
        {
            profile = new HrmEmployeeProfile
            {
                TenantId = _tenantContext.TenantId,
                UserId = request.UserId
            };
            _db.HrmEmployeeProfiles.Add(profile);
        }

        profile.EmployeeCode = request.EmployeeCode;
        profile.Department = request.Department;
        profile.Designation = request.Designation;
        profile.WorkMode = request.WorkMode;
        profile.DefaultStationType = request.DefaultStationType;
        profile.ReportingManagerUserId = request.ReportingManagerUserId;
        profile.HeadquarterCity = request.HeadquarterCity;
        profile.SfaDivisionId = request.SfaDivisionId;
        profile.SfaTerritoryId = request.SfaTerritoryId;
        profile.PanNumber = request.PanNumber;
        profile.AadhaarNumber = request.AadhaarNumber;
        profile.UanNumber = request.UanNumber;
        profile.EsicNumber = request.EsicNumber;
        profile.BankName = request.BankName;
        profile.BankAccountNumber = request.BankAccountNumber;
        profile.BankIfscCode = request.BankIfscCode;
        profile.BankBranchName = request.BankBranchName;
        profile.OfficeLatitude = request.OfficeLatitude;
        profile.OfficeLongitude = request.OfficeLongitude;
        profile.OfficeGeofenceRadiusMeters = request.OfficeGeofenceRadiusMeters > 0 ? request.OfficeGeofenceRadiusMeters : 100;
        profile.OfficeWifiSsid = request.OfficeWifiSsid;
        if (request.JoiningDate.HasValue) profile.JoiningDate = request.JoiningDate.Value;

        await _db.SaveChangesAsync(cancellationToken);

        // Auto-initialize default leave balances for current calendar year
        await EnsureLeaveBalancesInitializedAsync(profile.Id, DateTime.UtcNow.Year, cancellationToken);

        return Result<Guid>.Success(profile.Id);
    }

    private async Task EnsureLeaveBalancesInitializedAsync(Guid employeeProfileId, int year, CancellationToken cancellationToken)
    {
        var existingTypes = await _db.HrmLeaveTypes
            .Where(x => x.IsActive)
            .ToListAsync(cancellationToken);

        if (!existingTypes.Any())
        {
            // Seed standard leave types if none exist
            var defaultTypes = new List<HrmLeaveType>
            {
                new() { TenantId = _tenantContext.TenantId, Code = "CL", Name = "Casual Leave", AnnualQuotaDays = 12, IsPaid = true },
                new() { TenantId = _tenantContext.TenantId, Code = "SL", Name = "Sick Leave", AnnualQuotaDays = 8, IsPaid = true, RequiresMedicalCertificate = true },
                new() { TenantId = _tenantContext.TenantId, Code = "PL", Name = "Privilege / Earned Leave", AnnualQuotaDays = 15, IsPaid = true, AllowCarryForward = true, MaxCarryForwardDays = 30 },
                new() { TenantId = _tenantContext.TenantId, Code = "COMP_OFF", Name = "Compensatory Off", AnnualQuotaDays = 0, IsPaid = true },
                new() { TenantId = _tenantContext.TenantId, Code = "LWP", Name = "Leave Without Pay", AnnualQuotaDays = 0, IsPaid = false }
            };
            _db.HrmLeaveTypes.AddRange(defaultTypes);
            await _db.SaveChangesAsync(cancellationToken);
            existingTypes = defaultTypes;
        }

        var existingBalances = await _db.HrmLeaveBalances
            .Where(b => b.EmployeeProfileId == employeeProfileId && b.CalendarYear == year)
            .Select(b => b.LeaveTypeId)
            .ToListAsync(cancellationToken);

        foreach (var lt in existingTypes)
        {
            if (!existingBalances.Contains(lt.Id))
            {
                _db.HrmLeaveBalances.Add(new HrmLeaveBalance
                {
                    TenantId = _tenantContext.TenantId,
                    EmployeeProfileId = employeeProfileId,
                    LeaveTypeId = lt.Id,
                    CalendarYear = year,
                    TotalAllocatedDays = lt.AnnualQuotaDays,
                    CarriedForwardDays = 0,
                    UsedDays = 0,
                    PendingApprovalDays = 0
                });
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    #endregion

    #region 2. Leave Management System (LMS)

    public async Task<Result<IReadOnlyList<HrmLeaveTypeDto>>> GetLeaveTypesAsync(
        bool activeOnly = true,
        CancellationToken cancellationToken = default)
    {
        var query = _db.HrmLeaveTypes.AsNoTracking().AsQueryable();
        if (activeOnly) query = query.Where(x => x.IsActive);

        var list = await query
            .OrderBy(x => x.Code)
            .Select(x => new HrmLeaveTypeDto(
                x.Id,
                x.Code,
                x.Name,
                x.Description,
                x.AnnualQuotaDays,
                x.IsPaid,
                x.AllowCarryForward,
                x.MaxCarryForwardDays,
                x.RequiresMedicalCertificate,
                x.MinNoticeDays,
                x.IsActive
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<HrmLeaveTypeDto>>.Success(list);
    }

    public async Task<Result<Guid>> SaveLeaveTypeAsync(
        SaveHrmLeaveTypeRequest request,
        CancellationToken cancellationToken = default)
    {
        HrmLeaveType? entity = null;
        if (request.Id.HasValue && request.Id.Value != Guid.Empty)
        {
            entity = await _db.HrmLeaveTypes
                .FirstOrDefaultAsync(x => x.Id == request.Id.Value, cancellationToken);
        }

        if (entity == null)
        {
            entity = new HrmLeaveType
            {
                TenantId = _tenantContext.TenantId
            };
            _db.HrmLeaveTypes.Add(entity);
        }

        entity.Code = request.Code.Trim().ToUpperInvariant();
        entity.Name = request.Name;
        entity.Description = request.Description;
        entity.AnnualQuotaDays = request.AnnualQuotaDays;
        entity.IsPaid = request.IsPaid;
        entity.AllowCarryForward = request.AllowCarryForward;
        entity.MaxCarryForwardDays = request.MaxCarryForwardDays;
        entity.RequiresMedicalCertificate = request.RequiresMedicalCertificate;
        entity.MinNoticeDays = request.MinNoticeDays;
        entity.IsActive = request.IsActive;

        await _db.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(entity.Id);
    }

    public async Task<Result<IReadOnlyList<HrmLeaveBalanceDto>>> GetEmployeeLeaveBalancesAsync(
        Guid employeeProfileId,
        int year,
        CancellationToken cancellationToken = default)
    {
        await EnsureLeaveBalancesInitializedAsync(employeeProfileId, year, cancellationToken);

        var list = await _db.HrmLeaveBalances
            .AsNoTracking()
            .Include(x => x.LeaveType)
            .Where(x => x.EmployeeProfileId == employeeProfileId && x.CalendarYear == year)
            .Select(x => new HrmLeaveBalanceDto(
                x.LeaveTypeId,
                x.LeaveType.Code,
                x.LeaveType.Name,
                x.CalendarYear,
                x.TotalAllocatedDays,
                x.CarriedForwardDays,
                x.UsedDays,
                x.PendingApprovalDays,
                x.AvailableDays
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<HrmLeaveBalanceDto>>.Success(list);
    }

    public async Task<Result<IReadOnlyList<HrmLeaveApplicationDto>>> GetLeaveApplicationsAsync(
        Guid? employeeProfileId = null,
        HrmLeaveStatus? status = null,
        int? month = null,
        int? year = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.HrmLeaveApplications
            .AsNoTracking()
            .Include(x => x.EmployeeProfile).ThenInclude(p => p.User)
            .Include(x => x.LeaveType)
            .Include(x => x.ReviewedByUser)
            .AsQueryable();

        if (employeeProfileId.HasValue)
            query = query.Where(x => x.EmployeeProfileId == employeeProfileId.Value);

        if (status.HasValue)
            query = query.Where(x => x.Status == status.Value);

        if (year.HasValue)
            query = query.Where(x => x.FromDate.Year == year.Value || x.ToDate.Year == year.Value);

        if (month.HasValue)
            query = query.Where(x => x.FromDate.Month == month.Value || x.ToDate.Month == month.Value);

        var list = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new HrmLeaveApplicationDto(
                x.Id,
                x.EmployeeProfileId,
                x.EmployeeProfile.User.FullName,
                x.EmployeeProfile.EmployeeCode,
                x.LeaveTypeId,
                x.LeaveType.Code,
                x.LeaveType.Name,
                x.FromDate,
                x.ToDate,
                x.TotalDays,
                x.IsHalfDay,
                x.Reason,
                x.Status,
                x.Status.ToString(),
                x.ReviewedByUserId,
                x.ReviewedByUser != null ? x.ReviewedByUser.FullName : null,
                x.ReviewedAtUtc,
                x.ManagerRemarks,
                x.CreatedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<HrmLeaveApplicationDto>>.Success(list);
    }

    public async Task<Result<Guid>> ApplyLeaveAsync(
        ApplyHrmLeaveRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.ToDate < request.FromDate)
            return Result<Guid>.Failure("To date cannot be earlier than From date.");

        var leaveType = await _db.HrmLeaveTypes
            .FirstOrDefaultAsync(x => x.Id == request.LeaveTypeId, cancellationToken);
        if (leaveType == null)
            return Result<Guid>.Failure("Invalid leave type selected.");

        decimal totalDays = request.IsHalfDay
            ? 0.5m
            : (decimal)(request.ToDate.Date - request.FromDate.Date).TotalDays + 1;

        int year = request.FromDate.Year;
        var balance = await _db.HrmLeaveBalances
            .FirstOrDefaultAsync(x => x.EmployeeProfileId == request.EmployeeProfileId && x.LeaveTypeId == request.LeaveTypeId && x.CalendarYear == year, cancellationToken);

        if (balance == null)
        {
            await EnsureLeaveBalancesInitializedAsync(request.EmployeeProfileId, year, cancellationToken);
            balance = await _db.HrmLeaveBalances
                .FirstOrDefaultAsync(x => x.EmployeeProfileId == request.EmployeeProfileId && x.LeaveTypeId == request.LeaveTypeId && x.CalendarYear == year, cancellationToken);
        }

        if (balance != null && leaveType.IsPaid && balance.AvailableDays < totalDays)
        {
            return Result<Guid>.Failure($"Insufficient {leaveType.Name} balance. Available: {balance.AvailableDays} days, Requested: {totalDays} days.");
        }

        var application = new HrmLeaveApplication
        {
            TenantId = _tenantContext.TenantId,
            EmployeeProfileId = request.EmployeeProfileId,
            LeaveTypeId = request.LeaveTypeId,
            FromDate = request.FromDate.Date,
            ToDate = request.ToDate.Date,
            TotalDays = totalDays,
            IsHalfDay = request.IsHalfDay,
            Reason = request.Reason,
            Status = HrmLeaveStatus.Pending
        };

        _db.HrmLeaveApplications.Add(application);

        // Lock pending balance
        if (balance != null)
        {
            balance.PendingApprovalDays += totalDays;
        }

        await _db.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(application.Id);
    }

    public async Task<Result<bool>> ReviewLeaveApplicationAsync(
        ReviewHrmLeaveRequest request,
        Guid reviewerUserId,
        CancellationToken cancellationToken = default)
    {
        var application = await _db.HrmLeaveApplications
            .Include(x => x.LeaveType)
            .FirstOrDefaultAsync(x => x.Id == request.ApplicationId, cancellationToken);

        if (application == null)
            return Result<bool>.Failure("Leave application not found.");

        if (application.Status != HrmLeaveStatus.Pending)
            return Result<bool>.Failure($"Application is already {application.Status}.");

        var balance = await _db.HrmLeaveBalances
            .FirstOrDefaultAsync(x => x.EmployeeProfileId == application.EmployeeProfileId && x.LeaveTypeId == application.LeaveTypeId && x.CalendarYear == application.FromDate.Year, cancellationToken);

        if (request.IsApproved)
        {
            application.Status = HrmLeaveStatus.Approved;
            if (balance != null)
            {
                balance.PendingApprovalDays = Math.Max(0, balance.PendingApprovalDays - application.TotalDays);
                balance.UsedDays += application.TotalDays;
            }

            // Also record Leave in Daily Attendance logs for those dates
            for (var d = application.FromDate.Date; d <= application.ToDate.Date; d = d.AddDays(1))
            {
                var existingLog = await _db.HrmAttendanceLogs
                    .FirstOrDefaultAsync(a => a.EmployeeProfileId == application.EmployeeProfileId && a.AttendanceDate == d, cancellationToken);

                if (existingLog == null)
                {
                    _db.HrmAttendanceLogs.Add(new HrmAttendanceLog
                    {
                        TenantId = _tenantContext.TenantId,
                        EmployeeProfileId = application.EmployeeProfileId,
                        AttendanceDate = d,
                        Status = application.IsHalfDay ? HrmAttendanceStatus.HalfDay : HrmAttendanceStatus.OnLeave,
                        Remarks = $"Approved Leave ({application.LeaveType.Code}): {application.Reason}"
                    });
                }
                else
                {
                    existingLog.Status = application.IsHalfDay ? HrmAttendanceStatus.HalfDay : HrmAttendanceStatus.OnLeave;
                    existingLog.Remarks = $"Approved Leave ({application.LeaveType.Code})";
                }
            }
        }
        else
        {
            application.Status = HrmLeaveStatus.Rejected;
            if (balance != null)
            {
                balance.PendingApprovalDays = Math.Max(0, balance.PendingApprovalDays - application.TotalDays);
            }
        }

        application.ReviewedByUserId = reviewerUserId;
        application.ReviewedAtUtc = DateTime.UtcNow;
        application.ManagerRemarks = request.Remarks;

        await _db.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    #endregion

    #region 3. Attendance & GPS Geofencing

    public async Task<Result<HrmAttendanceLogDto>> PunchAttendanceAsync(
        PunchAttendanceRequest request,
        CancellationToken cancellationToken = default)
    {
        var profile = await _db.HrmEmployeeProfiles
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == request.EmployeeProfileId, cancellationToken);

        if (profile == null)
            return Result<HrmAttendanceLogDto>.Failure("Employee profile not found.");

        var today = DateTime.UtcNow.Date;
        var log = await _db.HrmAttendanceLogs
            .FirstOrDefaultAsync(x => x.EmployeeProfileId == request.EmployeeProfileId && x.AttendanceDate == today, cancellationToken);

        bool isGeofenceVerified = true;
        if (profile.WorkMode == HrmWorkMode.OfficeStaff && profile.OfficeLatitude.HasValue && profile.OfficeLongitude.HasValue)
        {
            double distMeters = CalculateDistanceMeters(
                profile.OfficeLatitude.Value,
                profile.OfficeLongitude.Value,
                request.Latitude,
                request.Longitude);

            isGeofenceVerified = distMeters <= profile.OfficeGeofenceRadiusMeters;
        }

        DateTime now = DateTime.UtcNow;

        if (log == null)
        {
            // Initial Punch In
            log = new HrmAttendanceLog
            {
                TenantId = _tenantContext.TenantId,
                EmployeeProfileId = request.EmployeeProfileId,
                AttendanceDate = today,
                PunchInTimeUtc = now,
                Status = HrmAttendanceStatus.Present,
                WorkModeAtPunch = profile.WorkMode,
                PunchInLatitude = request.Latitude,
                PunchInLongitude = request.Longitude,
                IsPunchInGeofenceVerified = isGeofenceVerified,
                PunchInAddress = request.Address,
                BatteryPercentage = request.BatteryPercentage,
                SelfieImageUrl = request.SelfieImageUrl,
                AssociatedDcrId = request.AssociatedDcrId,
                Remarks = request.Remarks
            };

            // Check late mark (after 9:45 AM Indian Standard Time = 04:15 UTC)
            var punchTimeIst = now.AddHours(5.5);
            var expectedTime = today.AddHours(9.75); // 9:45 AM
            if (punchTimeIst.TimeOfDay > new TimeSpan(9, 45, 0))
            {
                log.IsLateMark = true;
                log.LateMinutes = (int)(punchTimeIst.TimeOfDay - new TimeSpan(9, 30, 0)).TotalMinutes;
            }

            _db.HrmAttendanceLogs.Add(log);
        }
        else
        {
            // Update Punch Out
            if (!request.IsPunchIn)
            {
                log.PunchOutTimeUtc = now;
                log.PunchOutLatitude = request.Latitude;
                log.PunchOutLongitude = request.Longitude;
                log.PunchOutAddress = request.Address;

                if (log.PunchInTimeUtc.HasValue)
                {
                    log.TotalWorkHours = Math.Round((now - log.PunchInTimeUtc.Value).TotalHours, 2);
                    if (log.TotalWorkHours < 4.5 && log.Status == HrmAttendanceStatus.Present)
                    {
                        log.Status = HrmAttendanceStatus.HalfDay;
                    }
                }
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        var dto = new HrmAttendanceLogDto(
            log.Id,
            profile.Id,
            profile.User.FullName,
            profile.EmployeeCode,
            log.AttendanceDate,
            log.PunchInTimeUtc,
            log.PunchOutTimeUtc,
            log.Status,
            log.Status.ToString(),
            log.WorkModeAtPunch,
            log.PunchInLatitude,
            log.PunchInLongitude,
            log.IsPunchInGeofenceVerified,
            log.PunchInAddress,
            log.PunchOutLatitude,
            log.PunchOutLongitude,
            log.PunchOutAddress,
            log.BatteryPercentage,
            log.SelfieImageUrl,
            log.TotalWorkHours,
            log.LateMinutes,
            log.IsLateMark,
            log.AssociatedDcrId,
            log.Remarks
        );

        return Result<HrmAttendanceLogDto>.Success(dto);
    }

    public async Task<Result<IReadOnlyList<HrmAttendanceLogDto>>> GetDailyAttendanceLogsAsync(
        DateTime date,
        HrmWorkMode? workMode = null,
        CancellationToken cancellationToken = default)
    {
        var targetDate = date.Date;
        var query = _db.HrmAttendanceLogs
            .AsNoTracking()
            .Include(x => x.EmployeeProfile).ThenInclude(p => p.User)
            .Where(x => x.AttendanceDate == targetDate)
            .AsQueryable();

        if (workMode.HasValue)
            query = query.Where(x => x.WorkModeAtPunch == workMode.Value);

        var list = await query
            .OrderBy(x => x.EmployeeProfile.EmployeeCode)
            .Select(x => new HrmAttendanceLogDto(
                x.Id,
                x.EmployeeProfileId,
                x.EmployeeProfile.User.FullName,
                x.EmployeeProfile.EmployeeCode,
                x.AttendanceDate,
                x.PunchInTimeUtc,
                x.PunchOutTimeUtc,
                x.Status,
                x.Status.ToString(),
                x.WorkModeAtPunch,
                x.PunchInLatitude,
                x.PunchInLongitude,
                x.IsPunchInGeofenceVerified,
                x.PunchInAddress,
                x.PunchOutLatitude,
                x.PunchOutLongitude,
                x.PunchOutAddress,
                x.BatteryPercentage,
                x.SelfieImageUrl,
                x.TotalWorkHours,
                x.LateMinutes,
                x.IsLateMark,
                x.AssociatedDcrId,
                x.Remarks
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<HrmAttendanceLogDto>>.Success(list);
    }

    public async Task<Result<IReadOnlyList<HrmAttendanceLogDto>>> GetEmployeeMonthlyAttendanceAsync(
        Guid employeeProfileId,
        int month,
        int year,
        CancellationToken cancellationToken = default)
    {
        var list = await _db.HrmAttendanceLogs
            .AsNoTracking()
            .Include(x => x.EmployeeProfile).ThenInclude(p => p.User)
            .Where(x => x.EmployeeProfileId == employeeProfileId && x.AttendanceDate.Month == month && x.AttendanceDate.Year == year)
            .OrderBy(x => x.AttendanceDate)
            .Select(x => new HrmAttendanceLogDto(
                x.Id,
                x.EmployeeProfileId,
                x.EmployeeProfile.User.FullName,
                x.EmployeeProfile.EmployeeCode,
                x.AttendanceDate,
                x.PunchInTimeUtc,
                x.PunchOutTimeUtc,
                x.Status,
                x.Status.ToString(),
                x.WorkModeAtPunch,
                x.PunchInLatitude,
                x.PunchInLongitude,
                x.IsPunchInGeofenceVerified,
                x.PunchInAddress,
                x.PunchOutLatitude,
                x.PunchOutLongitude,
                x.PunchOutAddress,
                x.BatteryPercentage,
                x.SelfieImageUrl,
                x.TotalWorkHours,
                x.LateMinutes,
                x.IsLateMark,
                x.AssociatedDcrId,
                x.Remarks
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<HrmAttendanceLogDto>>.Success(list);
    }

    public async Task<Result<HrmAttendanceSummaryDto>> GetMonthlyAttendanceSummaryAsync(
        Guid employeeProfileId,
        int month,
        int year,
        CancellationToken cancellationToken = default)
    {
        int daysInMonth = DateTime.DaysInMonth(year, month);
        var logs = await _db.HrmAttendanceLogs
            .AsNoTracking()
            .Where(x => x.EmployeeProfileId == employeeProfileId && x.AttendanceDate.Month == month && x.AttendanceDate.Year == year)
            .ToListAsync(cancellationToken);

        int present = logs.Count(x => x.Status == HrmAttendanceStatus.Present);
        int halfDays = logs.Count(x => x.Status == HrmAttendanceStatus.HalfDay);
        int leaves = logs.Count(x => x.Status == HrmAttendanceStatus.OnLeave);
        int absent = logs.Count(x => x.Status == HrmAttendanceStatus.Absent);
        int holidays = logs.Count(x => x.Status == HrmAttendanceStatus.Holiday);
        int lateMarks = logs.Count(x => x.IsLateMark);
        double totalHours = logs.Sum(x => x.TotalWorkHours);

        var summary = new HrmAttendanceSummaryDto(
            daysInMonth,
            present,
            halfDays,
            leaves,
            absent,
            holidays,
            lateMarks,
            Math.Round(totalHours, 1)
        );

        return Result<HrmAttendanceSummaryDto>.Success(summary);
    }

    private static double CalculateDistanceMeters(double lat1, double lon1, double lat2, double lon2)
    {
        var r = 6371e3; // Earth radius in meters
        var phi1 = lat1 * Math.PI / 180;
        var phi2 = lat2 * Math.PI / 180;
        var deltaPhi = (lat2 - lat1) * Math.PI / 180;
        var deltaLambda = (lon2 - lon1) * Math.PI / 180;

        var a = Math.Sin(deltaPhi / 2) * Math.Sin(deltaPhi / 2) +
                Math.Cos(phi1) * Math.Cos(phi2) *
                Math.Sin(deltaLambda / 2) * Math.Sin(deltaLambda / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return r * c;
    }

    #endregion

    #region 4. CBO-Standard DA/TA & Statement of Expenses (SOE)

    public async Task<Result<IReadOnlyList<HrmStationPolicyDto>>> GetStationPoliciesAsync(
        CancellationToken cancellationToken = default)
    {
        var list = await _db.HrmStationPolicies
            .AsNoTracking()
            .OrderBy(x => x.Designation).ThenBy(x => x.StationType)
            .Select(x => new HrmStationPolicyDto(
                x.Id,
                x.Designation,
                x.StationType,
                x.DailyAllowanceRate,
                x.BikeRatePerKm,
                x.CarRatePerKm,
                x.HotelStayMaxLimit,
                x.RequiresReceiptAboveAmount,
                x.ReceiptThresholdAmount
            ))
            .ToListAsync(cancellationToken);

        if (!list.Any())
        {
            // Seed defaults for MR, ABM, RBM
            var defaultPolicies = new List<HrmStationPolicy>
            {
                new() { TenantId = _tenantContext.TenantId, Designation = "MR", StationType = HrmStationType.LocalHq, DailyAllowanceRate = 220, BikeRatePerKm = 3.5m, CarRatePerKm = 8.0m, HotelStayMaxLimit = 0 },
                new() { TenantId = _tenantContext.TenantId, Designation = "MR", StationType = HrmStationType.ExStation, DailyAllowanceRate = 420, BikeRatePerKm = 3.5m, CarRatePerKm = 8.0m, HotelStayMaxLimit = 0 },
                new() { TenantId = _tenantContext.TenantId, Designation = "MR", StationType = HrmStationType.OutStation, DailyAllowanceRate = 850, BikeRatePerKm = 3.5m, CarRatePerKm = 8.0m, HotelStayMaxLimit = 1500 },
                new() { TenantId = _tenantContext.TenantId, Designation = "ABM", StationType = HrmStationType.LocalHq, DailyAllowanceRate = 350, BikeRatePerKm = 4.0m, CarRatePerKm = 9.0m, HotelStayMaxLimit = 0 },
                new() { TenantId = _tenantContext.TenantId, Designation = "ABM", StationType = HrmStationType.OutStation, DailyAllowanceRate = 1200, BikeRatePerKm = 4.0m, CarRatePerKm = 9.0m, HotelStayMaxLimit = 2200 }
            };
            _db.HrmStationPolicies.AddRange(defaultPolicies);
            await _db.SaveChangesAsync(cancellationToken);

            return await GetStationPoliciesAsync(cancellationToken);
        }

        return Result<IReadOnlyList<HrmStationPolicyDto>>.Success(list);
    }

    public async Task<Result<Guid>> SaveStationPolicyAsync(
        SaveHrmStationPolicyRequest request,
        CancellationToken cancellationToken = default)
    {
        HrmStationPolicy? entity = null;
        if (request.Id.HasValue)
        {
            entity = await _db.HrmStationPolicies.FirstOrDefaultAsync(x => x.Id == request.Id.Value, cancellationToken);
        }

        if (entity == null)
        {
            entity = new HrmStationPolicy
            {
                TenantId = _tenantContext.TenantId
            };
            _db.HrmStationPolicies.Add(entity);
        }

        entity.Designation = request.Designation;
        entity.StationType = request.StationType;
        entity.DailyAllowanceRate = request.DailyAllowanceRate;
        entity.BikeRatePerKm = request.BikeRatePerKm;
        entity.CarRatePerKm = request.CarRatePerKm;
        entity.HotelStayMaxLimit = request.HotelStayMaxLimit;
        entity.RequiresReceiptAboveAmount = request.RequiresReceiptAboveAmount;
        entity.ReceiptThresholdAmount = request.ReceiptThresholdAmount;

        await _db.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(entity.Id);
    }

    public async Task<Result<Guid>> SubmitExpenseClaimAsync(
        SubmitHrmExpenseClaimRequest request,
        CancellationToken cancellationToken = default)
    {
        var claim = new HrmExpenseClaim
        {
            TenantId = _tenantContext.TenantId,
            EmployeeProfileId = request.EmployeeProfileId,
            ClaimDate = request.ClaimDate.Date,
            Category = request.Category,
            StationType = request.StationType,
            ClaimedDistanceKm = request.ClaimedDistanceKm,
            ClaimedAmount = request.ClaimedAmount,
            ApprovedAmount = request.ClaimedAmount, // Defaults to full claimed amount for review
            Description = request.Description,
            ReceiptAttachmentUrl = request.ReceiptAttachmentUrl,
            SfaDailyCallReportId = request.SfaDailyCallReportId,
            Status = HrmExpenseStatus.Submitted
        };

        _db.HrmExpenseClaims.Add(claim);
        await _db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(claim.Id);
    }

    public async Task<Result<IReadOnlyList<HrmExpenseClaimDto>>> GetExpenseClaimsAsync(
        Guid? employeeProfileId = null,
        int? month = null,
        int? year = null,
        HrmExpenseStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.HrmExpenseClaims
            .AsNoTracking()
            .Include(x => x.EmployeeProfile).ThenInclude(p => p.User)
            .Include(x => x.ApprovedByUser)
            .AsQueryable();

        if (employeeProfileId.HasValue)
            query = query.Where(x => x.EmployeeProfileId == employeeProfileId.Value);

        if (status.HasValue)
            query = query.Where(x => x.Status == status.Value);

        if (year.HasValue)
            query = query.Where(x => x.ClaimDate.Year == year.Value);

        if (month.HasValue)
            query = query.Where(x => x.ClaimDate.Month == month.Value);

        var list = await query
            .OrderByDescending(x => x.ClaimDate)
            .Select(x => new HrmExpenseClaimDto(
                x.Id,
                x.EmployeeProfileId,
                x.EmployeeProfile.User.FullName,
                x.ClaimDate,
                x.Category,
                x.StationType,
                x.ClaimedDistanceKm,
                x.ClaimedAmount,
                x.ApprovedAmount,
                x.Description,
                x.ReceiptAttachmentUrl,
                x.SfaDailyCallReportId,
                x.Status,
                x.Status.ToString(),
                x.ApprovedByUserId,
                x.ApprovedByUser != null ? x.ApprovedByUser.FullName : null,
                x.ApprovedAtUtc,
                x.ApprovalRemarks
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<HrmExpenseClaimDto>>.Success(list);
    }

    public async Task<Result<bool>> ReviewExpenseClaimAsync(
        ReviewHrmExpenseClaimRequest request,
        Guid reviewerUserId,
        CancellationToken cancellationToken = default)
    {
        var claim = await _db.HrmExpenseClaims
            .FirstOrDefaultAsync(x => x.Id == request.ClaimId, cancellationToken);

        if (claim == null)
            return Result<bool>.Failure("Expense claim not found.");

        if (request.IsApproved)
        {
            claim.Status = HrmExpenseStatus.ManagerApproved;
            claim.ApprovedAmount = request.ApprovedAmount > 0 ? request.ApprovedAmount : claim.ClaimedAmount;
        }
        else
        {
            claim.Status = HrmExpenseStatus.Rejected;
            claim.ApprovedAmount = 0;
        }

        claim.ApprovedByUserId = reviewerUserId;
        claim.ApprovedAtUtc = DateTime.UtcNow;
        claim.ApprovalRemarks = request.Remarks;

        await _db.SaveChangesAsync(cancellationToken);
        return Result<bool>.Success(true);
    }

    public async Task<Result<HrmExpenseMonthlySummaryDto>> GetMonthlyExpenseSummaryAsync(
        Guid employeeProfileId,
        int month,
        int year,
        CancellationToken cancellationToken = default)
    {
        var claims = await _db.HrmExpenseClaims
            .AsNoTracking()
            .Include(x => x.EmployeeProfile).ThenInclude(p => p.User)
            .Include(x => x.ApprovedByUser)
            .Where(x => x.EmployeeProfileId == employeeProfileId && x.ClaimDate.Month == month && x.ClaimDate.Year == year)
            .OrderBy(x => x.ClaimDate)
            .ToListAsync(cancellationToken);

        var dtos = claims.Select(x => new HrmExpenseClaimDto(
            x.Id,
            x.EmployeeProfileId,
            x.EmployeeProfile.User.FullName,
            x.ClaimDate,
            x.Category,
            x.StationType,
            x.ClaimedDistanceKm,
            x.ClaimedAmount,
            x.ApprovedAmount,
            x.Description,
            x.ReceiptAttachmentUrl,
            x.SfaDailyCallReportId,
            x.Status,
            x.Status.ToString(),
            x.ApprovedByUserId,
            x.ApprovedByUser != null ? x.ApprovedByUser.FullName : null,
            x.ApprovedAtUtc,
            x.ApprovalRemarks
        )).ToList();

        var summary = new HrmExpenseMonthlySummaryDto(
            month,
            year,
            claims.Sum(c => c.ClaimedAmount),
            claims.Where(c => c.Status == HrmExpenseStatus.ManagerApproved || c.Status == HrmExpenseStatus.AccountApproved || c.Status == HrmExpenseStatus.Paid).Sum(c => c.ApprovedAmount),
            claims.Count,
            claims.Count(c => c.Status == HrmExpenseStatus.Submitted),
            dtos
        );

        return Result<HrmExpenseMonthlySummaryDto>.Success(summary);
    }

    #endregion

    #region 5. Indian Statutory Payroll & Payslips

    public async Task<Result<HrmSalaryStructureDto>> GetSalaryStructureAsync(
        Guid employeeProfileId,
        CancellationToken cancellationToken = default)
    {
        var structEntity = await _db.HrmSalaryStructures
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.EmployeeProfileId == employeeProfileId, cancellationToken);

        if (structEntity == null)
        {
            // Default 25,000 INR CTC structure
            return Result<HrmSalaryStructureDto>.Success(new HrmSalaryStructureDto(
                Guid.Empty,
                employeeProfileId,
                25000,
                12500,
                5000,
                2500,
                5000,
                true,
                true,
                true,
                0,
                0
            ));
        }

        return Result<HrmSalaryStructureDto>.Success(new HrmSalaryStructureDto(
            structEntity.Id,
            structEntity.EmployeeProfileId,
            structEntity.MonthlyGrossSalary,
            structEntity.BasicSalary,
            structEntity.HouseRentAllowance,
            structEntity.ConveyanceAllowance,
            structEntity.SpecialAllowance,
            structEntity.IsPfApplicable,
            structEntity.IsEsicApplicable,
            structEntity.IsProfessionalTaxApplicable,
            structEntity.EstimatedMonthlyTds,
            structEntity.CurrentOutstandingAdvance
        ));
    }

    public async Task<Result<Guid>> SaveSalaryStructureAsync(
        SaveHrmSalaryStructureRequest request,
        CancellationToken cancellationToken = default)
    {
        var entity = await _db.HrmSalaryStructures
            .FirstOrDefaultAsync(x => x.EmployeeProfileId == request.EmployeeProfileId, cancellationToken);

        if (entity == null)
        {
            entity = new HrmSalaryStructure
            {
                TenantId = _tenantContext.TenantId,
                EmployeeProfileId = request.EmployeeProfileId
            };
            _db.HrmSalaryStructures.Add(entity);
        }

        entity.MonthlyGrossSalary = request.MonthlyGrossSalary;
        entity.BasicSalary = request.BasicSalary;
        entity.HouseRentAllowance = request.HouseRentAllowance;
        entity.ConveyanceAllowance = request.ConveyanceAllowance;
        entity.SpecialAllowance = request.SpecialAllowance;
        entity.IsPfApplicable = request.IsPfApplicable;
        entity.IsEsicApplicable = request.IsEsicApplicable;
        entity.IsProfessionalTaxApplicable = request.IsProfessionalTaxApplicable;
        entity.EstimatedMonthlyTds = request.EstimatedMonthlyTds;
        entity.CurrentOutstandingAdvance = request.CurrentOutstandingAdvance;

        await _db.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(entity.Id);
    }

    public async Task<Result<HrmPayrollCycleDto>> RunPayrollBatchAsync(
        RunPayrollCycleRequest request,
        CancellationToken cancellationToken = default)
    {
        int daysInMonth = DateTime.DaysInMonth(request.Year, request.Month);
        string batchTitle = !string.IsNullOrWhiteSpace(request.BatchTitle)
            ? request.BatchTitle
            : $"{new DateTime(request.Year, request.Month, 1):MMMM yyyy} Payroll";

        var existingCycle = await _db.HrmPayrollCycles
            .FirstOrDefaultAsync(x => x.Month == request.Month && x.Year == request.Year, cancellationToken);

        if (existingCycle != null && existingCycle.Status == HrmPayrollStatus.Finalized)
        {
            return Result<HrmPayrollCycleDto>.Failure("Payroll cycle for this month is already finalized and cannot be recalculated.");
        }

        if (existingCycle == null)
        {
            existingCycle = new HrmPayrollCycle
            {
                TenantId = _tenantContext.TenantId,
                Month = request.Month,
                Year = request.Year,
                BatchTitle = batchTitle,
                Status = HrmPayrollStatus.Draft
            };
            _db.HrmPayrollCycles.Add(existingCycle);
            await _db.SaveChangesAsync(cancellationToken);
        }

        // Clean any draft payslips for this cycle
        var existingPayslips = await _db.HrmPayslips
            .Where(p => p.PayrollCycleId == existingCycle.Id)
            .ToListAsync(cancellationToken);
        _db.HrmPayslips.RemoveRange(existingPayslips);

        // Fetch all active employees
        var employees = await _db.HrmEmployeeProfiles
            .Include(e => e.User)
            .Include(e => e.SalaryStructure)
            .Where(e => e.IsActive)
            .ToListAsync(cancellationToken);

        decimal totalGross = 0;
        decimal totalNet = 0;
        decimal totalPf = 0;
        decimal totalEsic = 0;

        foreach (var emp in employees)
        {
            var salary = emp.SalaryStructure ?? new HrmSalaryStructure
            {
                MonthlyGrossSalary = 25000,
                BasicSalary = 12500,
                HouseRentAllowance = 5000,
                ConveyanceAllowance = 2500,
                SpecialAllowance = 5000,
                IsPfApplicable = true,
                IsEsicApplicable = true,
                IsProfessionalTaxApplicable = true
            };

            // Calculate attendance & LOP
            var attendanceLogs = await _db.HrmAttendanceLogs
                .Where(a => a.EmployeeProfileId == emp.Id && a.AttendanceDate.Month == request.Month && a.AttendanceDate.Year == request.Year)
                .ToListAsync(cancellationToken);

            decimal absentDays = attendanceLogs.Count(a => a.Status == HrmAttendanceStatus.Absent);
            decimal halfDays = attendanceLogs.Count(a => a.Status == HrmAttendanceStatus.HalfDay) * 0.5m;
            decimal lopDays = absentDays + halfDays;

            decimal payableDays = Math.Max(0, daysInMonth - lopDays);
            decimal payRatio = daysInMonth > 0 ? payableDays / daysInMonth : 1;

            decimal basicEarned = Math.Round(salary.BasicSalary * payRatio, 2);
            decimal hraEarned = Math.Round(salary.HouseRentAllowance * payRatio, 2);
            decimal conveyanceEarned = Math.Round(salary.ConveyanceAllowance * payRatio, 2);
            decimal specialEarned = Math.Round(salary.SpecialAllowance * payRatio, 2);

            // Approved DA/TA reimbursement for this month
            decimal reimbursedExpenses = await _db.HrmExpenseClaims
                .Where(c => c.EmployeeProfileId == emp.Id && c.ClaimDate.Month == request.Month && c.ClaimDate.Year == request.Year &&
                            (c.Status == HrmExpenseStatus.ManagerApproved || c.Status == HrmExpenseStatus.AccountApproved || c.Status == HrmExpenseStatus.Paid))
                .SumAsync(c => c.ApprovedAmount, cancellationToken);

            // SFA secondary orders booked commission/incentive (0.5% of POB order amount)
            decimal salesIncentive = 0;
            if (emp.WorkMode == HrmWorkMode.FieldStaff)
            {
                var totalPob = await _db.SfaPobOrders
                    .Where(o => o.MrUserId == emp.UserId && o.OrderDate.Month == request.Month && o.OrderDate.Year == request.Year)
                    .SumAsync(o => o.GrandTotal, cancellationToken);
                salesIncentive = Math.Round(totalPob * 0.005m, 2);
            }

            // Statutory Deductions
            decimal pfDeduction = 0;
            if (salary.IsPfApplicable)
            {
                // Indian statutory PF: 12% of basic (statutory ceiling ₹1,800 on basic of ₹15,000, or actual)
                decimal pfEligibleWage = Math.Min(basicEarned, 15000);
                pfDeduction = Math.Round(pfEligibleWage * 0.12m, 2);
            }

            decimal esicDeduction = 0;
            decimal totalWages = basicEarned + hraEarned + conveyanceEarned + specialEarned;
            if (salary.IsEsicApplicable && salary.MonthlyGrossSalary <= 21000)
            {
                // Employee ESIC: 0.75% of wages
                esicDeduction = Math.Round(totalWages * 0.0075m, 2);
            }

            decimal ptDeduction = salary.IsProfessionalTaxApplicable ? 200 : 0;
            decimal tdsDeduction = salary.EstimatedMonthlyTds;
            decimal advanceRecovery = Math.Min(salary.CurrentOutstandingAdvance, 5000);

            var payslip = new HrmPayslip
            {
                TenantId = _tenantContext.TenantId,
                PayrollCycleId = existingCycle.Id,
                EmployeeProfileId = emp.Id,
                Month = request.Month,
                Year = request.Year,
                CalendarDaysInMonth = daysInMonth,
                PayableDays = payableDays,
                LossOfPayDays = lopDays,
                BasicEarned = basicEarned,
                HraEarned = hraEarned,
                ConveyanceEarned = conveyanceEarned,
                SpecialAllowanceEarned = specialEarned,
                SalesIncentiveEarned = salesIncentive,
                ReimbursedExpensesEarned = reimbursedExpenses,
                EmployeePfDeduction = pfDeduction,
                EmployeeEsicDeduction = esicDeduction,
                ProfessionalTaxDeduction = ptDeduction,
                TdsDeduction = tdsDeduction,
                SalaryAdvanceRecovery = advanceRecovery
            };

            _db.HrmPayslips.Add(payslip);

            totalGross += payslip.TotalGrossEarnings;
            totalNet += payslip.NetSalaryPayable;
            totalPf += pfDeduction;
            totalEsic += esicDeduction;
        }

        existingCycle.TotalEmployeesProcessed = employees.Count;
        existingCycle.TotalGrossPayout = totalGross;
        existingCycle.TotalNetPayout = totalNet;
        existingCycle.TotalPfContribution = totalPf;
        existingCycle.TotalEsicContribution = totalEsic;
        existingCycle.Status = HrmPayrollStatus.Calculated;

        await _db.SaveChangesAsync(cancellationToken);

        var dto = new HrmPayrollCycleDto(
            existingCycle.Id,
            existingCycle.Month,
            existingCycle.Year,
            existingCycle.BatchTitle,
            existingCycle.TotalEmployeesProcessed,
            existingCycle.TotalGrossPayout,
            existingCycle.TotalNetPayout,
            existingCycle.TotalPfContribution,
            existingCycle.TotalEsicContribution,
            existingCycle.Status,
            existingCycle.Status.ToString(),
            existingCycle.FinalizedAtUtc,
            existingCycle.DisbursedAtUtc
        );

        return Result<HrmPayrollCycleDto>.Success(dto);
    }

    public async Task<Result<IReadOnlyList<HrmPayrollCycleDto>>> GetPayrollCyclesAsync(
        CancellationToken cancellationToken = default)
    {
        var list = await _db.HrmPayrollCycles
            .AsNoTracking()
            .OrderByDescending(x => x.Year).ThenByDescending(x => x.Month)
            .Select(x => new HrmPayrollCycleDto(
                x.Id,
                x.Month,
                x.Year,
                x.BatchTitle,
                x.TotalEmployeesProcessed,
                x.TotalGrossPayout,
                x.TotalNetPayout,
                x.TotalPfContribution,
                x.TotalEsicContribution,
                x.Status,
                x.Status.ToString(),
                x.FinalizedAtUtc,
                x.DisbursedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<HrmPayrollCycleDto>>.Success(list);
    }

    public async Task<Result<IReadOnlyList<HrmPayslipDto>>> GetPayslipsAsync(
        Guid payrollCycleId,
        CancellationToken cancellationToken = default)
    {
        var list = await _db.HrmPayslips
            .AsNoTracking()
            .Include(x => x.EmployeeProfile).ThenInclude(p => p.User)
            .Where(x => x.PayrollCycleId == payrollCycleId)
            .OrderBy(x => x.EmployeeProfile.EmployeeCode)
            .Select(x => new HrmPayslipDto(
                x.Id,
                x.PayrollCycleId,
                x.EmployeeProfileId,
                x.EmployeeProfile.User.FullName,
                x.EmployeeProfile.EmployeeCode,
                x.EmployeeProfile.Designation,
                x.EmployeeProfile.Department,
                x.EmployeeProfile.BankName,
                x.EmployeeProfile.BankAccountNumber,
                x.EmployeeProfile.BankIfscCode,
                x.EmployeeProfile.PanNumber,
                x.EmployeeProfile.UanNumber,
                x.Month,
                x.Year,
                x.CalendarDaysInMonth,
                x.PayableDays,
                x.LossOfPayDays,
                x.BasicEarned,
                x.HraEarned,
                x.ConveyanceEarned,
                x.SpecialAllowanceEarned,
                x.SalesIncentiveEarned,
                x.ReimbursedExpensesEarned,
                x.TotalGrossEarnings,
                x.EmployeePfDeduction,
                x.EmployeeEsicDeduction,
                x.ProfessionalTaxDeduction,
                x.TdsDeduction,
                x.SalaryAdvanceRecovery,
                x.TotalDeductions,
                x.NetSalaryPayable,
                x.IsDisbursed,
                x.DisbursedAtUtc,
                x.PaymentReferenceTransactionId
            ))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<HrmPayslipDto>>.Success(list);
    }

    public async Task<Result<HrmPayslipDto>> GetEmployeePayslipAsync(
        Guid employeeProfileId,
        int month,
        int year,
        CancellationToken cancellationToken = default)
    {
        var x = await _db.HrmPayslips
            .AsNoTracking()
            .Include(p => p.EmployeeProfile).ThenInclude(p => p.User)
            .FirstOrDefaultAsync(p => p.EmployeeProfileId == employeeProfileId && p.Month == month && p.Year == year, cancellationToken);

        if (x == null)
            return Result<HrmPayslipDto>.Failure("Payslip not generated for this month yet.");

        var dto = new HrmPayslipDto(
            x.Id,
            x.PayrollCycleId,
            x.EmployeeProfileId,
            x.EmployeeProfile.User.FullName,
            x.EmployeeProfile.EmployeeCode,
            x.EmployeeProfile.Designation,
            x.EmployeeProfile.Department,
            x.EmployeeProfile.BankName,
            x.EmployeeProfile.BankAccountNumber,
            x.EmployeeProfile.BankIfscCode,
            x.EmployeeProfile.PanNumber,
            x.EmployeeProfile.UanNumber,
            x.Month,
            x.Year,
            x.CalendarDaysInMonth,
            x.PayableDays,
            x.LossOfPayDays,
            x.BasicEarned,
            x.HraEarned,
            x.ConveyanceEarned,
            x.SpecialAllowanceEarned,
            x.SalesIncentiveEarned,
            x.ReimbursedExpensesEarned,
            x.TotalGrossEarnings,
            x.EmployeePfDeduction,
            x.EmployeeEsicDeduction,
            x.ProfessionalTaxDeduction,
            x.TdsDeduction,
            x.SalaryAdvanceRecovery,
            x.TotalDeductions,
            x.NetSalaryPayable,
            x.IsDisbursed,
            x.DisbursedAtUtc,
            x.PaymentReferenceTransactionId
        );

        return Result<HrmPayslipDto>.Success(dto);
    }

    #endregion
}
