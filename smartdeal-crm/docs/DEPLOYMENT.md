# SmartDeal CRM – Deployment Guide

## Table of Contents
1. [Docker Setup](#docker-setup)
2. [Kubernetes Deployment](#kubernetes-deployment)
3. [Environment Variables](#environment-variables)
4. [Database Migration Strategy](#database-migration-strategy)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Monitoring & Logging](#monitoring--logging)
7. [Backup Strategy](#backup-strategy)
8. [Scaling Guidelines](#scaling-guidelines)

---

## Docker Setup

### Individual Service Dockerfile Pattern
Each microservice follows the same multi-stage Docker build. See `src/deployment/docker/Dockerfile.example` for the template.

Key principles:
- Multi-stage build (builder + production)
- Non-root user (`node:18-alpine`)
- Health check on `/health` endpoint
- Node.js production mode

### docker-compose (Development)
See `src/deployment/docker/docker-compose.yml.example` for the full development stack.

**Services included:**
- `api-gateway` (port 8080)
- `auth-service` (port 3001)
- `lead-service` (port 3002)
- `quotation-service` (port 3003)
- `booking-service` (port 3004)
- `finance-service` (port 3005)
- `insurance-service` (port 3006)
- `billing-service` (port 3007)
- `stock-service` (port 3008)
- `pdi-service` (port 3009)
- `delivery-service` (port 3010)
- `notification-service` (port 3011)
- `analytics-service` (port 3012)
- `postgres` (port 5432)
- `redis` (port 6379)
- `elasticsearch` (port 9200)
- `kibana` (port 5601)
- `prometheus` (port 9090)
- `grafana` (port 3100)

```bash
# Start all services
docker-compose -f src/deployment/docker/docker-compose.yml.example up -d

# View logs
docker-compose logs -f api-gateway

# Scale a service
docker-compose up -d --scale lead-service=3

# Stop all
docker-compose down
```

---

## Kubernetes Deployment

### Prerequisites
```bash
kubectl >= 1.28
helm >= 3.12
```

### Namespace Setup
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: smartdeal-crm
  labels:
    app: smartdeal-crm
    environment: production
```

### ConfigMap (Non-sensitive config)
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: smartdeal-config
  namespace: smartdeal-crm
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  API_VERSION: "v1"
  ALLOWED_ORIGINS: "https://app.smartdeal.akar-motors.in"
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  DB_NAME: "smartdeal_prod"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
```

### Secret (Sensitive config — use AWS Secrets Manager in production)
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: smartdeal-secrets
  namespace: smartdeal-crm
type: Opaque
stringData:
  DB_PASSWORD: "<from-secrets-manager>"
  JWT_PRIVATE_KEY: "<rsa-private-key>"
  RAZORPAY_KEY_SECRET: "<razorpay-secret>"
  WHATSAPP_TOKEN: "<meta-whatsapp-token>"
  AWS_SECRET_ACCESS_KEY: "<aws-secret>"
  ENCRYPTION_KEY: "<aes-256-key>"
```

### API Gateway Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: smartdeal-crm
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
        - name: api-gateway
          image: your-ecr.amazonaws.com/smartdeal/api-gateway:latest
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef:
                name: smartdeal-config
            - secretRef:
                name: smartdeal-secrets
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
  namespace: smartdeal-crm
spec:
  selector:
    app: api-gateway
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: smartdeal-ingress
  namespace: smartdeal-crm
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
    - hosts:
        - api.smartdeal.akar-motors.in
      secretName: smartdeal-tls
  rules:
    - host: api.smartdeal.akar-motors.in
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway-service
                port:
                  number: 80
```

### HorizontalPodAutoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: smartdeal-crm
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### PostgreSQL (Production — RDS recommended)
```yaml
# For dev/staging only — use AWS RDS for production
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: smartdeal-crm
spec:
  serviceName: "postgres"
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: smartdeal_prod
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: smartdeal-secrets
                  key: DB_PASSWORD
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-storage
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: gp3
        resources:
          requests:
            storage: 100Gi
```

---

## Environment Variables

### Complete Environment Variable Reference

```env
# ─── APPLICATION ──────────────────────────────────────────────────────────────
NODE_ENV=production                          # development | staging | production
API_VERSION=v1
PORT=8080                                    # Service port (overridden per service)
LOG_LEVEL=info                               # error | warn | info | debug

# ─── DATABASE ─────────────────────────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smartdeal_prod
DB_USER=smartdeal_app
DB_PASSWORD=<strong-random-password>
DB_SSL=true                                  # true in production
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_STATEMENT_TIMEOUT=30000                  # 30 seconds

# ─── REDIS ────────────────────────────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>
REDIS_TLS=true                               # true in production
REDIS_KEY_PREFIX=smartdeal:

# ─── JWT / AUTH ───────────────────────────────────────────────────────────────
JWT_ALGORITHM=RS256
JWT_PRIVATE_KEY=<rsa-2048-private-key-pem>
JWT_PUBLIC_KEY=<rsa-2048-public-key-pem>
JWT_ACCESS_TOKEN_TTL=900                    # 15 minutes in seconds
JWT_REFRESH_TOKEN_TTL=604800               # 7 days in seconds

# ─── ENCRYPTION ───────────────────────────────────────────────────────────────
ENCRYPTION_ALGORITHM=aes-256-gcm
ENCRYPTION_KEY=<32-byte-hex-key>            # AES-256 for PAN/Aadhaar
ENCRYPTION_IV_LENGTH=16

# ─── AWS ──────────────────────────────────────────────────────────────────────
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>
AWS_S3_BUCKET=smartdeal-documents-prod
AWS_S3_BUCKET_REGION=ap-south-1
AWS_CLOUDFRONT_URL=https://cdn.smartdeal.akar-motors.in
AWS_SES_FROM_EMAIL=noreply@akar-motors.in

# ─── WHATSAPP BUSINESS API ────────────────────────────────────────────────────
WHATSAPP_PHONE_ID=<meta-phone-number-id>
WHATSAPP_BUSINESS_ACCOUNT_ID=<waba-id>
WHATSAPP_ACCESS_TOKEN=<meta-permanent-token>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<random-string>
WHATSAPP_API_URL=https://graph.facebook.com/v18.0

# ─── PAYMENT GATEWAY ──────────────────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_live_<key>
RAZORPAY_KEY_SECRET=<razorpay-secret>
RAZORPAY_WEBHOOK_SECRET=<webhook-secret>
PAYMENT_GATEWAY=razorpay                    # razorpay | payu

# ─── GOOGLE SHEETS (Legacy migration) ────────────────────────────────────────
GOOGLE_SHEETS_API_KEY=<google-api-key>
GOOGLE_SHEETS_CLIENT_EMAIL=<service-account-email>
GOOGLE_SHEETS_PRIVATE_KEY=<service-account-private-key>
STOCK_SHEET_ID=<spreadsheet-id>             # Existing akar-quotation-server sheet
SCHEME_SHEET_ID=<spreadsheet-id>

# ─── GST PORTAL ───────────────────────────────────────────────────────────────
GST_PORTAL_USERNAME=<gstin-username>
GST_PORTAL_PASSWORD=<gstin-password>
GST_API_URL=https://api.gst.gov.in

# ─── RTO PORTAL (Vahan) ───────────────────────────────────────────────────────
VAHAN_API_KEY=<vahan-api-key>
VAHAN_API_URL=https://vahan.parivahan.gov.in/api

# ─── UIDAI (Aadhaar) ──────────────────────────────────────────────────────────
UIDAI_AUA_CODE=<aua-code>
UIDAI_ASA_CODE=<asa-code>
UIDAI_API_URL=https://prod.aadhaarapi.com

# ─── INSURANCE APIS ───────────────────────────────────────────────────────────
TATAIG_API_KEY=<tata-aig-key>
TATAIG_API_URL=https://api.tataaig.com
BAJAJ_API_KEY=<bajaj-key>
BAJAJ_API_URL=https://api.bajajallianz.com
ICICI_LOMBARD_API_KEY=<lombard-key>
ICICI_LOMBARD_API_URL=https://api.icicilombard.com

# ─── BANK APIs ────────────────────────────────────────────────────────────────
HDFC_DSA_CODE=<hdfc-dsa-code>
HDFC_API_KEY=<hdfc-api-key>
HDFC_API_URL=https://api.hdfc.com/auto-loans
TATA_CAPITAL_DEALER_CODE=<dealer-code>
TATA_CAPITAL_API_KEY=<tc-api-key>
TATA_CAPITAL_API_URL=https://api.tatacapital.com

# ─── ELASTICSEARCH ────────────────────────────────────────────────────────────
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=<es-password>

# ─── MONITORING ───────────────────────────────────────────────────────────────
PROMETHEUS_PORT=9090
GRAFANA_ADMIN_PASSWORD=<grafana-password>
SENTRY_DSN=<sentry-dsn>

# ─── CORS / SECURITY ──────────────────────────────────────────────────────────
ALLOWED_ORIGINS=https://app.smartdeal.akar-motors.in,https://portal.smartdeal.akar-motors.in
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_UNAUTHENTICATED=100

# ─── FEATURE FLAGS ────────────────────────────────────────────────────────────
FEATURE_AI_RECOMMENDATIONS=true
FEATURE_E_INVOICE=true
FEATURE_VAHAN_INTEGRATION=false             # Enable when RTO portal ready
FEATURE_AADHAAR_OTP=true
```

---

## Database Migration Strategy

### Phase 1: Schema Creation (Week 1)
```bash
# Run migrations in order
npm run db:migrate:up                       # Applies all pending migrations

# Individual migration naming convention:
# src/database/migrations/
# ├── 001_create_extensions.sql
# ├── 002_create_dealerships_branches.sql
# ├── 003_create_users_auth.sql
# ├── 004_create_leads.sql
# ├── 005_create_vehicles.sql
# ├── 006_create_quotations.sql
# ├── 007_create_test_drives.sql
# ├── 008_create_exchange.sql
# ├── 009_create_bookings.sql
# ├── 010_create_finance.sql
# ├── 011_create_insurance.sql
# ├── 012_create_billing.sql
# ├── 013_create_pdi.sql
# ├── 014_create_rto.sql
# ├── 015_create_delivery.sql
# └── 016_create_post_sale.sql
```

### Phase 2: Reference Data Seeding (Week 1)
```bash
npm run db:seed:states          # Indian states + GST state codes
npm run db:seed:rto-charges     # RTO charges by state (all 29 states + 8 UTs)
npm run db:seed:vehicle-models  # Tata Motors PV models (Nexon, Harrier, Punch, Tiago, etc.)
npm run db:seed:banks           # Bank master data
npm run db:seed:insurers        # Insurance provider master
npm run db:seed:accessories     # Tata genuine accessories catalogue
npm run db:seed:admin-user      # Initial admin user
```

### Phase 3: Google Sheets Data Migration (Week 2)
Migration from the existing `akar-quotation-server` data sources:

```javascript
// src/database/migrations/google-sheets-migrator.js
// Reads existing Google Sheets stock & scheme data
// Transforms and inserts into PostgreSQL vehicle_variants and vehicle_pricing tables

// Run migration script:
node src/database/migrations/google-sheets-migrator.js --dry-run    # Preview
node src/database/migrations/google-sheets-migrator.js --execute     # Apply
```

### Phase 4: Rollback Strategy
```bash
# Roll back last migration
npm run db:migrate:down --count=1

# Roll back to specific version
npm run db:migrate:down --to=005

# View migration status
npm run db:migrate:status
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: SmartDeal CRM – Build & Deploy

on:
  push:
    branches:
      - main        # Production deploy
      - staging     # Staging deploy
  pull_request:
    branches:
      - main

env:
  AWS_REGION: ap-south-1
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.ap-south-1.amazonaws.com

jobs:
  # ─── Test & Lint ───────────────────────────────────────────────────────────
  test:
    name: Test & Lint
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: smartdeal_test
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js 18
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run unit tests
        run: npm run test:unit
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: smartdeal_test
          DB_PASSWORD: test_password
          REDIS_HOST: localhost

      - name: Run integration tests
        run: npm run test:integration
        env:
          DB_HOST: localhost
          REDIS_HOST: localhost

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # ─── Security Scan ─────────────────────────────────────────────────────────
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - name: Run npm audit
        run: npm audit --audit-level=high
      - name: SAST Scan (Snyk)
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  # ─── Build & Push Docker Images ────────────────────────────────────────────
  build:
    name: Build Docker Images
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.event_name == 'push'
    strategy:
      matrix:
        service:
          - api-gateway
          - auth-service
          - lead-service
          - quotation-service
          - booking-service
          - finance-service
          - insurance-service
          - billing-service
          - stock-service
          - pdi-service
          - delivery-service
          - notification-service
          - analytics-service
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push ${{ matrix.service }}
        run: |
          SERVICE=${{ matrix.service }}
          IMAGE_TAG=${{ github.sha }}
          REPO=$ECR_REGISTRY/smartdeal/$SERVICE

          docker build \
            -f src/services/$SERVICE/Dockerfile \
            -t $REPO:$IMAGE_TAG \
            -t $REPO:latest \
            .

          docker push $REPO:$IMAGE_TAG
          docker push $REPO:latest

  # ─── Deploy to Staging ─────────────────────────────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/staging'
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'v1.28.0'

      - name: Configure kubeconfig (Staging)
        run: |
          aws eks update-kubeconfig \
            --region $AWS_REGION \
            --name smartdeal-staging-cluster
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Run DB migrations
        run: |
          kubectl run migration-job \
            --image=$ECR_REGISTRY/smartdeal/api-gateway:${{ github.sha }} \
            --restart=Never \
            --command -- npm run db:migrate:up
          kubectl wait --for=condition=complete job/migration-job --timeout=120s

      - name: Deploy all services
        run: |
          IMAGE_TAG=${{ github.sha }}
          for service in api-gateway auth-service lead-service quotation-service \
                         booking-service finance-service insurance-service billing-service \
                         stock-service pdi-service delivery-service notification-service \
                         analytics-service; do
            kubectl set image deployment/$service \
              $service=$ECR_REGISTRY/smartdeal/$service:$IMAGE_TAG \
              -n smartdeal-staging
          done

      - name: Verify rollout
        run: |
          kubectl rollout status deployment/api-gateway -n smartdeal-staging --timeout=300s

  # ─── Deploy to Production ──────────────────────────────────────────────────
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3

      - name: Configure kubeconfig (Production)
        run: |
          aws eks update-kubeconfig \
            --region $AWS_REGION \
            --name smartdeal-prod-cluster

      - name: Deploy with blue-green strategy
        run: |
          IMAGE_TAG=${{ github.sha }}
          kubectl set image deployment/api-gateway \
            api-gateway=$ECR_REGISTRY/smartdeal/api-gateway:$IMAGE_TAG \
            -n smartdeal-crm

          # Canary: route 10% traffic to new version first
          # (requires Argo Rollouts or Flagger for full canary support)

      - name: Smoke tests
        run: |
          GATEWAY_URL=https://api.smartdeal.akar-motors.in
          curl -f $GATEWAY_URL/health || exit 1

      - name: Notify team on Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'SmartDeal CRM deployed to production'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Monitoring & Logging

### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'smartdeal-api-gateway'
    static_configs:
      - targets: ['api-gateway:9090']
    metrics_path: /metrics

  - job_name: 'smartdeal-services'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - smartdeal-crm
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: "true"

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Grafana Dashboards
Pre-built dashboards for:
1. **API Gateway Dashboard** — request rate, error rate, p50/p95/p99 latency
2. **Business Metrics Dashboard** — leads today, bookings, deliveries, revenue
3. **Database Dashboard** — connections, query time, cache hit rate
4. **Service Health Dashboard** — each service uptime and resource usage

### Key Alerts (Prometheus AlertManager)
```yaml
# alerts.yml
groups:
  - name: smartdeal-critical
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.service }}"

      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_numbackends > 80
        for: 2m
        severity: warning

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        severity: critical

      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
        for: 5m
        severity: warning
```

### ELK Stack (Logging)

**Logstash Pipeline:**
```
Application Logs (JSON) → Logstash → Elasticsearch → Kibana
```

**Log Format (all services):**
```json
{
  "timestamp": "2024-01-15T10:30:00.000+05:30",
  "level": "info",
  "service": "lead-service",
  "correlationId": "req_01HXYZ",
  "userId": "uuid",
  "branchId": "uuid",
  "action": "lead.created",
  "resourceId": "uuid",
  "durationMs": 45,
  "message": "Lead created successfully"
}
```

**Kibana Index Patterns:**
- `smartdeal-*` — all application logs
- `smartdeal-audit-*` — audit trail logs
- `smartdeal-error-*` — error logs only

---

## Backup Strategy

### Database Backups (PostgreSQL / AWS RDS)
```bash
# Production: AWS RDS automated backups (30-day retention)
# Point-in-time recovery enabled

# Manual backup (if self-hosted):
pg_dump -Fc smartdeal_prod > backup_$(date +%Y%m%d_%H%M%S).dump

# Restore:
pg_restore -d smartdeal_prod backup_20240115_103000.dump
```

### Backup Schedule
| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| RDS Automated | Daily | 30 days | AWS RDS |
| RDS Snapshot | Weekly | 90 days | AWS RDS |
| S3 Documents | Continuous (versioned) | 7 years | AWS S3 |
| Redis (AOF) | Continuous | 24 hours | Redis persistence |
| Application logs | Daily | 1 year | AWS S3 (Glacier) |

### Disaster Recovery
- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 1 hour
- **Runbook:** Available in `src/deployment/kubernetes/runbooks/`

---

## Scaling Guidelines

### Horizontal Scaling Recommendations
| Service | Min Pods | Max Pods | Scale Trigger |
|---------|----------|----------|---------------|
| api-gateway | 2 | 10 | CPU > 70% |
| auth-service | 2 | 5 | CPU > 70% |
| lead-service | 1 | 5 | CPU > 70% |
| quotation-service | 1 | 5 | CPU > 70% |
| notification-service | 1 | 3 | Queue length > 1000 |
| analytics-service | 1 | 3 | CPU > 60% |

### Database Scaling
- **Read Replicas:** Add RDS read replica for analytics queries (analytics-service reads from replica)
- **Connection Pooling:** PgBouncer with transaction pooling mode
- **Partitioning:** Partition `audit_logs` and `lead_activities` by month after 6 months

### Caching Strategy
- **API responses:** Redis cache with TTL 60s for vehicle pricing, RTO charges
- **Session tokens:** Redis with 15-min TTL
- **Stock availability:** Redis with 30s TTL (near real-time)
- **Dashboard data:** Redis cache with 5-minute TTL

### Performance Optimization
```sql
-- Ensure critical indexes are in place
EXPLAIN ANALYZE SELECT * FROM leads WHERE branch_id = $1 AND status = 'new';
-- Should use idx_leads_branch + idx_leads_status

-- Regular VACUUM ANALYZE schedule
-- Run weekly during off-peak hours (Sunday 2:00 AM IST)
VACUUM ANALYZE leads, bookings, vehicles, audit_logs;
```
