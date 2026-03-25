# SmartDeal CRM – PostgreSQL Database Schema

All monetary amounts are stored in **Indian Rupees (INR)** as `NUMERIC(14,2)`.
UUIDs are used as primary keys. Timestamps use `TIMESTAMPTZ` (UTC stored, IST displayed).

---

## Table of Contents
1. [Dealership & Branch](#1-dealership--branch)
2. [Users & Auth](#2-users--auth)
3. [Leads](#3-leads)
4. [Vehicles & Stock](#4-vehicles--stock)
5. [Quotations](#5-quotations)
6. [Test Drives](#6-test-drives)
7. [Exchange Evaluation](#7-exchange-evaluation)
8. [Bookings](#8-bookings)
9. [Finance](#9-finance)
10. [Insurance](#10-insurance)
11. [Billing](#11-billing)
12. [PDI](#12-pdi)
13. [RTO Documents](#13-rto-documents)
14. [Delivery](#14-delivery)
15. [Post-Sale CRM](#15-post-sale-crm)

---

## 1. Dealership & Branch

```sql
CREATE TABLE dealerships (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    legal_name          VARCHAR(255) NOT NULL,
    gstin               VARCHAR(15) NOT NULL UNIQUE,
    pan                 VARCHAR(10) NOT NULL,
    registered_address  TEXT NOT NULL,
    city                VARCHAR(100) NOT NULL,
    state               VARCHAR(100) NOT NULL,
    pincode             VARCHAR(6) NOT NULL,
    phone               VARCHAR(15) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    tata_dealer_code    VARCHAR(20) UNIQUE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE branches (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealership_id       UUID NOT NULL REFERENCES dealerships(id),
    name                VARCHAR(255) NOT NULL,
    branch_code         VARCHAR(20) NOT NULL UNIQUE,
    address             TEXT NOT NULL,
    city                VARCHAR(100) NOT NULL,
    state               VARCHAR(100) NOT NULL,
    pincode             VARCHAR(6) NOT NULL,
    phone               VARCHAR(15) NOT NULL,
    email               VARCHAR(255),
    gstin               VARCHAR(15),           -- Branch-specific GSTIN if applicable
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_branches_dealership ON branches(dealership_id);
```

---

## 2. Users & Auth

```sql
CREATE TYPE user_role AS ENUM (
    'admin',
    'sales_consultant',
    'sales_manager',
    'finance_manager',
    'accounts',
    'pdi_technician',
    'delivery_manager',
    'customer'
);

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id           UUID REFERENCES branches(id),
    role                user_role NOT NULL,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    email               VARCHAR(255) UNIQUE,
    phone               VARCHAR(15) NOT NULL UNIQUE,
    password_hash       VARCHAR(255),           -- NULL for OTP-only staff
    employee_code       VARCHAR(50) UNIQUE,     -- NULL for customers
    pan                 VARCHAR(10),            -- Encrypted at app layer
    aadhaar_last4       VARCHAR(4),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at       TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_branch ON users(branch_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone ON users(phone);

CREATE TABLE sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash  VARCHAR(255) NOT NULL UNIQUE,
    device_fingerprint  VARCHAR(255),
    ip_address          INET,
    user_agent          TEXT,
    expires_at          TIMESTAMPTZ NOT NULL,
    revoked_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE audit_logs (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             UUID REFERENCES users(id),
    branch_id           UUID REFERENCES branches(id),
    action              VARCHAR(100) NOT NULL,  -- e.g. 'lead.created', 'discount.approved'
    resource_type       VARCHAR(100) NOT NULL,
    resource_id         UUID,
    old_value           JSONB,
    new_value           JSONB,
    ip_address          INET,
    user_agent          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
-- Prevent any modification to audit logs
CREATE RULE no_update_audit AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO audit_logs DO INSTEAD NOTHING;
```

---

## 3. Leads

```sql
CREATE TYPE lead_status AS ENUM (
    'new',
    'contacted',
    'interested',
    'demo_scheduled',
    'demo_done',
    'negotiation',
    'won',
    'lost',
    'dropped'
);

CREATE TYPE lead_source AS ENUM (
    'qr_walk_in',
    'walk_in_direct',
    'phone_call',
    'website',
    'whatsapp',
    'referral',
    'digital_campaign',
    'tata_motors_portal',
    'exchange_lead',
    'service_upsell'
);

CREATE TYPE fuel_type AS ENUM ('petrol', 'diesel', 'cng', 'electric', 'hybrid');
CREATE TYPE transmission_type AS ENUM ('manual', 'automatic', 'amt');
CREATE TYPE usage_type AS ENUM ('city', 'highway', 'mixed', 'commercial');

CREATE TABLE leads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id           UUID NOT NULL REFERENCES branches(id),
    assigned_to         UUID REFERENCES users(id),       -- Sales consultant
    customer_id         UUID REFERENCES users(id),       -- If customer has portal account
    lead_number         VARCHAR(20) NOT NULL UNIQUE,     -- e.g. LDN-2024-00001
    source              lead_source NOT NULL,
    status              lead_status NOT NULL DEFAULT 'new',
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    phone               VARCHAR(15) NOT NULL,
    email               VARCHAR(255),
    city                VARCHAR(100),
    pincode             VARCHAR(6),
    state               VARCHAR(100),
    interested_model    VARCHAR(100),
    interested_variant  VARCHAR(100),
    budget_min          NUMERIC(14,2),
    budget_max          NUMERIC(14,2),
    fuel_preference     fuel_type,
    transmission_pref   transmission_type,
    purchase_timeline   VARCHAR(50),            -- 'immediate', '1_month', '3_months', etc.
    has_exchange        BOOLEAN DEFAULT FALSE,
    exchange_vehicle     VARCHAR(200),
    notes               TEXT,
    lost_reason         TEXT,
    qr_session_id       VARCHAR(100),           -- If came via QR scan
    utm_source          VARCHAR(100),
    utm_medium          VARCHAR(100),
    utm_campaign        VARCHAR(100),
    won_at              TIMESTAMPTZ,
    lost_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_branch ON leads(branch_id);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created ON leads(created_at);
CREATE INDEX idx_leads_phone ON leads(phone);

CREATE TABLE requirement_discovery (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id             UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    family_size         SMALLINT,
    primary_driver_age  SMALLINT,
    usage_type          usage_type,
    daily_km            SMALLINT,
    monthly_emi_budget  NUMERIC(14,2),
    down_payment        NUMERIC(14,2),
    fuel_preference     fuel_type,
    transmission_pref   transmission_type,
    priority_safety     BOOLEAN DEFAULT FALSE,
    priority_comfort    BOOLEAN DEFAULT FALSE,
    priority_performance BOOLEAN DEFAULT FALSE,
    priority_economy    BOOLEAN DEFAULT FALSE,
    priority_technology BOOLEAN DEFAULT FALSE,
    has_garage          BOOLEAN,
    existing_vehicle    VARCHAR(200),
    existing_vehicle_year SMALLINT,
    existing_vehicle_km   INTEGER,
    any_specific_colour VARCHAR(50),
    finance_required    BOOLEAN DEFAULT TRUE,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lead_activities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id             UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id),
    activity_type       VARCHAR(50) NOT NULL,  -- 'call', 'visit', 'whatsapp', 'email', 'sms'
    direction           VARCHAR(10),           -- 'inbound', 'outbound'
    outcome             VARCHAR(50),           -- 'answered', 'no_answer', 'callback', 'interested'
    duration_minutes    SMALLINT,
    notes               TEXT,
    next_followup_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_followup ON lead_activities(next_followup_at)
    WHERE next_followup_at IS NOT NULL;
```

---

## 4. Vehicles & Stock

```sql
CREATE TYPE stock_status AS ENUM (
    'in_transit',
    'in_yard',
    'blocked',           -- Reserved for a specific lead/booking
    'allocated',         -- VIN allocated to a confirmed booking
    'pdi_in_progress',
    'pdi_done',
    'delivered',
    'demo_vehicle',
    'scrapped'
);

CREATE TABLE vehicle_models (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_code          VARCHAR(20) NOT NULL UNIQUE,    -- e.g. 'NEXON', 'HARRIER', 'PUNCH'
    model_name          VARCHAR(100) NOT NULL,
    segment             VARCHAR(50),                    -- 'SUV', 'Hatchback', 'Sedan', 'MPV'
    body_type           VARCHAR(50),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vehicle_variants (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id            UUID NOT NULL REFERENCES vehicle_models(id),
    variant_code        VARCHAR(50) NOT NULL UNIQUE,
    variant_name        VARCHAR(100) NOT NULL,
    fuel_type           fuel_type NOT NULL,
    transmission        transmission_type NOT NULL,
    engine_cc           SMALLINT,
    power_bhp           NUMERIC(6,2),
    torque_nm           NUMERIC(6,2),
    seating_capacity    SMALLINT DEFAULT 5,
    ex_showroom_price   NUMERIC(14,2) NOT NULL,         -- Base ex-showroom in INR
    price_effective_from DATE NOT NULL,
    price_effective_to  DATE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_variants_model ON vehicle_variants(model_id);

CREATE TABLE vehicle_colours (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id          UUID NOT NULL REFERENCES vehicle_variants(id),
    colour_name         VARCHAR(100) NOT NULL,
    colour_code         VARCHAR(20),
    colour_type         VARCHAR(20),                    -- 'solid', 'metallic', 'dual_tone'
    colour_surcharge    NUMERIC(14,2) NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE vehicles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id           UUID NOT NULL REFERENCES branches(id),
    variant_id          UUID NOT NULL REFERENCES vehicle_variants(id),
    colour_id           UUID REFERENCES vehicle_colours(id),
    vin                 VARCHAR(17) NOT NULL UNIQUE,    -- 17-char VIN (World Manufacturer Identifier)
    engine_number       VARCHAR(30) NOT NULL UNIQUE,
    chassis_number      VARCHAR(30) NOT NULL UNIQUE,
    manufacture_month   SMALLINT NOT NULL,
    manufacture_year    SMALLINT NOT NULL,
    yard_location       VARCHAR(50),                    -- e.g. 'BAY-A-12'
    status              stock_status NOT NULL DEFAULT 'in_transit',
    allocated_booking_id UUID,                          -- FK added after bookings table
    invoice_number      VARCHAR(50),                    -- OEM invoice to dealer
    invoice_date        DATE,
    invoice_price       NUMERIC(14,2),                  -- OEM invoice price (dealer cost)
    transit_start_date  DATE,
    received_date       DATE,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_branch ON vehicles(branch_id);
CREATE INDEX idx_vehicles_variant ON vehicles(variant_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_vin ON vehicles(vin);

CREATE TABLE vehicle_features (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id          UUID NOT NULL REFERENCES vehicle_variants(id),
    category            VARCHAR(100),                   -- 'Safety', 'Comfort', 'Infotainment'
    feature_name        VARCHAR(200) NOT NULL,
    is_standard         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE accessories (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(200) NOT NULL,
    part_number         VARCHAR(50),
    category            VARCHAR(100),                   -- 'Exterior', 'Interior', 'Electronics'
    price               NUMERIC(14,2) NOT NULL,
    gstn_rate           NUMERIC(5,2) NOT NULL DEFAULT 28.00, -- GST % on accessories
    is_genuine          BOOLEAN NOT NULL DEFAULT TRUE,
    compatible_models   TEXT[],                         -- Array of model codes
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 5. Quotations

```sql
CREATE TYPE quotation_status AS ENUM (
    'draft',
    'shared',
    'revision_requested',
    'approved',
    'expired',
    'converted_to_booking'
);

CREATE TABLE quotations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id                 UUID NOT NULL REFERENCES leads(id),
    branch_id               UUID NOT NULL REFERENCES branches(id),
    created_by              UUID NOT NULL REFERENCES users(id),
    approved_by             UUID REFERENCES users(id),
    quotation_number        VARCHAR(20) NOT NULL UNIQUE,    -- e.g. QTN-2024-00123
    status                  quotation_status NOT NULL DEFAULT 'draft',
    variant_id              UUID NOT NULL REFERENCES vehicle_variants(id),
    colour_id               UUID REFERENCES vehicle_colours(id),
    ex_showroom_price       NUMERIC(14,2) NOT NULL,
    -- RTO components
    rto_registration_fee    NUMERIC(14,2) NOT NULL DEFAULT 0,
    rto_road_tax            NUMERIC(14,2) NOT NULL DEFAULT 0,
    rto_hp_charges          NUMERIC(14,2) DEFAULT 0,       -- Hypothecation if loan
    rto_state               VARCHAR(100) NOT NULL,
    -- GST
    gst_rate                NUMERIC(5,2) NOT NULL,          -- 28% for vehicles
    cgst_amount             NUMERIC(14,2) NOT NULL DEFAULT 0,
    sgst_amount             NUMERIC(14,2) NOT NULL DEFAULT 0,
    igst_amount             NUMERIC(14,2) NOT NULL DEFAULT 0,
    cess_amount             NUMERIC(14,2) NOT NULL DEFAULT 0,
    -- Compensation cess (applicable on vehicles)
    tcs_rate                NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    tcs_amount              NUMERIC(14,2) NOT NULL DEFAULT 0,
    -- Insurance
    insurance_amount        NUMERIC(14,2) NOT NULL DEFAULT 0,
    insurance_provider      VARCHAR(100),
    -- Accessories & Extended Warranty
    accessories_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
    extended_warranty_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    -- Handling & logistics
    handling_charges        NUMERIC(14,2) NOT NULL DEFAULT 0,
    -- Discounts
    manufacturer_discount   NUMERIC(14,2) NOT NULL DEFAULT 0,
    dealer_discount         NUMERIC(14,2) NOT NULL DEFAULT 0,
    exchange_bonus          NUMERIC(14,2) NOT NULL DEFAULT 0,
    loyalty_bonus           NUMERIC(14,2) NOT NULL DEFAULT 0,
    -- Totals
    on_road_price           NUMERIC(14,2) NOT NULL,
    -- Finance
    finance_required        BOOLEAN DEFAULT FALSE,
    loan_amount             NUMERIC(14,2),
    loan_tenure_months      SMALLINT,
    interest_rate           NUMERIC(5,2),
    emi_amount              NUMERIC(14,2),
    -- Metadata
    valid_until             DATE NOT NULL,
    version                 SMALLINT NOT NULL DEFAULT 1,
    parent_quotation_id     UUID REFERENCES quotations(id), -- For revisions
    pdf_url                 VARCHAR(500),
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotations_lead ON quotations(lead_id);
CREATE INDEX idx_quotations_branch ON quotations(branch_id);
CREATE INDEX idx_quotations_status ON quotations(status);

CREATE TABLE quotation_accessories (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id        UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    accessory_id        UUID NOT NULL REFERENCES accessories(id),
    quantity            SMALLINT NOT NULL DEFAULT 1,
    unit_price          NUMERIC(14,2) NOT NULL,
    total_price         NUMERIC(14,2) NOT NULL,
    gst_amount          NUMERIC(14,2) NOT NULL DEFAULT 0
);
```

---

## 6. Test Drives

```sql
CREATE TYPE test_drive_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
);

CREATE TABLE driving_licenses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id             UUID NOT NULL REFERENCES leads(id),
    dl_number           VARCHAR(20) NOT NULL,
    dl_expiry_date      DATE NOT NULL,
    dl_class            VARCHAR(50),           -- 'LMV', 'MCWG', etc.
    dl_scan_url         VARCHAR(500),          -- S3 URL of DL image
    is_verified         BOOLEAN DEFAULT FALSE,
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE test_drive_schedules (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id                 UUID NOT NULL REFERENCES leads(id),
    branch_id               UUID NOT NULL REFERENCES branches(id),
    vehicle_id              UUID REFERENCES vehicles(id),  -- Demo vehicle
    variant_id              UUID NOT NULL REFERENCES vehicle_variants(id),
    driving_license_id      UUID REFERENCES driving_licenses(id),
    sales_consultant_id     UUID NOT NULL REFERENCES users(id),
    status                  test_drive_status NOT NULL DEFAULT 'scheduled',
    scheduled_at            TIMESTAMPTZ NOT NULL,
    started_at              TIMESTAMPTZ,
    ended_at                TIMESTAMPTZ,
    odometer_start          INTEGER,
    odometer_end            INTEGER,
    route_description       VARCHAR(200),
    customer_rating         SMALLINT CHECK (customer_rating BETWEEN 1 AND 5),
    customer_feedback       TEXT,
    would_buy               BOOLEAN,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_td_lead ON test_drive_schedules(lead_id);
CREATE INDEX idx_td_scheduled ON test_drive_schedules(scheduled_at);
```

---

## 7. Exchange Evaluation

```sql
CREATE TYPE exchange_status AS ENUM (
    'pending_inspection',
    'inspected',
    'valued',
    'offer_made',
    'offer_accepted',
    'offer_rejected',
    'completed'
);

CREATE TABLE exchange_evaluations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id             UUID NOT NULL REFERENCES leads(id),
    evaluator_id        UUID REFERENCES users(id),
    status              exchange_status NOT NULL DEFAULT 'pending_inspection',
    -- Vehicle details
    make                VARCHAR(100) NOT NULL,
    model               VARCHAR(100) NOT NULL,
    variant             VARCHAR(100),
    year                SMALLINT NOT NULL,
    fuel_type           fuel_type,
    transmission        transmission_type,
    colour              VARCHAR(50),
    registration_number VARCHAR(20) NOT NULL,
    registration_state  VARCHAR(100),
    -- Condition
    odometer_km         INTEGER NOT NULL,
    service_history     VARCHAR(50),            -- 'full_oem', 'partial', 'none'
    accidents_count     SMALLINT DEFAULT 0,
    tyres_condition     VARCHAR(20),
    battery_condition   VARCHAR(20),
    -- Valuation
    market_value        NUMERIC(14,2),          -- C2B market value
    dealer_offer        NUMERIC(14,2),          -- Offer made to customer
    final_exchange_value NUMERIC(14,2),         -- Accepted value
    -- RC details
    rc_book_url         VARCHAR(500),
    insurance_url       VARCHAR(500),
    puc_url             VARCHAR(500),
    hypothecation_bank  VARCHAR(100),
    loan_outstanding    NUMERIC(14,2) DEFAULT 0,
    noc_required        BOOLEAN DEFAULT FALSE,
    notes               TEXT,
    evaluated_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exchange_photos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id       UUID NOT NULL REFERENCES exchange_evaluations(id) ON DELETE CASCADE,
    photo_type          VARCHAR(50) NOT NULL,   -- 'front', 'rear', 'left', 'right', 'interior', 'engine', 'damage'
    s3_url              VARCHAR(500) NOT NULL,
    caption             TEXT,
    uploaded_by         UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 8. Bookings

```sql
CREATE TYPE booking_status AS ENUM (
    'draft',
    'pending_documents',
    'documents_submitted',
    'documents_verified',
    'payment_pending',
    'payment_done',
    'confirmed',
    'vehicle_allocated',
    'cancelled',
    'refund_initiated',
    'refunded'
);

CREATE TYPE document_type AS ENUM (
    'pan_card',
    'aadhaar_card',
    'form_60',         -- If no PAN
    'address_proof',
    'passport',
    'voter_id',
    'driving_license',
    'company_pan',     -- For corporate bookings
    'gst_certificate',
    'other'
);

CREATE TABLE bookings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id               UUID NOT NULL REFERENCES branches(id),
    lead_id                 UUID NOT NULL REFERENCES leads(id),
    quotation_id            UUID NOT NULL REFERENCES quotations(id),
    sales_consultant_id     UUID NOT NULL REFERENCES users(id),
    vehicle_id              UUID REFERENCES vehicles(id),   -- Allocated VIN
    booking_number          VARCHAR(20) NOT NULL UNIQUE,    -- e.g. BKN-2024-00045
    status                  booking_status NOT NULL DEFAULT 'draft',
    -- Customer details (snapshot at booking time)
    customer_name           VARCHAR(200) NOT NULL,
    customer_phone          VARCHAR(15) NOT NULL,
    customer_email          VARCHAR(255),
    customer_address        TEXT NOT NULL,
    customer_city           VARCHAR(100) NOT NULL,
    customer_state          VARCHAR(100) NOT NULL,
    customer_pincode        VARCHAR(6) NOT NULL,
    -- Booking amount
    booking_amount          NUMERIC(14,2) NOT NULL,
    payment_method          VARCHAR(50),                    -- 'upi', 'card', 'netbanking', 'cash', 'cheque'
    payment_reference       VARCHAR(100),
    payment_gateway_order_id VARCHAR(100),
    payment_gateway_txn_id  VARCHAR(100),
    payment_date            TIMESTAMPTZ,
    -- Exchange
    exchange_evaluation_id  UUID REFERENCES exchange_evaluations(id),
    -- Expected delivery
    expected_delivery_date  DATE,
    colour_preference_1     UUID REFERENCES vehicle_colours(id),
    colour_preference_2     UUID REFERENCES vehicle_colours(id),
    -- Finance
    finance_required        BOOLEAN DEFAULT FALSE,
    -- Cancellation
    cancelled_at            TIMESTAMPTZ,
    cancellation_reason     TEXT,
    refund_amount           NUMERIC(14,2),
    refund_date             DATE,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_branch ON bookings(branch_id);
CREATE INDEX idx_bookings_lead ON bookings(lead_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_vehicle ON bookings(vehicle_id);

-- Add FK from vehicles to bookings (circular reference managed at app layer)
ALTER TABLE vehicles ADD CONSTRAINT fk_vehicle_booking
    FOREIGN KEY (allocated_booking_id) REFERENCES bookings(id);

CREATE TABLE booking_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    document_type       document_type NOT NULL,
    document_number     VARCHAR(100),           -- Stored encrypted at app layer for PAN/Aadhaar
    s3_url              VARCHAR(500) NOT NULL,
    s3_key              VARCHAR(500) NOT NULL,
    file_name           VARCHAR(255),
    mime_type           VARCHAR(100),
    file_size_bytes     INTEGER,
    is_verified         BOOLEAN DEFAULT FALSE,
    verified_by         UUID REFERENCES users(id),
    verified_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_docs_booking ON booking_documents(booking_id);
```

---

## 9. Finance

```sql
CREATE TYPE loan_status AS ENUM (
    'draft',
    'applied',
    'under_review',
    'approved',
    'sanctioned',
    'disbursed',
    'rejected',
    'cancelled'
);

CREATE TABLE banks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL UNIQUE,
    short_name          VARCHAR(20) NOT NULL,
    logo_url            VARCHAR(500),
    api_endpoint        VARCHAR(500),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE loan_products (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id             UUID NOT NULL REFERENCES banks(id),
    product_name        VARCHAR(200) NOT NULL,
    min_loan_amount     NUMERIC(14,2) NOT NULL,
    max_loan_amount     NUMERIC(14,2) NOT NULL,
    min_tenure_months   SMALLINT NOT NULL,
    max_tenure_months   SMALLINT NOT NULL,
    interest_rate_from  NUMERIC(5,2) NOT NULL,
    interest_rate_to    NUMERIC(5,2) NOT NULL,
    processing_fee_pct  NUMERIC(5,2) DEFAULT 0,
    processing_fee_flat NUMERIC(14,2) DEFAULT 0,
    is_subvention       BOOLEAN DEFAULT FALSE,   -- Manufacturer subvented rate
    subvention_rate     NUMERIC(5,2),
    valid_from          DATE NOT NULL,
    valid_to            DATE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE loan_applications (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id              UUID NOT NULL REFERENCES bookings(id),
    bank_id                 UUID NOT NULL REFERENCES banks(id),
    loan_product_id         UUID REFERENCES loan_products(id),
    applicant_name          VARCHAR(200) NOT NULL,
    co_applicant_name       VARCHAR(200),
    pan_number              VARCHAR(10) NOT NULL,   -- Encrypted at app layer
    aadhaar_number          VARCHAR(12),            -- Encrypted at app layer (last 4 visible)
    date_of_birth           DATE NOT NULL,
    employment_type         VARCHAR(50),            -- 'salaried', 'self_employed', 'business'
    employer_name           VARCHAR(200),
    monthly_income          NUMERIC(14,2),
    existing_emi            NUMERIC(14,2) DEFAULT 0,
    vehicle_value           NUMERIC(14,2) NOT NULL, -- On-road price
    loan_amount_requested   NUMERIC(14,2) NOT NULL,
    down_payment            NUMERIC(14,2) NOT NULL,
    tenure_months           SMALLINT NOT NULL,
    interest_rate           NUMERIC(5,2),
    emi_amount              NUMERIC(14,2),
    processing_fee          NUMERIC(14,2),
    status                  loan_status NOT NULL DEFAULT 'draft',
    bank_reference_number   VARCHAR(100),
    approved_amount         NUMERIC(14,2),
    sanctioned_at           TIMESTAMPTZ,
    disbursed_at            TIMESTAMPTZ,
    disbursement_amount     NUMERIC(14,2),
    rejection_reason        TEXT,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loan_booking ON loan_applications(booking_id);
CREATE INDEX idx_loan_status ON loan_applications(status);

CREATE TABLE loan_documents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_application_id UUID NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    document_type       VARCHAR(100) NOT NULL,   -- 'salary_slip', 'bank_statement', 'itr', 'form16', etc.
    s3_url              VARCHAR(500) NOT NULL,
    file_name           VARCHAR(255),
    is_submitted_to_bank BOOLEAN DEFAULT FALSE,
    submitted_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 10. Insurance

```sql
CREATE TABLE insurance_providers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL UNIQUE,
    short_name          VARCHAR(20) NOT NULL,
    irdai_code          VARCHAR(20),
    logo_url            VARCHAR(500),
    api_endpoint        VARCHAR(500),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE insurance_addons (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL,
    code                VARCHAR(30) NOT NULL UNIQUE,   -- 'zero_dep', 'rsa', 'engine_protect', etc.
    description         TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE insurance_quotes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id              UUID NOT NULL REFERENCES bookings(id),
    provider_id             UUID NOT NULL REFERENCES insurance_providers(id),
    quote_reference         VARCHAR(100),               -- Provider's quote ID
    policy_type             VARCHAR(30) NOT NULL,       -- 'comprehensive', 'third_party', 'own_damage'
    idv                     NUMERIC(14,2) NOT NULL,     -- Insured Declared Value
    own_damage_premium      NUMERIC(14,2) NOT NULL DEFAULT 0,
    third_party_premium     NUMERIC(14,2) NOT NULL,
    addons_premium          NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
    ncb_percentage          NUMERIC(5,2) NOT NULL DEFAULT 0,
    ncb_discount            NUMERIC(14,2) NOT NULL DEFAULT 0,
    gst_amount              NUMERIC(14,2) NOT NULL,     -- 18% GST on insurance
    total_premium           NUMERIC(14,2) NOT NULL,
    selected_addons         UUID[],                     -- Array of addon IDs
    is_selected             BOOLEAN DEFAULT FALSE,
    policy_number           VARCHAR(100),
    policy_document_url     VARCHAR(500),
    quote_valid_until       TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insurance_booking ON insurance_quotes(booking_id);
```

---

## 11. Billing

```sql
CREATE TYPE invoice_type AS ENUM ('proforma', 'tax_invoice', 'credit_note', 'debit_note');
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'cancelled', 'e_invoice_generated');
CREATE TYPE payment_mode AS ENUM ('upi', 'neft', 'rtgs', 'cheque', 'demand_draft', 'card', 'cash', 'loan_disbursement');

CREATE TABLE invoices (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id              UUID NOT NULL REFERENCES bookings(id),
    branch_id               UUID NOT NULL REFERENCES branches(id),
    invoice_type            invoice_type NOT NULL,
    invoice_number          VARCHAR(30) NOT NULL UNIQUE,    -- e.g. INV/2024-25/00123
    invoice_date            DATE NOT NULL,
    status                  invoice_status NOT NULL DEFAULT 'draft',
    -- Seller details (snapshot)
    seller_name             VARCHAR(255) NOT NULL,
    seller_gstin            VARCHAR(15) NOT NULL,
    seller_address          TEXT NOT NULL,
    -- Buyer details (snapshot)
    buyer_name              VARCHAR(255) NOT NULL,
    buyer_phone             VARCHAR(15) NOT NULL,
    buyer_pan               VARCHAR(10),                    -- Encrypted
    buyer_gstin             VARCHAR(15),                    -- For B2B
    buyer_address           TEXT NOT NULL,
    buyer_state             VARCHAR(100) NOT NULL,
    buyer_state_code        VARCHAR(5) NOT NULL,
    -- Vehicle
    vehicle_id              UUID NOT NULL REFERENCES vehicles(id),
    hsn_code                VARCHAR(10) NOT NULL DEFAULT '8703',  -- Motor vehicles HSN
    -- Amounts
    ex_showroom_price       NUMERIC(14,2) NOT NULL,
    gst_rate                NUMERIC(5,2) NOT NULL,
    cgst_rate               NUMERIC(5,2) NOT NULL DEFAULT 0,
    sgst_rate               NUMERIC(5,2) NOT NULL DEFAULT 0,
    igst_rate               NUMERIC(5,2) NOT NULL DEFAULT 0,
    cgst_amount             NUMERIC(14,2) NOT NULL DEFAULT 0,
    sgst_amount             NUMERIC(14,2) NOT NULL DEFAULT 0,
    igst_amount             NUMERIC(14,2) NOT NULL DEFAULT 0,
    cess_rate               NUMERIC(5,2) NOT NULL DEFAULT 0,
    cess_amount             NUMERIC(14,2) NOT NULL DEFAULT 0,
    tcs_rate                NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    tcs_amount              NUMERIC(14,2) NOT NULL DEFAULT 0,
    accessories_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
    accessories_gst_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
    insurance_amount        NUMERIC(14,2) NOT NULL DEFAULT 0,
    rto_amount              NUMERIC(14,2) NOT NULL DEFAULT 0,
    handling_charges        NUMERIC(14,2) NOT NULL DEFAULT 0,
    extended_warranty       NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_discount          NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_amount            NUMERIC(14,2) NOT NULL,
    amount_paid             NUMERIC(14,2) NOT NULL DEFAULT 0,
    balance_amount          NUMERIC(14,2) NOT NULL,
    -- e-Invoice
    irn                     VARCHAR(100),                   -- Invoice Reference Number (GST portal)
    irn_generated_at        TIMESTAMPTZ,
    qr_code_url             VARCHAR(500),                   -- GST QR code for invoice
    -- Documents
    pdf_url                 VARCHAR(500),
    notes                   TEXT,
    created_by              UUID NOT NULL REFERENCES users(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_booking ON invoices(booking_id);
CREATE INDEX idx_invoices_branch ON invoices(branch_id);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);

CREATE TABLE invoice_payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id          UUID NOT NULL REFERENCES invoices(id),
    payment_mode        payment_mode NOT NULL,
    amount              NUMERIC(14,2) NOT NULL,
    payment_date        DATE NOT NULL,
    reference_number    VARCHAR(100),               -- UTR, cheque number, etc.
    bank_name           VARCHAR(100),
    payment_for         VARCHAR(100),               -- 'booking_advance', 'loan_disbursement', 'balance'
    gateway_order_id    VARCHAR(100),
    gateway_txn_id      VARCHAR(100),
    notes               TEXT,
    recorded_by         UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice ON invoice_payments(invoice_id);
```

---

## 12. PDI

```sql
CREATE TYPE pdi_status AS ENUM ('pending', 'in_progress', 'passed', 'failed', 'rework_required');
CREATE TYPE pdi_item_result AS ENUM ('pass', 'fail', 'na', 'rework');

CREATE TABLE pdi_checklists (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id          UUID NOT NULL REFERENCES vehicles(id),
    technician_id       UUID NOT NULL REFERENCES users(id),
    booking_id          UUID REFERENCES bookings(id),
    status              pdi_status NOT NULL DEFAULT 'pending',
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    total_items         SMALLINT NOT NULL DEFAULT 0,
    passed_items        SMALLINT NOT NULL DEFAULT 0,
    failed_items        SMALLINT NOT NULL DEFAULT 0,
    rework_items        SMALLINT NOT NULL DEFAULT 0,
    certificate_url     VARCHAR(500),               -- S3 URL of PDI certificate
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pdi_vehicle ON pdi_checklists(vehicle_id);

CREATE TABLE pdi_checklist_templates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id            UUID REFERENCES vehicle_models(id),   -- NULL = applies to all
    name                VARCHAR(200) NOT NULL,
    version             VARCHAR(20) NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pdi_template_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id         UUID NOT NULL REFERENCES pdi_checklist_templates(id),
    section             VARCHAR(100) NOT NULL,               -- 'Exterior', 'Interior', 'Mechanical', etc.
    item_code           VARCHAR(20) NOT NULL,
    description         VARCHAR(500) NOT NULL,
    requires_photo      BOOLEAN NOT NULL DEFAULT FALSE,
    is_mandatory        BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order          SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE pdi_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id        UUID NOT NULL REFERENCES pdi_checklists(id) ON DELETE CASCADE,
    template_item_id    UUID NOT NULL REFERENCES pdi_template_items(id),
    result              pdi_item_result NOT NULL DEFAULT 'na',
    technician_notes    TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pdi_photos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pdi_item_id         UUID NOT NULL REFERENCES pdi_items(id) ON DELETE CASCADE,
    s3_url              VARCHAR(500) NOT NULL,
    s3_key              VARCHAR(500) NOT NULL,
    caption             TEXT,
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 13. RTO Documents

```sql
CREATE TYPE rto_doc_status AS ENUM (
    'not_generated',
    'generated',
    'submitted',
    'registration_applied',
    'temp_registration_issued',
    'permanent_registration_issued',
    'failed'
);

CREATE TABLE rto_applications (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id              UUID NOT NULL REFERENCES bookings(id),
    vehicle_id              UUID NOT NULL REFERENCES vehicles(id),
    status                  rto_doc_status NOT NULL DEFAULT 'not_generated',
    rto_office              VARCHAR(100),
    registration_category   VARCHAR(20) DEFAULT 'Non-Transport',
    registration_state      VARCHAR(100) NOT NULL,
    registration_district   VARCHAR(100),
    -- Form references
    form_20_generated       BOOLEAN DEFAULT FALSE,          -- Application for registration
    form_21_generated       BOOLEAN DEFAULT FALSE,          -- Sale certificate
    form_22_generated       BOOLEAN DEFAULT FALSE,          -- Roadworthiness certificate
    form_22a_generated      BOOLEAN DEFAULT FALSE,          -- Roadworthiness (if amended)
    form_34_generated       BOOLEAN DEFAULT FALSE,          -- Hypothecation (if loan)
    -- Registration numbers
    temp_registration_number VARCHAR(20),
    temp_registration_valid_until DATE,
    permanent_registration_number VARCHAR(20),
    registration_date       DATE,
    -- Hypothecation
    is_hypothecation        BOOLEAN DEFAULT FALSE,
    hypothecation_bank      VARCHAR(100),
    hypothecation_date      DATE,
    -- Documents
    form_20_url             VARCHAR(500),
    form_21_url             VARCHAR(500),
    form_22_url             VARCHAR(500),
    form_34_url             VARCHAR(500),
    rc_url                  VARCHAR(500),                   -- Registration certificate
    -- Portal
    vahan_application_id    VARCHAR(100),
    rto_portal_username     VARCHAR(100),
    submitted_at            TIMESTAMPTZ,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rto_booking ON rto_applications(booking_id);
```

---

## 14. Delivery

```sql
CREATE TYPE delivery_status AS ENUM (
    'not_scheduled',
    'scheduled',
    'customer_confirmed',
    'in_progress',
    'completed',
    'rescheduled',
    'cancelled'
);

CREATE TABLE delivery_schedules (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id              UUID NOT NULL REFERENCES bookings(id),
    vehicle_id              UUID NOT NULL REFERENCES vehicles(id),
    delivery_manager_id     UUID NOT NULL REFERENCES users(id),
    sales_consultant_id     UUID NOT NULL REFERENCES users(id),
    status                  delivery_status NOT NULL DEFAULT 'not_scheduled',
    scheduled_date          DATE NOT NULL,
    scheduled_time_slot     VARCHAR(20) NOT NULL,           -- e.g. '10:00-11:00'
    delivery_bay            VARCHAR(20),
    customer_confirmed_at   TIMESTAMPTZ,
    started_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    reschedule_reason       TEXT,
    cancellation_reason     TEXT,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_booking ON delivery_schedules(booking_id);
CREATE INDEX idx_delivery_date ON delivery_schedules(scheduled_date);

CREATE TABLE delivery_checklists (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_schedule_id    UUID NOT NULL REFERENCES delivery_schedules(id),
    completed_by            UUID NOT NULL REFERENCES users(id),
    -- Physical check items
    exterior_checked        BOOLEAN DEFAULT FALSE,
    interior_checked        BOOLEAN DEFAULT FALSE,
    accessories_verified    BOOLEAN DEFAULT FALSE,
    documents_verified      BOOLEAN DEFAULT FALSE,   -- RC (temp/permanent), insurance, invoice
    -- Documents handed over
    invoice_copy_given      BOOLEAN DEFAULT FALSE,
    insurance_policy_given  BOOLEAN DEFAULT FALSE,
    temp_rc_given           BOOLEAN DEFAULT FALSE,
    warranty_card_given     BOOLEAN DEFAULT FALSE,
    owners_manual_given     BOOLEAN DEFAULT FALSE,
    service_booklet_given   BOOLEAN DEFAULT FALSE,
    -- Keys
    keys_count              SMALLINT DEFAULT 2,
    keys_given              SMALLINT DEFAULT 0,
    -- Accessories check
    floor_mats_given        BOOLEAN DEFAULT FALSE,
    seat_covers_given       BOOLEAN DEFAULT FALSE,
    -- Demo
    vehicle_features_explained BOOLEAN DEFAULT FALSE,
    infotainment_demo_done  BOOLEAN DEFAULT FALSE,
    adas_features_explained BOOLEAN DEFAULT FALSE,
    -- Fuel
    fuel_level              VARCHAR(20),
    -- Customer satisfaction
    customer_happy          BOOLEAN,
    customer_feedback       TEXT,
    completed_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE delivery_confirmations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_schedule_id    UUID NOT NULL REFERENCES delivery_schedules(id),
    customer_signature_url  VARCHAR(500),               -- S3 URL of digital signature
    sales_signature_url     VARCHAR(500),
    confirmed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    customer_name_signed    VARCHAR(200),
    ip_address              INET,
    device_info             TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE delivery_photos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_schedule_id UUID NOT NULL REFERENCES delivery_schedules(id),
    photo_type          VARCHAR(50) NOT NULL,           -- 'front', 'rear', 'left', 'right', 'key_handover', 'family'
    s3_url              VARCHAR(500) NOT NULL,
    uploaded_by         UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 15. Post-Sale CRM

```sql
CREATE TABLE follow_up_schedules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id             UUID NOT NULL REFERENCES leads(id),
    assigned_to         UUID NOT NULL REFERENCES users(id),
    follow_up_type      VARCHAR(50) NOT NULL,           -- 'call', 'whatsapp', 'visit', 'email'
    subject             VARCHAR(200),
    scheduled_at        TIMESTAMPTZ NOT NULL,
    completed_at        TIMESTAMPTZ,
    outcome             VARCHAR(50),
    notes               TEXT,
    is_auto_generated   BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_followup_scheduled ON follow_up_schedules(scheduled_at)
    WHERE completed_at IS NULL;

CREATE TABLE service_reminders (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id              UUID NOT NULL REFERENCES bookings(id),
    vehicle_id              UUID NOT NULL REFERENCES vehicles(id),
    reminder_type           VARCHAR(50) NOT NULL,       -- 'first_service', 'periodic_service', 'insurance_renewal'
    reminder_date           DATE NOT NULL,
    km_due                  INTEGER,
    is_sent                 BOOLEAN DEFAULT FALSE,
    sent_at                 TIMESTAMPTZ,
    channel                 VARCHAR(20),                -- 'whatsapp', 'sms', 'email'
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_reminders_date ON service_reminders(reminder_date)
    WHERE is_sent = FALSE;

CREATE TABLE customer_feedback (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id              UUID NOT NULL REFERENCES bookings(id),
    delivery_schedule_id    UUID REFERENCES delivery_schedules(id),
    feedback_type           VARCHAR(50) NOT NULL,       -- 'post_delivery', '30_day', '90_day', 'csi'
    overall_rating          SMALLINT CHECK (overall_rating BETWEEN 1 AND 10),
    sales_rating            SMALLINT CHECK (sales_rating BETWEEN 1 AND 5),
    process_rating          SMALLINT CHECK (process_rating BETWEEN 1 AND 5),
    delivery_rating         SMALLINT CHECK (delivery_rating BETWEEN 1 AND 5),
    vehicle_rating          SMALLINT CHECK (vehicle_rating BETWEEN 1 AND 5),
    would_recommend         BOOLEAN,
    feedback_text           TEXT,
    submitted_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GST state codes reference table
CREATE TABLE gst_state_codes (
    state_code          VARCHAR(5) PRIMARY KEY,
    state_name          VARCHAR(100) NOT NULL UNIQUE,
    is_ut               BOOLEAN DEFAULT FALSE
);

-- RTO registration charge reference by state
CREATE TABLE rto_charges (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state               VARCHAR(100) NOT NULL,
    vehicle_category    VARCHAR(50) NOT NULL,           -- 'car', 'suv', 'ev'
    min_price           NUMERIC(14,2) NOT NULL,
    max_price           NUMERIC(14,2),
    registration_tax_pct NUMERIC(5,2) NOT NULL,
    registration_fee    NUMERIC(14,2) NOT NULL DEFAULT 600,
    green_tax           NUMERIC(14,2) NOT NULL DEFAULT 0,
    effective_from      DATE NOT NULL,
    effective_to        DATE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Database Extensions & Conventions

```sql
-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- For gen_random_uuid() and encryption functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- For fuzzy text search on customer names

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at' AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
        ', t, t);
    END LOOP;
END;
$$;
```
