using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace UdyogBill.Api.Configuration;

public static class ProductionSecurityConfigurationValidator
{
    public static readonly string[] KnownInsecureSecrets = new[]
    {
        "DEVELOPMENT_ONLY_KEY_OVERRIDE_IN_PRODUCTION_ENV_MIN_256_BITS!",
        "UdyogBill_Super_Secure_Secret_Key_Production_Grade_2026_Minimum_256_Bits!",
        "UdyogBill_Super_Secure_Secret_Key_For_Development_Only_Min_256_Bits!",
        "UdyogBill_Development_Fallback_Key_Not_For_Production_Use_256Bits!",
        "AIzaSyDDq8_DzbrIaT2aa9Ai-HFYVW0-IToXJTM",
        "DEVELOPMENT_GEMINI_API_KEY"
    };

    public static void ValidateProductionConfiguration(IConfiguration configuration, IWebHostEnvironment environment)
    {
        if (!environment.IsProduction())
        {
            return;
        }

        if (configuration["ALLOW_LEGACY_CREDENTIALS_TRANSITION"] == "true" ||
            Environment.GetEnvironmentVariable("ALLOW_LEGACY_CREDENTIALS_TRANSITION") == "true")
        {
            return;
        }

        // 1. Validate ConnectionString
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? configuration["ConnectionStrings:DefaultConnection"]
            ?? configuration["POSTGRES_CONNECTION_STRING"];

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "CRITICAL SECURITY CONFIGURATION ERROR: 'ConnectionStrings:DefaultConnection' (or environment variable 'POSTGRES_CONNECTION_STRING') is missing in Production environment.");
        }

        var lowerConn = connectionString.ToLowerInvariant();
        if (lowerConn.Contains("localhost") || lowerConn.Contains("127.0.0.1") || lowerConn.Contains("::1") || lowerConn.Contains("password=localdev"))
        {
            throw new InvalidOperationException(
                "CRITICAL SECURITY CONFIGURATION ERROR: Production database connection string cannot point to localhost or use default development credentials ('localdev'). Please provide a production database connection string via 'POSTGRES_CONNECTION_STRING'.");
        }

        if (lowerConn.Contains("npg_0kkhxdzvo4el") || lowerConn.Contains("ep-withered-shadow-a51u5sfj"))
        {
            throw new InvalidOperationException(
                "CRITICAL SECURITY CONFIGURATION ERROR: Production database connection string contains a known compromised credential. Please rotate database credentials and provide the new connection string via 'POSTGRES_CONNECTION_STRING'.");
        }

        if (lowerConn.Contains("include error detail=true") || lowerConn.Contains("include errordetail=true"))
        {
            throw new InvalidOperationException(
                "CRITICAL SECURITY CONFIGURATION ERROR: Production database connection string cannot contain 'Include Error Detail=true'. Internal database schema and query structures must not be exposed.");
        }

        // 2. Validate JWT Secret Key
        var jwtSecret = configuration["Jwt:SecretKey"] ?? configuration["JWT_SECRET_KEY"];
        if (string.IsNullOrWhiteSpace(jwtSecret))
        {
            throw new InvalidOperationException(
                "CRITICAL SECURITY CONFIGURATION ERROR: 'Jwt:SecretKey' (or environment variable 'JWT_SECRET_KEY') is missing in Production environment.");
        }

        if (jwtSecret.Length < 32)
        {
            throw new InvalidOperationException(
                $"CRITICAL SECURITY CONFIGURATION ERROR: 'Jwt:SecretKey' in Production must be at least 256 bits (>= 32 characters). Current length: {jwtSecret.Length}.");
        }

        if (KnownInsecureSecrets.Contains(jwtSecret))
        {
            throw new InvalidOperationException(
                "CRITICAL SECURITY CONFIGURATION ERROR: 'Jwt:SecretKey' in Production is using a known development default or insecure secret key. Provide a cryptographically random secret via environment variable 'JWT_SECRET_KEY'.");
        }

        // 3. Validate Gemini API Key if configured
        var geminiKey = configuration["Gemini:ApiKey"] ?? configuration["GEMINI_API_KEY"];
        if (!string.IsNullOrWhiteSpace(geminiKey))
        {
            if (geminiKey == "DEVELOPMENT_GEMINI_API_KEY" || geminiKey == "AIzaSyDDq8_DzbrIaT2aa9Ai-HFYVW0-IToXJTM")
            {
                throw new InvalidOperationException(
                    "CRITICAL SECURITY CONFIGURATION ERROR: 'Gemini:ApiKey' contains a placeholder or compromised API key. Provide a valid API key via environment variable 'GEMINI_API_KEY' or remove the section if not used.");
            }
        }

        // 4. Validate JWT ExpiryMinutes
        var expiryMinutesStr = configuration["Jwt:ExpiryMinutes"] ?? configuration["JWT_EXPIRY_MINUTES"];
        if (int.TryParse(expiryMinutesStr, out var expiryMinutes) && expiryMinutes > 1440)
        {
            throw new InvalidOperationException(
                $"CRITICAL SECURITY CONFIGURATION ERROR: 'Jwt:ExpiryMinutes' in Production cannot exceed 24 hours (1440 minutes) (configured: {expiryMinutes} minutes). Recommended: 720 minutes (12 hours).");
        }

        // 5. Validate CORS AllowedOrigins
        var corsOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        if (corsOrigins != null && corsOrigins.Length > 0)
        {
            foreach (var origin in corsOrigins)
            {
                if (string.IsNullOrWhiteSpace(origin)) continue;
                var trimmed = origin.Trim();

                if (trimmed == "*")
                {
                    throw new InvalidOperationException(
                        "CRITICAL SECURITY CONFIGURATION ERROR: 'Cors:AllowedOrigins' in Production cannot contain wildcard ('*') when credentials are enabled.");
                }

                if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(
                        $"CRITICAL SECURITY CONFIGURATION ERROR: 'Cors:AllowedOrigins' in Production cannot contain unencrypted HTTP origin '{trimmed}'. Production CORS origins must use HTTPS.");
                }

                if (Uri.TryCreate(trimmed, UriKind.Absolute, out var originUri))
                {
                    var host = originUri.Host.ToLowerInvariant();
                    if (host == "localhost" || host == "127.0.0.1" || host == "::1" ||
                        host.StartsWith("192.168.") || host.StartsWith("10.") ||
                        IsPrivate172(host))
                    {
                        throw new InvalidOperationException(
                            $"CRITICAL SECURITY CONFIGURATION ERROR: 'Cors:AllowedOrigins' in Production cannot contain LAN/local IP address origin '{trimmed}'. Production CORS origins must use verified domain names.");
                    }
                }
            }
        }
    }

    private static bool IsPrivate172(string host)
    {
        if (System.Net.IPAddress.TryParse(host, out var ip))
        {
            var bytes = ip.GetAddressBytes();
            if (bytes.Length == 4 && bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
            {
                return true;
            }
        }
        return false;
    }
}
