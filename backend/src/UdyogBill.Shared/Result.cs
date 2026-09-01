namespace UdyogBill.Shared;

public class Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public string? ErrorMessage { get; }
    public string? ErrorCode { get; }
    public IDictionary<string, string[]>? ValidationErrors { get; }

    protected Result(bool isSuccess, string? errorMessage = null, string? errorCode = null, IDictionary<string, string[]>? validationErrors = null)
    {
        IsSuccess = isSuccess;
        ErrorMessage = errorMessage;
        ErrorCode = errorCode;
        ValidationErrors = validationErrors;
    }

    public static Result Success() => new(true);
    public static Result Failure(string errorMessage, string? errorCode = null) => new(false, errorMessage, errorCode);
    public static Result Failure(IDictionary<string, string[]> validationErrors, string? errorMessage = "Validation failed") => new(false, errorMessage, "VALIDATION_FAILED", validationErrors);
}

public class Result<T> : Result
{
    public T? Data { get; }

    private Result(bool isSuccess, T? data = default, string? errorMessage = null, string? errorCode = null, IDictionary<string, string[]>? validationErrors = null)
        : base(isSuccess, errorMessage, errorCode, validationErrors)
    {
        Data = data;
    }

    public static Result<T> Success(T data) => new(true, data);
    public static new Result<T> Failure(string errorMessage, string? errorCode = null) => new(false, default, errorMessage, errorCode);
    public static new Result<T> Failure(IDictionary<string, string[]> validationErrors, string? errorMessage = "Validation failed") => new(false, default, errorMessage, "VALIDATION_FAILED", validationErrors);
}

public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; }
    public int PageNumber { get; }
    public int PageSize { get; }
    public int TotalCount { get; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;

    public PagedResult(IReadOnlyList<T> items, int pageNumber, int pageSize, int totalCount)
    {
        Items = items;
        PageNumber = pageNumber;
        PageSize = pageSize;
        TotalCount = totalCount;
    }

    public static PagedResult<T> Create(IReadOnlyList<T> items, int pageNumber, int pageSize, int totalCount)
    {
        return new PagedResult<T>(items, pageNumber, pageSize, totalCount);
    }
}
