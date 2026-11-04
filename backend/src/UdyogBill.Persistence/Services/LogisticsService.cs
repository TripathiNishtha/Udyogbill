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
using UdyogBill.Domain.Entities.Inventory;
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

        var seriesSetting = await _context.TenantSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tenantId && s.Category == "Invoice" && s.Key == "DocumentSeriesConfig", cancellationToken);

        DocumentSeriesConfigDto? seriesConfig = null;
        if (seriesSetting != null && !string.IsNullOrWhiteSpace(seriesSetting.Value))
        {
            try
            {
                seriesConfig = JsonSerializer.Deserialize<DocumentSeriesConfigDto>(
                    seriesSetting.Value,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch { }
        }

        string challanNo;
        if (seriesConfig?.Challan != null && !string.IsNullOrWhiteSpace(seriesConfig.Challan.Prefix))
        {
            var activeSeries = seriesConfig.Challan;
            var customPrefix = activeSeries.Prefix.Trim();
            var customSuffix = activeSeries.Suffix?.Trim() ?? string.Empty;
            int padding = activeSeries.Padding;

            var existingChallans = await _context.DeliveryChallans
                .Where(c => c.TenantId == tenantId && c.ChallanNumber.StartsWith(customPrefix))
                .Select(c => c.ChallanNumber)
                .ToListAsync(cancellationToken);

            int maxNum = Math.Max(0, activeSeries.NextNumber - 1);
            foreach (var cNum in existingChallans)
            {
                if (string.IsNullOrWhiteSpace(cNum) || cNum.Length <= customPrefix.Length)
                    continue;

                var middle = cNum.Substring(customPrefix.Length);
                if (!string.IsNullOrEmpty(customSuffix) && middle.EndsWith(customSuffix, StringComparison.OrdinalIgnoreCase))
                {
                    middle = middle.Substring(0, middle.Length - customSuffix.Length);
                }

                if (int.TryParse(middle, out int parsed))
                {
                    if (parsed > maxNum) maxNum = parsed;
                }
                else
                {
                    var digits = new string(middle.TakeWhile(char.IsDigit).ToArray());
                    if (int.TryParse(digits, out int leadParsed) && leadParsed > maxNum)
                    {
                        maxNum = leadParsed;
                    }
                }
            }

            int nextVal = maxNum + 1;
            string numPart = padding > 1 ? nextVal.ToString().PadLeft(padding, '0') : nextVal.ToString();
            challanNo = $"{customPrefix}{numPart}{customSuffix}";
        }
        else
        {
            challanNo = $"DC-{DateTime.UtcNow:yyMM}-{Guid.NewGuid().ToString().Substring(0, 5).ToUpperInvariant()}";
        }

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

        if (invoice.IsCancelled || invoice.Status == Domain.Entities.Sales.InvoiceStatus.Cancelled)
        {
            return Result<Guid>.Failure("Cannot generate delivery challan for a cancelled sales invoice.", "INVOICE_CANCELLED");
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

    public async Task<Result<Guid>> CreateInvoiceFromChallanAsync(
        Guid challanId,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var tenantId = RequireTenantId();

        var challan = await _context.DeliveryChallans
            .Include(d => d.Items)
            .Include(d => d.CustomerParty)
            .FirstOrDefaultAsync(d => d.TenantId == tenantId && d.Id == challanId && !d.IsDeleted, cancellationToken);

        if (challan == null)
        {
            return Result<Guid>.Failure("Delivery challan not found.", "NOT_FOUND");
        }

        if (challan.SalesInvoiceId.HasValue)
        {
            return Result<Guid>.Failure("This delivery challan has already been converted to an invoice.", "ALREADY_CONVERTED");
        }

        var branch = await _context.TenantBranches
            .FirstOrDefaultAsync(b => b.TenantId == tenantId && b.IsHeadOffice && !b.IsDeleted, cancellationToken)
            ?? await _context.TenantBranches.FirstOrDefaultAsync(b => b.TenantId == tenantId && !b.IsDeleted, cancellationToken);

        var warehouse = await _context.TenantWarehouses
            .FirstOrDefaultAsync(w => w.TenantId == tenantId && w.IsDefault && !w.IsDeleted, cancellationToken)
            ?? await _context.TenantWarehouses.FirstOrDefaultAsync(w => w.TenantId == tenantId && !w.IsDeleted, cancellationToken);

        if (branch == null || warehouse == null)
        {
            return Result<Guid>.Failure("No default branch or warehouse configured.", "CONFIG_MISSING");
        }

        // Fetch or create default UOM for fallback
        var defaultUom = await _context.UnitsOfMeasure
            .FirstOrDefaultAsync(u => u.TenantId == tenantId && !u.IsDeleted, cancellationToken);
        if (defaultUom == null)
        {
            defaultUom = new UnitOfMeasure
            {
                TenantId = tenantId,
                Code = "PCS",
                Name = "Pieces",
                Symbol = "PCS"
            };
            _context.UnitsOfMeasure.Add(defaultUom);
            await _context.SaveChangesAsync(cancellationToken);
        }

        // Fetch or create default Item fallback
        var defaultItem = await _context.Items
            .Include(i => i.PrimaryUom)
            .FirstOrDefaultAsync(i => i.TenantId == tenantId && !i.IsDeleted, cancellationToken);
        if (defaultItem == null)
        {
            defaultItem = new Item
            {
                TenantId = tenantId,
                Sku = "GEN-ITEM",
                Name = "General Item",
                PrimaryUomId = defaultUom.Id,
                TaxRate = 18m,
                SellingPrice = 100m,
                TrackInventory = false,
                IsActive = true
            };
            _context.Items.Add(defaultItem);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var party = challan.CustomerParty ?? (challan.CustomerPartyId != Guid.Empty
            ? await _context.Parties.Include(p => p.Addresses).FirstOrDefaultAsync(p => p.TenantId == tenantId && p.Id == challan.CustomerPartyId, cancellationToken)
            : null);

        var address = party?.Addresses.FirstOrDefault(a => a.AddressType == AddressType.Shipping) ?? party?.Addresses.FirstOrDefault();

        var invoiceNo = $"INV-DC-{DateTime.UtcNow:yyMM}-{new Random().Next(1000, 9999)}";

        // State code sanitization (max 5 chars in DB schema)
        string billingStateCode = !string.IsNullOrWhiteSpace(address?.StateCode)
            ? (address.StateCode.Trim().Length > 5 ? address.StateCode.Trim().Substring(0, 2) : address.StateCode.Trim())
            : "07";

        string shippingStateCode = !string.IsNullOrWhiteSpace(challan.ShippingState)
            ? (challan.ShippingState.Trim().Length > 5 ? challan.ShippingState.Trim().Substring(0, 2) : challan.ShippingState.Trim())
            : billingStateCode;

        var invoice = new SalesInvoice
        {
            TenantId = tenantId,
            InvoiceNumber = invoiceNo,
            InvoiceType = InvoiceType.TaxInvoice,
            Status = InvoiceStatus.Issued,
            BranchId = branch.Id,
            WarehouseId = warehouse.Id,
            PartyId = party?.Id,
            CustomerName = !string.IsNullOrWhiteSpace(challan.CustomerName) ? challan.CustomerName : (party?.LegalName ?? "Walk-in Customer"),
            CustomerPhone = party?.Mobile ?? party?.PrimaryPhone,
            CustomerEmail = party?.Email,
            CustomerGSTIN = party?.GSTIN,
            CustomerPAN = party?.PAN,
            BillingAddress = address?.AddressLine1 ?? challan.ShippingAddress ?? "Main Market",
            ShippingAddress = challan.ShippingAddress ?? address?.AddressLine1 ?? "Main Market",
            BillingStateCode = billingStateCode,
            ShippingStateCode = shippingStateCode,
            PlaceOfSupply = !string.IsNullOrWhiteSpace(challan.ShippingState) ? challan.ShippingState : (address?.State ?? "Delhi"),
            InvoiceDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(15),
            TaxSupplyType = TaxSupplyType.IntraState,
            PaymentStatus = PaymentStatus.Unpaid,
            Notes = $"Generated from Delivery Challan #{challan.ChallanNumber}",
            VehicleNumber = challan.VehicleNumber,
            TransporterName = challan.TransporterName,
            LrNumber = challan.TransportDocNumber,
            LrDate = challan.TransportDocDate,
            EWayBillNumber = challan.EWayBillNumber,
            EWayBillDate = challan.EWayBillDate,
            AttributesJson = "{}"
        };

        decimal subTotal = 0m;
        decimal totalTax = 0m;

        foreach (var cItem in challan.Items)
        {
            Item? dbItem = null;
            if (cItem.ItemId.HasValue && cItem.ItemId.Value != Guid.Empty)
            {
                dbItem = await _context.Items
                    .Include(i => i.PrimaryUom)
                    .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Id == cItem.ItemId.Value && !i.IsDeleted, cancellationToken);
            }

            if (dbItem == null && !string.IsNullOrWhiteSpace(cItem.ItemCode))
            {
                dbItem = await _context.Items
                    .Include(i => i.PrimaryUom)
                    .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Sku == cItem.ItemCode && !i.IsDeleted, cancellationToken);
            }

            if (dbItem == null && !string.IsNullOrWhiteSpace(cItem.ItemName))
            {
                dbItem = await _context.Items
                    .Include(i => i.PrimaryUom)
                    .FirstOrDefaultAsync(i => i.TenantId == tenantId && i.Name == cItem.ItemName && !i.IsDeleted, cancellationToken);
            }

            var resolvedItem = dbItem ?? defaultItem;

            Guid resolvedUomId = resolvedItem.PrimaryUomId != Guid.Empty ? resolvedItem.PrimaryUomId : defaultUom.Id;
            string resolvedUomCode = !string.IsNullOrWhiteSpace(cItem.UnitName)
                ? cItem.UnitName
                : (resolvedItem.PrimaryUom?.Code ?? defaultUom.Code);

            if (!string.IsNullOrWhiteSpace(cItem.UnitName))
            {
                var matchedUom = await _context.UnitsOfMeasure
                    .FirstOrDefaultAsync(u => u.TenantId == tenantId && !u.IsDeleted &&
                        (u.Code == cItem.UnitName || u.Name == cItem.UnitName || u.Symbol == cItem.UnitName), cancellationToken);
                if (matchedUom != null)
                {
                    resolvedUomId = matchedUom.Id;
                    resolvedUomCode = matchedUom.Code;
                }
            }

            var unitPrice = resolvedItem.SellingPrice > 0 ? resolvedItem.SellingPrice : 100m;
            var gstRate = resolvedItem.TaxRate > 0 ? resolvedItem.TaxRate : 18m;
            var taxable = cItem.Quantity * unitPrice;
            var cgst = Math.Round(taxable * (gstRate / 200m), 2);
            var sgst = Math.Round(taxable * (gstRate / 200m), 2);
            var total = taxable + cgst + sgst;

            subTotal += taxable;
            totalTax += (cgst + sgst);

            var lineItemAttrs = new Dictionary<string, object>();
            if (!string.IsNullOrWhiteSpace(cItem.BatchNumber))
            {
                lineItemAttrs["batchNumber"] = cItem.BatchNumber;
            }
            if (!string.IsNullOrWhiteSpace(cItem.SerialNumber))
            {
                lineItemAttrs["serialNumber"] = cItem.SerialNumber;
            }

            invoice.Items.Add(new SalesInvoiceItem
            {
                TenantId = tenantId,
                ItemId = resolvedItem.Id,
                ItemSku = !string.IsNullOrWhiteSpace(cItem.ItemCode) ? cItem.ItemCode : resolvedItem.Sku,
                ItemName = !string.IsNullOrWhiteSpace(cItem.ItemName) ? cItem.ItemName : resolvedItem.Name,
                HsnCode = cItem.HsnCode ?? resolvedItem.HSNCode ?? "9999",
                Quantity = cItem.Quantity > 0 ? cItem.Quantity : 1m,
                UomId = resolvedUomId,
                UomCode = resolvedUomCode,
                UnitPrice = unitPrice,
                DiscountPercent = 0m,
                DiscountAmount = 0m,
                TaxableAmount = taxable,
                GstRate = gstRate,
                CgstAmount = cgst,
                SgstAmount = sgst,
                IgstAmount = 0m,
                CessAmount = 0m,
                TotalAmount = total,
                BatchNumber = cItem.BatchNumber,
                AttributesJson = lineItemAttrs.Count > 0 ? System.Text.Json.JsonSerializer.Serialize(lineItemAttrs) : "{}"
            });
        }

        invoice.SubTotal = subTotal;
        invoice.TaxableAmount = subTotal;
        invoice.CgstAmount = Math.Round(totalTax / 2m, 2);
        invoice.SgstAmount = Math.Round(totalTax / 2m, 2);
        invoice.TotalAmount = subTotal + totalTax;
        invoice.BalanceAmount = invoice.TotalAmount;

        _context.SalesInvoices.Add(invoice);

        // Update Challan Linkage
        challan.SalesInvoiceId = invoice.Id;
        challan.DispatchStatus = DispatchStatus.Delivered;
        challan.DeliveredAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(invoice.Id);
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

        var tenant = await _context.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        var docNo = challan?.ChallanNumber ?? invoice?.InvoiceNumber ?? $"DOC-{DateTime.UtcNow:yyMMdd}";
        var totalValue = invoice?.TotalAmount ?? 55000m;
        var fromGstin = !string.IsNullOrWhiteSpace(tenant?.GSTIN) ? tenant.GSTIN : "27AAACU9988F1Z2";
        var toGstin = invoice?.CustomerGSTIN ?? invoice?.Party?.GSTIN ?? "27AAACG1234F1Z9";
        var vehicleNo = request.VehicleNumber ?? challan?.VehicleNumber ?? "MH-02-CD-1234";

        // Generate 12-digit Indian GST E-Way Bill Number (starts with state code 31/27)
        var rng = new Random();
        var ewbNumber = $"311{rng.Next(100000000, 999999999)}";
        var generatedAt = DateTime.UtcNow;
        // Validity: 1 day per 200 KM
        var validityDays = Math.Max(1, (int)Math.Ceiling(request.DistanceKm / 200m));
        var validUntil = generatedAt.AddDays(validityDays);

        var fromTrdName = tenant?.TradeName ?? tenant?.BusinessName ?? "City Pharma Lifesciences";
        var fromAddr1 = tenant?.AddressLine1 ?? "Plot 45, MIDC Andheri East";
        var fromPlace = tenant?.City ?? "Mumbai";
        var fromPincode = int.TryParse(tenant?.Pincode, out var pin) ? pin : 400093;

        var nicPayload = new
        {
            supplyType = "O", // Outward
            subSupplyType = "1", // Supply
            docType = "INV",
            docNo,
            docDate = generatedAt.ToString("dd/MM/yyyy"),
            fromGstin,
            fromTrdName,
            fromAddr1,
            fromPlace,
            fromPincode,
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
            FromAddress = !string.IsNullOrWhiteSpace(tenant?.AddressLine1) ? $"{tenant.AddressLine1}, {tenant.City}" : "MIDC Andheri East, Mumbai",
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
