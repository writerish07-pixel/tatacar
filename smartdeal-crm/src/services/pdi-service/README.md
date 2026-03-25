# PDI Service

Pre-Delivery Inspection service for SmartDeal CRM. Powers the tablet-based technician workflow for vehicle quality verification before customer handover.

## Responsibilities
- Configurable PDI checklist templates by vehicle model/variant
- Tablet-optimised API for technician workflow
- Checklist item management with Pass/Fail/Rework/NA statuses
- Photo evidence upload (mandatory for Fail and Rework items) via AWS S3
- Rework workflow: flagged items trigger supervisor notification
- PDI completion certificate generation (Puppeteer PDF)
- PDI completion event triggers delivery service to unlock delivery scheduling
- PDI history and reports for quality tracking

## Port: 3009

## Tech: NestJS + PostgreSQL + AWS S3 (photo storage)

## PDI Checklist Sections
1. **Exterior** — Body alignment, paint, glass, tyres, lights (8 items)
2. **Interior** — Seats, dashboard, AC, all switches, infotainment (6 items)
3. **Mechanical** — Engine, fluids, brakes, steering, suspension (5 items)
4. **Electrical** — ADAS sensors, connected car, all electrics (4 items)
5. **Documentation** — RC (transit), insurance in system, warranty card (2 items)

## Key Tables
`pdi_checklists`, `pdi_checklist_templates`, `pdi_template_items`, `pdi_items`, `pdi_photos`

## Key Events Published (Redis)
- `pdi.completed` → delivery-service (unlock delivery scheduling)
- `pdi.failed` → notification-service (alert service manager)

## Sample Code
See [`samples/pdi-checklist.js`](../../../samples/pdi-checklist.js) for the PDI API with photo upload.

## Development
```bash
cd src/services/pdi-service
npm install
npm run dev
```
