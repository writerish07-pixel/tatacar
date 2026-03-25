# Auth Service

Handles all authentication and authorisation for SmartDeal CRM.

## Responsibilities
- User registration and login (email/password or WhatsApp OTP)
- JWT access token (15-min TTL) and refresh token (7-day TTL) issuance
- Token rotation and revocation (Redis-backed)
- RBAC enforcement with 8 roles
- Multi-branch access scoping
- OTP generation and verification via WhatsApp Business API
- Audit logging of all authentication events
- JWKS endpoint for token verification by other services

## Port: 3001

## Tech: NestJS + Passport.js + bcrypt + Redis

## Key Endpoints
- `POST /auth/login` — Login with phone+OTP or email+password
- `POST /auth/otp/send` — Send OTP to phone via WhatsApp
- `POST /auth/refresh` — Refresh access token
- `POST /auth/logout` — Revoke refresh token
- `GET  /auth/me` — Current user profile
- `GET  /auth/.well-known/jwks.json` — Public key for JWT verification

## Security
See [SECURITY.md](../../../docs/SECURITY.md) for JWT strategy, token rotation, and key management.

## Development
```bash
cd src/services/auth-service
npm install
npm run dev
```
