# Insurance Service

Manages motor vehicle insurance quotes, comparison, and policy issuance for SmartDeal CRM. Fully IRDAI-compliant.

## Responsibilities
- Multi-insurer comprehensive motor insurance quote comparison
- Supported insurers: Tata AIG, Bajaj Allianz, ICICI Lombard, New India Assurance
- IDV (Insured Declared Value) calculation from vehicle ex-showroom price
- Policy type options: Comprehensive / Own Damage Only / Third Party Only
- Add-on management: Zero Dep, RSA, Engine Protect, Consumables, Tyre Protect, Return to Invoice
- NCB (No Claim Bonus) discount application (0%, 20%, 25%, 35%, 45%, 50%)
- 18% GST calculation on insurance premiums
- Policy issuance via insurer REST APIs
- Policy document storage in AWS S3
- Policy document sharing via WhatsApp

## Port: 3006

## Tech: NestJS + PostgreSQL + Insurer REST APIs

## Key Tables
`insurance_providers`, `insurance_addons`, `insurance_quotes`

## IRDAI Compliance
- All quotes and policies comply with IRDAI Motor Vehicle Insurance guidelines
- Add-on definitions follow IRDAI approved add-on constructs
- Third-party premium rates as mandated by IRDAI (fixed, not negotiable)

## Development
```bash
cd src/services/insurance-service
npm install
npm run dev
```
