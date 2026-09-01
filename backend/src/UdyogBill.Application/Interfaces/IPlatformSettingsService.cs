using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;
using UdyogBill.Shared;

namespace UdyogBill.Application.Interfaces;

public interface IPlatformSettingsService
{
    // SuperAdmin Company Profile
    Task<Result<PlatformCompanyProfileDto>> GetCompanyProfileAsync(CancellationToken cancellationToken = default);
    Task<Result> UpdateCompanyProfileAsync(UpdatePlatformCompanyProfileRequest request, CancellationToken cancellationToken = default);

    // SuperAdmin Email Configuration
    Task<Result<PlatformEmailConfigDto>> GetEmailConfigAsync(CancellationToken cancellationToken = default);
    Task<Result> UpdateEmailConfigAsync(UpdatePlatformEmailConfigRequest request, CancellationToken cancellationToken = default);
    Task<Result> SendTestEmailAsync(SendTestEmailRequest request, CancellationToken cancellationToken = default);

    // Bulk Broadcast Mailer
    Task<Result<BroadcastEmailResultDto>> BroadcastEmailAsync(BroadcastEmailRequest request, CancellationToken cancellationToken = default);

    // Password Reset via OTP
    Task<Result> SendForgotPasswordOtpAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default);
    Task<Result> ResetPasswordWithOtpAsync(ResetPasswordWithOtpRequest request, CancellationToken cancellationToken = default);
}
