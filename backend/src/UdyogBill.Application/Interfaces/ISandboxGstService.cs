using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface ISandboxGstService
{
    Task<Result<GstLookupResponseDto>> LookupGstinAsync(string gstin, CancellationToken cancellationToken = default);
    Task<Result<GstLookupResponseDto>> TestConnectionAsync(TestSandboxGstRequest request, CancellationToken cancellationToken = default);
}
