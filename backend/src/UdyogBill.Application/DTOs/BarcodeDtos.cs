using System;
using System.Collections.Generic;

namespace UdyogBill.Application.DTOs;

public class BarcodeItemLabelDto
{
    public Guid ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string ItemSku { get; set; } = string.Empty;
    public string Barcode { get; set; } = string.Empty;
    public decimal Mrp { get; set; }
    public decimal SellingPrice { get; set; }
    public string? BatchNumber { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string? BrandName { get; set; }
    public string? CategoryName { get; set; }
    public string TenantName { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
}

public class GenerateBarcodeLabelsRequest
{
    public List<BarcodeItemLabelDto> Items { get; set; } = new();
    public string PaperLayout { get; set; } = "A4_24"; // A4_24 (3x8), A4_40 (4x10), A4_65 (5x13), ThermalRoll_50x25, ThermalRoll_38x25
    public bool IncludeTenantName { get; set; } = true;
    public bool IncludeMrp { get; set; } = true;
    public bool IncludeSellingPrice { get; set; } = true;
    public bool IncludeExpiryDate { get; set; } = true;
    public bool IncludeBatchNumber { get; set; } = true;
}

public class BarcodeScanResultDto
{
    public Guid ItemId { get; set; }
    public string ItemSku { get; set; } = string.Empty;
    public string Barcode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public decimal Mrp { get; set; }
    public decimal SellingPrice { get; set; }
    public decimal PurchasePrice { get; set; }
    public decimal TaxRate { get; set; }
    public string? HsnCode { get; set; }
    public Guid PrimaryUomId { get; set; }
    public string PrimaryUomCode { get; set; } = string.Empty;
    public decimal TotalStock { get; set; }
    public List<ItemBatchDto> Batches { get; set; } = new();
}

public class UpiQrPayloadDto
{
    public string UpiUri { get; set; } = string.Empty;
    public string PayeeVpa { get; set; } = string.Empty;
    public string PayeeName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string TransactionNote { get; set; } = string.Empty;
}
