using System.Security.Cryptography;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using UdyogBill.Application.Interfaces;

namespace UdyogBill.Infrastructure.Services;

public class PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 128 / 8; // 16 bytes
    private const int IterationCount = 100_000;
    private const int HashSize = 256 / 8; // 32 bytes

    public string HashPassword(string password, out string salt)
    {
        byte[] saltBytes = RandomNumberGenerator.GetBytes(SaltSize);
        salt = Convert.ToBase64String(saltBytes);

        byte[] hashBytes = KeyDerivation.Pbkdf2(
            password: password,
            salt: saltBytes,
            prf: KeyDerivationPrf.HMACSHA512,
            iterationCount: IterationCount,
            numBytesRequested: HashSize);

        return Convert.ToBase64String(hashBytes);
    }

    public bool VerifyPassword(string password, string storedHash, string storedSalt)
    {
        if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(storedHash) || string.IsNullOrWhiteSpace(storedSalt))
        {
            return false;
        }

        try
        {
            byte[] saltBytes = Convert.FromBase64String(storedSalt);
            byte[] expectedHashBytes = Convert.FromBase64String(storedHash);

            byte[] actualHashBytes = KeyDerivation.Pbkdf2(
                password: password,
                salt: saltBytes,
                prf: KeyDerivationPrf.HMACSHA512,
                iterationCount: IterationCount,
                numBytesRequested: expectedHashBytes.Length);

            return CryptographicOperations.FixedTimeEquals(actualHashBytes, expectedHashBytes);
        }
        catch
        {
            return false;
        }
    }
}
