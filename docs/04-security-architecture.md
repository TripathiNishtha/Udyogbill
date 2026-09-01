# 04. Security Architecture Specification

## 1. Authentication Engine

- **Token Protocol**: JSON Web Tokens (JWT) using HMAC-SHA256 / RSA-256 signatures with short lifespan access tokens (15–60 minutes) and persistent, cryptographically secure Refresh Tokens (30 days).
- **Password Security**: Cryptographically salted and stretched hashing algorithm (PBKDF2 with SHA512, 100,000+ iterations or BCrypt/Argon2id). Plaintext passwords are never logged or stored.
- **Refresh Token Lifecycle**:
  - Refresh tokens stored in PostgreSQL with SHA256 hashed value, device metadata, IP address, and expiry.
  - Token reuse detection: If an expired or already revoked refresh token is presented, the entire family of refresh tokens for that user session is invalidated immediately (Replay Attack Protection).
- **Multi-Factor Authentication (MFA)**:
  - Architecture prepared for TOTP (Time-Based One-Time Password) RFC 6238 via authenticator apps (Google Authenticator, Microsoft Authenticator) and backup recovery codes.

---

## 2. Authorization & Permission Model

The platform uses a hybrid **Role-Based Access Control (RBAC)** + **Granular Policy-Based Permission System**:

```
User ───► UserRoles ───► Role ───► RolePermissions ───► Permission
  │                                                          ▲
  └───────────────────► UserPermissions (Overrides) ─────────┘
```

1. **Permission Format**: `[module].[feature].[action]`
   - Examples: `sales.invoice.create`, `sales.invoice.approve`, `inventory.batch.view`, `settings.tax.manage`.
2. **Dynamic Policy Handler**: ASP.NET Core `IAuthorizationHandler` checks user's effective permissions (Role permissions + Direct User permission grants/revocations).
3. **Plan Entitlement Authorization**: Even if a user has permission `inventory.batch.create`, the request is additionally verified against the Tenant's active **Subscription Plan Entitlements** to ensure the feature is included in the tenant's plan.

---

## 3. Defense-in-Depth Measures

1. **Security Headers Middleware**:
   - `Content-Security-Policy`: Restricts unauthorized script execution.
   - `X-Frame-Options: DENY`: Clickjacking protection.
   - `X-Content-Type-Options: nosniff`: MIME-sniffing prevention.
   - `Strict-Transport-Security (HSTS)`: Enforces HTTPS communication.
   - `Referrer-Policy: strict-origin-when-cross-origin`.
2. **Rate Limiting & Brute-Force Protection**:
   - Endpoint-level rate limiting on sensitive routes (`/api/v1/auth/login`, `/api/v1/auth/forgot-password`, `/api/v1/auth/register`).
   - Account lockout after 5 consecutive failed login attempts (with exponential backoff).
3. **Audit Logging**:
   - Security events (login, logout, failed login, role modification, password change) and business operations are captured with IP, User Agent, Correlation ID, and Timestamp into `audit_logs`.
4. **Input Validation**:
   - FluentValidation / DataAnnotations on backend DTOs before reaching domain logic.
   - Zod validation schemas on Next.js frontend forms.
