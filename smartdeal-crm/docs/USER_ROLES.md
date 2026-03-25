# SmartDeal CRM – User Roles & Permissions

## Role Definitions

### 1. Admin
Full system access. Responsible for system configuration, user management, branch setup, pricing configuration, and integration management. Typically the dealership owner or IT head.

### 2. Sales Consultant
Front-line sales staff who interact directly with customers. Can manage their own leads, create quotations, schedule test drives, and initiate bookings. Cannot approve discounts above their limit.

### 3. Sales Manager
Manages the sales team. Has access to all leads and consultants' data within their branch. Approves discounts above consultant threshold. Views team performance dashboards.

### 4. Finance Manager
Specialises in vehicle finance processing. Manages loan applications, bank communications, and subvention schemes. Can view booking and customer financial data.

### 5. Accounts
Handles billing, invoicing, payment reconciliation, and GST compliance. Issues final invoices, records payments, and generates financial reports.

### 6. PDI Technician
Pre-Delivery Inspection technician with tablet access to PDI checklists. Can update checklist items, upload photos, and mark vehicles as PDI passed/failed/rework.

### 7. Delivery Manager
Manages vehicle delivery scheduling, bay allocation, and the handover process. Oversees delivery checklists and can capture digital signatures.

### 8. Customer
Self-service portal access only. Can track their own booking status, view and download documents, and submit feedback. Cannot access any CRM data.

---

## Permissions Matrix

Legend: **C** = Create | **R** = Read | **U** = Update | **D** = Delete | **—** = No Access | **Own** = Own records only | **Branch** = Branch records | **All** = All branches

| Resource | Admin | Sales Consultant | Sales Manager | Finance Manager | Accounts | PDI Technician | Delivery Manager | Customer |
|----------|-------|-----------------|---------------|-----------------|----------|----------------|-----------------|---------|
| **USERS & AUTH** | | | | | | | | |
| User Accounts | CRUD | R(Own) | R(Branch) | R(Own) | R(Own) | R(Own) | R(Own) | R(Own) |
| Role Assignment | CRUD | — | — | — | — | — | — | — |
| Branch Config | CRUD | — | R | — | — | — | — | — |
| Audit Logs | R | — | R(Branch) | — | R(Branch) | — | — | — |
| **LEADS** | | | | | | | | |
| Lead Create | CRUD | C, R(Own) | CRUD | R | R | — | R | — |
| Lead View All | R(All) | R(Own) | R(Branch) | R(Branch) | R(Branch) | — | R(Branch) | — |
| Lead Assign | CRUD | — | CRUD | — | — | — | — | — |
| Lead Activities | CRUD | CRUD(Own) | CRUD | R | R | — | R | — |
| Follow-up Schedules | CRUD | CRUD(Own) | CRUD(Branch) | R | R | — | — | — |
| **REQUIREMENT DISCOVERY** | | | | | | | | |
| Requirement Data | CRUD | CRUD(Own) | R(Branch) | R | — | — | — | — |
| **VEHICLES & STOCK** | | | | | | | | |
| Vehicle Add/Edit | CRUD | R | R | R | R | R | R | — |
| Vehicle Status Update | CRUD | R | R(Branch) | R | R | U(PDI) | U(Delivery) | — |
| Stock Reports | R(All) | R(Branch) | R(Branch) | R(Branch) | R(All) | — | R(Branch) | — |
| Vehicle Models/Variants | CRUD | R | R | R | R | R | R | — |
| Accessories Catalogue | CRUD | R | R | R | R | — | — | — |
| **QUOTATIONS** | | | | | | | | |
| Create Quotation | CRUD | C, R(Own) | CRUD(Branch) | R | R | — | — | R(Own) |
| View All Quotations | R(All) | R(Own) | R(Branch) | R(Branch) | R(All) | — | — | R(Own) |
| Apply Discount (Level 1: ≤₹5k) | — | U | U | — | — | — | — | — |
| Approve Discount (Level 2: ≤₹20k) | U | — | U | — | — | — | — | — |
| Approve Discount (Level 3: ≤₹50k) | U | — | — | — | — | — | — | — |
| Share Quotation (WhatsApp/PDF) | CRUD | CRUD(Own) | CRUD(Branch) | — | — | — | — | R(Own) |
| **TEST DRIVES** | | | | | | | | |
| Schedule Test Drive | CRUD | CRUD(Own) | CRUD(Branch) | — | — | — | — | — |
| Start/Complete Test Drive | CRUD | U(Own) | CRUD(Branch) | — | — | — | — | — |
| Test Drive Reports | R(All) | R(Own) | R(Branch) | — | — | — | — | — |
| **EXCHANGE EVALUATION** | | | | | | | | |
| Create Evaluation | CRUD | C, R(Own) | CRUD(Branch) | R | — | — | — | — |
| Upload Photos | CRUD | CRUD(Own) | CRUD | — | — | — | — | — |
| Set Valuation | CRUD | — | U(Branch) | — | — | — | — | — |
| Accept/Reject Offer | CRUD | U | U | — | — | — | — | — |
| **BOOKINGS** | | | | | | | | |
| Create Booking | CRUD | C, R(Own) | CRUD(Branch) | R | R | — | R | — |
| View All Bookings | R(All) | R(Own) | R(Branch) | R(Branch) | R(All) | R | R(Branch) | R(Own) |
| Upload KYC Documents | CRUD | CRUD(Own) | CRUD | R | R | — | — | CRUD(Own) |
| Verify KYC Documents | CRUD | — | U | U | U | — | — | — |
| Allocate Vehicle (VIN) | CRUD | — | U | — | — | — | — | — |
| Cancel Booking | CRUD | — | U(Branch) | — | — | — | — | — |
| **FINANCE** | | | | | | | | |
| View Finance Products | R | R | R | R | R | — | — | R(Own) |
| Create Loan Application | CRUD | C, R(Own) | CRUD(Branch) | CRUD(Branch) | R | — | — | — |
| View All Loan Applications | R(All) | R(Own) | R(Branch) | R(Branch) | R(All) | — | — | R(Own) |
| Upload Loan Documents | CRUD | CRUD(Own) | CRUD | CRUD | R | — | — | — |
| Bank API Submission | CRUD | — | — | U | — | — | — | — |
| Loan Status Updates | CRUD | R(Own) | R(Branch) | CRUD(Branch) | R | — | — | R(Own) |
| **INSURANCE** | | | | | | | | |
| View Insurance Quotes | R | R | R | R | R | — | — | R(Own) |
| Select Insurance Policy | CRUD | U(Own) | CRUD(Branch) | CRUD | — | — | — | — |
| Issue Policy | CRUD | — | U | U | U | — | — | — |
| **BILLING** | | | | | | | | |
| Generate Proforma Invoice | CRUD | — | R | R | CRUD(Branch) | — | — | R(Own) |
| Generate Final GST Invoice | CRUD | — | R | R | CRUD(Branch) | — | — | R(Own) |
| Record Payment | CRUD | — | R | R | CRUD(Branch) | — | — | — |
| Generate e-Invoice (IRN) | CRUD | — | — | — | CRUD(Branch) | — | — | — |
| View All Invoices | R(All) | R(Own) | R(Branch) | R(Branch) | R(All) | — | — | R(Own) |
| Financial Reports | R(All) | — | R(Branch) | R(Branch) | R(All) | — | — | — |
| **PDI** | | | | | | | | |
| Create PDI Checklist | CRUD | — | U | — | — | C, R | R | — |
| Update PDI Items | CRUD | — | R | — | — | U | R | — |
| Upload PDI Photos | CRUD | — | R | — | — | CRUD | R | — |
| Complete/Sign PDI | CRUD | — | R | — | — | U | R | — |
| View PDI Reports | R(All) | R | R(Branch) | R | R | R(Own) | R(Branch) | — |
| PDI Templates | CRUD | R | R | — | — | R | — | — |
| **RTO DOCUMENTS** | | | | | | | | |
| Create RTO Application | CRUD | — | U | — | R | — | — | — |
| Generate RTO Forms | CRUD | — | U | — | U | — | — | — |
| Submit to Vahan Portal | CRUD | — | — | — | U | — | — | — |
| View RTO Status | R(All) | R(Own) | R(Branch) | R(Branch) | R(All) | — | R(Branch) | R(Own) |
| **DELIVERY** | | | | | | | | |
| Schedule Delivery | CRUD | U(Own) | CRUD(Branch) | — | — | — | CRUD(Branch) | — |
| View All Deliveries | R(All) | R(Own) | R(Branch) | R | R | — | R(Branch) | R(Own) |
| Delivery Bay Management | CRUD | — | R | — | — | — | CRUD | — |
| Update Delivery Checklist | CRUD | U(Own) | U | — | — | — | CRUD | — |
| Capture Digital Signature | CRUD | U(Own) | U | — | — | — | CRUD | — |
| Upload Delivery Photos | CRUD | U(Own) | U | — | — | — | CRUD | — |
| Complete Delivery | CRUD | — | U | — | — | — | CRUD | — |
| **POST-SALE CRM** | | | | | | | | |
| View/Create Follow-ups | CRUD | CRUD(Own) | CRUD(Branch) | R | R | — | R | — |
| Service Reminders | CRUD | R(Own) | CRUD(Branch) | — | — | — | — | R(Own) |
| Customer Feedback | R(All) | R(Own) | R(Branch) | — | — | — | — | CRUD(Own) |
| **ANALYTICS & REPORTS** | | | | | | | | |
| Personal Performance | R | R(Own) | R(Branch) | R(Branch) | R | — | R | — |
| Branch Dashboard | R(All) | R(Branch) | R(Branch) | R(Branch) | R(Branch) | — | R(Branch) | — |
| All Branches Dashboard | R(All) | — | — | — | — | — | — | — |
| Export Reports | R(All) | R(Own) | R(Branch) | R(Branch) | R(All) | — | — | — |
| Lead Funnel Analytics | R(All) | R(Own) | R(Branch) | — | — | — | — | — |
| Revenue Reports | R(All) | — | R(Branch) | R(Branch) | R(All) | — | — | — |
| Stock Ageing Reports | R(All) | R | R(Branch) | — | R | — | R | — |
| **INTEGRATIONS & CONFIG** | | | | | | | | |
| WhatsApp Templates | CRUD | — | — | — | — | — | — | — |
| Payment Gateway Config | CRUD | — | — | — | — | — | — | — |
| Insurance API Config | CRUD | — | — | — | — | — | — | — |
| Bank API Config | CRUD | — | — | — | — | — | — | — |
| GST Settings | CRUD | — | — | — | — | — | — | — |
| RTO Charges | CRUD | R | R | — | R | — | — | — |
| Feature Flags | CRUD | — | — | — | — | — | — | — |

---

## Discount Approval Hierarchy

```
Customer Request → Sales Consultant
                         │
              ┌──────────┴──────────┐
         ≤ ₹5,000             > ₹5,000
              │                    │
    Self-approve            Sales Manager
                                   │
                       ┌───────────┴──────────┐
                  ≤ ₹20,000            > ₹20,000
                       │                    │
             Manager approves         General Manager
                                           │
                               ┌───────────┴──────────┐
                          ≤ ₹50,000           > ₹50,000
                               │                    │
                        GM approves            MD approval
                                              (Admin role)
```

## Multi-Branch Access Rules

- Each user (except Admin) is assigned to a specific branch
- Users can only read/write data within their assigned branch
- Admin users can access all branches (controlled via `X-Branch-ID` header)
- Sales Managers can view consultant performance across their managed branches
- Customers access only their own data regardless of branch

## Session & Security

- **Session Timeout:** 8 hours of inactivity for sales/manager roles
- **Session Timeout:** 4 hours for PDI Technician (tablet, shared device scenario)
- **Session Timeout:** 30 days for Customer portal (remember me)
- **Failed Login Lockout:** Account locked for 30 minutes after 5 failed attempts
- **Password Policy:** Min 8 chars, 1 uppercase, 1 number, 1 special char (for email/password users)
- **OTP Expiry:** 5 minutes for WhatsApp OTP login
