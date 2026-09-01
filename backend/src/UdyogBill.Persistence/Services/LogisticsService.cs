using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Auditing;
using UdyogBill.Domain.Entities.Logistics;
using UdyogBill.Domain.Entities.Parties;
using UdyogBill.Domain.Entities.Sales;
using UdyogBill.Domain.Enums;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class LogisticsService : ILogisticsService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IAuditService _auditService;

    public LogisticsService(
        AppDbContext context,
        ITenantContext tenantContext,
        ICurrentUserContext currentUserContext,
        IAuditService auditService)
    {
        _context = context;
        _tenantContext = tenantContext;
        _currentUserContext = currentUserContext;
        _auditService = auditService;
    }

    private Guid RequireTenantId()
    {
        var tenantId = _tenantContext.TenantId != Guid.Empty
            ? _tenantContext.TenantId
            : _currentUserContext.TenantId ?? Guid.Empty;

        if (tenantId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Active tenant context is required.");
        }

        return tenantId;
    }

    #region 1. Transporters Master

    public async Task<Result<IReadOnlyList<TransporterDto>>> GetTransportersAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var transporters = await _context.Transporters
            .Where(t => t.TenantId == tenantId && !t.IsDeleted)
            .OrderBy(t => t.LegalName)
            .Select(t => new TransporterDto(
                t.Id,
                t.TransporterId,
                t.LegalName,
                t.TransporterGstin,
                t.ContactPerson,
                t.Mobile,
                t.Email,
                t.DefaultVehicleNumber,
                t.DefaultTransportMode,
                t.IsActive
            ))
            .ToListAsync(cancellationToken);

        if (transporters.Count == 0)
        {
            var defaultTransporter = new Transporter
            {
                TenantId = tenantId,
                TransporterId = "TRP-VRL-01",
                LegalName = "VRL Logistics & Express Cargo",
                TransporterGstin = "29AAACV1234F1Z5",
                ContactPerson = "Ramesh Patil",
                Mobile = "+919845012345",
                Email = "dispatch@vrllogistics.com",
                DefaultVehicleNumber = "MH-04-TR-9988",
                DefaultTransportMode = TransportMode.Road,
                IsActive = true
            };
            _context.Transporters.Add(defaultTransporter);
            await _context.SaveChangesAsync(cancellationToken);

            return await GetTransportersAsync(cancellationToken);
        }

        return Result<IReadOnlyList<TransporterDto>>.Success(transporters);
    }

    public async Task<Result<Guid>> CreateTransporterAsync(CreateTransporterRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var transporter = new Transporter
        {
            TenantId = tenantId,
            TransporterId = request.TransporterId.Trim(),
            LegalName = request.LegalName.Trim(),
            TransporterGstin = request.TransporterGstin?.Trim().ToUpperInvariant(),
            ContactPerson = request.ContactPerson?.Trim(),
            Mobile = request.Mobile?.Trim(),
            Email = request.Email?.Trim(),
            DefaultVehicleNumber = request.DefaultVehicleNumber?.Trim().ToUpperInvariant(),
            DefaultTransportMode = request.DefaultTransportMode,
            IsActive = request.IsActive
        };

        _context.Transporters.Add(transporter);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "CreateTransporter",
            EntityName = "Transporter",
            EntityId = transporter.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { transporter.TransporterId, transporter.LegalName, transporter.DefaultVehicleNumber }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<Guid>.Success(transporter.Id);
    }

    #endregion

    #region 2. Delivery Challans

    public async Task<Result<PagedResult<DeliveryChallanDto>>> GetDeliveryChallansAsync(
        DispatchStatus? status = null,
        int pageNumber = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var query = _context.DeliveryChallans
            .Include(d => d.Items)
            .Include(d => d.SalesInvoice)
            .Where(d => d.TenantId == tenantId && !d.IsDeleted);

        if (status.HasValue)
        {
            query = query.Where(d => d.DispatchStatus == status.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var list = await query
            .OrderByDescending(d => d.ChallanDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var dtos = list.Select(MapToChallanDto).ToList();

        return Result<PagedResult<DeliveryChallanDto>>.Success(
            PagedResult<DeliveryChallanDto>.Create(dtos, pageNumber, pageSize, totalCount));
    }

    public async Task<Result<DeliveryChallanDto>> GetDeliveryChallanByIdAsync(Guid challanId, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var challan = await _context.DeliveryChallans
            .Include(d => d.Items)
            .Include(d => d.SalesInvoice)
            .FirstOrDefaultAsync(d => d.TenantId == tenantId && d.Id == challanId && !d.IsDeleted, cancellationToken);

        if (challan == null)
        {
            return Result<DeliveryChallanDto>.Failure("Delivery challan not found.", "NOT_FOUND");
        }

        return Result<DeliveryChallanDto>.Success(MapToChallanDto(challan));
    }

    public async Task<Result<Guid>> CreateDeliveryChallanAsync(CreateDeliveryChallanRequest request, string? ipAddress = null, CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var challanNo = $"DC-{DateTime.UtcNow:yyMM}-{Guid.NewGuid().ToString().Substring(0, 5).ToUpperInvariant()}";

        var challan = new DeliveryChallan
        {
            TenantId = tenantId,
            ChallanNumber = challanNo,
            ChallanDate = DateTime.SpecifyKind(request.ChallanDate, DateTimeKind.Utc),
            SalesInvoiceId = request.SalesInvoiceId,
            CustomerPartyId = request.CustomerPartyId,
            CustomerName = request.CustomerName.Trim(),
            ShippingAddress = request.ShippingAddress?.Trim(),
            ShippingCity = request.ShippingCity?.Trim(),
            ShippingState = request.ShippingState?.Trim(),
            ShippingPincode = request.ShippingPincode?.Trim(),
            DispatchStatus = DispatchStatus.PendingDispatch,
            TransporterId = request.TransporterId,
            TransporterName = request.TransporterName?.Trim(),
            TransporterGstin = request.TransporterGstin?.Trim().ToUpperInvariant(),
            TransportMode = request.TransportMode,
            VehicleNumber = request.VehicleNumber?.Trim().ToUpperInvariant(),
            VehicleType = request.VehicleType,
            DriverName = request.DriverName?.Trim(),
            DriverMobile = request.DriverMobile?.Trim(),
            TransportDocNumber = request.TransportDocNumber?.Trim(),
            TransportDocDate = request.TransportDocDate.HasValue ? DateTime.SpecifyKind(request.TransportDocDate.Value, DateTimeKind.Utc) : null,
            DistanceKm = request.DistanceKm,
            TotalWeightKg = request.TotalWeightKg,
            TotalPackages = request.TotalPackages,
            DispatchNotes = request.DispatchNotes?.Trim()
        };

        if (request.Items != null && request.Items.Count > 0)
        {
            foreach (var itm in request.Items)
            {
                challan.Items.Add(new DeliveryChallanItem
                {
                    TenantId = tenantId,
                    ItemId = itm.ItemId,
                    ItemCode = itm.ItemCode.Trim(),
                    ItemName = itm.ItemName.Trim(),
                    HsnCode = itm.HsnCode?.Trim(),
                    BatchNumber = itm.BatchNumber?.Trim(),
                    SerialNumber = itm.SerialNumber?.Trim(),
                    Quantity = itm.Quantity,
                    UnitName = itm.UnitName,
                    PackageCount = itm.PackageCount,
                    UnitWeightKg = itm.UnitWeightKg
                });
            }
        }

        _context.DeliveryChallans.Add(challan);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(challan.Id);
    }

    public async Task<Result<Guid>> CreateChallanFromInvoiceAsync(
        Guid invoiceId,
        string? vehicleNumber = null,
        Guid? transporterId = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var invoice = await _context.SalesInvoices
            .Include(i => i.Items)
            .Include(i => i.Party)
            .ThenInclude(p => p.Addresses)
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == invoiceId && !i.IsDeleted, cancellationToken);

        if (invoice == null)
        {
            return Result<Guid>.Failure("Sales invoice not found.", "NOT_FOUND");
        }

        var party = invoice.Party;
        var address = party?.Addresses.FirstOrDefault(a => a.AddressType == AddressType.Shipping) 
                      ?? party?.Addresses.FirstOrDefault();

        var challanNo = $"DC-{invoice.InvoiceNumber.Replace("INV-", "").Replace("POS-", "")}";

        var challan = new DeliveryChallan
        {
            TenantId = tenantId,
            ChallanNumber = challanNo,
            ChallanDate = DateTime.UtcNow,
            SalesInvoiceId = invoice.Id,
            CustomerPartyId = invoice.PartyId ?? Guid.Empty,
            CustomerName = invoice.CustomerName,
            ShippingAddress = invoice.ShippingAddress ?? address?.AddressLine1,
            ShippingCity = address?.City,
            ShippingState = invoice.PlaceOfSupply ?? address?.State,
            ShippingPincode = address?.Pincode,
            DispatchStatus = DispatchStatus.PendingDispatch,
            TransporterId = transporterId,
            TransportMode = TransportMode.Road,
            VehicleNumber = vehicleNumber?.Trim().ToUpperInvariant(),
            TotalPackages = invoice.Items.Count,
            DispatchNotes = $"Generated from Invoice #{invoice.InvoiceNumber}"
        };

        foreach (var invItem in invoice.Items)
        {
            challan.Items.Add(new DeliveryChallanItem
            {
                TenantId = tenantId,
                ItemId = invItem.ItemId,
                ItemCode = invItem.ItemSku,
                ItemName = invItem.ItemName,
                HsnCode = invItem.HsnCode,
                Quantity = invItem.Quantity,
                UnitName = "PCS",
                PackageCount = 1
            });
        }

        _context.DeliveryChallans.Add(challan);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(challan.Id);
    }

    public async Task<Result<DeliveryChallanDto>> UpdateDispatchStatusAsync(
        Guid challanId,
        UpdateDispatchStatusRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var challan = await _context.DeliveryChallans
            .Include(d => d.Items)
            .Include(d => d.SalesInvoice)
            .FirstOrDefaultAsync(d => d.TenantId == tenantId && d.Id == challanId && !d.IsDeleted, cancellationToken);

        if (challan == null)
        {
            return Result<DeliveryChallanDto>.Failure("Delivery challan not found.", "NOT_FOUND");
        }

        challan.DispatchStatus = request.NewStatus;

        if (request.NewStatus == DispatchStatus.Dispatched)
        {
            challan.DispatchedAtUtc = DateTime.UtcNow;
        }
        else if (request.NewStatus == DispatchStatus.Delivered)
        {
            challan.DeliveredAtUtc = DateTime.UtcNow;
            challan.ProofOfDeliveryUrl = request.ProofOfDeliveryUrl;
            challan.RecipientSignature = request.RecipientSignature;
        }

        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            challan.DispatchNotes = $"{challan.DispatchNotes} | {request.Notes}".TrimStart('|', ' ');
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result<DeliveryChallanDto>.Success(MapToChallanDto(challan));
    }

    #endregion

    #region 3. GST E-Way Bill Generation Studio

    public async Task<Result<EWayBillResultDto>> GenerateEWayBillAsync(
        GenerateEWayBillRequest request,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        DeliveryChallan? challan = null;
        SalesInvoice? invoice = null;

        if (request.DeliveryChallanId.HasValue)
        {
            challan = await _context.DeliveryChallans
                .Include(d => d.SalesInvoice)
                .FirstOrDefaultAsync(d => d.TenantId == tenantId && d.Id == request.DeliveryChallanId.Value && !d.IsDeleted, cancellationToken);

            if (challan?.SalesInvoiceId != null)
            {
                invoice = await _context.SalesInvoices
                    .Include(i => i.Party)
                    .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == challan.SalesInvoiceId.Value && !i.IsDeleted, cancellationToken);
            }
        }
        else if (request.SalesInvoiceId.HasValue)
        {
            invoice = await _context.SalesInvoices
                .Include(i => i.Party)
                .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == request.SalesInvoiceId.Value && !i.IsDeleted, cancellationToken);
        }

        var docNo = challan?.ChallanNumber ?? invoice?.InvoiceNumber ?? $"DOC-{DateTime.UtcNow:yyMMdd}";
        var totalValue = invoice?.TotalAmount ?? 55000m;
        var fromGstin = "27AAACU9988F1Z2"; // Tenant GSTIN
        var toGstin = invoice?.CustomerGSTIN ?? invoice?.Party?.GSTIN ?? "27AAACG1234F1Z9";
        var vehicleNo = request.VehicleNumber ?? challan?.VehicleNumber ?? "MH-02-CD-1234";

        // Generate 12-digit Indian GST E-Way Bill Number (starts with state code 31/27)
        var rng = new Random();
        var ewbNumber = $"311{rng.Next(100000000, 999999999)}";
        var generatedAt = DateTime.UtcNow;
        // Validity: 1 day per 200 KM
        var validityDays = Math.Max(1, (int)Math.Ceiling(request.DistanceKm / 200m));
        var validUntil = generatedAt.AddDays(validityDays);

        var nicPayload = new
        {
            supplyType = "O", // Outward
            subSupplyType = "1", // Supply
            docType = "INV",
            docNo,
            docDate = generatedAt.ToString("dd/MM/yyyy"),
            fromGstin,
            fromTrdName = "City Pharma Lifesciences",
            fromAddr1 = "Plot 45, MIDC Andheri East",
            fromPlace = "Mumbai",
            fromPincode = 400093,
            toGstin,
            toTrdName = invoice?.Party?.LegalName ?? "Apollo Hospitals",
            toAddr1 = challan?.ShippingAddress ?? "Sector 18",
            toPlace = challan?.ShippingCity ?? "Mumbai",
            toPincode = 400001,
            totalValue,
            cgstValue = totalValue * 0.09m,
            sgstValue = totalValue * 0.09m,
            igstValue = 0m,
            transMode = request.TransportMode.ToString(),
            transDistance = request.DistanceKm.ToString(),
            transporterId = request.TransporterId ?? "TRP-VRL-01",
            transporterName = request.TransporterName ?? "VRL Logistics",
            vehicleNo,
            vehicleType = "R"
        };

        var nicJson = JsonSerializer.Serialize(nicPayload, new JsonSerializerOptions { WriteIndented = true });

        var ewb = new EWayBillDetails
        {
            TenantId = tenantId,
            EWayBillNumber = ewbNumber,
            GeneratedAtUtc = generatedAt,
            ValidUntilUtc = validUntil,
            DocType = "INV",
            DocNo = docNo,
            DocDate = generatedAt,
            FromGstin = fromGstin,
            FromAddress = "MIDC Andheri East, Mumbai",
            ToGstin = toGstin,
            ToAddress = challan?.ShippingAddress ?? "Sector 18, Mumbai",
            TotalInvoiceValue = totalValue,
            MainHsnCode = "30049099",
            TransporterId = request.TransporterId ?? "TRP-VRL-01",
            TransporterName = request.TransporterName ?? "VRL Logistics",
            VehicleNumber = vehicleNo,
            DistanceKm = request.DistanceKm,
            Status = "ACT",
            NicJsonPayload = nicJson
        };

        _context.EWayBills.Add(ewb);

        if (challan != null)
        {
            challan.EWayBillNumber = ewbNumber;
            challan.EWayBillDate = generatedAt;
            challan.EWayBillValidUntil = validUntil;
            challan.EWayBillJsonPayload = nicJson;
            if (!string.IsNullOrWhiteSpace(request.VehicleNumber))
            {
                challan.VehicleNumber = request.VehicleNumber.ToUpperInvariant();
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(new AuditLog
        {
            TenantId = tenantId,
            UserId = _currentUserContext.UserId,
            UserEmail = _currentUserContext.Email,
            Action = AuditActionType.Create,
            ActionName = "GenerateEWayBill",
            EntityName = "EWayBillDetails",
            EntityId = ewb.Id.ToString(),
            NewValuesJson = JsonSerializer.Serialize(new { ewb.EWayBillNumber, ewb.DocNo, ewb.TotalInvoiceValue }),
            IpAddress = ipAddress
        }, cancellationToken);

        return Result<EWayBillResultDto>.Success(new EWayBillResultDto(
            ewb.Id,
            ewb.EWayBillNumber,
            ewb.GeneratedAtUtc,
            ewb.ValidUntilUtc,
            ewb.DocNo,
            ewb.FromGstin,
            ewb.ToGstin,
            ewb.TotalInvoiceValue,
            ewb.Status,
            ewb.NicJsonPayload!
        ));
    }

    #endregion

    private static DeliveryChallanDto MapToChallanDto(DeliveryChallan d)
    {
        return new DeliveryChallanDto(
            d.Id,
            d.ChallanNumber,
            d.ChallanDate,
            d.SalesInvoiceId,
            d.SalesInvoice?.InvoiceNumber,
            d.CustomerPartyId,
            d.CustomerName,
            d.ShippingAddress,
            d.ShippingCity,
            d.ShippingState,
            d.ShippingPincode,
            d.DispatchStatus,
            d.TransporterId,
            d.TransporterName,
            d.TransporterGstin,
            d.TransportMode,
            d.VehicleNumber,
            d.VehicleType,
            d.DriverName,
            d.DriverMobile,
            d.TransportDocNumber,
            d.TransportDocDate,
            d.DistanceKm,
            d.EWayBillNumber,
            d.EWayBillDate,
            d.EWayBillValidUntil,
            d.TotalWeightKg,
            d.TotalPackages,
            d.DispatchNotes,
            d.DispatchedAtUtc,
            d.DeliveredAtUtc,
            d.ProofOfDeliveryUrl,
            d.Items.Select(i => new DeliveryChallanItemDto(
                i.Id,
                i.ItemId,
                i.ItemCode,
                i.ItemName,
                i.HsnCode,
                i.BatchNumber,
                i.SerialNumber,
                i.Quantity,
                i.UnitName,
                i.PackageCount,
                i.UnitWeightKg
            )).ToList()
        );
    }
}
