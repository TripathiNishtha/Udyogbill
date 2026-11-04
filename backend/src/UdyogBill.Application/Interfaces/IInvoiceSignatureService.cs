using System;

namespace UdyogBill.Application.Interfaces;

public interface IInvoiceSignatureService
{
    /// <summary>
    /// Generates a tamper-proof cryptographic HMAC-SHA256 signature token for public invoice access.
    /// </summary>
    string GenerateToken(Guid invoiceId, long? expiresEpochSeconds = null);

    /// <summary>
    /// Validates that the provided token matches the cryptographic HMAC signature of invoiceId and has not expired.
    /// </summary>
    bool ValidateToken(Guid invoiceId, string? token, long? expiresEpochSeconds, out string? failureReason);

    /// <summary>
    /// Builds the complete public verification URL including invoiceId, token, and optional expires parameters.
    /// </summary>
    string BuildPublicInvoiceUrl(string baseUrl, Guid invoiceId, long? expiresEpochSeconds = null);
}
