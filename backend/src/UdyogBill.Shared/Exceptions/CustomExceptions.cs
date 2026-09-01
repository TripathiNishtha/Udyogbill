namespace UdyogBill.Shared.Exceptions;

public abstract class BaseCustomException : Exception
{
    public string ErrorCode { get; }
    public int StatusCode { get; }

    protected BaseCustomException(string message, string errorCode = "INTERNAL_SERVER_ERROR", int statusCode = 500)
        : base(message)
    {
        ErrorCode = errorCode;
        StatusCode = statusCode;
    }
}

public class NotFoundException : BaseCustomException
{
    public NotFoundException(string message, string errorCode = "NOT_FOUND")
        : base(message, errorCode, 404)
    {
    }

    public NotFoundException(string entityName, object key)
        : base($"Entity '{entityName}' with key '{key}' was not found.", "NOT_FOUND", 404)
    {
    }
}

public class ValidationAppException : BaseCustomException
{
    public IDictionary<string, string[]> Errors { get; }

    public ValidationAppException(IDictionary<string, string[]> errors, string message = "One or more validation errors occurred.")
        : base(message, "VALIDATION_FAILED", 400)
    {
        Errors = errors;
    }

    public ValidationAppException(string propertyName, string error)
        : base(error, "VALIDATION_FAILED", 400)
    {
        Errors = new Dictionary<string, string[]>
        {
            { propertyName, new[] { error } }
        };
    }
}

public class UnauthorizedAppException : BaseCustomException
{
    public UnauthorizedAppException(string message = "Unauthorized access.", string errorCode = "UNAUTHORIZED")
        : base(message, errorCode, 401)
    {
    }
}

public class ForbiddenAppException : BaseCustomException
{
    public ForbiddenAppException(string message = "Access to the requested resource is forbidden.", string errorCode = "FORBIDDEN")
        : base(message, errorCode, 403)
    {
    }
}

public class TenantIsolationViolationException : BaseCustomException
{
    public TenantIsolationViolationException(string message = "Tenant isolation policy violation detected.", string errorCode = "TENANT_ISOLATION_BREACH")
        : base(message, errorCode, 403)
    {
    }
}

public class ConflictAppException : BaseCustomException
{
    public ConflictAppException(string message, string errorCode = "RESOURCE_CONFLICT")
        : base(message, errorCode, 409)
    {
    }
}
