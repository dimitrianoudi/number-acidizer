# Testing & Breaking ACID (Plan)

## 1) Correctness under Load
- Use `k6` to spawn N virtual users; randomly increment or decrement within bounds.
- Verify `GET /number` after the run equals `increments - decrements` modulo clamping at 0/1e9.
- Repeat with 10x; 50x; 100x VUs.

## 2) Idempotency
- Send `POST /number` with the same `Idempotency-Key` N times in parallel. Exactly one should succeed; the rest return the same final value (or 200 with `idempotent: true`).

## 3) Faults & Retries
- Inject random 5xx (using chaos or proxy) and client retries with same key. Confirm no over-counting.

## 4) Bounds
- Hammer the API near 0 and 1_000_000_000; assert no violations and correct `409` response.

## 5) Consistency
- After a heavy burst; sample `GET /number` every 50ms for a second. Values should be monotonic in the intended direction with no jumps skipping logical outcomes.

## Tools
- `k6`, `bombardier`, or `vegeta` for load tests.
- Optional: CloudWatch metrics + alarms for error rates; throttling; p95 latency.
