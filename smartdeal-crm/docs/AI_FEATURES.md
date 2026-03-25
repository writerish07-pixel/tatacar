# SmartDeal CRM – AI Features

## Overview

SmartDeal incorporates three AI/ML features to optimise the sales process, improve lead conversion, and reduce manual decision-making. All models are trained on dealership-specific historical data and refined continuously.

---

## 1. Vehicle Recommendation Engine

### Purpose
When a customer's requirements are captured in the Requirement Discovery wizard, the system instantly recommends the top 3 vehicle variants ranked by match percentage — eliminating the consultant's need to manually shortlist and reducing vehicle presentation time by 60%.

### Input Features

| Feature | Type | Source | Example Values |
|---------|------|--------|---------------|
| `family_size` | Integer | Requirement form | 1, 2, 3, 4, 5, 6+ |
| `primary_driver_age` | Integer | Requirement form | 25, 35, 45... |
| `usage_type` | Categorical | Requirement form | city, highway, mixed |
| `daily_km` | Integer | Requirement form | 20, 40, 80, 120... |
| `monthly_emi_budget` | Float (INR) | Requirement form | 10000, 15000, 25000 |
| `down_payment` | Float (INR) | Requirement form | 100000, 250000... |
| `fuel_preference` | Categorical | Requirement form | petrol, diesel, cng, ev |
| `transmission_pref` | Categorical | Requirement form | manual, automatic, amt |
| `priority_safety` | Boolean | Requirement form | true/false |
| `priority_comfort` | Boolean | Requirement form | true/false |
| `priority_economy` | Boolean | Requirement form | true/false |
| `priority_performance` | Boolean | Requirement form | true/false |
| `priority_technology` | Boolean | Requirement form | true/false |
| `has_garage` | Boolean | Requirement form | true/false |
| `existing_vehicle` | String | Requirement form | "Maruti Swift" |
| `existing_vehicle_year` | Integer | Requirement form | 2018, 2019... |
| `state` | Categorical | Lead data | Maharashtra, Karnataka... |

### Vehicle Feature Vector (for each variant)
```
- price_band (ex-showroom)
- segment (hatchback, compact-suv, suv, mpv)
- fuel_type
- transmission_type
- seating_capacity
- boot_space_litres
- ground_clearance_mm
- has_sunroof
- has_adas
- ncap_safety_rating
- infotainment_screen_size_inch
- connected_car_features (bool)
- mileage_kmpl (ARAI/WLTP)
- ev_range_km (for EVs)
- price_index (ex-showroom / market average)
```

### Model Architecture

```
Phase 1 (Rule-Based Scoring):
─────────────────────────────
- Budget filter: Remove variants where monthly EMI > budget_max
- Fuel filter: Hard filter on fuel_preference
- Family filter: seating_capacity >= max(family_size - 1, 2)
- Generate candidate set (usually 5-15 variants)

Phase 2 (Scoring):
──────────────────
- Content-based scoring (weighted feature matching):
    weight_budget          = 0.25
    weight_safety          = 0.20 (if priority_safety)
    weight_fuel_economy    = 0.15 (if usage_type = city/highway)
    weight_features        = 0.15
    weight_comfort         = 0.10 (if priority_comfort)
    weight_segment_fit     = 0.10 (family_size vs seating)
    weight_ev_infra        = 0.05 (if fuel=ev and has_garage=true)

Phase 3 (Collaborative Filtering — after sufficient data):
──────────────────────────────────────────────────────────
- Find similar customer profiles from historical data
- Weight recommendations by actual purchase outcomes
- Blend content score (70%) + collaborative score (30%)

Output:
- Top 3 variants ranked by total score (0-100%)
- Explanation text: "Great match! Families of 4 in Pune love this car for city use."
```

### Training Data Requirements
- Minimum 500 completed lead-to-purchase journeys with full requirement discovery data
- Retrain monthly with new data
- A/B test: Show AI recommendations vs. top-selling models; measure conversion rate

### Implementation Notes
```javascript
// samples/vehicle-recommendation.js provides the scoring algorithm
// For production: can be served as a Python microservice (FastAPI)
// or integrated directly into Node.js analytics-service using ONNX runtime

// Inference time target: < 200ms (synchronous, real-time)
// Model size target: < 50MB (allow in-process inference)
```

---

## 2. Lead Conversion Prediction

### Purpose
Predict the probability (0-100%) that a given lead will convert to a booking within the next 30 days. This allows Sales Managers to prioritise their team's attention on high-probability leads and trigger specific intervention actions for medium-probability leads before they go cold.

### Features Used

#### Lead-Level Features
| Feature | Description |
|---------|-------------|
| `lead_source` | QR walk-in, phone, web, referral, etc. |
| `days_since_creation` | Age of lead in days |
| `time_to_first_contact_minutes` | Minutes between lead creation and first consultant contact |
| `visit_count` | Number of showroom visits logged |
| `test_drive_done` | Boolean |
| `quotation_viewed_count` | Number of times quotation was opened |
| `quotation_shared` | Boolean (was PDF shared via WhatsApp) |
| `exchange_evaluated` | Boolean |
| `finance_interest_shown` | Boolean |
| `last_activity_days_ago` | Days since last logged interaction |
| `activity_count_7d` | Total activities in last 7 days |
| `lead_stage` | Current status in pipeline |
| `budget_fit` | % match between budget and quoted price |
| `preferred_model_in_stock` | Boolean (is preferred model/colour available) |
| `consultant_conversion_rate` | Historical conversion rate of assigned consultant |
| `day_of_week_created` | Monday-Sunday (some days show higher intent) |
| `time_of_day_created` | Morning/afternoon/evening |
| `campaign_lead` | Whether from a specific campaign |

### Model
```
Algorithm: XGBoost (Gradient Boosted Trees) Binary Classifier
- Output: P(convert) in range [0, 1]
- Threshold: > 0.7 = Hot, 0.4-0.7 = Warm, < 0.4 = Cold

Training:
- Label: 1 if lead converted to booking within 30 days, 0 otherwise
- Validation metric: AUC-ROC (target > 0.80)
- Feature importance tracked (SHAP values for explainability)
- Retrain: Weekly (as new data comes in)
```

### Usage in SmartDeal
```
Lead list view:
  - Each lead shows a heat indicator: 🔴 Hot | 🟡 Warm | 🔵 Cold
  - Sorted by conversion probability by default (can override)

Manager dashboard:
  - "5 leads likely to convert this week" section
  - "3 warm leads need attention before they go cold" alert

Automated actions:
  - P > 0.8: Auto-remind consultant if no activity in 2 days
  - P 0.5-0.8 + no contact in 3 days: Auto-schedule WhatsApp follow-up
  - P < 0.3 + lead age > 30 days: Flag for "Nurture campaign" or "Archive"
```

### SHAP Explainability
Each prediction includes a brief explanation visible to the manager:
```
Lead: Vikram Shah | Probability: 78% (Hot) 🔴
Top factors:
  ✅ Test drive completed (+15%)
  ✅ Quotation viewed 3 times (+12%)
  ✅ Finance interest shown (+10%)
  ⚠️  No activity in 3 days (-8%)
  ⚠️  Preferred colour out of stock (-5%)

Recommended action: Call today. Mention incoming stock for Thar Red.
```

---

## 3. Follow-up Timing Optimization

### Purpose
Recommend the **optimal time** to make the next follow-up contact with each lead, maximising the likelihood that the customer answers/engages and moves the lead forward in the pipeline.

### Problem Statement
A consultant making 30+ follow-up calls/messages daily cannot manually optimise when to contact each customer. Calling at the wrong time results in missed calls, unanswered messages, and lost momentum.

### Features Used

| Feature | Description |
|---------|-------------|
| `last_answer_day_of_week` | Day they answered last time (Mon-Sun) |
| `last_answer_hour` | Hour they answered last time (0-23) |
| `lead_source` | Phone leads answer differently than walk-ins |
| `employment_type` | Salaried (don't answer 9-6) vs self-employed |
| `lead_age_days` | Older leads need different treatment |
| `previous_attempts_no_answer` | Count of unanswered call attempts |
| `best_channel` | Call vs WhatsApp vs Email (from past interactions) |
| `city` | Adjust for IST but also consider local patterns |
| `customer_reply_pattern` | Historical reply time patterns |

### Model
```
Algorithm: LightGBM Regressor (predict optimal contact time)
OR Rule-based system (for initial deployment before sufficient data)

Output: { recommended_time: "Tuesday 7:30 PM", channel: "whatsapp" }

Rule-Based Fallback (before ML model has enough data):
  - Working professional + no answer on weekday → Try weekend morning (10-12)
  - Previous contact at 10 AM answered → Try 10 AM again
  - 3+ missed calls → Switch to WhatsApp
  - No WhatsApp reply in 2 days → Try phone call at 7 PM
  - Lead source = walk-in → First contact within 30 minutes
```

### Integration
```javascript
// analytics-service exposes:
POST /api/v1/analytics/ai/followup-timing
{
  "leadId": "uuid",
  "consultantId": "uuid"
}

// Response:
{
  "recommendedAt": "2024-01-16T19:30:00+05:30",
  "channel": "whatsapp",
  "messageTemplate": "followup_warm_lead",
  "confidence": 0.74,
  "reasoning": "Customer answered at 7:30 PM on Tuesday last week. WhatsApp preferred (seen read receipt)."
}
```

The recommendation is shown in the consultant's follow-up list and pre-populates the "Next follow-up" datetime.

---

## Data Pipeline Requirements

### Training Data Collection
```
SmartDeal PostgreSQL
    │
    ▼
Analytics Service (ETL job — runs nightly at 2:00 AM IST)
    │
    ├── Extract: lead activities, quotations, bookings, conversion outcomes
    ├── Transform: feature engineering (time deltas, counts, ratios)
    └── Load: ML training dataset (S3 Parquet files)
          │
          ▼
    Model Training (AWS SageMaker or local Python job)
          │
          ▼
    Model Artifacts (saved to S3 / ONNX format)
          │
          ▼
    Deployed to analytics-service (ONNX Runtime / REST API)
```

### Minimum Data Requirements
| Model | Min Samples | Confidence Threshold |
|-------|------------|---------------------|
| Vehicle Recommendation | 500 purchases | 0.70 |
| Lead Conversion | 1,000 leads (closed) | 0.75 |
| Follow-up Timing | 2,000 follow-up interactions | 0.65 |

### Model Performance Monitoring
```
Weekly automated report:
  - Recommendation acceptance rate (did consultants follow AI suggestions?)
  - Conversion rate: AI-recommended leads vs. manually managed leads
  - Model drift detection (feature distribution changes)
  - Accuracy degradation alerts (AUC-ROC drops > 5% → retrain triggered)
```

### Privacy Considerations
- Customer requirement data used for recommendations only in aggregate (anonymised for model training)
- Individual customer data never used for external model training
- DPDP Act 2023 compliant: customers can request their data not be used for AI processing
- Models stored and run entirely within AWS India region (ap-south-1) — data never leaves India
