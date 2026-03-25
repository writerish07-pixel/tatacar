# Lead Service

Manages the complete lead lifecycle from creation to win/loss for SmartDeal CRM.

## Responsibilities
- Lead creation from QR scan, walk-in, phone, web, referral, and digital campaigns
- Auto-assignment to sales consultants (round-robin or load-based algorithm)
- Lead status lifecycle management: `new → contacted → interested → demo_scheduled → demo_done → negotiation → won/lost`
- Requirement discovery data capture (family size, usage, budget, preferences)
- Follow-up scheduling and tracking
- Lead activity logging (calls, visits, WhatsApp interactions)
- Lead source analytics and attribution
- Emits Redis pub/sub events on lead creation and assignment

## Port: 3002

## Tech: NestJS + PostgreSQL + Redis (pub/sub for assignment events)

## Key Tables
`leads`, `requirement_discovery`, `lead_activities`, `follow_up_schedules`

## Key Events Published (Redis)
- `lead.created` → notification-service sends WhatsApp to consultant
- `lead.assigned` → notification-service sends welcome WhatsApp to customer

## Development
```bash
cd src/services/lead-service
npm install
npm run dev
```

## Sample Code
See [`samples/lead-capture-api.js`](../../../samples/lead-capture-api.js) for a reference implementation of the lead capture API with QR scan, auto-assignment, and WhatsApp notification.
