using System;
using Microsoft.Extensions.Configuration;
using UdyogBill.Application.Interfaces;
using UdyogBill.Application.Services;

namespace UdyogBill.Infrastructure.Services;

public class InvoiceSignatureService : IInvoiceSignatureService
{
    public InvoiceSignatureService(IConfiguration configuration)
    {
        var secret = configuration["Security:InvoiceSigningKey"]
                     ?? configuration["Jwt:SecretKey"]
                     ?? "UDYOGBILL_DEFAULT_SECURE_INVOICE_SIGNING_MASTER_KEY_256_BITS!";
        InvoiceSignatureHelper.Configure(secret);
    }

    public string GenerateToken(Guid invoiceId, long? expiresEpochSeconds = null)
    {
        return InvoiceSignatureHelper.GenerateToken(invoiceId, expiresEpochSeconds);
    }

    public bool ValidateToken(Guid invoiceId, string? token, long? expiresEpochSeconds, out string? failureReason)
    {
        return InvoiceSignatureHelper.ValidateToken(invoiceId, token, expiresEpochSeconds, out failureReason);
    }

    public string BuildPublicInvoiceUrl(string baseUrl, Guid invoiceId, long? expiresEpochSeconds = null)
    {
        return InvoiceSignatureHelper.BuildPublicInvoiceUrl(baseUrl, invoiceId, expiresEpochSeconds);
    }
}
