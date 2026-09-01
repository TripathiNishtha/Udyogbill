using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using UdyogBill.Application.Interfaces;
using UdyogBill.Domain.Entities.Identity;
using SharedClaims = UdyogBill.Shared.Constants.Claims;

namespace UdyogBill.Infrastructure.Services;

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly IConfiguration _configuration;

    public JwtTokenGenerator(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateAccessToken(User user, IReadOnlyList<string> roles, IReadOnlyList<string> permissions, Guid? tenantId, string? tenantCode)
    {
        var secretKey = _configuration["Jwt:SecretKey"] ?? "UdyogBill_Super_Secure_Secret_Key_Production_Grade_2026_Minimum_256_Bits!";
        var issuer = _configuration["Jwt:Issuer"] ?? "UdyogBill.Api";
        var audience = _configuration["Jwt:Audience"] ?? "UdyogBill.Client";
        var expiryMinutes = int.TryParse(_configuration["Jwt:ExpiryMinutes"], out var minutes) ? minutes : 60;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(SharedClaims.UserId, user.Id.ToString()),
            new(SharedClaims.Email, user.Email),
            new(SharedClaims.FullName, user.FullName),
            new(SharedClaims.IsSuperAdmin, user.IsSuperAdmin.ToString().ToLowerInvariant()),
            new(SharedClaims.IsTenantAdmin, user.IsTenantAdmin.ToString().ToLowerInvariant())
        };

        if (tenantId.HasValue && tenantId.Value != Guid.Empty)
        {
            claims.Add(new Claim(SharedClaims.TenantId, tenantId.Value.ToString()));
            if (!string.IsNullOrEmpty(tenantCode))
            {
                claims.Add(new Claim("tenant_code", tenantCode));
            }
        }

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        foreach (var permission in permissions)
        {
            claims.Add(new Claim(SharedClaims.Permission, permission));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(expiryMinutes),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public (string Token, string TokenHash, DateTimeOffset ExpiresAt) GenerateRefreshToken(string? ipAddress = null)
    {
        var randomBytes = RandomNumberGenerator.GetBytes(64);
        var token = Convert.ToBase64String(randomBytes);
        var tokenHash = ComputeSha256Hash(token);
        var expiryDays = int.TryParse(_configuration["Jwt:RefreshTokenExpiryDays"], out var days) ? days : 30;
        var expiresAt = DateTimeOffset.UtcNow.AddDays(expiryDays);

        return (token, tokenHash, expiresAt);
    }

    private static string ComputeSha256Hash(string rawData)
    {
        byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawData));
        var builder = new StringBuilder();
        foreach (var b in bytes)
        {
            builder.Append(b.ToString("x2"));
        }
        return builder.ToString();
    }
}
