# Architecture; Security; and Scale Considerations

## ACID & Correctness
- **DynamoDB transactions** (`TransactWriteItems`) update the counter and write an idempotency record in one atomic operation.
- **Bounds enforced at DB level** using `ConditionExpression` so a race can’t bypass the limits (0 to 1,000,000,000).
- **Strongly consistent reads** for `GET /number` guarantee freshness for the frontend.
- The item maintains a `version` number; handy for debugging or optimistic flows later.

## Idempotency
- Clients send `Idempotency-Key` header (UUID).  
- Transaction includes a `Put` into an **idempotency table** with `attribute_not_exists(id)`; retries reuse the same key and *do not* re-apply the update.  
- TTL cleans up idempotency records automatically (defaults to 60s; configurable).

## Abuse & Edge Cases
- Input validation;
- API Gateway throttling; WAF (AWS WAF) recommended at CloudFront level for common protections;
- Limits requests to the precise action set: `"increment"|"decrement"`;
- Returns `409` when bounds would be violated;
- Errors have safe; non-leaky messages.

## IAM (Sane & Scoped)
- Lambda role allows only:
  - `dynamodb:TransactWriteItems` (for writes)
  - `dynamodb:GetItem` (for reads)
- CI/CD OIDC role:
  - ECR: push images;
  - S3: upload artifacts to the specific bucket;
  - CloudFront: create invalidations for the one distribution;
  - Broader infra managed by Terraform (the workflow runs `terraform apply`). The role is constrained to resources in this stack using resource ARNs and a project tag.

## Auth (Suggested; not implemented)
- Start: Anonymous, rate-limited API (usage plans or WAF).
- Next: **API keys + Usage Plans** per environment for basic protection.
- Fully featured: **Cognito User Pools**; JWT authorizer on API Gateway for per-user quotas and abuse control; integrate with Web UI login.

## Testing Scheme (Suggested; not implemented)
- **Functional**: Unit tests for Lambda logic; integration tests hitting a dev stack.
- **Race/ACID**: Heavy concurrency with `k6` or `locust`; thousands of parallel `POST` with and without idempotency keys; verify final value equals increments − decrements exactly.
- **Fault Injection**: Force retries; random 5xx; verify idempotency prevents over-increment.
- **Chaos**: Simulate partial network failures; slow DynamoDB; test timeouts.
- **Soak**: Hours of sustained, mixed R/W load; verify no drift.

## Global Distribution (Suggested path)
- **CloudFront** for static site; Lambda in a **single write region** to maintain strict counter correctness.
- If multi-region writes are ever required; use **a single-writer pattern** (Route 53 failover) or design a **CRDT/sharded counter** with reconciliation windows; but then strict; immediate ACID across regions isn’t trivial.
- **Multi-region deployments**: Deploy read replicas (GET served from edge via Lambda@Edge or regional caches) while writes go to primary region; cutover via progressive traffic shifting.
