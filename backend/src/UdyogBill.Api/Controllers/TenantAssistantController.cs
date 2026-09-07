using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Api.Filters;
using UdyogBill.Application.DTOs;
using UdyogBill.Application.Interfaces;
using UdyogBill.Shared;
using UdyogBill.Shared.Constants;

namespace UdyogBill.Api.Controllers;

[Authorize]
[RequireActiveSubscription]
[Route("api/v1/tenant/assistant")]
public class TenantAssistantController : BaseApiController
{
    private readonly ITenantAssistantService _assistantService;

    public TenantAssistantController(ITenantAssistantService assistantService)
    {
        _assistantService = assistantService;
    }

    [HttpPost("query")]
    [ProducesResponseType(typeof(AssistantQueryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Query([FromBody] AssistantQueryRequest request, CancellationToken cancellationToken)
    {
        var tenantIdClaim = User.FindFirst(Claims.TenantId)?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized();
        }

        var userIdClaim = User.FindFirst(Claims.UserId)?.Value;
        Guid.TryParse(userIdClaim, out var userId);

        var isTenantAdmin = User.IsInRole(Roles.TenantAdmin) || User.FindFirst(Claims.IsTenantAdmin)?.Value == "true";
        var permissions = User.FindAll(Claims.Permission).Select(c => c.Value).ToList();

        var result = await _assistantService.ProcessQueryAsync(request, tenantId, userId, isTenantAdmin, permissions, cancellationToken);
        return HandleResult(result);
    }

    [HttpGet("quick-prompts")]
    [ProducesResponseType(typeof(List<QuickPromptGroup>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetQuickPrompts(CancellationToken cancellationToken)
    {
        var tenantIdClaim = User.FindFirst(Claims.TenantId)?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim) || !Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            return Unauthorized();
        }

        var result = await _assistantService.GetQuickPromptsAsync(tenantId, cancellationToken);
        return HandleResult(result);
    }
}
