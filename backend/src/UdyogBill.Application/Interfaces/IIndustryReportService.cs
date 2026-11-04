using System;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;

namespace UdyogBill.Application.Interfaces;

public interface IIndustryReportService
{
    // 1. Hardware, Sanitary & Paint
    Task<ThekedarProjectLedgerReportDto> GetThekedarProjectLedgerAsync(
        Guid? partyId = null,
        string? siteName = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<PainterCommissionReportDto> GetPainterCommissionReportAsync(
        string? painterName = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<DualUnitReconciliationReportDto> GetDualUnitReconciliationReportAsync(
        string? search = null,
        Guid? categoryId = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<PaintTintingAuditReportDto> GetPaintTintingAuditReportAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    // 2. Auto Spare Parts
    Task<MechanicReferralReportDto> GetMechanicReferralReportAsync(
        string? mechanicName = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<VehicleFitmentVelocityReportDto> GetVehicleFitmentVelocityReportAsync(
        string? vehicleType = null,
        string? make = null,
        string? model = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<AutopartsDeadstockReportDto> GetAutopartsDeadstockReportAsync(
        int minDaysNonMoving = 180,
        Guid? categoryId = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<BatteryScrapExchangeReportDto> GetBatteryScrapExchangeReportAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    // 3. Pharma & Chemist
    Task<DoctorPrescriptionSalesReportDto> GetDoctorPrescriptionSalesReportAsync(
        Guid? doctorId = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<NearExpiryClaimsReportDto> GetNearExpiryClaimsReportAsync(
        Guid? distributorId = null,
        int withinDays = 90,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<ScheduleH1AuditReportDto> GetScheduleH1AuditReportAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string? scheduleType = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<LooseStripBreakageReportDto> GetLooseStripBreakageReportAsync(
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    // 4. Jewellery & Gold
    Task<KarigarWastageReportDto> GetKarigarWastageReportAsync(
        string? karigarName = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<JewelleryM2mValuationReportDto> GetJewelleryM2mValuationReportAsync(
        DateTime? asOfDate = null,
        CancellationToken cancellationToken = default);

    Task<KaratagePurityStockReportDto> GetKaratagePurityStockReportAsync(
        CancellationToken cancellationToken = default);
}
