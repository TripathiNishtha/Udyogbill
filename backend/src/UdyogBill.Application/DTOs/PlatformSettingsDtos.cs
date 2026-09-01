using System;

namespace UdyogBill.Application.DTOs;

// --- Company Profile DTOs ---

public record PlatformCompanyProfileDto(
    string LegalCompanyName,
    string ProductBrandName,
    string Tagline,
    string Gstin,
    string Pan,
    string State,
    string StateCode,
    string AddressLine1,
    string AddressLine2,
    string City,
    string Pincode,
    string SupportEmail,
    string SupportPhone,
    string Website,
    string BankName,
    string BankAccountNumber,
    string BankIfsc,
    string BankBranch,
    string? UpiId,
    string? UpiQrImageUrl,
    string? LogoUrl,
    string? SignatoryImageUrl,
    string AuthorizedSignatoryName,
    string AuthorizedSignatoryDesignation,
    string InvoicePrefix,
    string InvoiceTermsAndConditions
);

public record UpdatePlatformCompanyProfileRequest(
    string LegalCompanyName,
    string ProductBrandName,
    string Tagline,
    string Gstin,
    string Pan,
    string State,
    string StateCode,
    string AddressLine1,
    string AddressLine2,
    string City,
    string Pincode,
    string SupportEmail,
    string SupportPhone,
    string Website,
    string BankName,
    string BankAccountNumber,
    string BankIfsc,
    string BankBranch,
    string? UpiId,
    string? UpiQrImageUrl,
    string? LogoUrl,
    string? SignatoryImageUrl,
    string AuthorizedSignatoryName,
    string AuthorizedSignatoryDesignation,
    string InvoicePrefix,
    string InvoiceTermsAndConditions
);

// --- SMTP / Email Settings DTOs ---

public record PlatformEmailConfigDto(
    string SmtpHost,
    int SmtpPort,
    string SmtpUsername,
    string FromEmail,
    string FromName,
    string? ReplyToEmail,
    bool EnableSsl,
    bool IsActive,
    bool HasPassword
);

public record UpdatePlatformEmailConfigRequest(
    string SmtpHost,
    int SmtpPort,
    string SmtpUsername,
    string? SmtpPassword,
    string FromEmail,
    string FromName,
    string? ReplyToEmail,
    bool EnableSsl,
    bool IsActive
);

public record SendTestEmailRequest(
    string RecipientEmail
);

// --- Bulk Broadcast Mailer DTOs ---

public record BroadcastEmailRequest(
    string Subject,
    string BodyHtml,
    string? TargetPlanCode = null,
    string? TargetAddonCode = null
);

public record BroadcastEmailResultDto(
    int TotalTargeted,
    int SuccessfullySent,
    int FailedCount
);

// --- Forgot & Reset Password DTOs ---

public record ForgotPasswordRequest(
    string Email
);

public record ResetPasswordWithOtpRequest(
    string Email,
    string OtpCode,
    string NewPassword
);
