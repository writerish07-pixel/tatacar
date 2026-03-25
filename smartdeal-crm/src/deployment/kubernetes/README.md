# Kubernetes Deployment

Kubernetes manifests for deploying SmartDeal CRM to a production Kubernetes cluster (AWS EKS recommended).

## Directory Structure
```
kubernetes/
├── namespace.yaml              # smartdeal-crm namespace
├── configmap.yaml              # Non-sensitive configuration
├── secrets.yaml                # Sensitive config (use external-secrets operator in production)
├── services/
│   ├── api-gateway/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── hpa.yaml
│   ├── auth-service/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── lead-service/
│   ├── quotation-service/
│   ├── booking-service/
│   ├── finance-service/
│   ├── insurance-service/
│   ├── billing-service/
│   ├── stock-service/
│   ├── pdi-service/
│   ├── delivery-service/
│   ├── notification-service/
│   └── analytics-service/
├── infrastructure/
│   ├── redis.yaml              # Redis StatefulSet (or ElastiCache for prod)
│   ├── elasticsearch.yaml      # Elasticsearch StatefulSet
│   └── postgres.yaml           # PostgreSQL StatefulSet (or RDS for prod)
├── ingress/
│   └── ingress.yaml            # NGINX Ingress with TLS (cert-manager)
├── monitoring/
│   ├── prometheus.yaml
│   ├── grafana.yaml
│   └── alertmanager.yaml
└── runbooks/
    ├── incident-response.md
    └── scaling-guide.md
```

## Deployment Commands

```bash
# Apply all manifests
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secrets.yaml
kubectl apply -f kubernetes/infrastructure/
kubectl apply -f kubernetes/services/
kubectl apply -f kubernetes/ingress/
kubectl apply -f kubernetes/monitoring/

# Check deployment status
kubectl rollout status deployment/api-gateway -n smartdeal-crm

# Scale a service
kubectl scale deployment/lead-service --replicas=3 -n smartdeal-crm

# View logs
kubectl logs -l app=api-gateway -n smartdeal-crm --tail=100 -f
```

## Prerequisites
- AWS EKS cluster (≥ Kubernetes 1.28)
- cert-manager for TLS certificate management
- NGINX Ingress Controller
- AWS Load Balancer Controller
- external-secrets operator (for AWS Secrets Manager integration)
- Prometheus Operator (for monitoring)

## Helm (Alternative)
```bash
# Deploy using Helm chart (coming soon)
helm install smartdeal ./helm/smartdeal-crm \
  --namespace smartdeal-crm \
  --values ./helm/values-production.yaml
```

## Full deployment documentation
See [DEPLOYMENT.md](../../../docs/DEPLOYMENT.md) for complete Kubernetes manifests and deployment guide.
