using System;
using UdyogBill.Domain.Common;

namespace UdyogBill.Domain.Entities.Common;

public class IdempotentRequest : BaseTenantAuditableEntity
{
    public string IdempotencyKey { get; set; } = string.Empty;
    public string RequestPath { get; set; } = string.Empty;
    public string HttpMethod { get; set; } = string.Empty;
    public string RequestHash { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public string ResponseBody { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAtUtc { get; set; } = DateTimeOffset.UtcNow.AddDays(7);
}
