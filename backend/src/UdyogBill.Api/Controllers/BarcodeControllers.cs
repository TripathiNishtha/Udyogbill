using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/barcode")]
public class TenantBarcodeController : BaseApiController
{
    private readonly IBarcodeService _barcodeService;

    public TenantBarcodeController(IBarcodeService barcodeService)
    {
        _barcodeService = barcodeService;
    }

    [HttpGet("item/{itemId:guid}")]
    [ProducesResponseType(typeof(BarcodeItemLabelDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetItemBarcode(Guid itemId, [FromQuery] Guid? batchId = null, CancellationToken cancellationToken = default)
    {
        var result = await _barcodeService.GetBarcodeItemLabelAsync(itemId, batchId, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("scan/{barcodeOrSku}")]
    [ProducesResponseType(typeof(BarcodeScanResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ScanBarcode(string barcodeOrSku, CancellationToken cancellationToken)
    {
        var result = await _barcodeService.ScanBarcodeOrSkuAsync(barcodeOrSku, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("invoice/{invoiceId:guid}/upi-qr")]
    [ProducesResponseType(typeof(UpiQrPayloadDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetInvoiceUpiQr(Guid invoiceId, CancellationToken cancellationToken)
    {
        var result = await _barcodeService.GenerateInvoiceUpiQrAsync(invoiceId, cancellationToken);
        return HandleResult(result);
    }
}
