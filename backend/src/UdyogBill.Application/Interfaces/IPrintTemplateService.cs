using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Domain.Entities.Printing;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IPrintTemplateService
{
    Task<Result<IReadOnlyList<PrintTemplateDto>>> GetTemplatesAsync(PrintDocumentType? documentType = null, CancellationToken cancellationToken = default);
    Task<Result<PrintTemplateDto>> GetTemplateByIdAsync(Guid templateId, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateTemplateAsync(CreatePrintTemplateRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<PrintTemplateDto>> UpdateTemplateAsync(Guid templateId, UpdatePrintTemplateRequest request, string? ipAddress = null, CancellationToken cancellationToken = default);
    Task<Result<bool>> SetDefaultTemplateAsync(Guid templateId, PrintDocumentType? documentType = null, CancellationToken cancellationToken = default);
    Task<Result<RenderPrintPreviewResultDto>> RenderPreviewAsync(RenderPrintPreviewRequest request, CancellationToken cancellationToken = default);
}
