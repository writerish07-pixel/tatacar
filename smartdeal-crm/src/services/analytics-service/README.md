# Analytics Service

Real-time dashboards, business intelligence, and AI/ML features for SmartDeal CRM.

## Responsibilities
- Real-time sales dashboard data (leads, bookings, deliveries, revenue)
- Lead funnel analysis with stage conversion rates
- Sales consultant performance leaderboards
- Stock ageing analysis and turn reports
- Finance penetration rate reporting
- Insurance penetration rate reporting
- Manager and GM level analytics with drill-down
- GraphQL API for flexible dashboard queries
- AI: Vehicle recommendation engine (content-based + collaborative filtering)
- AI: Lead conversion probability prediction (XGBoost classifier)
- AI: Follow-up timing optimization (LightGBM regressor)
- Scheduled report generation and email distribution

## Port: 3012

## Tech: NestJS + PostgreSQL + Elasticsearch + GraphQL (Apollo Server) + ONNX Runtime (ML inference)

## GraphQL Endpoint
```
POST /api/v1/analytics/graphql
```
See [API_DESIGN.md](../../../docs/API_DESIGN.md#graphql-schema) for full schema.

## AI Features
See [AI_FEATURES.md](../../../docs/AI_FEATURES.md) for detailed documentation on:
- Vehicle Recommendation Engine
- Lead Conversion Prediction
- Follow-up Timing Optimization

## Dashboard Refresh Strategy
- Real-time KPIs (leads, bookings today): Redis cached, 30-second TTL
- Revenue figures: PostgreSQL, 5-minute cache
- Historical analytics: Elasticsearch aggregations

## Development
```bash
cd src/services/analytics-service
npm install
npm run dev
```
