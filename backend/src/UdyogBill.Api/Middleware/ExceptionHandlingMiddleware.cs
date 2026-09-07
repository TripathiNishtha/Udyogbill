using System.Net;
using System.Text.Json;
using UdyogBill.Shared;
using UdyogBill.Shared.Exceptions;

namespace UdyogBill.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred during request execution: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var correlationId = $"UB-SYS-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
        context.Response.Headers["X-Correlation-ID"] = correlationId;

        var response = new ApiErrorResponse
        {
            Success = false,
            CorrelationId = correlationId,
            TransactionStatus = "ROLLED_BACK",
            Timestamp = DateTimeOffset.UtcNow
        };

        switch (exception)
        {
            case BaseCustomException customEx:
                context.Response.StatusCode = customEx.StatusCode;
                response.ErrorCode = customEx.ErrorCode;
                response.Message = customEx.Message;
                response.UserMessage = customEx.Message;

                if (customEx is ValidationAppException valEx)
                {
                    response.FieldErrors = valEx.Errors;
                    response.TransactionStatus = "NOT_COMMITTED";
                }
                break;

            case UnauthorizedAccessException:
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                response.ErrorCode = "UNAUTHORIZED";
                response.Message = "You do not have authorization to perform this operation.";
                response.UserMessage = "Your session expired or you lack permissions. Please log in again.";
                response.TransactionStatus = "NOT_COMMITTED";
                break;

            default:
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                response.ErrorCode = "INTERNAL_SERVER_ERROR";
                response.Message = "An unexpected server error occurred during transaction processing.";
                response.UserMessage = $"Operation could not be completed due to an unexpected server exception. (Error ID: {correlationId}). No partial changes were committed.";
                response.TransactionStatus = "ROLLED_BACK";
                response.Retryable = true;
                break;
        }

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, jsonOptions));
    }
}
