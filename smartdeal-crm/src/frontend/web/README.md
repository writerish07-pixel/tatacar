# SmartDeal Web Portal (Frontend)

React/Next.js web application for sales consultants, sales managers, finance managers, accounts, and administrators.

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **UI Components:** Tailwind CSS + shadcn/ui
- **State Management:** Zustand + React Query (TanStack)
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts (dashboard analytics)
- **PDF Viewer:** react-pdf
- **Signature Pad:** react-signature-canvas
- **WhatsApp Share:** Native Web Share API

## Pages & Modules
| Route | Module | Roles |
|-------|--------|-------|
| `/dashboard` | Sales Dashboard | Sales Consultant, Manager |
| `/leads` | Lead Management | All sales roles |
| `/leads/new` | Lead Capture | Sales Consultant |
| `/leads/:id` | Lead Detail + Timeline | All sales roles |
| `/quotations/new` | Quotation Builder | Sales Consultant |
| `/test-drives` | Test Drive Calendar | Sales Consultant, Manager |
| `/exchange` | Exchange Evaluation | Sales Consultant |
| `/bookings` | Booking Management | All roles |
| `/finance` | Finance Comparison | Finance Manager |
| `/insurance` | Insurance Selection | Sales Consultant |
| `/billing` | Invoice Management | Accounts |
| `/stock` | Stock Dashboard | Manager, Admin |
| `/pdi` | PDI Management | Manager |
| `/delivery` | Delivery Calendar | Delivery Manager |
| `/analytics` | Analytics Dashboard | Manager, Admin |
| `/admin` | Admin Config Panel | Admin |

## Wireframes
See [UI_WIREFRAMES.md](../../../docs/UI_WIREFRAMES.md) for ASCII wireframes of all screens.

## Development
```bash
cd src/frontend/web
npm install
npm run dev
# Opens at http://localhost:4000
```
