using System;
using System.Security.Cryptography;
using System.Text;

namespace UdyogBill.Application.Services;

public static class InvoiceSignatureHelper
{
    private static string _masterKey = "UDYOGBILL_DEFAULT_SECURE_INVOICE_SIGNING_MASTER_KEY_256_BITS!";

    public static void Configure(string key)
    {
        if (!string.IsNullOrWhiteSpace(key))
        {
            _masterKey = key;
        }
    }

    public static string GenerateToken(Guid invoiceId, long? expiresEpochSeconds = null)
    {
        var payload = expiresEpochSeconds.HasValue
            ? $"{invoiceId:N}:{expiresEpochSeconds.Value}"
            : $"{invoiceId:N}:permanent";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_masterKey));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public static bool ValidateToken(Guid invoiceId, string? token, long? expiresEpochSeconds, out string? failureReason)
    {
        failureReason = null;

        if (string.IsNullOrWhiteSpace(token))
        {
            failureReason = "SIGNATURE_REQUIRED";
            return false;
        }

        if (expiresEpochSeconds.HasValue)
        {
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            if (now > expiresEpochSeconds.Value)
            {
                failureReason = "TOKEN_EXPIRED";
                return false;
            }
        }

        var expectedToken = GenerateToken(invoiceId, expiresEpochSeconds);
        var providedBytes = Encoding.UTF8.GetBytes(token.Trim().ToLowerInvariant());
        var expectedBytes = Encoding.UTF8.GetBytes(expectedToken);

        if (providedBytes.Length != expectedBytes.Length || !CryptographicOperations.FixedTimeEquals(providedBytes, expectedBytes))
        {
            failureReason = "INVALID_SIGNATURE";
            return false;
        }

        return true;
    }

    public static string BuildPublicInvoiceUrl(string baseUrl, Guid invoiceId, long? expiresEpochSeconds = null)
    {
        var cleanBase = baseUrl.TrimEnd('/');
        var token = GenerateToken(invoiceId, expiresEpochSeconds);
        if (expiresEpochSeconds.HasValue)
        {
            return $"{cleanBase}/i/{invoiceId}?token={token}&expires={expiresEpochSeconds.Value}";
        }
        return $"{cleanBase}/i/{invoiceId}?token={token}";
    }
}
