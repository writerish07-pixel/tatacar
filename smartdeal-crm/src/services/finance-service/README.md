# Finance Service

Manages vehicle loan applications and multi-bank finance comparison for Tata Motors dealership customers.

## Responsibilities
- Multi-bank loan product catalogue (HDFC, SBI, Tata Capital, Kotak, Axis Bank)
- Real-time EMI calculator (flat rate and reducing balance methods)
- Multi-bank quote comparison based on customer profile and loan amount
- Subvention scheme management (OEM-subsidised interest rates)
- Loan application submission via bank REST APIs
- Loan document upload (salary slips, bank statements, ITR, Form 16)
- Loan status tracking and webhook processing from banks
- Finance penetration reporting
- Income and eligibility validation

## Port: 3005

## Tech: NestJS + PostgreSQL + Bank REST APIs (HDFC, SBI, Tata Capital, Kotak, Axis)

## Key Tables
`banks`, `loan_products`, `loan_applications`, `loan_documents`

## Loan Status Flow
```
draft → applied → under_review → approved → sanctioned → disbursed
```
Rejection: `under_review → rejected`

## Bank Integrations
See [INTEGRATIONS.md](../../../docs/INTEGRATIONS.md#4-bank-apis-loan-processing) for API details.

## Development
```bash
cd src/services/finance-service
npm install
npm run dev
```
