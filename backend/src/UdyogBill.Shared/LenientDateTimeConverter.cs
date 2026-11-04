using System;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace UdyogBill.Shared;

public class LenientNullableDateTimeConverter : JsonConverter<DateTime?>
{
    private static readonly string[] Formats =
    {
        "yyyy-MM-ddTHH:mm:ss.FFFFFFFZ",
        "yyyy-MM-ddTHH:mm:ssZ",
        "yyyy-MM-ddTHH:mm:ss",
        "yyyy-MM-dd",
        "yyyy/MM/dd",
        "dd/MM/yyyy",
        "dd-MM-yyyy",
        "d/M/yyyy",
        "d-M-yyyy"
    };

    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
            return null;

        if (reader.TokenType == JsonTokenType.String)
        {
            var str = reader.GetString();
            if (string.IsNullOrWhiteSpace(str))
                return null;

            str = str.Trim();

            // Handle MM/yy (e.g. "09/28")
            if (Regex.IsMatch(str, @"^\d{1,2}/\d{2}$"))
            {
                var parts = str.Split('/');
                if (int.TryParse(parts[0], out var m) && int.TryParse(parts[1], out var y))
                {
                    if (m >= 1 && m <= 12)
                        return new DateTime(2000 + y, m, 1, 0, 0, 0, DateTimeKind.Utc);
                }
            }

            // Handle MM/yyyy (e.g. "09/2028")
            if (Regex.IsMatch(str, @"^\d{1,2}/\d{4}$"))
            {
                var parts = str.Split('/');
                if (int.TryParse(parts[0], out var m) && int.TryParse(parts[1], out var y))
                {
                    if (m >= 1 && m <= 12)
                        return new DateTime(y, m, 1, 0, 0, 0, DateTimeKind.Utc);
                }
            }

            // Standard parsing
            if (DateTime.TryParse(str, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var dt))
            {
                return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
            }

            if (DateTime.TryParseExact(str, Formats, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var dtExact))
            {
                return DateTime.SpecifyKind(dtExact, DateTimeKind.Utc);
            }

            // Graceful fallback instead of throwing 400 Bad Request
            return null;
        }

        return null;
    }

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (value.HasValue)
            writer.WriteStringValue(value.Value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
        else
            writer.WriteNullValue();
    }
}

public class LenientDateTimeConverter : JsonConverter<DateTime>
{
    private readonly LenientNullableDateTimeConverter _inner = new();

    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var result = _inner.Read(ref reader, typeof(DateTime?), options);
        return result ?? DateTime.UtcNow;
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
    }
}
