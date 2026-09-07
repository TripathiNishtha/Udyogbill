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

public class ApiErrorResponse
{
    public bool Success { get; set; } = false;
    public string ErrorCode { get; set; } = "UNKNOWN_ERROR";
    public string Message { get; set; } = string.Empty;
    public string UserMessage { get; set; } = string.Empty;
    public string CorrelationId { get; set; } = string.Empty;
    public string TransactionStatus { get; set; } = "NOT_COMMITTED";
    public bool Retryable { get; set; } = false;
    public IDictionary<string, string[]>? FieldErrors { get; set; }
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
}

public static class IndianCurrencyInWordsConverter
{
    private static readonly string[] Units = { "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen" };
    private static readonly string[] Tens = { "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };

    public static string ToWords(decimal number)
    {
        if (number == 0) return "Rupees Zero Only";

        var wholePart = (long)Math.Floor(Math.Abs(number));
        var decimalPart = (int)Math.Round((Math.Abs(number) - wholePart) * 100);

        var result = "Indian Rupees " + ConvertWholePart(wholePart).Trim();

        if (decimalPart > 0)
        {
            result += " and " + ConvertWholePart(decimalPart).Trim() + " Paise";
        }

        return result + " Only";
    }

    private static string ConvertWholePart(long n)
    {
        if (n == 0) return "";
        if (n < 20) return Units[n] + " ";
        if (n < 100) return Tens[n / 10] + " " + Units[n % 10] + " ";
        if (n < 1000) return Units[n / 100] + " Hundred " + ConvertWholePart(n % 100);
        if (n < 100000) return ConvertWholePart(n / 1000) + "Thousand " + ConvertWholePart(n % 1000);
        if (n < 10000000) return ConvertWholePart(n / 100000) + "Lakh " + ConvertWholePart(n % 100000);
        return ConvertWholePart(n / 10000000) + "Crore " + ConvertWholePart(n % 10000000);
    }
}


