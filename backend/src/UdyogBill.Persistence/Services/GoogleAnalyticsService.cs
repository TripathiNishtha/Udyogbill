using Google.Analytics.Data.V1Beta;
using Google.Apis.Auth.OAuth2;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace UdyogBill.Persistence.Services;

public class AnalyticsRealtimeData
{
    public int ActiveUsers { get; set; }
    public List<ActivePage> TopActivePages { get; set; } = [];
    public List<ActiveCity> TopActiveCities { get; set; } = [];
}

public record ActivePage(string PagePath, int ActiveUsers);
public record ActiveCity(string City, int ActiveUsers);

public class AnalyticsOverviewData
{
    public long TotalUsers { get; set; }
    public long NewUsers { get; set; }
    public long Sessions { get; set; }
    public long PageViews { get; set; }
    public double AvgSessionDurationSeconds { get; set; }
    public double BounceRate { get; set; }
}

public class AnalyticsTrendPoint
{
    public string Date { get; set; } = string.Empty;
    public long Users { get; set; }
    public long Sessions { get; set; }
    public long PageViews { get; set; }
}

public class AnalyticsSourceData
{
    public string Source { get; set; } = string.Empty;
    public string Medium { get; set; } = string.Empty;
    public long Sessions { get; set; }
    public long Users { get; set; }
}

public class AnalyticsPageData
{
    public string PagePath { get; set; } = string.Empty;
    public string PageTitle { get; set; } = string.Empty;
    public long Views { get; set; }
    public double AvgTimeSeconds { get; set; }
}

public class AnalyticsGeoData
{
    public string City { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public long Users { get; set; }
    public long Sessions { get; set; }
}

public class AnalyticsDeviceData
{
    public string DeviceCategory { get; set; } = string.Empty;
    public long Users { get; set; }
}

public class GoogleAnalyticsService
{
    public static async Task<AnalyticsRealtimeData> GetRealtimeDataAsync(
        string propertyId, string serviceAccountJson)
    {
        try
        {
            var credential = GoogleCredential
                .FromJson(serviceAccountJson)
                .CreateScoped("https://www.googleapis.com/auth/analytics.readonly");

            var client = new BetaAnalyticsDataClientBuilder
            {
                GoogleCredential = credential
            }.Build();

            var request = new RunRealtimeReportRequest
            {
                Property = propertyId,
                Dimensions = { new Dimension { Name = "unifiedScreenName" }, new Dimension { Name = "city" } },
                Metrics = { new Metric { Name = "activeUsers" } }
            };

            var response = await client.RunRealtimeReportAsync(request);

            var result = new AnalyticsRealtimeData();
            var pageDict = new Dictionary<string, int>();
            var cityDict = new Dictionary<string, int>();

            foreach (var row in response.Rows)
            {
                var page = row.DimensionValues[0].Value;
                var city = row.DimensionValues[1].Value;
                var users = int.TryParse(row.MetricValues[0].Value, out var u) ? u : 0;

                result.ActiveUsers += users;
                pageDict[page] = pageDict.GetValueOrDefault(page) + users;
                cityDict[city] = cityDict.GetValueOrDefault(city) + users;
            }

            result.TopActivePages = pageDict
                .OrderByDescending(x => x.Value)
                .Take(10)
                .Select(x => new ActivePage(x.Key, x.Value))
                .ToList();

            result.TopActiveCities = cityDict
                .OrderByDescending(x => x.Value)
                .Take(10)
                .Select(x => new ActiveCity(x.Key, x.Value))
                .ToList();

            return result;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GoogleAnalyticsService] Realtime error: {ex.Message}");
            return new AnalyticsRealtimeData();
        }
    }

    public static async Task<AnalyticsOverviewData> GetOverviewAsync(
        string propertyId, string serviceAccountJson,
        string startDate, string endDate)
    {
        try
        {
            var credential = GoogleCredential
                .FromJson(serviceAccountJson)
                .CreateScoped("https://www.googleapis.com/auth/analytics.readonly");

            var client = new BetaAnalyticsDataClientBuilder
            {
                GoogleCredential = credential
            }.Build();

            var request = new RunReportRequest
            {
                Property = propertyId,
                DateRanges = { new DateRange { StartDate = startDate, EndDate = endDate } },
                Metrics =
                {
                    new Metric { Name = "totalUsers" },
                    new Metric { Name = "newUsers" },
                    new Metric { Name = "sessions" },
                    new Metric { Name = "screenPageViews" },
                    new Metric { Name = "averageSessionDuration" },
                    new Metric { Name = "bounceRate" }
                }
            };

            var response = await client.RunReportAsync(request);
            if (response.Rows.Count == 0) return new AnalyticsOverviewData();

            var row = response.Rows[0];
            return new AnalyticsOverviewData
            {
                TotalUsers = long.TryParse(row.MetricValues[0].Value, out var tu) ? tu : 0,
                NewUsers = long.TryParse(row.MetricValues[1].Value, out var nu) ? nu : 0,
                Sessions = long.TryParse(row.MetricValues[2].Value, out var s) ? s : 0,
                PageViews = long.TryParse(row.MetricValues[3].Value, out var pv) ? pv : 0,
                AvgSessionDurationSeconds = double.TryParse(row.MetricValues[4].Value, out var asd) ? asd : 0,
                BounceRate = double.TryParse(row.MetricValues[5].Value, out var br) ? br * 100 : 0
            };
        }
        catch
        {
            return new AnalyticsOverviewData();
        }
    }

    public static async Task<List<AnalyticsTrendPoint>> GetTrendAsync(
        string propertyId, string serviceAccountJson,
        string startDate, string endDate)
    {
        try
        {
            var credential = GoogleCredential
                .FromJson(serviceAccountJson)
                .CreateScoped("https://www.googleapis.com/auth/analytics.readonly");

            var client = new BetaAnalyticsDataClientBuilder
            {
                GoogleCredential = credential
            }.Build();

            var request = new RunReportRequest
            {
                Property = propertyId,
                DateRanges = { new DateRange { StartDate = startDate, EndDate = endDate } },
                Dimensions = { new Dimension { Name = "date" } },
                Metrics =
                {
                    new Metric { Name = "totalUsers" },
                    new Metric { Name = "sessions" },
                    new Metric { Name = "screenPageViews" }
                },
                OrderBys = { new OrderBy { Dimension = new OrderBy.Types.DimensionOrderBy { DimensionName = "date" } } }
            };

            var response = await client.RunReportAsync(request);

            return response.Rows.Select(row => new AnalyticsTrendPoint
            {
                Date = row.DimensionValues[0].Value,
                Users = long.TryParse(row.MetricValues[0].Value, out var u) ? u : 0,
                Sessions = long.TryParse(row.MetricValues[1].Value, out var s) ? s : 0,
                PageViews = long.TryParse(row.MetricValues[2].Value, out var pv) ? pv : 0
            }).ToList();
        }
        catch
        {
            return [];
        }
    }

    public static async Task<List<AnalyticsSourceData>> GetSourcesAsync(
        string propertyId, string serviceAccountJson,
        string startDate, string endDate)
    {
        try
        {
            var credential = GoogleCredential
                .FromJson(serviceAccountJson)
                .CreateScoped("https://www.googleapis.com/auth/analytics.readonly");

            var client = new BetaAnalyticsDataClientBuilder
            {
                GoogleCredential = credential
            }.Build();

            var request = new RunReportRequest
            {
                Property = propertyId,
                DateRanges = { new DateRange { StartDate = startDate, EndDate = endDate } },
                Dimensions = { new Dimension { Name = "sessionDefaultChannelGroup" } },
                Metrics =
                {
                    new Metric { Name = "sessions" },
                    new Metric { Name = "totalUsers" }
                },
                OrderBys = { new OrderBy { Metric = new OrderBy.Types.MetricOrderBy { MetricName = "sessions" }, Desc = true } }
            };

            var response = await client.RunReportAsync(request);

            return response.Rows.Select(row => new AnalyticsSourceData
            {
                Source = row.DimensionValues[0].Value,
                Medium = "",
                Sessions = long.TryParse(row.MetricValues[0].Value, out var s) ? s : 0,
                Users = long.TryParse(row.MetricValues[1].Value, out var u) ? u : 0
            }).ToList();
        }
        catch
        {
            return [];
        }
    }

    public static async Task<List<AnalyticsPageData>> GetPagesAsync(
        string propertyId, string serviceAccountJson,
        string startDate, string endDate)
    {
        try
        {
            var credential = GoogleCredential
                .FromJson(serviceAccountJson)
                .CreateScoped("https://www.googleapis.com/auth/analytics.readonly");

            var client = new BetaAnalyticsDataClientBuilder
            {
                GoogleCredential = credential
            }.Build();

            var request = new RunReportRequest
            {
                Property = propertyId,
                DateRanges = { new DateRange { StartDate = startDate, EndDate = endDate } },
                Dimensions = { new Dimension { Name = "pagePath" }, new Dimension { Name = "pageTitle" } },
                Metrics =
                {
                    new Metric { Name = "screenPageViews" },
                    new Metric { Name = "averageSessionDuration" }
                },
                OrderBys = { new OrderBy { Metric = new OrderBy.Types.MetricOrderBy { MetricName = "screenPageViews" }, Desc = true } },
                Limit = 20
            };

            var response = await client.RunReportAsync(request);

            return response.Rows.Select(row => new AnalyticsPageData
            {
                PagePath = row.DimensionValues[0].Value,
                PageTitle = row.DimensionValues[1].Value,
                Views = long.TryParse(row.MetricValues[0].Value, out var v) ? v : 0,
                AvgTimeSeconds = double.TryParse(row.MetricValues[1].Value, out var t) ? t : 0
            }).ToList();
        }
        catch
        {
            return [];
        }
    }

    public static async Task<List<AnalyticsGeoData>> GetGeoAsync(
        string propertyId, string serviceAccountJson,
        string startDate, string endDate)
    {
        try
        {
            var credential = GoogleCredential
                .FromJson(serviceAccountJson)
                .CreateScoped("https://www.googleapis.com/auth/analytics.readonly");

            var client = new BetaAnalyticsDataClientBuilder
            {
                GoogleCredential = credential
            }.Build();

            var request = new RunReportRequest
            {
                Property = propertyId,
                DateRanges = { new DateRange { StartDate = startDate, EndDate = endDate } },
                Dimensions = { new Dimension { Name = "city" }, new Dimension { Name = "region" } },
                Metrics =
                {
                    new Metric { Name = "totalUsers" },
                    new Metric { Name = "sessions" }
                },
                OrderBys = { new OrderBy { Metric = new OrderBy.Types.MetricOrderBy { MetricName = "totalUsers" }, Desc = true } },
                Limit = 30
            };

            var response = await client.RunReportAsync(request);

            return response.Rows.Select(row => new AnalyticsGeoData
            {
                City = row.DimensionValues[0].Value,
                Region = row.DimensionValues[1].Value,
                Country = "India",
                Users = long.TryParse(row.MetricValues[0].Value, out var u) ? u : 0,
                Sessions = long.TryParse(row.MetricValues[1].Value, out var s) ? s : 0
            }).ToList();
        }
        catch
        {
            return [];
        }
    }

    public static async Task<List<AnalyticsDeviceData>> GetDevicesAsync(
        string propertyId, string serviceAccountJson,
        string startDate, string endDate)
    {
        try
        {
            var credential = GoogleCredential
                .FromJson(serviceAccountJson)
                .CreateScoped("https://www.googleapis.com/auth/analytics.readonly");

            var client = new BetaAnalyticsDataClientBuilder
            {
                GoogleCredential = credential
            }.Build();

            var request = new RunReportRequest
            {
                Property = propertyId,
                DateRanges = { new DateRange { StartDate = startDate, EndDate = endDate } },
                Dimensions = { new Dimension { Name = "deviceCategory" } },
                Metrics = { new Metric { Name = "totalUsers" } },
                OrderBys = { new OrderBy { Metric = new OrderBy.Types.MetricOrderBy { MetricName = "totalUsers" }, Desc = true } }
            };

            var response = await client.RunReportAsync(request);

            return response.Rows.Select(row => new AnalyticsDeviceData
            {
                DeviceCategory = row.DimensionValues[0].Value,
                Users = long.TryParse(row.MetricValues[0].Value, out var u) ? u : 0
            }).ToList();
        }
        catch
        {
            return [];
        }
    }

    /// <summary>Returns date strings for GA4 API based on range key</summary>
    public static (string startDate, string endDate) GetDateRange(string range)
    {
        var today = DateTime.UtcNow.Date;
        return range switch
        {
            "today" => ("today", "today"),
            "yesterday" => ("yesterday", "yesterday"),
            "7d" => ("7daysAgo", "today"),
            "30d" => ("30daysAgo", "today"),
            "90d" => ("90daysAgo", "today"),
            _ => ("30daysAgo", "today")
        };
    }
}
