using System.Net;
using System.Text.Json;
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

        var response = new ErrorResponse();

        switch (exception)
        {
            case BaseCustomException customEx:
                context.Response.StatusCode = customEx.StatusCode;
                response.StatusCode = customEx.StatusCode;
                response.ErrorCode = customEx.ErrorCode;
                response.Message = customEx.Message;

                if (customEx is ValidationAppException valEx)
                {
                    response.ValidationErrors = valEx.Errors;
                }
                break;

            case UnauthorizedAccessException:
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                response.StatusCode = 401;
                response.ErrorCode = "UNAUTHORIZED";
                response.Message = "Unauthorized request.";
                break;

            default:
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                response.StatusCode = 500;
                response.ErrorCode = "INTERNAL_SERVER_ERROR";
                response.Message = "An unexpected internal server error occurred.";
                break;
        }

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, jsonOptions));
    }

    private class ErrorResponse
    {
        public int StatusCode { get; set; }
        public string ErrorCode { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public IDictionary<string, string[]>? ValidationErrors { get; set; }
        public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
    }
}
