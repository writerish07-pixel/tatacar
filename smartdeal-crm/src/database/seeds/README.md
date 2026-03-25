# Database Seeds

Reference data seed scripts for SmartDeal CRM. Seeds must be applied after migrations.

## Seed Files

| File | Description |
|------|-------------|
| `01_gst_state_codes.sql` | All 29 Indian states + 8 Union Territories with GST state codes |
| `02_rto_charges.sql` | RTO road tax rates for all states (as of FY 2024-25) |
| `03_vehicle_models.sql` | All active Tata Motors PV models (Nexon, Harrier, Punch, Tiago, Thar, Safari, Curvv, Altroz) |
| `04_vehicle_variants.sql` | All variants, fuel types, transmissions, pricing for current MY |
| `05_vehicle_colours.sql` | All available colour options per variant with colour surcharge |
| `06_accessories.sql` | Tata Motors genuine accessories catalogue with pricing and GST |
| `07_banks.sql` | Bank partners (HDFC, SBI, Tata Capital, Kotak, Axis) |
| `08_insurance_providers.sql` | Insurance partners (Tata AIG, Bajaj Allianz, ICICI Lombard, New India) |
| `09_insurance_addons.sql` | Standard motor insurance add-on definitions |
| `10_pdi_templates.sql` | PDI checklist templates (25-item standard, model-specific variants) |
| `11_admin_user.sql` | Initial admin user (password must be changed on first login) |
| `12_dealership_branch.sql` | Akar Motors dealership and branch master data |

## Running Seeds

```bash
# Run all seeds in order
npm run db:seed

# Run specific seed
npm run db:seed:vehicles
npm run db:seed:states
npm run db:seed:admin-user
```

## Notes
- Seeds are idempotent (safe to run multiple times — use `INSERT ... ON CONFLICT DO NOTHING`)
- Vehicle pricing seeds need to be updated when Tata Motors revises prices
- RTO charges need to be updated when state governments revise motor vehicle taxes
- Create a scheduled job or admin panel feature to keep pricing data current

## Google Sheets Migration Seeds
For migrating existing stock and scheme data from `akar-quotation-server` Google Sheets:
```bash
node src/database/migrations/google-sheets-migrator.js --execute
```
See [INTEGRATIONS.md](../../../docs/INTEGRATIONS.md#6-google-sheets-migration-path) for details.
