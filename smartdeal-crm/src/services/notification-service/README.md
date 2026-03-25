# Notification Service

Centralised notification dispatcher for SmartDeal CRM. Handles all outbound communications via WhatsApp, email, and SMS.

## Responsibilities
- WhatsApp Business API (Meta Cloud API) message dispatch
- Pre-approved template message sending with variable substitution
- Email notifications via AWS SES (for staff and customers)
- SMS fallback via MSG91/Twilio (when WhatsApp unavailable)
- In-app push notification preparation
- Inbound WhatsApp message webhook processing (customer replies → lead activity log)
- Notification template management (centralised)
- Message delivery tracking and retry logic (exponential backoff)
- Unsubscribe / STOP handling (WhatsApp opt-out)
- Notification history logging

## Port: 3011

## Tech: NestJS + Redis (subscriber for events) + WhatsApp Cloud API + AWS SES

## Event Subscriptions (Redis pub/sub)
This service subscribes to events from all other services:

| Event | Action |
|-------|--------|
| `lead.created` | WhatsApp to assigned consultant |
| `lead.assigned` | WhatsApp welcome to customer |
| `quotation.shared` | WhatsApp PDF to customer |
| `booking.confirmed` | WhatsApp confirmation to customer |
| `booking.documents_uploaded` | WhatsApp alert to consultant/manager |
| `finance.approved` | WhatsApp to customer |
| `pdi.completed` | WhatsApp to delivery manager |
| `delivery.scheduled` | WhatsApp confirmation to customer |
| `delivery.completed` | WhatsApp thank you + CSI survey link |
| `service.reminder_due` | WhatsApp/SMS to customer |

## WhatsApp Templates
See [INTEGRATIONS.md](../../../docs/INTEGRATIONS.md#1-whatsapp-business-api) for all 8 approved templates.

## Development
```bash
cd src/services/notification-service
npm install
npm run dev
```
