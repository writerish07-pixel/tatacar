# SmartDeal CRM – UI Wireframes

All wireframes use ASCII art. Each block represents a screen section.
Dimensions assume 1920×1080 desktop unless noted as tablet/mobile.

---

## 1. QR Code Showroom Entry Page (Mobile — Customer View)

```
┌──────────────────────────────────────────┐
│           AKAR MOTORS                    │
│         Tata Motors Dealership           │
│                                          │
│    ┌────────────────────────────────┐    │
│    │                                │    │
│    │    [TATA MOTORS LOGO IMAGE]    │    │
│    │                                │    │
│    └────────────────────────────────┘    │
│                                          │
│    ✅ Welcome to Akar Motors, Pune!      │
│    You've scanned the showroom QR.       │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ Your Name *                      │    │
│  │ ┌────────────────────────────┐   │    │
│  │ │ Amit Sharma                │   │    │
│  │ └────────────────────────────┘   │    │
│  │                                  │    │
│  │ Mobile Number *                  │    │
│  │ ┌────────────────────────────┐   │    │
│  │ │ +91 9988776655             │   │    │
│  │ └────────────────────────────┘   │    │
│  │                                  │    │
│  │ Interested In                    │    │
│  │ ┌────────────────────────────┐   │    │
│  │ │ ▾  Select a model          │   │    │
│  │ └────────────────────────────┘   │    │
│  │                                  │    │
│  │ ┌──────────────────────────────┐ │    │
│  │ │   🚗  GET MY CONSULTANT      │ │    │
│  │ └──────────────────────────────┘ │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ℹ️  Your consultant will meet you in   │
│     under 2 minutes.                     │
│                                          │
│  ─────────────────────────────────────   │
│  🔒 Your data is safe. DPDP compliant.  │
└──────────────────────────────────────────┘
```

---

## 2. Lead Capture Form (Sales Consultant — Desktop)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SMARTDEAL  [Akar Motors – Pune Main ▾]    Priya Singh 👤  [Logout]     │
├─────────────────────────────────────────────────────────────────────────┤
│ Dashboard > Leads > New Lead                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ➕ NEW LEAD                              Lead Source: [QR Walk-in ▾]  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ PERSONAL INFORMATION                                            │   │
│  │                                                                 │   │
│  │  First Name *          Last Name *        Phone *               │   │
│  │  ┌───────────────┐   ┌───────────────┐  ┌───────────────────┐  │   │
│  │  │ Amit          │   │ Sharma        │  │ 9988776655        │  │   │
│  │  └───────────────┘   └───────────────┘  └───────────────────┘  │   │
│  │                                                                 │   │
│  │  Email                  City              State                 │   │
│  │  ┌───────────────────┐ ┌─────────────┐  ┌───────────────────┐  │   │
│  │  │ amit@example.com  │ │ Pune        │  │ Maharashtra  ▾    │  │   │
│  │  └───────────────────┘ └─────────────┘  └───────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ INTEREST                                                        │   │
│  │                                                                 │   │
│  │  Interested Model       Fuel           Budget (Max)             │   │
│  │  ┌───────────────────┐ ┌─────────────┐ ┌───────────────────┐   │   │
│  │  │ Nexon         ▾   │ │ Petrol  ▾   │ │ ₹ 12,00,000      │   │   │
│  │  └───────────────────┘ └─────────────┘ └───────────────────┘   │   │
│  │                                                                 │   │
│  │  Has Exchange Vehicle?  Purchase Timeline                       │   │
│  │  ◉ Yes  ○ No           [Immediate ▾]                           │   │
│  │                                                                 │   │
│  │  Notes                                                          │   │
│  │  ┌────────────────────────────────────────────────────────┐    │   │
│  │  │ Saw Nexon EV ad, very interested in electric variant   │    │   │
│  │  └────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│       [CANCEL]                              [💾 SAVE LEAD →]           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Requirement Discovery Wizard

```
┌─────────────────────────────────────────────────────────────────────────┐
│  REQUIREMENT DISCOVERY      Lead: Amit Sharma (LDN-2024-00123)         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Step ●──────●──────○──────○──────○   (2 of 5)                       │
│         Family  Usage  Budget  Fuel  Priority                           │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │   🚗 HOW WILL YOU USE THE VEHICLE?                              │   │
│  │                                                                 │   │
│  │  Primary Usage                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ 🏙️  City     │  │ 🛣️ Highway  │  │ 🔀 Mixed     │          │   │
│  │  │  Commute    ●│  │   Driving   ○│  │   Use      ○ │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  │                                                                 │   │
│  │  Approximate Daily KM                                           │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │  0 ────────────●────────────────── 200 km/day            │   │   │
│  │  │                40 km/day                                 │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  │  Family Members                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │  1   2   3   ④   5   6   7+                             │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  │  Do you have a garage / parking?    ◉ Yes  ○ No  ○ Street      │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│      [← BACK]                                   [NEXT: BUDGET →]      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Vehicle Comparison Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│  VEHICLE COMPARISON                    Lead: Amit Sharma                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  🤖 AI Recommendation: Based on your profile (family of 4, city use,  │
│  ₹12L budget, petrol) — top matches:                                   │
│                                                                         │
│  ┌──────────────────┬──────────────────┬──────────────────┐            │
│  │   NEXON XZ+      │   PUNCH iCNG     │   HARRIER XZ     │            │
│  │   ★★★★★ 94%     │   ★★★★☆ 87%     │   ★★★★☆ 82%     │            │
│  ├──────────────────┼──────────────────┼──────────────────┤            │
│  │ [🚗 IMAGE]       │ [🚗 IMAGE]       │ [🚗 IMAGE]       │            │
│  ├──────────────────┼──────────────────┼──────────────────┤            │
│  │ ₹8,50,000        │ ₹7,20,000        │ ₹14,50,000       │            │
│  │ Ex-Showroom      │ Ex-Showroom      │ Ex-Showroom      │            │
│  ├──────────────────┼──────────────────┼──────────────────┤            │
│  │ ⛽ Petrol 1.2T   │ ⛽ CNG 1.2       │ ⛽ Diesel 2.0    │            │
│  │ 🔧 Manual        │ 🔧 AMT           │ 🔧 Automatic     │            │
│  │ 👥 5 seater      │ 👥 5 seater      │ 👥 5 seater      │            │
│  │ 🛡️  5-star NCAP  │ 🛡️  5-star NCAP  │ 🛡️  5-star NCAP  │            │
│  ├──────────────────┼──────────────────┼──────────────────┤            │
│  │ ✅ Sunroof       │ ❌ No sunroof    │ ✅ Sunroof       │            │
│  │ ✅ TPMS          │ ✅ TPMS          │ ✅ TPMS          │            │
│  │ ✅ 360° camera   │ ❌              │ ✅ 360° camera   │            │
│  │ ✅ ADAS          │ ❌              │ ✅ ADAS          │            │
│  │ ✅ Connected car │ ✅ Connected car │ ✅ Connected car │            │
│  ├──────────────────┼──────────────────┼──────────────────┤            │
│  │ 📅 In Stock: 3   │ 📅 In Stock: 1   │ 📅 Wait: 45 days │            │
│  ├──────────────────┼──────────────────┼──────────────────┤            │
│  │ [BUILD QUOTE]    │ [BUILD QUOTE]    │ [BUILD QUOTE]    │            │
│  │ [SCHEDULE DRIVE] │ [SCHEDULE DRIVE] │ [SCHEDULE DRIVE] │            │
│  └──────────────────┴──────────────────┴──────────────────┘            │
│                                                                         │
│  [+ ADD ANOTHER MODEL TO COMPARE]                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Quotation Builder

```
┌─────────────────────────────────────────────────────────────────────────┐
│  QUOTATION BUILDER                  QTN-2024-00456 | Draft | v1        │
├───────────────────────────────────────────┬─────────────────────────────┤
│  CONFIGURE VEHICLE                        │  PRICE SUMMARY              │
│                                           │                             │
│  Model: Tata Nexon XZ+ Petrol MT         │  Ex-Showroom   ₹8,50,000   │
│  ────────────────────────────────────     │  ─────────────────────────  │
│  Registration State: [Maharashtra ▾]     │  GST (28%)     ₹2,38,000   │
│                                           │    CGST (14%)  ₹1,19,000   │
│  ACCESSORIES                             │    SGST (14%)  ₹1,19,000   │
│  ┌─────────────────────────────────────┐ │  ─────────────────────────  │
│  │ ☑ Floor Mats (Genuine)    ₹4,500   │ │  RTO Charges   ₹1,19,600   │
│  │ ☑ Seat Covers             ₹8,200   │ │    Road Tax    ₹1,19,000   │
│  │ ☑ Body Side Moulding      ₹6,800   │ │    Reg. Fee        ₹600    │
│  │ ☐ Mud Flaps               ₹2,400   │ │  ─────────────────────────  │
│  │ ☐ Roof Rails             ₹12,000   │ │  Insurance      ₹45,000    │
│  │ [+ Add More Accessories]           │ │  Accessories    ₹19,500    │
│  └─────────────────────────────────────┘ │  Ext. Warranty  ₹15,000    │
│                                           │  Handling        ₹5,000    │
│  INSURANCE                               │  ─────────────────────────  │
│  ○ Select from comparison [→]            │  TCS (1%)        ₹8,500    │
│  ✅ Tata AIG Comprehensive  ₹45,000    │  ─────────────────────────  │
│                                           │  Discount       -₹20,000   │
│  EXTENDED WARRANTY                       │  ─────────────────────────  │
│  ◉ 3 Years / 1,00,000 km   ₹15,000   │                             │
│  ○ 5 Years / 1,50,000 km   ₹22,000   │  ON-ROAD PRICE              │
│  ○ No Extended Warranty                  │  ┌─────────────────────┐   │
│                                           │  │   ₹10,80,600        │   │
│  DISCOUNTS                               │  └─────────────────────┘   │
│  Manufacturer Offer:   ₹0               │                             │
│  Dealer Discount:      ₹20,000          │  EMI @ ₹60L loan, 60m      │
│  Exchange Bonus:       ₹0               │  ┌─────────────────────┐   │
│  [Request Higher Discount →]             │  │  ₹12,465 / month   │   │
│                                           │  │  @ 8.9% p.a.       │   │
│                                           │  └─────────────────────┘   │
│                                           │                             │
│                                           │  Valid: 14 Jan – 14 Feb    │
│                                           │                             │
│  [CANCEL]    [SAVE DRAFT]               │  [📤 SHARE ON WHATSAPP]     │
│                                           │  [📥 DOWNLOAD PDF]          │
└───────────────────────────────────────────┴─────────────────────────────┘
```

---

## 6. Test Drive Scheduler

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SCHEDULE TEST DRIVE                Lead: Amit Sharma                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Vehicle: Tata Nexon XZ+ Petrol MT (Demo car: MH-12-XX-1234)          │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  SELECT DATE                                                    │   │
│  │                                                                 │   │
│  │    JANUARY 2024                                                 │   │
│  │  Mo  Tu  We  Th  Fr  Sa  Su                                    │   │
│  │   1   2   3   4   5   6   7                                    │   │
│  │   8   9  10  11  12  13  14                                    │   │
│  │  15  16  17  18  19 [20] 21  ← Selected                        │   │
│  │  22  23  24  25  26  27  28                                    │   │
│  │  29  30  31                                                    │   │
│  │  ⬜ = Available  ⬛ = Full  🔵 = Selected                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  SELECT TIME SLOT (Saturday, Jan 20, 2024)                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐             │
│  │ 09:00  │ │ 10:00  │ │[11:00] │ │ 12:00  │ │ 14:00  │             │
│  │ FULL   │ │  ✅    │ │  ✅ ●  │ │  ✅    │ │  ✅    │             │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘             │
│  ┌────────┐ ┌────────┐                                               │
│  │ 15:00  │ │ 16:00  │                                               │
│  │  ✅    │ │  ✅    │                                               │
│  └────────┘ └────────┘                                               │
│                                                                         │
│  DRIVING LICENCE VERIFICATION                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ DL Number *     Expiry Date *    Class                          │   │
│  │ ┌────────────┐  ┌────────────┐  ┌────────────┐                 │   │
│  │ │ MH12 2010  │  │ 2030-05-15 │  │ LMV        │                 │   │
│  │ └────────────┘  └────────────┘  └────────────┘                 │   │
│  │                                                                 │   │
│  │  📷 Upload DL Photo: [Choose File]   ✅ Verified               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│      [CANCEL]                        [📅 CONFIRM TEST DRIVE]           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Exchange Evaluation Form

```
┌─────────────────────────────────────────────────────────────────────────┐
│  EXCHANGE EVALUATION            Lead: Amit Sharma                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  VEHICLE DETAILS                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Make           Model           Variant       Year              │   │
│  │  [Maruti Suzu ▾][Swift     ▾] [ZXi        ▾] [2019        ▾]  │   │
│  │                                                                 │   │
│  │  Registration No.*    State             Odometer (km)          │   │
│  │  ┌──────────────┐    [Maharashtra ▾]   ┌────────────────┐      │   │
│  │  │ MH12AB1234   │                      │ 45,000         │      │   │
│  │  └──────────────┘                      └────────────────┘      │   │
│  │                                                                 │   │
│  │  Fuel Type     Service History        Accidents                │   │
│  │  [Petrol ▾]   ◉ Full OEM  ○ Partial  ○ None    [0       ]    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  UPLOAD PHOTOS (min. 6 photos)                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │   │
│  │  │ [Front ✅]│ │[Rear  ✅]│ │[Left  ✅]│ │[Right ✅]│          │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │   │
│  │  │[Interior✅]│ │[Engine✅]│ │[Damage+] │ │    +    │          │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  LOAN STATUS                                                            │
│  Is vehicle under loan?  ◉ Yes  ○ No                                   │
│  Bank: [HDFC Bank ▾]   Outstanding: ₹ [1,20,000]                      │
│                                                                         │
│  ESTIMATED VALUE     Market Value: ₹ 4,50,000                         │
│  Dealer Offer:  ₹ [3,80,000]    Exchange Bonus: ₹ [20,000]            │
│                                                                         │
│  Notes: ┌─────────────────────────────────────────────────────────┐   │
│         │ Minor scratch on rear bumper. All 4 tyres good.          │   │
│         └─────────────────────────────────────────────────────────┘   │
│                                                                         │
│  [CANCEL]          [SAVE DRAFT]          [📤 SEND OFFER TO CUSTOMER]  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Booking Form with Document Upload

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BOOKING FORM                     BKN-2024-00089 | Pending Docs        │
├─────────────────────────────────────────────────────────────────────────┤
│  Progress: [Quotation ✅] → [Booking Form ●] → [Documents] → [Payment] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  BOOKING SUMMARY                                                        │
│  Vehicle: Tata Nexon XZ+ Petrol MT | On-Road: ₹10,80,600              │
│  Booking Amount: ₹ 25,000   |   Colour Pref 1: Cosmic Gold             │
│                                                                         │
│  KYC DOCUMENTS                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │  1. PAN CARD *                                    ✅ Uploaded   │   │
│  │  ┌─────────────────────────────────────────┐                   │   │
│  │  │ PAN Number: ABCDE1234F  [View] [Replace]│                   │   │
│  │  └─────────────────────────────────────────┘                   │   │
│  │                                                                 │   │
│  │  2. AADHAAR CARD *                                ⏳ Pending   │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │  📷 Front Side: [Choose File]                           │   │   │
│  │  │  📷 Back Side:  [Choose File]                           │   │   │
│  │  │                                                         │   │   │
│  │  │  OR  Verify via Aadhaar OTP: [Send OTP to Registered   │   │   │
│  │  │                               Mobile]                   │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  │  3. ADDRESS PROOF *                               ⏳ Pending   │   │
│  │  Type: [Voter ID ▾]   📷 [Choose File]                         │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  REGISTRATION ADDRESS                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Same as Aadhaar address ☑                                       │   │
│  │ City: Pune | State: Maharashtra | Pincode: 411001               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   [CANCEL]                    [SAVE & PROCEED TO PAYMENT →]            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Finance Comparison Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FINANCE COMPARISON               Vehicle On-Road: ₹10,80,600          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Down Payment: ₹ [2,80,600]   Loan Amount: ₹ [8,00,000]               │
│  Tenure: ○ 36m  ○ 48m  ◉ 60m  ○ 72m  ○ 84m                          │
│                                                                         │
│  ┌─────────┬──────────┬────────────┬──────────┬──────────┬──────────┐  │
│  │ BANK    │ RATE     │ EMI/month  │ Proc.Fee │ LTV      │ ACTION   │  │
│  ├─────────┼──────────┼────────────┼──────────┼──────────┼──────────┤  │
│  │ Tata    │ 7.99%   │  ₹16,223   │ ₹0       │ 85%      │[SELECT ●]│  │
│  │ Capital │ ⭐BEST   │            │ Subvented│          │          │  │
│  ├─────────┼──────────┼────────────┼──────────┼──────────┼──────────┤  │
│  │ HDFC    │ 8.50%   │  ₹16,534   │ ₹4,999   │ 85%      │[SELECT]  │  │
│  │ Bank    │          │            │          │          │          │  │
│  ├─────────┼──────────┼────────────┼──────────┼──────────┼──────────┤  │
│  │ SBI     │ 8.75%   │  ₹16,686   │ ₹2,500   │ 80%      │[SELECT]  │  │
│  │         │          │            │          │          │          │  │
│  ├─────────┼──────────┼────────────┼──────────┼──────────┼──────────┤  │
│  │ Kotak   │ 9.25%   │  ₹16,999   │ ₹3,999   │ 85%      │[SELECT]  │  │
│  │ Bank    │          │            │          │          │          │  │
│  ├─────────┼──────────┼────────────┼──────────┼──────────┼──────────┤  │
│  │ Axis    │ 9.50%   │  ₹17,150   │ ₹5,000   │ 80%      │[SELECT]  │  │
│  │ Bank    │          │            │          │          │          │  │
│  └─────────┴──────────┴────────────┴──────────┴──────────┴──────────┘  │
│                                                                         │
│  Selected: Tata Capital @ 7.99%                                        │
│  EMI: ₹16,223/month × 60 months = Total Interest: ₹1,73,380           │
│                                                                         │
│  [← BACK TO BOOKING]              [PROCEED WITH TATA CAPITAL →]        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Insurance Selection Page

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INSURANCE SELECTION                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Vehicle: Tata Nexon XZ+ Petrol MT  |  IDV: ₹8,50,000                 │
│                                                                         │
│  Policy Type: ◉ Comprehensive  ○ Own Damage Only  ○ Third Party Only  │
│                                                                         │
│  ADD-ONS (select to include)                                            │
│  ☑ Zero Depreciation   ☑ Roadside Assistance   ☑ Engine Protect        │
│  ☐ Consumables Cover   ☐ Tyre Protect          ☐ Return to Invoice     │
│                                                                         │
│  NCB: 0% (New Vehicle)                                                  │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ INSURER       │ OD PREMIUM │ TP PREMIUM │ ADD-ONS   │  TOTAL      │ │
│  ├───────────────┼────────────┼────────────┼───────────┼─────────────┤ │
│  │ Tata AIG  ⭐  │  ₹12,800  │  ₹8,200   │ ₹6,500   │ ₹27,500    │ │
│  │ (Preferred)  ●│            │            │           │ + GST 18%   │ │
│  │               │            │            │           │ = ₹32,450  │ │
│  ├───────────────┼────────────┼────────────┼───────────┼─────────────┤ │
│  │ Bajaj Allianz │  ₹11,200  │  ₹8,200   │ ₹7,800   │ ₹27,200    │ │
│  │               │            │            │           │ = ₹32,096  │ │
│  ├───────────────┼────────────┼────────────┼───────────┼─────────────┤ │
│  │ ICICI Lombard │  ₹13,500  │  ₹8,200   │ ₹5,200   │ ₹26,900    │ │
│  │               │            │            │           │ = ₹31,742  │ │
│  └───────────────┴────────────┴────────────┴───────────┴─────────────┘ │
│                                                                         │
│  Selected: Tata AIG Comprehensive with Zero Dep + RSA + Engine Protect │
│  Total Premium: ₹32,450 (GST included)                                 │
│                                                                         │
│  [← BACK]                        [CONFIRM INSURANCE →]                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Billing / Invoice View

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AKAR MOTORS PVT. LTD.                           │
│                    Authorised Tata Motors Dealer                        │
│              Plot 42, Baner Road, Pune – 411045, Maharashtra           │
│              GSTIN: 27AABCA1234B1Z5  |  Ph: 020-12345678              │
├─────────────────────────────────────────────────────────────────────────┤
│                         TAX INVOICE (Original)                          │
│  Invoice No: INV/2024-25/00089           Date: 15-Jan-2024             │
│  IRN: 1a2b3c4d5e6f7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u      │
├─────────────────────────────────────────────────────────────────────────┤
│  Bill To:                           VIN: MA3FJBB1S00123456            │
│  Amit Sharma                        Engine No: 1.2RAN123456           │
│  42, Shivaji Nagar, Pune 411001     Chassis No: MA3FJBB1S00123456     │
│  PAN: ABCDE1234F                    Model: Nexon XZ+ Petrol MT        │
│  State: Maharashtra (27)            Colour: Cosmic Gold               │
├─────────────────────────────────────────────────────────────────────────┤
│  DESCRIPTION                         HSN     QTY   RATE      AMOUNT   │
│  ─────────────────────────────────────────────────────────────────     │
│  Vehicle: Tata Nexon XZ+ Petrol MT  8703      1  8,50,000  8,50,000  │
│  CGST @ 14%                                                  1,19,000  │
│  SGST @ 14%                                                  1,19,000  │
│  GST Cess @ 0%                                                      0  │
│  ─────────────────────────────────────────────────────────────────     │
│  Accessories (Floor Mats, Seat Covers)                          19,500  │
│  GST on Accessories @ 28%                                        5,460  │
│  ─────────────────────────────────────────────────────────────────     │
│  Insurance (Tata AIG)               9985              1     32,450    │
│  Extended Warranty                                             15,000   │
│  Handling & Logistics Charges                                   5,000   │
│  TCS u/s 206C @ 1%                                              8,500   │
│  ─────────────────────────────────────────────────────────────────     │
│  Less: Dealer Discount                                        -20,000   │
│  ═════════════════════════════════════════════════════════════════════  │
│  TOTAL AMOUNT (₹)                                         11,53,910   │
│  ═════════════════════════════════════════════════════════════════════  │
│  Amount in Words: Rupees Eleven Lakh Fifty-Three Thousand Nine         │
│                   Hundred and Ten Only                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  [📥 DOWNLOAD PDF]   [📤 SEND TO CUSTOMER]   [🖨️ PRINT]               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 12. PDI Checklist — Tablet View (1024×768)

```
┌────────────────────────────────────────────────────────────┐
│  PDI CHECKLIST          VIN: MA3FJBB1S00123456             │
│  Tech: Ravi Patil       Model: Nexon XZ+ Petrol MT         │
│  Date: 20-Jan-2024      Progress: ████████░░ 72% (18/25)  │
├────────────────────────────────────────────────────────────┤
│  [EXTERIOR] [INTERIOR] [MECHANICAL] [ELECTRICAL] [DOCS]    │
├────────────────────────────────────────────────────────────┤
│  ▼ EXTERIOR SECTION                                        │
│                                                            │
│  1. Body panel alignment        [✅ PASS] [❌ FAIL] [N/A] │
│     Notes: ________________________________               │
│     📷 Photo: [Upload]                                    │
│                                                            │
│  2. Paint finish – scratches/   [✅ PASS] [❌ FAIL] [N/A] │
│     dents/bubbles                                          │
│     Notes: ________________________________               │
│     📷 Photo: [Upload]                                    │
│                                                            │
│  3. All glass panels intact     [✅ PASS] [❌ FAIL] [N/A] │
│                                                            │
│  4. Wheel arch protectors      [⚠️ REWORK] ← Selected     │
│     Notes: Left front arch clip missing                   │
│     📷 [clip_missing.jpg ✅]                              │
│                                                            │
│  5. Tyre pressure (all 4+spare) [✅ PASS] [❌ FAIL] [N/A] │
│     Notes: All set to 35 PSI                              │
│                                                            │
│  ─────────────────────────────────────────────────────    │
│  ▼ INTERIOR SECTION                         [EXPAND]      │
│  ─────────────────────────────────────────────────────    │
│  ▷ MECHANICAL SECTION                       [EXPAND]      │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  ✅ 17 PASS   ⚠️  1 REWORK   ❌ 0 FAIL            │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  [SAVE PROGRESS]           [MARK COMPLETE & SIGN OFF]     │
└────────────────────────────────────────────────────────────┘
```

---

## 13. Delivery Scheduling

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SCHEDULE DELIVERY                    BKN-2024-00089 | PDI: ✅ Passed  │
├─────────────────────────────────────────────────────────────────────────┤
│  Customer: Amit Sharma  |  Vehicle: Nexon XZ+ (MH-12-XX-5678)         │
│                                                                         │
│  AVAILABLE DELIVERY SLOTS                                               │
│                                                                         │
│     Mon 22 Jan    Tue 23 Jan    Wed 24 Jan    Thu 25 Jan               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │ 09-10 Full │ │ 09-10 ✅  │ │ 09-10 ✅  │ │ 09-10 ✅  │           │
│  │ 10-11 Full │ │ 10-11 ✅  │ │ 10-11 Full │ │ 10-11 ●   │ ← Choose  │
│  │ 11-12 ✅  │ │ 11-12 Full │ │ 11-12 ✅  │ │ 11-12 ✅  │           │
│  │ 14-15 ✅  │ │ 14-15 ✅  │ │ 14-15 ✅  │ │ 14-15 ✅  │           │
│  │ 15-16 ✅  │ │ 15-16 ✅  │ │ 15-16 ✅  │ │ 15-16 ✅  │           │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘           │
│                                                                         │
│  Selected: Thursday, 25 Jan 2024 | 10:00 – 11:00 AM                   │
│  Delivery Bay: [BAY-D-02 ▾]                                            │
│  Delivery Manager: Anand Desai                                          │
│  Sales Consultant: Priya Singh                                          │
│                                                                         │
│  CUSTOMER NOTIFICATION                                                  │
│  ☑ Send WhatsApp confirmation to customer (9988776655)                 │
│  ☑ Send reminder 24 hours before (24 Jan 10:00 AM)                    │
│  ☑ Send reminder 1 hour before (25 Jan 09:00 AM)                      │
│                                                                         │
│  [CANCEL]                       [📅 CONFIRM DELIVERY SLOT]             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 14. Customer Portal — Track Booking & Delivery

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MY BOOKING                         Akar Motors Customer Portal        │
│  Booking: BKN-2024-00089                                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Tata Nexon XZ+ Petrol MT – Cosmic Gold                                │
│  Sales Consultant: Priya Singh  📞 9876543210                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  BOOKING JOURNEY                                                        │
│                                                                         │
│  ✅ Booking Confirmed                          15 Jan 2024             │
│  │   Booking amount ₹25,000 received                                   │
│  │                                                                      │
│  ✅ Documents Verified                         17 Jan 2024             │
│  │   PAN ✅  Aadhaar ✅  Address Proof ✅                              │
│  │                                                                      │
│  ✅ Finance Approved                           18 Jan 2024             │
│  │   Tata Capital | ₹8,00,000 | 60 months @ 7.99%                    │
│  │                                                                      │
│  ✅ Insurance Policy Issued                    18 Jan 2024             │
│  │   Tata AIG Comprehensive | Policy: TATAIG-2024-12345               │
│  │                                                                      │
│  ✅ Vehicle Ready (PDI Completed)              20 Jan 2024             │
│  │   VIN: MA3FJBB1S00123456                                            │
│  │                                                                      │
│  🔵 Delivery Scheduled                         25 Jan 2024             │
│  │   10:00 – 11:00 AM | Akar Motors, Pune                             │
│  │   [Add to Calendar]  [Get Directions]                               │
│  │                                                                      │
│  ⭕ Delivery                                  Upcoming                 │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  DOCUMENTS                                                              │
│  [📄 Quotation PDF]  [📄 Booking Receipt]  [📄 Insurance Policy]       │
│                                                                         │
│  NEED HELP?  📞 Call: 020-12345678   💬 WhatsApp: 9876543210          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 15. Sales Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SMARTDEAL                   📅 January 2024    [Branch: Pune Main ▾]  │
│  Sales Dashboard             Priya Singh | Sales Consultant             │
├─────────────────────────────────────────────────────────────────────────┤
│  MY PERFORMANCE THIS MONTH                                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│  │  LEADS     │ │  BOOKINGS  │ │ DELIVERIES │ │CONV. RATE  │          │
│  │    23      │ │     6      │ │     4      │ │   26.0%    │          │
│  │ ▲2 vs last │ │ ✅ Target  │ │            │ │ ▲ 8% MoM   │          │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘          │
│                                                                         │
│  TODAY'S FOLLOW-UPS (8)                    LEAD FUNNEL                 │
│  ┌────────────────────────────────────┐    ┌─────────────────────────┐ │
│  │ 10:00 📞 Rajesh – Nexon demo call  │    │ New        ████ 5       │ │
│  │ 11:30 📱 Sunita – EMI doubt        │    │ Contacted  ██████ 7     │ │
│  │ 14:00 🚶 Vikram – Second visit     │    │ Interested ████ 4       │ │
│  │ 15:00 📞 Pradeep – Quote revision  │    │ Demo Done  ██ 3         │ │
│  │ 16:00 📱 Meena – Delivery reminder │    │ Negotiat.  █ 2          │ │
│  │ [+3 more follow-ups]               │    │ Won        █ 2          │ │
│  └────────────────────────────────────┘    └─────────────────────────┘ │
│                                                                         │
│  MY ACTIVE LEADS                                                        │
│  ┌──────────────┬───────────────┬───────────┬──────────┬─────────────┐ │
│  │ CUSTOMER     │ MODEL         │ STATUS    │ LAST ACT │ NEXT ACTION  │ │
│  ├──────────────┼───────────────┼───────────┼──────────┼─────────────┤ │
│  │ Amit Sharma  │ Nexon XZ+     │ Won ✅    │ 2h ago   │ Delivery 25J│ │
│  │ Rajesh Verma │ Harrier XZ    │ Negotiat. │ 1d ago   │ Call today  │ │
│  │ Sunita Patel │ Punch iCNG    │ Demo Done │ 3d ago   │ Follow-up ⚠ │ │
│  │ Vikram Shah  │ Nexon EV Max  │ Interested│ 2d ago   │ Schedule demo│ │
│  │ [View All 23 Leads →]         │           │          │             │ │
│  └──────────────┴───────────────┴───────────┴──────────┴─────────────┘ │
│                                                                         │
│  STOCK AVAILABILITY (Quick View)                                        │
│  Nexon Petrol: 3 ✅ | Nexon EV: 0 ❌ (45d) | Harrier: 1 ✅ | Punch: 5│ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 16. Manager Dashboard with Analytics

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SMARTDEAL              January 2024     [All Branches ▾]   [Export]  │
│  Manager Dashboard      Sandeep Joshi | Sales Manager                  │
├─────────────────────────────────────────────────────────────────────────┤
│  KPIs THIS MONTH        ▲ vs Last Month                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ LEADS    │ │BOOKINGS  │ │DELIVERIES│ │ REVENUE  │ │CONV. RATE│   │
│  │   234    │ │   42     │ │   38     │ │₹4.2Cr    │ │  17.9%   │   │
│  │  ▲ 12%  │ │  ▲ 8%   │ │  ▲ 15%  │ │  ▲ 22%  │ │  ▲ 2.1pp │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                                         │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │ LEAD FUNNEL                     │  │ TOP MODELS (Deliveries)      │ │
│  │                                 │  │                              │ │
│  │ New         ■■■■■■ 45           │  │ 1. Nexon XZ+    14  ■■■■■■  │ │
│  │ Contacted   ■■■■■  67           │  │ 2. Punch iCNG   9   ■■■■    │ │
│  │ Demo Done   ■■■    45           │  │ 3. Harrier XZ   7   ■■■     │ │
│  │ Negotiation ■■     34           │  │ 4. Tiago CNG    5   ■■      │ │
│  │ Won         ■      42           │  │ 5. Nexon EV     3   ■       │ │
│  │ Lost        ●      46 (16.5%)   │  │                              │ │
│  └─────────────────────────────────┘  └──────────────────────────────┘ │
│                                                                         │
│  CONSULTANT PERFORMANCE                                                  │
│  ┌───────────────┬────────┬──────────┬───────────┬────────────────────┐ │
│  │ CONSULTANT    │ LEADS  │ BOOKINGS │ CONV. RATE│  REVENUE           │ │
│  ├───────────────┼────────┼──────────┼───────────┼────────────────────┤ │
│  │ 🥇 Priya Singh│   23   │    6     │  26.1%    │ ₹ 68,40,000       │ │
│  │ 🥈 Rahul Mehta│   31   │    7     │  22.6%    │ ₹ 73,50,000       │ │
│  │ 🥉 Anita Rao  │   28   │    5     │  17.9%    │ ₹ 51,20,000       │ │
│  │ Deepak Kumar  │   19   │    3     │  15.8%    │ ₹ 31,80,000       │ │
│  └───────────────┴────────┴──────────┴───────────┴────────────────────┘ │
│                                                                         │
│  PENETRATION RATES          STOCK ALERTS                                │
│  Finance:   ████ 78.5%     ⚠️  Nexon EV: 0 in stock (45d wait)       │
│  Insurance: █████ 92.3%    ⚠️  Harrier: Only 1 unit left              │
│  Accessories:███ 65.0%     ℹ️  15 vehicles >45 days in yard           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 17. Admin Configuration Panel

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SMARTDEAL ADMIN                                 Admin: Vikram Joshi   │
├─────────────────────────────────────────────────────────────────────────┤
│  [Dashboard] [Users] [Roles] [Vehicles] [Pricing] [RTO] [Integrations] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ⚙️  SYSTEM CONFIGURATION                                              │
│                                                                         │
│  ┌─────────────────┐  ┌──────────────────────────────────────────────┐ │
│  │ USER MANAGEMENT │  │  USER MANAGEMENT                             │ │
│  │ Roles & Perms   │  │                                              │ │
│  │ Branches        │  │  [+ ADD USER]           Search: [          ] │ │
│  │                 │  │                                              │ │
│  │ VEHICLE CONFIG  │  │  Name           Role           Branch  Status│ │
│  │ Models          │  │  ─────────────────────────────────────────── │ │
│  │ Variants        │  │  Priya Singh    Sales Conslt.  Pune   Active │ │
│  │ Pricing         │  │  Rahul Mehta    Sales Conslt.  Pune   Active │ │
│  │ Accessories     │  │  Anand Desai    Delivery Mgr   Pune   Active │ │
│  │                 │  │  Ravi Patil     PDI Technician  Pune   Active │ │
│  │ FINANCIAL       │  │  [View All 24 Users →]                       │ │
│  │ GST Settings    │  │                                              │ │
│  │ Discount Limits │  └──────────────────────────────────────────────┘ │
│  │ Bank Partners   │                                                   │ │
│  │ Insurance Co.   │  ┌──────────────────────────────────────────────┐ │
│  │                 │  │  DISCOUNT APPROVAL MATRIX                    │ │
│  │ INTEGRATIONS    │  │                                              │ │
│  │ WhatsApp API    │  │  Level 1: Sales Consultant  up to ₹ 5,000   │ │
│  │ Razorpay        │  │  Level 2: Sales Manager     up to ₹ 20,000  │ │
│  │ RTO Portal      │  │  Level 3: GM                up to ₹ 50,000  │ │
│  │ GST Portal      │  │  Level 4: MD                unlimited        │ │
│  │                 │  │  [EDIT MATRIX]                               │ │
│  │ NOTIFICATIONS   │  └──────────────────────────────────────────────┘ │
│  │ Templates       │                                                   │ │
│  │ Schedules       │  ┌──────────────────────────────────────────────┐ │
│  │                 │  │  SYSTEM STATUS                               │ │
│  │ REPORTS         │  │  API Gateway        ✅ Online               │ │
│  │ Export          │  │  Database           ✅ Online               │ │
│  │ Scheduled Rpts  │  │  Redis Cache        ✅ Online               │ │
│  └─────────────────┘  │  WhatsApp API       ✅ Connected            │ │
│                        │  Razorpay           ✅ Connected            │ │
│                        │  RTO Portal         ⚠️  Degraded           │ │
│                        └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```
