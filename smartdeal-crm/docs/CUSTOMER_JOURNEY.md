# SmartDeal CRM – Customer Journey

## Overview

The SmartDeal customer journey consists of **16 digital steps** that transform a walk-in customer (or digital inquiry) into a delivered vehicle owner, with full post-sale engagement. Every step is paperless, trackable, and triggers automated notifications.

---

## Step 1: Showroom Entry (QR Scan)

**Channel:** QR code at dealership gate, reception desk, and marketing materials

**What Happens:**
1. Customer scans QR code with smartphone camera
2. Redirected to a mobile-optimised micro-form (name, phone, interested model)
3. Consent checkbox for data collection (DPDP Act 2023 compliant)
4. On form submission:
   - Lead is created in SmartDeal with source = `qr_walk_in`
   - Round-robin assignment algorithm assigns next available sales consultant
   - WhatsApp message sent to consultant: "New walk-in: Amit Sharma, interested in Nexon"
   - WhatsApp message sent to customer: "Welcome to Akar Motors! Your consultant Priya Singh will meet you shortly."
5. Receptionist's dashboard shows new walk-in notification

**Data Captured:**
- Name, phone, email (optional)
- Interested model, city
- QR session ID for journey tracking

**System Components:** Lead Service, Notification Service, WhatsApp API

---

## Step 2: Requirement Discovery

**Touchpoint:** Sales consultant's tablet or desktop

**What Happens:**
1. Consultant sits with customer and opens the Requirement Discovery Wizard
2. Guided conversation captures:
   - **Family profile:** Number of members, primary driver age
   - **Usage pattern:** City/highway/mixed, approximate daily KM
   - **Budget:** Down payment capacity, desired EMI range
   - **Fuel preference:** Petrol / Diesel / CNG / Electric
   - **Transmission:** Manual / AMT / Automatic
   - **Feature priorities:** Safety / Comfort / Performance / Economy / Technology
   - **Infrastructure:** Garage availability, charging point (for EV)
   - **Exchange:** Existing vehicle details if planning exchange
   - **Financing:** Whether they need a loan

**System Components:** Lead Service (requirement_discovery table), AI Service

**AI Processing:** Requirements are scored against the vehicle catalogue. A ranked recommendation list is generated within 2 seconds.

---

## Step 3: Product Presentation

**Touchpoint:** Sales consultant's desktop, showroom display screen

**What Happens:**
1. AI recommendation list shown: Top 3 vehicle variants ranked by match %
2. Digital vehicle comparison table (side-by-side specs, features, colours)
3. 360° image viewer and feature videos for each variant
4. Live stock availability check:
   - "3 units available in Cosmic Gold" or "45-day waiting period"
5. Consultant can add up to 4 vehicles to comparison
6. Customer indicates preferred variant(s) to proceed to quotation

**System Components:** Stock Service (real-time availability), Analytics Service (AI recommendation), Vehicle catalogue data

---

## Step 4: Quotation Engine

**Touchpoint:** Sales consultant desktop, WhatsApp (PDF share)

**What Happens:**
1. Consultant selects variant, colour, accessories, insurance option, extended warranty
2. System auto-calculates all components:
   - Ex-showroom price (from vehicle_variants pricing table)
   - GST (CGST+SGST for intra-state / IGST for inter-state based on customer state)
   - Compensation cess (where applicable)
   - State-specific RTO charges (from rto_charges table – all 29 states + 8 UTs)
   - Insurance premium (from live insurer API or stored rates)
   - Accessories total with GST
   - Extended warranty
   - Handling charges
   - TCS (1% for vehicles above ₹10 Lakh under Section 206C)
   - Manufacturer / dealer discounts
3. EMI breakup shown for selected loan amount and tenure
4. Quotation PDF generated (Puppeteer-rendered, branded Akar Motors template)
5. PDF shared via WhatsApp with customer
6. Quotation valid for 30 days
7. Multiple quotations possible per lead (comparison, revision)
8. Discount above ₹5,000 triggers approval workflow to Sales Manager

**System Components:** Quotation Service (extends legacy index.js), Billing Service (GST engine), Notification Service

---

## Step 5: Test Drive Management

**Touchpoint:** Sales consultant desktop / customer WhatsApp confirmation

**What Happens:**
1. Customer expresses interest in test drive
2. Consultant opens test drive calendar showing available slots
3. Driving Licence captured: DL number, expiry date, class (LMV), front/back photo upload
4. Slot booked; WhatsApp confirmation sent to customer with time, location, consultant contact
5. Day of test drive:
   - Demo vehicle assigned (dedicated demo car with VIN)
   - Odometer reading recorded at start
   - Route noted (standard test drive route)
   - After completion: odometer end reading, duration
6. Digital feedback form shown on tablet:
   - Overall rating (1-5 stars)
   - Specific feedback (ride quality, features, comfort, driving ease)
   - "Would you like to proceed with booking?" Yes/No/Need more time
7. Feedback stored, triggers next action recommendation for consultant

**System Components:** Lead Service (test_drive_schedules), Stock Service (demo vehicle), Notification Service

---

## Step 6: Exchange Evaluation

**Touchpoint:** Sales consultant desktop or dedicated exchange evaluator

**Triggered when:** Customer indicates they have an existing vehicle to exchange

**What Happens:**
1. Exchange form filled: make, model, variant, year, registration number, odometer, service history, accident history
2. Physical inspection by sales consultant or dedicated exchange evaluator
3. Multi-photo upload required (min 6 photos: front, rear, left, right, interior, engine)
4. Damage photos with area marked and description
5. RC book scan, insurance copy, PUC copy uploaded
6. Loan outstanding check: If vehicle under hypothecation, NOC process noted
7. Market valuation fetched (from integrated C2B valuation APIs or manual entry)
8. Dealer offer set by Sales Manager
9. Offer shared with customer via WhatsApp
10. Customer accepts/rejects:
    - If accepted: Exchange value deducted from new vehicle quotation
    - If rejected: Consultant can revise offer (within limits)
11. Exchange bonus (manufacturer promotional exchange bonus) applied if applicable

**System Components:** Lead Service (exchange_evaluations, exchange_photos), Quotation Service (exchange deduction)

---

## Step 7: Booking

**Touchpoint:** Sales consultant desktop / Customer portal

**What Happens:**
1. Customer decides to book: Consultant opens booking form
2. Quotation linked to booking
3. KYC document collection (digital upload):
   - PAN card (mandatory for vehicles > ₹2 Lakh per IT Act)
   - Aadhaar card (for address proof and identity)
   - Address proof (if address differs from Aadhaar)
   - Company PAN + GST certificate (for corporate bookings)
4. PAN validation via NSDL API (real-time)
5. Aadhaar verification: Customer enters last 4 digits + OTP on registered mobile (UIDAI)
6. Booking amount collection:
   - Payment link generated via Razorpay
   - Customer pays via UPI / card / netbanking
   - OR in-showroom UPI QR generated
   - Booking receipt generated on payment confirmation
7. Colour preference (1st and 2nd choice) noted
8. Vehicle VIN allocation (if stock available) or waiting period confirmed
9. WhatsApp confirmation: "Your booking BKN-2024-00089 is confirmed! Delivery expected by Jan 25, 2024."
10. Customer portal access credentials sent via WhatsApp

**System Components:** Booking Service, Stock Service (VIN lock), Razorpay, Notification Service, AWS S3 (KYC documents)

---

## Step 8: Finance Module

**Touchpoint:** Finance Manager desktop / Customer portal

**Triggered when:** Customer opts for vehicle loan

**What Happens:**
1. Finance manager (or sales consultant) opens Finance module
2. Loan parameters set: loan amount, tenure, bank preference
3. System queries bank APIs (HDFC, SBI, Tata Capital, Kotak, Axis) for real-time rates
4. Multi-bank EMI comparison table shown:
   - Interest rate, EMI amount, processing fee, LTV ratio, special offers
5. Subvention schemes highlighted (manufacturer-subsidised rates, e.g., 0% for 12 months)
6. Customer selects preferred bank and product
7. Loan application form filled: personal details, employment, income, co-applicant (if any)
8. Loan documents uploaded: salary slips (3 months), bank statements (6 months), ITR/Form 16, existing loan NOC
9. Application submitted to bank API
10. Status tracking: under review → credit check → approved → sanctioned
11. Sanction letter received → disbursement order placed to bank
12. Loan disbursement = bank transfers funds to dealership
13. Customer notified at each milestone via WhatsApp

**System Components:** Finance Service, Bank APIs, Notification Service, AWS S3

---

## Step 9: Insurance Selection

**Touchpoint:** Sales consultant desktop / Finance manager desktop

**Regulatory Note:** Motor vehicle insurance is mandatory under Motor Vehicles Act 1988. IRDAI-compliant process.

**What Happens:**
1. Vehicle IDV (Insured Declared Value) auto-calculated from ex-showroom price
2. Insurance comparison fetched from multiple insurers:
   - Tata AIG, Bajaj Allianz, ICICI Lombard, New India Assurance
3. Policy types shown: Comprehensive / Own Damage + Third Party
4. Add-on selection:
   - Zero Depreciation (most popular)
   - Roadside Assistance (RSA)
   - Engine Protection Cover
   - Consumables Cover
   - Tyre Protect
   - Return to Invoice
5. NCB (No Claim Bonus) applied if customer has existing vehicle with NCB certificate
6. Premium comparison table with all add-ons calculated
7. Customer selects insurer and add-ons
8. Policy issued via insurer API
9. Policy document (PDF) stored in AWS S3 and shared via WhatsApp
10. Insurance premium added to final invoice

**System Components:** Insurance Service, Insurer APIs, Notification Service

---

## Step 10: Billing Module

**Touchpoint:** Accounts department

**What Happens:**
1. Proforma invoice generated once all amounts confirmed (quotation → booking → finance → insurance)
2. Proforma shared with customer for verification
3. Final GST Tax Invoice generated on delivery day:
   - HSN code 87.03 for vehicles, appropriate codes for accessories
   - CGST + SGST for intra-state (customer's registration state = dealership state)
   - IGST for inter-state transactions
   - TCS calculated if vehicle > ₹10 Lakh (Section 206C, TCS certificate issued)
4. Payment reconciliation:
   - Booking advance (already received)
   - Loan disbursement from bank
   - Balance amount from customer (if any)
5. e-Invoice generated via GST portal (IRN + QR code embedded in invoice PDF)
6. Invoice number in format: INV/2024-25/00089 (Indian fiscal year format)
7. Invoice emailed and WhatsApp shared with customer

**System Components:** Billing Service, GST Portal API, Notification Service

---

## Step 11: Vehicle Stock Management

**Touchpoint:** Stock manager / Admin (background operational step)

**What Happens:**
1. Vehicle VIN definitively allocated to booking (status: `allocated`)
2. Vehicle moved from general yard to delivery preparation zone (status: `pdi_in_progress`)
3. Battery charged, tank filled (if petrol/diesel), gas filled (if CNG)
4. Any pending accessories fitted (floor mats, seat covers, body kit, etc.)
5. Windshield sticker / RTO sticker placement
6. Dealer number plate fitted (temporary)
7. Yard management system updated with bay location

**System Components:** Stock Service, PDI Service

---

## Step 12: Pre-Delivery Inspection (PDI)

**Touchpoint:** PDI Technician — Tablet App

**What Happens:**
1. PDI checklist assigned to technician for the specific VIN
2. Technician opens tablet app and starts checklist
3. ~25-item inspection across 5 sections:
   - **Exterior:** Body alignment, paint quality, glass integrity, tyres, lights
   - **Interior:** Seat condition, dashboard, infotainment, AC, all switches
   - **Mechanical:** Engine, battery (EV), fluid levels, brakes, steering
   - **Electrical:** All electrical systems, ADAS sensors, connected car features
   - **Documentation:** RC (in transit), insurance in system, warranty card
4. For each item: Pass / Fail / Rework / N/A
5. Photo evidence mandatory for Fail and Rework items
6. Technician adds notes for issues found
7. If all critical items Pass → PDI marked Complete → delivery unlocked
8. If any critical Fail → Rework workflow triggered → re-inspection required
9. PDI completion certificate generated and stored in S3
10. Delivery service automatically notified: "PDI complete for VIN MA3FJBB1S00123456"

**System Components:** PDI Service, Stock Service, Delivery Service (event trigger), AWS S3

---

## Step 13: RTO Document Generation

**Touchpoint:** Accounts / Admin

**What Happens:**
1. RTO application created in system with customer and vehicle details
2. Auto-fill of RTO forms from data already in system:
   - **Form 20:** Application for registration of motor vehicle
   - **Form 21:** Sale certificate from dealer (dealer signs)
   - **Form 22:** Certificate of roadworthiness from manufacturer
   - **Form 34:** Hypothecation entry (if loan)
3. RTO charges calculated and verified against rto_charges table
4. Documents submitted digitally to Vahan portal (where available) OR printed for physical submission
5. Temporary registration issued (valid 30 days until permanent RC received)
6. Permanent RC received and registration number updated in system
7. Registration number sent to customer via WhatsApp
8. Vehicle data updated with registration number

**System Components:** RTO Service, Vahan API, Notification Service

---

## Step 14: Delivery Scheduling

**Touchpoint:** Delivery Manager desktop / Customer portal / WhatsApp

**Pre-conditions:** PDI passed, insurance issued, invoice generated, payment cleared

**What Happens:**
1. Delivery manager (or consultant) opens delivery calendar
2. Available delivery bays and time slots shown
3. Slot selected based on customer preference
4. Delivery Manager and Sales Consultant assigned
5. Booking confirmation:
   - WhatsApp to customer: "Your Tata Nexon delivery is scheduled for 25 Jan 2024 at 11:00 AM at Akar Motors, Pune. Get Directions: [maps link]"
   - Calendar event invitation sent
6. Automated reminders:
   - 24 hours before: "Reminder: Your delivery tomorrow at 11:00 AM..."
   - 1 hour before: "Your delivery is in 1 hour! We're getting your vehicle ready 🚗"
7. Checklist preparation: Delivery manager ensures all items ready:
   - Invoice copy, insurance policy, RC (temp), warranty card, service booklet, owner manual, keys, accessories

**System Components:** Delivery Service, Notification Service

---

## Step 15: Delivery Experience

**Touchpoint:** Delivery Manager tablet/desktop at delivery bay

**What Happens:**
1. Customer arrives at dealership, welcomed at delivery bay
2. Vehicle parked in decorated delivery bay (optional: bow/balloons setup)
3. **Pre-handover checks (dealer side):**
   - All accessories verified against invoice
   - Fuel level confirmed (full tank for petrol/diesel)
   - Temporary registration sticker on windshield
4. **Document handover (digital checklist):**
   - ☑ Original invoice (with IRN QR code)
   - ☑ Insurance policy document
   - ☑ Temporary RC (permanent RC by post in 30-60 days)
   - ☑ Warranty card
   - ☑ Service booklet
   - ☑ Owner's manual
   - ☑ Emergency toolkit
   - ☑ Both sets of keys
5. **Vehicle demonstration (30-45 minutes):**
   - Exterior walkthrough
   - Infotainment and connected car demo (Tata Motors Connect / iRA)
   - ADAS features demonstration (Lane Assist, Auto Emergency Braking, etc.)
   - Emergency features (how to call for roadside assistance)
6. **Delivery photos captured:**
   - Front, rear, left, right of vehicle
   - Key handover moment
   - Happy family/customer photos (with consent)
7. **Digital signature capture:**
   - Customer signs on tablet: "I acknowledge receipt of vehicle and all documents"
   - Sales consultant countersigns
   - Stored securely in AWS S3
8. **Monroney sticker** provided if applicable
9. WhatsApp message: "Congratulations on your new Tata [Model]! 🎉 Your journey with Akar Motors has just begun. Your service due date is 15 Apr 2024."
10. Booking status updated to `delivered`; post-sale CRM triggered

**System Components:** Delivery Service, Notification Service, AWS S3 (signatures + photos)

---

## Step 16: Post-Sale CRM

**Touchpoint:** Sales consultant dashboard / Automated notifications

**What Happens:**

### Day 1 (Delivery Day)
- Auto-trigger: First follow-up scheduled for Day 3
- Thank you WhatsApp with dealership helpline number

### Day 3 Follow-up
- Consultant calls customer
- Check: "How is the vehicle? Any questions about features?"
- Log outcome in activity log

### Day 30 Survey
- WhatsApp message with feedback link
- Customer satisfaction survey (CSI – Customer Satisfaction Index)
  - Sales process rating (1-10)
  - Finance process rating
  - Delivery experience rating
  - Vehicle satisfaction rating
  - NPS (Net Promoter Score): "How likely are you to recommend us?"
- Feedback stored and linked to consultant's performance metrics

### First Free Service Reminder (1,000 km or 30 days, whichever first)
- WhatsApp + SMS: "Your first free service is due. Book at [service centre link]"
- Service reminder registered in system
- Escalation if not acknowledged: consultant follows up

### Periodic Service Reminders
- 7,500 km / 6 months (whichever first) for petrol/diesel
- Automated WhatsApp messages at each interval
- Service booking link (integration with Tata Motors service system)

### Insurance Renewal (11 months post-delivery)
- Renewal reminder sent 30 days before expiry
- Insurance comparison link shared via WhatsApp
- Consultant follow-up call

### Loyalty Program
- Customer marked as existing Tata customer
- Exchange bonus available on next purchase
- Loyalty discount on accessories and extended warranty

### Referral Program
- Customer invited to refer friends/family
- Referral tracked back to original customer (referral bonus)

**System Components:** Lead Service (follow_up_schedules), Notification Service, Feedback Module, Analytics Service

---

## Journey Timeline Summary

| Step | Typical Duration | Key Milestone |
|------|-----------------|---------------|
| 1. Showroom Entry | 2 minutes | Lead created, consultant assigned |
| 2. Requirement Discovery | 15-20 minutes | Customer profile captured |
| 3. Product Presentation | 20-30 minutes | Vehicle(s) shortlisted |
| 4. Quotation Engine | 10 minutes | Quotation PDF shared via WhatsApp |
| 5. Test Drive | 30-45 minutes | Feedback recorded |
| 6. Exchange Evaluation | 30-60 minutes | Offer made to customer |
| 7. Booking | 30-45 minutes | Booking confirmed, payment received |
| 8. Finance | 2-7 days | Loan approved and sanctioned |
| 9. Insurance | Same day | Policy issued |
| 10. Billing | 1-2 days | Final invoice with IRN |
| 11. Stock Management | 1-2 days (background) | VIN allocated and prepared |
| 12. PDI | 2-4 hours | PDI certificate issued |
| 13. RTO Documents | 1-3 days | Forms submitted to Vahan |
| 14. Delivery Scheduling | 5 minutes | Slot confirmed, customer notified |
| 15. Delivery Experience | 1-2 hours | Keys handed over, signatures done |
| 16. Post-Sale CRM | Ongoing (2+ years) | Service reminders, renewals, loyalty |

**Total Cycle Time (booking to delivery):** 7-15 working days (depending on finance and RTO)
