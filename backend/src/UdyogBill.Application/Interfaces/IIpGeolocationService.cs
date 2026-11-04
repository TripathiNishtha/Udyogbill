using System.Threading;
using System.Threading.Tasks;

namespace UdyogBill.Application.Interfaces;

public class GeoLocationResult
{
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string Country { get; set; } = "IN";
    public string IspName { get; set; } = string.Empty;
}

public interface IIpGeolocationService
{
    Task<GeoLocationResult> ResolveIpAsync(string? ipAddress, CancellationToken cancellationToken = default);
}
