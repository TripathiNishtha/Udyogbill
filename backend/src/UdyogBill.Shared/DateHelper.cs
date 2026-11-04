using System;

namespace UdyogBill.Shared;

public static class DateHelper
{
    public static readonly TimeSpan IndiaTimezoneOffset = TimeSpan.FromHours(5.5);

    /// <summary>
    /// Converts client date filters (assumed to be Indian Standard Time unless explicitly UTC with non-zero time)
    /// into exact UTC boundaries for PostgreSQL queries.
    /// E.g. fromDate: 2026-09-18 -> 2026-09-17 18:30:00 UTC (00:00:00 IST)
    ///      toDate: 2026-09-18 -> 2026-09-18 18:29:59.999 UTC (23:59:59.999 IST)
    /// </summary>
    public static (DateTime? fromUtc, DateTime? toUtc) ResolveDateRangeUtc(
        DateTime? fromDate,
        DateTime? toDate,
        bool defaultToCurrentMonthIfBothNull = false)
    {
        if (!fromDate.HasValue && !toDate.HasValue && defaultToCurrentMonthIfBothNull)
        {
            var nowIst = DateTimeOffset.UtcNow.ToOffset(IndiaTimezoneOffset);
            fromDate = new DateTime(nowIst.Year, nowIst.Month, 1);
            toDate = nowIst.Date;
        }

        DateTime? fromUtc = null;
        if (fromDate.HasValue)
        {
            var f = fromDate.Value;
            if (f.Kind == DateTimeKind.Utc && f.TimeOfDay != TimeSpan.Zero)
            {
                fromUtc = f;
            }
            else
            {
                var istDto = new DateTimeOffset(f.Year, f.Month, f.Day, f.Hour, f.Minute, f.Second, IndiaTimezoneOffset);
                fromUtc = istDto.UtcDateTime;
            }
        }

        DateTime? toUtc = null;
        if (toDate.HasValue)
        {
            var t = toDate.Value;
            if (t.Kind == DateTimeKind.Utc && t.TimeOfDay != TimeSpan.Zero)
            {
                toUtc = t;
            }
            else
            {
                int h = t.Hour, m = t.Minute, s = t.Second, ms = t.Millisecond;
                if (h == 0 && m == 0 && s == 0)
                {
                    h = 23; m = 59; s = 59; ms = 999;
                }
                var istDto = new DateTimeOffset(t.Year, t.Month, t.Day, h, m, s, ms, IndiaTimezoneOffset);
                toUtc = istDto.UtcDateTime;
            }
        }

        return (fromUtc, toUtc);
    }
}
