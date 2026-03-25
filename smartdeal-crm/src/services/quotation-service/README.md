# Quotation Service

Extends the existing `akar-quotation-server` (`index.js`) into a full enterprise quotation engine for Tata Motors dealership.

## Responsibilities
- Vehicle quotation creation with full itemised breakdown
- Ex-showroom pricing from PostgreSQL (migrated from Google Sheets)
- GST computation: CGST+SGST (intra-state) / IGST (inter-state) based on RTO state
- Compensation cess calculation
- TCS computation (1% for vehicles above ₹10 Lakh, Section 206C)
- State-wise RTO charge lookup
- Accessories total with 28% GST
- EMI calculation (flat rate and reducing balance)
- Discount approval workflow (Level 1/2/3 thresholds)
- Quotation PDF generation (Puppeteer — branded Akar Motors template)
- WhatsApp PDF sharing via notification-service
- Quotation versioning and revision history

## Port: 3003

## Tech: NestJS + PostgreSQL + Puppeteer (PDF) + Redis (real-time pricing cache)

## Legacy Integration
During Phase 1 (migration), this service proxies pricing data requests to the existing `index.js` on port 3000. See [ARCHITECTURE.md](../../../docs/ARCHITECTURE.md#legacy-system-integration) for the migration phases.

## Key Tables
`quotations`, `quotation_accessories`

## Sample Code
See [`samples/quotation-engine.js`](../../../samples/quotation-engine.js) for the quotation calculation logic including GST, RTO, TCS, and accessories.

## Development
```bash
cd src/services/quotation-service
npm install
npm run dev
```
