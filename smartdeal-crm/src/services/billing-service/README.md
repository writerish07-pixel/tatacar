# Billing Service

Handles GST-compliant invoicing, payment reconciliation, and e-Invoice generation for Tata Motors dealership.

## Responsibilities
- Proforma invoice generation (before final delivery)
- Final GST Tax Invoice generation with correct tax breakup:
  - CGST + SGST for intra-state (customer's registration state = dealership state)
  - IGST for inter-state transactions
  - Compensation cess where applicable
  - TCS (1% under Section 206C for vehicles > ₹10 Lakh)
- HSN code mapping: 8703 for vehicles, category-specific codes for accessories
- e-Invoice generation via GSTIN IRP (Invoice Reference Number + QR code)
- TCS certificate (Form 27D) generation
- Payment recording and reconciliation (booking advance, loan disbursement, balance)
- Invoice PDF generation (Puppeteer, GST-compliant format with IRN QR)
- Credit note / debit note for adjustments
- Financial reports for accounts team

## Port: 3007

## Tech: NestJS + PostgreSQL + GST Portal API + Puppeteer (PDF)

## Invoice Numbering
Format: `INV/YYYY-YY/NNNNN` (Indian fiscal year, e.g., `INV/2024-25/00089`)

## Key Tables
`invoices`, `invoice_payments`

## Fiscal Year Logic
Indian fiscal year runs April to March. Invoices are numbered within each FY.

## Development
```bash
cd src/services/billing-service
npm install
npm run dev
```
