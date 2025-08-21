# Number Acidizer

A neat, production-grade solution to the challenge:
- **Dockerized TypeScript backend** on AWS Lambda behind API Gateway (HTTP API), image in **ECR**
- **DynamoDB** with ACID guarantees for the counter and an **idempotency** table
- **React + TypeScript** frontend with **Vite** and **Zustand**, animated deltas, seamless UX
- **Terraform** provisioning for all infra; **CloudFront + S3** for HTTPS site
- **GitHub Actions** CI/CD builds & pushes the backend image; runs Terraform; builds & deploys frontend; invalidates CloudFront

> The counter never goes below `0` or above `1_000_000_000`.  
> Concurrent updates are strictly atomic via DynamoDB **transactions**; duplicate client retries are neutralized via **idempotency keys**.

---

## Quick Start

### Prereqs
- AWS account (with permissions to create resources used here)
- GitHub repo with Actions enabled
- Terraform v1.6+
- Node.js 18+ and npm

### Configure Terraform
Copy `terraform.tfvars.example` to `infra/terraform.tfvars` and fill in values.

```bash
cp terraform.tfvars.example infra/terraform.tfvars
```

### First Deployment (from CI recommended)
The GitHub Actions workflow handles everything automatically. For a manual run:

```bash
cd infra
terraform init
# 1) create ECR first (so CI can push image)
terraform apply -target=aws_ecr_repository.backend
# 2) build & push the backend image (replace ACCOUNT_ID & REGION and tag as desired)
#    or let CI do it for you.
# 3) full apply with the image URI
terraform apply -var="lambda_image_uri=<ECR_REPO_URI>:<TAG>"
```

> The workflow performs these steps automatically: create ECR, push image, apply infra, build+upload frontend, invalidate CloudFront.

### Frontend Local Dev
```bash
cd frontend
cp .env.example .env
npm i
npm run dev
```

### Backend Local Build (image)
```bash
cd backend
npm i
npm run build
# Docker build
docker build -t number-acidizer-backend .
```

---

## Architecture Overview

- **API**  
  - `GET /number` → returns the current value (strongly consistent read)  
  - `POST /number` with `{ "action": "increment" | "decrement" }`  
    - Uses header `Idempotency-Key` (UUID) to avoid double-processing on retries
    - DynamoDB **TransactWrite** ensures atomicity: update counter + insert idempotency record
    - Enforces bounds [0, 1_000_000_000]; returns `409` if you'd exceed bounds

- **Sync Between Tabs/Devices**  
  - Frontend polls every 2s for the latest value; no manual reload needed
  - If value jumps by more than 1; the UI animates the delta smoothly

- **Abuse & Edge-Case Checks**
  - Validates payloads; rejects invalid `action`
  - Enforces strict numeric bounds at DB level (ConditionExpression)
  - Idempotency table prevents accidental double increments due to client/server retries
  - CORS enabled; API throttling/WAF can be added easily (see docs)

- **IAM**  
  - Scoped execution role for Lambda (DynamoDB only); CI role via GitHub OIDC with limited permissions (see `infra/github_oidc.tf`).

- **Global Scale (suggested)**  
  See `docs/ARCHITECTURE.md` and `docs/TESTING.md` for proposals on auth; ACID stress tests; and multi-region rollouts.

---

## Repo Guide

- `backend/` — Lambda (TypeScript), Dockerized
- `frontend/` — React + Vite + Zustand
- `infra/` — Terraform for all resources (DynamoDB; Lambda; API Gateway; ECR; S3; CloudFront; GitHub OIDC role)
- `.github/workflows/ci-cd.yml` — CI/CD pipeline
- `scripts/recreate_commit_history.sh` — build the progressive commit history locally

---

## What’s deployed

Dockerized TypeScript Lambda (image in ECR), API Gateway (HTTP API), DynamoDB (counter + idempotency), S3+CloudFront frontend.

ACID: DynamoDB transaction + idempotency key (TTL) + bounds via ConditionExpression.

CI/CD: GitHub Actions with OIDC → builds image, Terraform apply, builds frontend, uploads to S3, CloudFront invalidation.

## How to test

 Record URLs:

```bash
  API: https://gee6k5fvrb.execute-api.eu-north-1.amazonaws.com
  Site: https://d2mvlfqf4mq6m.cloudfront.net
```



Quick API test

```bash
  API="https://gee6k5fvrb.execute-api.eu-north-1.amazonaws.com"
  curl -s "$API/number"
  curl -s -XPOST "$API/number" -H 'content-type: application/json' -d '{"action":"increment"}'
```

```bash
  API: GET/POST /number as above; concurrency & idempotency sample commands included.
  Frontend: polling ensures eventual consistency across tabs; large jumps animate.
```

 Frontend sanity: open the CloudFront URL in two tabs; (or better two different devices) and click increment; both converge.

## Security/IAM

Lambda role: dynamodb:GetItem, TransactWriteItems, PutItem, UpdateItem, and logs.

CI role: scoped to tagged resources, ECR push, S3 put, CloudFront invalidate.

## Ops

Terraform remote state: S3 (+ DynamoDB lock) for consistent CI runs.
