using System;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IBarcodeService
{
    Task<Result<BarcodeItemLabelDto>> GetBarcodeItemLabelAsync(Guid itemId, Guid? batchId = null, CancellationToken cancellationToken = default);
    Task<Result<BarcodeScanResultDto>> ScanBarcodeOrSkuAsync(string barcodeOrSku, CancellationToken cancellationToken = default);
    Task<Result<UpiQrPayloadDto>> GenerateInvoiceUpiQrAsync(Guid invoiceId, CancellationToken cancellationToken = default);
}
