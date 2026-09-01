using Microsoft.AspNetCore.Mvc;
using UdyogBill.Shared;

namespace UdyogBill.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public abstract class BaseApiController : ControllerBase
{
    protected ActionResult HandleResult<T>(Result<T> result)
    {
        if (result.IsSuccess)
        {
            return Ok(result.Data);
        }

        return result.ErrorCode switch
        {
            "NOT_FOUND" => NotFound(new { error = result.ErrorMessage, code = result.ErrorCode }),
            "UNAUTHORIZED" or "INVALID_CREDENTIALS" => Unauthorized(new { error = result.ErrorMessage, code = result.ErrorCode }),
            "FORBIDDEN" or "TENANT_ISOLATION_BREACH" => StatusCode(403, new { error = result.ErrorMessage, code = result.ErrorCode }),
            "EMAIL_ALREADY_EXISTS" or "RESOURCE_CONFLICT" => Conflict(new { error = result.ErrorMessage, code = result.ErrorCode }),
            "VALIDATION_FAILED" => BadRequest(new { error = result.ErrorMessage, errors = result.ValidationErrors, code = result.ErrorCode }),
            _ => BadRequest(new { error = result.ErrorMessage, code = result.ErrorCode })
        };
    }

    protected ActionResult HandleResult(Result result)
    {
        if (result.IsSuccess)
        {
            return NoContent();
        }

        return result.ErrorCode switch
        {
            "NOT_FOUND" => NotFound(new { error = result.ErrorMessage, code = result.ErrorCode }),
            "UNAUTHORIZED" => Unauthorized(new { error = result.ErrorMessage, code = result.ErrorCode }),
            "FORBIDDEN" => StatusCode(403, new { error = result.ErrorMessage, code = result.ErrorCode }),
            "VALIDATION_FAILED" => BadRequest(new { error = result.ErrorMessage, errors = result.ValidationErrors, code = result.ErrorCode }),
            _ => BadRequest(new { error = result.ErrorMessage, code = result.ErrorCode })
        };
    }
}
