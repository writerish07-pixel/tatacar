# Delivery Service

Manages vehicle delivery scheduling, bay management, digital handover, and confirmation for SmartDeal CRM.

## Responsibilities
- Delivery slot calendar management with bay allocation
- Customer confirmation workflow (WhatsApp/portal)
- Digital delivery checklist (accessories, documents, demo verification)
- Customer digital signature capture (via signature pad or touch screen)
- Sales consultant countersignature
- Delivery photo upload (front, rear, key handover, family photos) to AWS S3
- Delivery confirmation document generation
- Automated WhatsApp reminders (24h and 1h before delivery)
- Delivery status tracking for customer portal
- Post-delivery event trigger (activates post-sale CRM)

## Port: 3010

## Tech: NestJS + PostgreSQL + AWS S3 (signatures + photos) + Redis (event pub/sub)

## Pre-conditions for Delivery
1. PDI must be completed (pdi.completed event received)
2. Insurance policy issued
3. Invoice generated (proforma or final)
4. Booking confirmed with payment

## Key Tables
`delivery_schedules`, `delivery_checklists`, `delivery_confirmations`, `delivery_photos`

## Key Events Consumed (Redis)
- `pdi.completed` → unlock delivery scheduling for vehicle

## Key Events Published (Redis)
- `delivery.scheduled` → notification-service (send WhatsApp to customer)
- `delivery.completed` → analytics-service, notification-service (CSI survey trigger)

## Sample Code
See [`samples/delivery-workflow.js`](../../../samples/delivery-workflow.js) for scheduling and confirmation logic.

## Development
```bash
cd src/services/delivery-service
npm install
npm run dev
```
