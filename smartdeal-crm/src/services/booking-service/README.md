# Booking Service

Manages vehicle bookings from confirmation through to vehicle allocation for SmartDeal CRM.

## Responsibilities
- Booking form processing with KYC document upload (PAN, Aadhaar, address proof)
- PAN validation via NSDL API (real-time)
- Aadhaar verification via UIDAI (OTP-based)
- Booking amount payment integration with Razorpay/PayU
- UPI QR code generation for in-showroom payments
- Document storage in AWS S3 with SSE-S3 encryption
- KYC document verification workflow (accounts/manager)
- Vehicle VIN allocation to confirmed bookings
- Booking cancellation with refund initiation
- Booking status state machine management
- Customer portal tracking link generation

## Port: 3004

## Tech: NestJS + PostgreSQL + AWS S3 + Razorpay SDK

## Booking Status Flow
```
draft → pending_documents → documents_submitted → documents_verified
      → payment_pending → payment_done → confirmed → vehicle_allocated
```
Cancellation: any state → `cancelled → refund_initiated → refunded`

## Key Tables
`bookings`, `booking_documents`

## Key Events Published (Redis)
- `booking.confirmed` → stock-service (VIN lock) + notification-service
- `booking.documents_uploaded` → notification-service (team alert)
- `payment.received` → billing-service (reconciliation)

## Security
PAN numbers encrypted with AES-256-GCM before DB storage. Aadhaar: only last 4 digits stored.

## Development
```bash
cd src/services/booking-service
npm install
npm run dev
```
