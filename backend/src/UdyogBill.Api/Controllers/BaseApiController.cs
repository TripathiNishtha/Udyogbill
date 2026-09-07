using System;
using Microsoft.AspNetCore.Mvc;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public abstract class BaseApiController : ControllerBase
{
    private string GetOrCreateCorrelationId()
    {
        if (HttpContext.Items.TryGetValue("CorrelationId", out var cid) && cid is string strCid && !string.IsNullOrWhiteSpace(strCid))
        {
            return strCid;
        }

        var newId = $"UB-ERR-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
        HttpContext.Items["CorrelationId"] = newId;
        HttpContext.Response.Headers["X-Correlation-ID"] = newId;
        return newId;
    }

    private ApiErrorResponse BuildErrorResponse(string? errorMessage, string? errorCode, IDictionary<string, string[]>? validationErrors)
    {
        var correlationId = GetOrCreateCorrelationId();
        var code = errorCode ?? "OPERATION_FAILED";
        var msg = errorMessage ?? "The requested operation could not be completed.";

        return new ApiErrorResponse
        {
            Success = false,
            ErrorCode = code,
            Message = msg,
            UserMessage = msg,
            CorrelationId = correlationId,
            TransactionStatus = "NOT_COMMITTED",
            Retryable = code == "TIMEOUT" || code == "NETWORK_ERROR",
            FieldErrors = validationErrors,
            Timestamp = DateTimeOffset.UtcNow
        };
    }

    protected ActionResult HandleResult<T>(Result<T> result)
    {
        if (result.IsSuccess)
        {
            return Ok(result.Data);
        }

        var errResp = BuildErrorResponse(result.ErrorMessage, result.ErrorCode, result.ValidationErrors);

        return result.ErrorCode switch
        {
            "NOT_FOUND" => NotFound(errResp),
            "UNAUTHORIZED" or "INVALID_CREDENTIALS" => Unauthorized(errResp),
            "FORBIDDEN" or "TENANT_ISOLATION_BREACH" => StatusCode(403, errResp),
            "EMAIL_ALREADY_EXISTS" or "RESOURCE_CONFLICT" => Conflict(errResp),
            "VALIDATION_FAILED" => BadRequest(errResp),
            _ => BadRequest(errResp)
        };
    }

    protected ActionResult HandleResult(Result result)
    {
        if (result.IsSuccess)
        {
            return NoContent();
        }

        var errResp = BuildErrorResponse(result.ErrorMessage, result.ErrorCode, result.ValidationErrors);

        return result.ErrorCode switch
        {
            "NOT_FOUND" => NotFound(errResp),
            "UNAUTHORIZED" => Unauthorized(errResp),
            "FORBIDDEN" => StatusCode(403, errResp),
            "VALIDATION_FAILED" => BadRequest(errResp),
            _ => BadRequest(errResp)
        };
    }
}
