using System.Threading;
using System.Threading.Tasks;
using UdyogBill.Application.DTOs;

namespace UdyogBill.Application.Interfaces;

public interface IPlatformEmailService
{
    Task<bool> SendEmailAsync(string toEmail, string toName, string subject, string htmlBody, CancellationToken cancellationToken = default);
    Task<bool> SendTestEmailAsync(string recipientEmail, CancellationToken cancellationToken = default);
    Task<bool> SendPasswordResetOtpAsync(string toEmail, string userName, string otpCode, CancellationToken cancellationToken = default);
    Task<bool> SendWelcomeEmailAsync(string toEmail, string businessName, string adminName, string tenantCode, CancellationToken cancellationToken = default);
    Task<bool> SendSubscriptionInvoiceEmailAsync(string toEmail, string businessName, SubscriptionInvoiceDto invoice, CancellationToken cancellationToken = default);
}
