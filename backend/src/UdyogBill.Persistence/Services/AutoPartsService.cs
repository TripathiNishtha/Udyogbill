using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Application.Services.AutoParts;
using UdyogBill.Domain.Entities.AutoParts;
using UdyogBill.Persistence.Context;
using UdyogBill.Shared;

namespace UdyogBill.Persistence.Services;

public class AutoPartsService : IAutoPartsService
{
    private readonly AppDbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<AutoPartsService> _logger;

    public AutoPartsService(
        AppDbContext context,
        ITenantContext tenantContext,
        ILogger<AutoPartsService> logger)
    {
        _context = context;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    #region Vehicles

    public async Task<Result<IReadOnlyList<VehicleMasterDto>>> SearchVehiclesAsync(string? query, string? vehicleType, CancellationToken cancellationToken = default)
    {
        try
        {
            await EnsureDefaultVehiclesSeededAsync(cancellationToken);

            var q = _context.VehicleMasters.AsNoTracking().Where(v => v.IsActive);

            if (!string.IsNullOrWhiteSpace(vehicleType))
            {
                var vt = vehicleType.Trim().ToLower();
                q = q.Where(v => v.VehicleType.ToLower() == vt);
            }

            if (!string.IsNullOrWhiteSpace(query))
            {
                var term = query.Trim().ToLower();
                q = q.Where(v =>
                    v.Make.ToLower().Contains(term) ||
                    v.Model.ToLower().Contains(term) ||
                    v.Variant.ToLower().Contains(term));
            }

            var list = await q
                .OrderBy(v => v.Make)
                .ThenBy(v => v.Model)
                .Take(50)
                .Select(v => new VehicleMasterDto(
                    v.Id,
                    v.VehicleType,
                    v.Make,
                    v.Model,
                    v.Variant,
                    v.FuelType,
                    v.YearStart,
                    v.YearEnd
                ))
                .ToListAsync(cancellationToken);

            return Result<IReadOnlyList<VehicleMasterDto>>.Success(list);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to search vehicle master");
            return Result<IReadOnlyList<VehicleMasterDto>>.Failure("Error searching vehicle master: " + ex.Message);
        }
    }

    public async Task<Result> SeedStandardVehiclesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await EnsureDefaultVehiclesSeededAsync(cancellationToken);
            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to seed standard vehicles");
            return Result.Failure("Failed to seed vehicles: " + ex.Message);
        }
    }

    private async Task EnsureDefaultVehiclesSeededAsync(CancellationToken cancellationToken)
    {
        if (await _context.VehicleMasters.AnyAsync(cancellationToken))
            return;

        var defaults = new List<VehicleMaster>
        {
            // Passenger Cars (4-Wheeler)
            new() { VehicleType = "4-Wheeler", Make = "Maruti Suzuki", Model = "Swift", Variant = "Petrol K-Series", FuelType = "Petrol", YearStart = 2012, YearEnd = 2024 },
            new() { VehicleType = "4-Wheeler", Make = "Maruti Suzuki", Model = "Swift", Variant = "Diesel 1.3 DDiS", FuelType = "Diesel", YearStart = 2012, YearEnd = 2020 },
            new() { VehicleType = "4-Wheeler", Make = "Maruti Suzuki", Model = "Dzire", Variant = "Petrol / CNG", FuelType = "Petrol", YearStart = 2017, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Maruti Suzuki", Model = "Baleno", Variant = "1.2 DualJet", FuelType = "Petrol", YearStart = 2015, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Maruti Suzuki", Model = "WagonR", Variant = "1.0L / 1.2L", FuelType = "Petrol", YearStart = 2010, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Maruti Suzuki", Model = "Brezza", Variant = "1.5L K15C", FuelType = "Petrol", YearStart = 2020, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Maruti Suzuki", Model = "Eeco", Variant = "5-Seater / Ambulance", FuelType = "CNG", YearStart = 2010, YearEnd = null },

            new() { VehicleType = "4-Wheeler", Make = "Hyundai", Model = "Creta", Variant = "1.5L CRDi Diesel", FuelType = "Diesel", YearStart = 2015, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Hyundai", Model = "Creta", Variant = "1.5L MPi Petrol", FuelType = "Petrol", YearStart = 2015, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Hyundai", Model = "i20", Variant = "Asta / Magna 1.2", FuelType = "Petrol", YearStart = 2014, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Hyundai", Model = "Grand i10", Variant = "Nios 1.2 Kappa", FuelType = "Petrol", YearStart = 2019, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Hyundai", Model = "Venue", Variant = "1.0 Turbo / 1.2", FuelType = "Petrol", YearStart = 2019, YearEnd = null },

            new() { VehicleType = "4-Wheeler", Make = "Tata Motors", Model = "Nexon", Variant = "1.5L Revotorq Diesel", FuelType = "Diesel", YearStart = 2017, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Tata Motors", Model = "Nexon", Variant = "1.2L Revotron Petrol", FuelType = "Petrol", YearStart = 2017, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Tata Motors", Model = "Punch", Variant = "1.2L Revotron", FuelType = "Petrol", YearStart = 2021, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Tata Motors", Model = "Tiago", Variant = "XZ+ / XT", FuelType = "Petrol", YearStart = 2016, YearEnd = null },

            new() { VehicleType = "4-Wheeler", Make = "Mahindra", Model = "Bolero", Variant = "Power Plus / Neo mHawk75", FuelType = "Diesel", YearStart = 2005, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Mahindra", Model = "Scorpio", Variant = "Classic / mHawk 2.2L", FuelType = "Diesel", YearStart = 2008, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Mahindra", Model = "Scorpio-N", Variant = "Z8 / Z4 mStallion / mHawk", FuelType = "Diesel", YearStart = 2022, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Mahindra", Model = "Thar", Variant = "2.2L Diesel / 2.0L Petrol", FuelType = "Diesel", YearStart = 2020, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Mahindra", Model = "XUV700", Variant = "AX7 / AX5", FuelType = "Diesel", YearStart = 2021, YearEnd = null },

            new() { VehicleType = "4-Wheeler", Make = "Toyota", Model = "Innova Crysta", Variant = "2.4L / 2.8L GD Diesel", FuelType = "Diesel", YearStart = 2016, YearEnd = null },
            new() { VehicleType = "4-Wheeler", Make = "Toyota", Model = "Fortuner", Variant = "2.8L 4x4 Sigma", FuelType = "Diesel", YearStart = 2016, YearEnd = null },

            // 2-Wheelers (Bikes & Scooters)
            new() { VehicleType = "2-Wheeler", Make = "Hero MotoCorp", Model = "Splendor Plus", Variant = "100cc i3S BS6", FuelType = "Petrol", YearStart = 2005, YearEnd = null },
            new() { VehicleType = "2-Wheeler", Make = "Hero MotoCorp", Model = "HF Deluxe", Variant = "97.2cc BS4 / BS6", FuelType = "Petrol", YearStart = 2010, YearEnd = null },
            new() { VehicleType = "2-Wheeler", Make = "Hero MotoCorp", Model = "Passion Pro", Variant = "110cc xSens", FuelType = "Petrol", YearStart = 2012, YearEnd = null },

            new() { VehicleType = "2-Wheeler", Make = "Bajaj", Model = "Pulsar 150", Variant = "Twin Disc BS4 / BS6", FuelType = "Petrol", YearStart = 2006, YearEnd = null },
            new() { VehicleType = "2-Wheeler", Make = "Bajaj", Model = "Platina 100", Variant = "Comfortec ES", FuelType = "Petrol", YearStart = 2015, YearEnd = null },
            new() { VehicleType = "2-Wheeler", Make = "Bajaj", Model = "Pulsar NS200", Variant = "Liquid Cooled 4V", FuelType = "Petrol", YearStart = 2012, YearEnd = null },

            new() { VehicleType = "2-Wheeler", Make = "Honda", Model = "Activa 6G", Variant = "110cc PGM-FI H-Smart", FuelType = "Petrol", YearStart = 2015, YearEnd = null },
            new() { VehicleType = "2-Wheeler", Make = "Honda", Model = "Shine 125", Variant = "SP125 / Drum / Disc", FuelType = "Petrol", YearStart = 2010, YearEnd = null },

            new() { VehicleType = "2-Wheeler", Make = "TVS", Model = "Apache RTR 160", Variant = "4V / 2V Race Edition", FuelType = "Petrol", YearStart = 2010, YearEnd = null },
            new() { VehicleType = "2-Wheeler", Make = "TVS", Model = "Jupiter", Variant = "110cc ZX / Classic", FuelType = "Petrol", YearStart = 2013, YearEnd = null },

            new() { VehicleType = "2-Wheeler", Make = "Royal Enfield", Model = "Classic 350", Variant = "J-Series / UCE 350", FuelType = "Petrol", YearStart = 2010, YearEnd = null },
            new() { VehicleType = "2-Wheeler", Make = "Royal Enfield", Model = "Bullet 350", Variant = "ES / Standard", FuelType = "Petrol", YearStart = 2000, YearEnd = null },

            // Tractors & Agricultural Machinery
            new() { VehicleType = "Tractor", Make = "Mahindra", Model = "575 DI", Variant = "Sarpanch 45 HP", FuelType = "Diesel", YearStart = 2000, YearEnd = null },
            new() { VehicleType = "Tractor", Make = "Swaraj", Model = "744 FE", Variant = "48 HP Power Steering", FuelType = "Diesel", YearStart = 2005, YearEnd = null },
            new() { VehicleType = "Tractor", Make = "Sonalika", Model = "DI 35", Variant = "Sikander 39 HP", FuelType = "Diesel", YearStart = 2010, YearEnd = null },

            // LCV & Heavy Commercial Vehicles
            new() { VehicleType = "Commercial", Make = "Tata Motors", Model = "Tata 407", Variant = "SFC 407 TT BS6", FuelType = "Diesel", YearStart = 1995, YearEnd = null },
            new() { VehicleType = "Commercial", Make = "Tata Motors", Model = "Tata Ace", Variant = "Gold / HT Plus", FuelType = "Diesel", YearStart = 2005, YearEnd = null },
            new() { VehicleType = "Commercial", Make = "Mahindra", Model = "Bolero Maxi Truck", Variant = "Plus 1.3T / 1.7T", FuelType = "Diesel", YearStart = 2010, YearEnd = null },
            new() { VehicleType = "Commercial", Make = "Ashok Leyland", Model = "Dost Plus", Variant = "1.5L TDCR", FuelType = "Diesel", YearStart = 2012, YearEnd = null }
        };

        _context.VehicleMasters.AddRange(defaults);
        await _context.SaveChangesAsync(cancellationToken);
    }

    #endregion

    #region Product Fitment

    public async Task<Result<ProductFitmentDto>> SaveProductFitmentAsync(SaveProductFitmentRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == request.ItemId, cancellationToken);
            if (item == null)
                return Result<ProductFitmentDto>.Failure("Item not found");

            VehicleMaster? vehicle = null;
            if (request.VehicleMasterId.HasValue)
            {
                vehicle = await _context.VehicleMasters.FirstOrDefaultAsync(v => v.Id == request.VehicleMasterId.Value, cancellationToken);
            }

            var fitment = new ProductFitment
            {
                ItemId = request.ItemId,
                VehicleMasterId = request.VehicleMasterId,
                CustomVehicleString = request.CustomVehicleString ?? string.Empty,
                PositionSide = string.IsNullOrWhiteSpace(request.PositionSide) ? "Universal" : request.PositionSide,
                FitmentNotes = request.FitmentNotes
            };

            _context.ProductFitments.Add(fitment);
            await _context.SaveChangesAsync(cancellationToken);

            var displayText = vehicle != null
                ? $"{vehicle.Make} {vehicle.Model} {vehicle.Variant} ({vehicle.YearStart}-{vehicle.YearEnd?.ToString() ?? "Present"})"
                : request.CustomVehicleString;

            return Result<ProductFitmentDto>.Success(new ProductFitmentDto(
                fitment.Id,
                fitment.ItemId,
                item.Name,
                fitment.VehicleMasterId,
                displayText,
                fitment.PositionSide,
                fitment.FitmentNotes
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save product fitment");
            return Result<ProductFitmentDto>.Failure("Error saving fitment: " + ex.Message);
        }
    }

    public async Task<Result<IReadOnlyList<ProductFitmentDto>>> GetFitmentsByItemAsync(Guid itemId, CancellationToken cancellationToken = default)
    {
        try
        {
            var list = await _context.ProductFitments
                .Include(f => f.Item)
                .Include(f => f.VehicleMaster)
                .Where(f => f.ItemId == itemId)
                .Select(f => new ProductFitmentDto(
                    f.Id,
                    f.ItemId,
                    f.Item.Name,
                    f.VehicleMasterId,
                    f.VehicleMaster != null
                        ? $"{f.VehicleMaster.Make} {f.VehicleMaster.Model} {f.VehicleMaster.Variant}"
                        : f.CustomVehicleString,
                    f.PositionSide,
                    f.FitmentNotes
                ))
                .ToListAsync(cancellationToken);

            return Result<IReadOnlyList<ProductFitmentDto>>.Success(list);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get fitments for item {ItemId}", itemId);
            return Result<IReadOnlyList<ProductFitmentDto>>.Failure("Error getting item fitments: " + ex.Message);
        }
    }

    public async Task<Result<IReadOnlyList<PartCrossReferenceDto>>> SearchItemsByVehicleAsync(string vehicleQuery, Guid? categoryId, CancellationToken cancellationToken = default)
    {
        try
        {
            var term = vehicleQuery.Trim().ToLower();

            var fitments = await _context.ProductFitments
                .Include(f => f.Item)
                .Include(f => f.VehicleMaster)
                .Where(f =>
                    (f.VehicleMaster != null && (
                        f.VehicleMaster.Make.ToLower().Contains(term) ||
                        f.VehicleMaster.Model.ToLower().Contains(term) ||
                        f.VehicleMaster.Variant.ToLower().Contains(term))) ||
                    f.CustomVehicleString.ToLower().Contains(term))
                .ToListAsync(cancellationToken);

            var itemIds = fitments.Select(f => f.ItemId).Distinct().ToList();

            var crossRefs = await _context.PartCrossReferences
                .Include(c => c.Item)
                .Where(c => itemIds.Contains(c.ItemId))
                .ToListAsync(cancellationToken);

            var result = new List<PartCrossReferenceDto>();

            foreach (var f in fitments)
            {
                var existingCr = crossRefs.FirstOrDefault(c => c.ItemId == f.ItemId);
                var rackLocation = ExtractRackBin(f.Item);

                result.Add(new PartCrossReferenceDto(
                    f.Id,
                    f.ItemId,
                    f.Item.Name,
                    f.Item.Sku ?? string.Empty,
                    f.Item.SellingPrice,
                    0m, // Stock will be augmented
                    rackLocation,
                    existingCr?.OemPartNumber ?? string.Empty,
                    existingCr?.OesBrand ?? f.Item.Brand?.Name ?? "Standard",
                    existingCr?.OesPartNumber ?? string.Empty,
                    f.PositionSide
                ));
            }

            return Result<IReadOnlyList<PartCrossReferenceDto>>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to search items by vehicle");
            return Result<IReadOnlyList<PartCrossReferenceDto>>.Failure("Error searching by vehicle: " + ex.Message);
        }
    }

    public async Task<Result<IReadOnlyList<ProductFitmentDto>>> GetAllFitmentsAsync(string? query, CancellationToken cancellationToken = default)
    {
        try
        {
            var q = _context.ProductFitments
                .Include(f => f.Item)
                .Include(f => f.VehicleMaster)
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(query))
            {
                var term = query.Trim().ToLower();
                q = q.Where(f =>
                    f.Item.Name.ToLower().Contains(term) ||
                    (f.Item.Sku != null && f.Item.Sku.ToLower().Contains(term)) ||
                    f.CustomVehicleString.ToLower().Contains(term) ||
                    (f.VehicleMaster != null && (
                        f.VehicleMaster.Make.ToLower().Contains(term) ||
                        f.VehicleMaster.Model.ToLower().Contains(term) ||
                        f.VehicleMaster.Variant.ToLower().Contains(term)
                    )));
            }

            var list = await q
                .OrderByDescending(f => f.CreatedAtUtc)
                .Take(100)
                .Select(f => new ProductFitmentDto(
                    f.Id,
                    f.ItemId,
                    f.Item.Name,
                    f.VehicleMasterId,
                    f.VehicleMaster != null
                        ? $"{f.VehicleMaster.Make} {f.VehicleMaster.Model} {f.VehicleMaster.Variant}"
                        : f.CustomVehicleString,
                    f.PositionSide,
                    f.FitmentNotes
                ))
                .ToListAsync(cancellationToken);

            return Result<IReadOnlyList<ProductFitmentDto>>.Success(list);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get all fitments");
            return Result<IReadOnlyList<ProductFitmentDto>>.Failure("Error fetching fitments: " + ex.Message);
        }
    }

    public async Task<Result> DeleteFitmentAsync(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var fitment = await _context.ProductFitments.FirstOrDefaultAsync(f => f.Id == id, cancellationToken);
            if (fitment == null)
                return Result.Failure("Fitment mapping not found");

            _context.ProductFitments.Remove(fitment);
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete fitment {Id}", id);
            return Result.Failure("Error deleting fitment: " + ex.Message);
        }
    }

    #endregion

    #region Part Cross-Reference & Interchangeable Alternatives

    public async Task<Result<PartCrossReferenceDto>> SaveCrossReferenceAsync(SaveCrossReferenceRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var item = await _context.Items.Include(i => i.Brand).FirstOrDefaultAsync(i => i.Id == request.ItemId, cancellationToken);
            if (item == null)
                return Result<PartCrossReferenceDto>.Failure("Item not found");

            var cr = new PartCrossReference
            {
                ItemId = request.ItemId,
                OemPartNumber = request.OemPartNumber.Trim().ToUpperInvariant(),
                OesBrand = request.OesBrand.Trim(),
                OesPartNumber = request.OesPartNumber.Trim().ToUpperInvariant(),
                InterchangeableNotes = request.InterchangeableNotes
            };

            _context.PartCrossReferences.Add(cr);
            await _context.SaveChangesAsync(cancellationToken);

            return Result<PartCrossReferenceDto>.Success(new PartCrossReferenceDto(
                cr.Id,
                cr.ItemId,
                item.Name,
                item.Sku ?? string.Empty,
                item.SellingPrice,
                0m,
                ExtractRackBin(item),
                cr.OemPartNumber,
                cr.OesBrand,
                cr.OesPartNumber,
                cr.InterchangeableNotes
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save cross reference");
            return Result<PartCrossReferenceDto>.Failure("Error saving cross reference: " + ex.Message);
        }
    }

    public async Task<Result<IReadOnlyList<PartCrossReferenceDto>>> GetCrossReferencesByOemNumberAsync(string oemNumber, CancellationToken cancellationToken = default)
    {
        try
        {
            var cleanOem = oemNumber.Trim().ToUpperInvariant();

            var list = await _context.PartCrossReferences
                .Include(c => c.Item)
                .Where(c => c.OemPartNumber == cleanOem || c.OesPartNumber == cleanOem)
                .Select(c => new PartCrossReferenceDto(
                    c.Id,
                    c.ItemId,
                    c.Item.Name,
                    c.Item.Sku ?? string.Empty,
                    c.Item.SellingPrice,
                    0m,
                    null,
                    c.OemPartNumber,
                    c.OesBrand,
                    c.OesPartNumber,
                    c.InterchangeableNotes
                ))
                .ToListAsync(cancellationToken);

            return Result<IReadOnlyList<PartCrossReferenceDto>>.Success(list);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to search cross references by OEM {Oem}", oemNumber);
            return Result<IReadOnlyList<PartCrossReferenceDto>>.Failure("Error finding cross reference: " + ex.Message);
        }
    }

    public async Task<Result<IReadOnlyList<PartCrossReferenceDto>>> GetCrossReferencesByItemAsync(Guid itemId, CancellationToken cancellationToken = default)
    {
        try
        {
            var list = await _context.PartCrossReferences
                .Include(c => c.Item)
                .Where(c => c.ItemId == itemId)
                .Select(c => new PartCrossReferenceDto(
                    c.Id,
                    c.ItemId,
                    c.Item.Name,
                    c.Item.Sku ?? string.Empty,
                    c.Item.SellingPrice,
                    0m,
                    null,
                    c.OemPartNumber,
                    c.OesBrand,
                    c.OesPartNumber,
                    c.InterchangeableNotes
                ))
                .ToListAsync(cancellationToken);

            return Result<IReadOnlyList<PartCrossReferenceDto>>.Success(list);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to search cross references for Item {ItemId}", itemId);
            return Result<IReadOnlyList<PartCrossReferenceDto>>.Failure("Error finding item cross references: " + ex.Message);
        }
    }

    public async Task<Result<IReadOnlyList<PartCrossReferenceDto>>> GetAllCrossReferencesAsync(string? query, CancellationToken cancellationToken = default)
    {
        try
        {
            var q = _context.PartCrossReferences
                .Include(c => c.Item)
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(query))
            {
                var term = query.Trim().ToUpperInvariant();
                var termLower = query.Trim().ToLowerInvariant();
                q = q.Where(c =>
                    c.OemPartNumber.Contains(term) ||
                    c.OesPartNumber.Contains(term) ||
                    c.OesBrand.ToLower().Contains(termLower) ||
                    c.Item.Name.ToLower().Contains(termLower) ||
                    (c.Item.Sku != null && c.Item.Sku.Contains(term)));
            }

            var list = await q
                .OrderByDescending(c => c.CreatedAtUtc)
                .Take(100)
                .Select(c => new PartCrossReferenceDto(
                    c.Id,
                    c.ItemId,
                    c.Item.Name,
                    c.Item.Sku ?? string.Empty,
                    c.Item.SellingPrice,
                    0m,
                    ExtractRackBin(c.Item),
                    c.OemPartNumber,
                    c.OesBrand,
                    c.OesPartNumber,
                    c.InterchangeableNotes
                ))
                .ToListAsync(cancellationToken);

            return Result<IReadOnlyList<PartCrossReferenceDto>>.Success(list);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list all cross references");
            return Result<IReadOnlyList<PartCrossReferenceDto>>.Failure("Error fetching cross references: " + ex.Message);
        }
    }

    public async Task<Result> DeleteCrossReferenceAsync(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var cr = await _context.PartCrossReferences.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
            if (cr == null)
                return Result.Failure("Cross reference not found");

            _context.PartCrossReferences.Remove(cr);
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete cross reference {Id}", id);
            return Result.Failure("Error deleting cross reference: " + ex.Message);
        }
    }

    #endregion

    #region Mechanics & Commission

    public async Task<Result<IReadOnlyList<MechanicMasterDto>>> GetMechanicsAsync(string? search, CancellationToken cancellationToken = default)
    {
        try
        {
            var q = _context.MechanicMasters.AsNoTracking().Where(m => m.IsActive);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                q = q.Where(m =>
                    m.Name.ToLower().Contains(term) ||
                    m.Mobile.Contains(term) ||
                    (m.GarageName != null && m.GarageName.ToLower().Contains(term)));
            }

            var list = await q
                .OrderBy(m => m.Name)
                .Select(m => new MechanicMasterDto(
                    m.Id,
                    m.Code,
                    m.Name,
                    m.Mobile,
                    m.GarageName,
                    m.Address,
                    m.City,
                    m.DefaultCommissionPercent,
                    m.FlatCommissionPerPart,
                    m.TotalCommissionEarned,
                    m.TotalCommissionPaid,
                    m.TotalCommissionEarned - m.TotalCommissionPaid,
                    m.IsActive
                ))
                .ToListAsync(cancellationToken);

            return Result<IReadOnlyList<MechanicMasterDto>>.Success(list);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get mechanics");
            return Result<IReadOnlyList<MechanicMasterDto>>.Failure("Error fetching mechanics: " + ex.Message);
        }
    }

    public async Task<Result<MechanicMasterDto>> SaveMechanicAsync(SaveMechanicRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            MechanicMaster m;
            if (request.Id.HasValue && request.Id.Value != Guid.Empty)
            {
                m = await _context.MechanicMasters.FirstOrDefaultAsync(x => x.Id == request.Id.Value, cancellationToken)
                    ?? throw new InvalidOperationException("Mechanic not found");
            }
            else
            {
                var count = await _context.MechanicMasters.CountAsync(cancellationToken);
                m = new MechanicMaster
                {
                    Code = $"MISTRI-{(count + 1):D3}"
                };
                _context.MechanicMasters.Add(m);
            }

            m.Name = request.Name.Trim();
            m.Mobile = request.Mobile.Trim();
            m.GarageName = request.GarageName?.Trim();
            m.Address = request.Address?.Trim();
            m.City = request.City?.Trim();
            m.DefaultCommissionPercent = request.DefaultCommissionPercent;
            m.FlatCommissionPerPart = request.FlatCommissionPerPart;

            await _context.SaveChangesAsync(cancellationToken);

            return Result<MechanicMasterDto>.Success(new MechanicMasterDto(
                m.Id,
                m.Code,
                m.Name,
                m.Mobile,
                m.GarageName,
                m.Address,
                m.City,
                m.DefaultCommissionPercent,
                m.FlatCommissionPerPart,
                m.TotalCommissionEarned,
                m.TotalCommissionPaid,
                m.TotalCommissionEarned - m.TotalCommissionPaid,
                m.IsActive
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save mechanic");
            return Result<MechanicMasterDto>.Failure("Error saving mechanic: " + ex.Message);
        }
    }

    public async Task<Result> LogCommissionAsync(LogMechanicCommissionRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var mechanic = await _context.MechanicMasters.FirstOrDefaultAsync(m => m.Id == request.MechanicId, cancellationToken);
            if (mechanic == null)
                return Result.Failure("Mechanic not found");

            var log = new MechanicCommissionLog
            {
                MechanicId = request.MechanicId,
                InvoiceId = request.InvoiceId,
                InvoiceNumber = request.InvoiceNumber,
                VehicleRegNumber = request.VehicleRegNumber?.Trim().ToUpperInvariant() ?? string.Empty,
                OdometerKm = request.OdometerKm,
                InvoiceTotal = request.InvoiceTotal,
                CommissionAmount = request.CommissionAmount,
                Status = "Accrued",
                Notes = request.Notes
            };

            mechanic.TotalCommissionEarned += request.CommissionAmount;

            _context.MechanicCommissionLogs.Add(log);
            await _context.SaveChangesAsync(cancellationToken);

            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log mechanic commission");
            return Result.Failure("Error logging commission: " + ex.Message);
        }
    }

    public async Task<Result> ProcessMechanicPayoutAsync(MechanicCommissionPayoutRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var mechanic = await _context.MechanicMasters.FirstOrDefaultAsync(m => m.Id == request.MechanicId, cancellationToken);
            if (mechanic == null)
                return Result.Failure("Mechanic not found");

            if (request.Amount <= 0)
                return Result.Failure("Payout amount must be greater than zero");

            mechanic.TotalCommissionPaid += request.Amount;

            var pendingLogs = await _context.MechanicCommissionLogs
                .Where(l => l.MechanicId == request.MechanicId && l.Status == "Accrued")
                .OrderBy(l => l.CreatedAtUtc)
                .ToListAsync(cancellationToken);

            decimal runningPayout = request.Amount;
            foreach (var pl in pendingLogs)
            {
                if (runningPayout >= pl.CommissionAmount)
                {
                    pl.Status = "Settled";
                    pl.SettledAtUtc = DateTimeOffset.UtcNow;
                    pl.SettlementPaymentMode = request.PaymentMode;
                    runningPayout -= pl.CommissionAmount;
                }
                else
                {
                    break;
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process mechanic payout");
            return Result.Failure("Error processing payout: " + ex.Message);
        }
    }

    public async Task<Result<IReadOnlyList<MechanicCommissionLogDto>>> GetMechanicLogsAsync(Guid? mechanicId, CancellationToken cancellationToken = default)
    {
        try
        {
            var q = _context.MechanicCommissionLogs
                .Include(l => l.Mechanic)
                .AsNoTracking();

            if (mechanicId.HasValue && mechanicId.Value != Guid.Empty)
            {
                q = q.Where(l => l.MechanicId == mechanicId.Value);
            }

            var list = await q
                .OrderByDescending(l => l.CreatedAtUtc)
                .Take(100)
                .Select(l => new MechanicCommissionLogDto(
                    l.Id,
                    l.MechanicId,
                    l.Mechanic.Name,
                    l.Mechanic.Mobile,
                    l.InvoiceId,
                    l.InvoiceNumber,
                    l.VehicleRegNumber,
                    l.OdometerKm,
                    l.InvoiceTotal,
                    l.CommissionAmount,
                    l.Status,
                    l.SettledAtUtc,
                    l.SettlementPaymentMode,
                    l.Notes,
                    l.CreatedAtUtc
                ))
                .ToListAsync(cancellationToken);

            return Result<IReadOnlyList<MechanicCommissionLogDto>>.Success(list);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get mechanic commission logs");
            return Result<IReadOnlyList<MechanicCommissionLogDto>>.Failure("Error fetching mechanic logs: " + ex.Message);
        }
    }

    #endregion

    #region Battery / Scrap Buyback

    public async Task<Result<BatteryScrapBuybackDto>> SaveBatteryScrapBuybackAsync(BatteryScrapBuybackRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var buyback = new BatteryScrapBuyback
            {
                InvoiceId = request.InvoiceId,
                InvoiceNumber = request.InvoiceNumber,
                OldBatteryBrand = request.OldBatteryBrand.Trim(),
                OldAhCapacity = request.OldAhCapacity.Trim(),
                ScrapWeightKg = request.ScrapWeightKg,
                ScrapCreditAmount = request.ScrapCreditAmount,
                HsnCode = "8548",
                Remarks = request.Remarks
            };

            _context.BatteryScrapBuybacks.Add(buyback);
            await _context.SaveChangesAsync(cancellationToken);

            return Result<BatteryScrapBuybackDto>.Success(new BatteryScrapBuybackDto(
                buyback.Id,
                buyback.InvoiceId,
                buyback.InvoiceNumber,
                buyback.OldBatteryBrand,
                buyback.OldAhCapacity,
                buyback.ScrapWeightKg,
                buyback.ScrapCreditAmount,
                buyback.HsnCode,
                buyback.Remarks,
                buyback.CreatedAtUtc
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save battery scrap buyback");
            return Result<BatteryScrapBuybackDto>.Failure("Error saving battery scrap buyback: " + ex.Message);
        }
    }

    public async Task<Result<BatteryScrapBuybackDto?>> GetScrapBuybackByInvoiceAsync(Guid invoiceId, CancellationToken cancellationToken = default)
    {
        try
        {
            var buyback = await _context.BatteryScrapBuybacks
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.InvoiceId == invoiceId, cancellationToken);

            if (buyback == null)
                return Result<BatteryScrapBuybackDto?>.Success(null);

            return Result<BatteryScrapBuybackDto?>.Success(new BatteryScrapBuybackDto(
                buyback.Id,
                buyback.InvoiceId,
                buyback.InvoiceNumber,
                buyback.OldBatteryBrand,
                buyback.OldAhCapacity,
                buyback.ScrapWeightKg,
                buyback.ScrapCreditAmount,
                buyback.HsnCode,
                buyback.Remarks,
                buyback.CreatedAtUtc
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get scrap buyback for invoice {InvoiceId}", invoiceId);
            return Result<BatteryScrapBuybackDto?>.Failure("Error getting scrap buyback: " + ex.Message);
        }
    }

    public async Task<Result<IReadOnlyList<BatteryScrapBuybackDto>>> GetAllScrapBuybacksAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var list = await _context.BatteryScrapBuybacks
                .AsNoTracking()
                .OrderByDescending(b => b.CreatedAtUtc)
                .Take(100)
                .Select(buyback => new BatteryScrapBuybackDto(
                    buyback.Id,
                    buyback.InvoiceId,
                    buyback.InvoiceNumber,
                    buyback.OldBatteryBrand,
                    buyback.OldAhCapacity,
                    buyback.ScrapWeightKg,
                    buyback.ScrapCreditAmount,
                    buyback.HsnCode,
                    buyback.Remarks,
                    buyback.CreatedAtUtc
                ))
                .ToListAsync(cancellationToken);

            return Result<IReadOnlyList<BatteryScrapBuybackDto>>.Success(list);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list all scrap buybacks");
            return Result<IReadOnlyList<BatteryScrapBuybackDto>>.Failure("Error fetching scrap buybacks: " + ex.Message);
        }
    }

    public async Task<Result> DeleteScrapBuybackAsync(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var buyback = await _context.BatteryScrapBuybacks.FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
            if (buyback == null)
                return Result.Failure("Scrap buyback record not found");

            _context.BatteryScrapBuybacks.Remove(buyback);
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete scrap buyback {Id}", id);
            return Result.Failure("Error deleting scrap buyback: " + ex.Message);
        }
    }

    #endregion

    private static string? ExtractRackBin(Domain.Entities.Inventory.Item item)
    {
        if (string.IsNullOrWhiteSpace(item.ShortDescription))
            return null;

        if (item.ShortDescription.Contains("Rack") || item.ShortDescription.Contains("Bin") || item.ShortDescription.Contains("Shelf"))
            return item.ShortDescription;

        return null;
    }
}
