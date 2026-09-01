using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Printing;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[Authorize]
[Route("api/v1/tenant/print-templates")]
public class TenantPrintTemplatesController : BaseApiController
{
    private readonly IPrintTemplateService _printTemplateService;

    public TenantPrintTemplatesController(IPrintTemplateService printTemplateService)
    {
        _printTemplateService = printTemplateService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<PrintTemplateDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTemplates([FromQuery] PrintDocumentType? documentType, CancellationToken cancellationToken)
    {
        var result = await _printTemplateService.GetTemplatesAsync(documentType, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("{templateId:guid}")]
    [ProducesResponseType(typeof(PrintTemplateDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTemplateById(Guid templateId, CancellationToken cancellationToken)
    {
        var result = await _printTemplateService.GetTemplateByIdAsync(templateId, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateTemplate([FromBody] CreatePrintTemplateRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _printTemplateService.CreateTemplateAsync(request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPut("{templateId:guid}")]
    [ProducesResponseType(typeof(PrintTemplateDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateTemplate(Guid templateId, [FromBody] UpdatePrintTemplateRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var result = await _printTemplateService.UpdateTemplateAsync(templateId, request, ip, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("{templateId:guid}/set-default")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetDefaultTemplate(Guid templateId, [FromQuery] PrintDocumentType? documentType, CancellationToken cancellationToken)
    {
        var result = await _printTemplateService.SetDefaultTemplateAsync(templateId, documentType, cancellationToken);
        return HandleResult(result);
    }

    [HttpPost("preview")]
    [ProducesResponseType(typeof(RenderPrintPreviewResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RenderPreview([FromBody] RenderPrintPreviewRequest request, CancellationToken cancellationToken)
    {
        var result = await _printTemplateService.RenderPreviewAsync(request, cancellationToken);
        return HandleResult(result);
    }
}
