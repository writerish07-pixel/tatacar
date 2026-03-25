# Database Migrations

PostgreSQL database migration scripts for SmartDeal CRM. Uses sequential numbered SQL files applied in order.

## Migration Tool
**Tool:** `node-pg-migrate` or custom migration runner
**Command:** `npm run db:migrate:up` / `npm run db:migrate:down`

## Migration File Naming Convention
```
NNN_description.sql
```
Example: `001_create_extensions.sql`, `002_create_dealerships.sql`

## Migration Order

| # | File | Description |
|---|------|-------------|
| 001 | create_extensions.sql | Enable uuid-ossp, pgcrypto, pg_trgm |
| 002 | create_dealerships_branches.sql | Dealership and branch tables |
| 003 | create_users_auth.sql | Users, sessions, audit_logs |
| 004 | create_leads.sql | Leads, requirement_discovery, activities |
| 005 | create_vehicles.sql | Models, variants, colours, vehicles, accessories |
| 006 | create_quotations.sql | Quotations, quotation_accessories |
| 007 | create_test_drives.sql | Driving_licenses, test_drive_schedules |
| 008 | create_exchange.sql | Exchange_evaluations, exchange_photos |
| 009 | create_bookings.sql | Bookings, booking_documents |
| 010 | create_finance.sql | Banks, loan_products, loan_applications, loan_documents |
| 011 | create_insurance.sql | Insurance_providers, addons, quotes |
| 012 | create_billing.sql | Invoices, invoice_payments |
| 013 | create_pdi.sql | PDI templates, checklists, items, photos |
| 014 | create_rto.sql | RTO applications |
| 015 | create_delivery.sql | Delivery schedules, checklists, confirmations, photos |
| 016 | create_post_sale.sql | Follow_ups, service_reminders, customer_feedback |
| 017 | create_reference_data.sql | GST state codes, RTO charges |
| 018 | create_indexes.sql | All performance indexes |
| 019 | create_triggers.sql | updated_at triggers, audit rules |

## Running Migrations

```bash
# Apply all pending migrations
npm run db:migrate:up

# Roll back last migration
npm run db:migrate:down --count=1

# View migration status
npm run db:migrate:status

# Create new migration
npm run db:migrate:create -- --name=add_consent_logs
```

## Schema Reference
See [DATABASE_SCHEMA.md](../../../docs/DATABASE_SCHEMA.md) for the complete table definitions.
