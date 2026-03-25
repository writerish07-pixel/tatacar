# API Gateway

Central entry point for all SmartDeal CRM services. Routes requests, validates JWT tokens, enforces rate limits, and provides unified logging.

## Responsibilities
- Request routing to downstream microservices
- JWT access token validation (delegates issuance to auth-service)
- Rate limiting: 100 req/min (unauthenticated), 1000 req/min (authenticated)
- CORS enforcement
- Security headers (Helmet.js)
- Correlation ID injection for distributed tracing
- Health check aggregation at `GET /health`
- Swagger UI at `GET /api/docs`

## Port: 8080

## Tech: Node.js + Express + http-proxy-middleware

## Routes
See [API_DESIGN.md](../../docs/API_DESIGN.md) for full routing table.

## Development
```bash
cd src/api-gateway
npm install
npm run dev
```
