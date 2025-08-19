export const TABLE_COUNTER = process.env.TABLE_COUNTER || '';
export const TABLE_IDEMPOTENCY = process.env.TABLE_IDEMPOTENCY || '';
export const IDEMPOTENCY_TTL_SECONDS = parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '60', 10);
export const MAX_VALUE = 1_000_000_000;
export const MIN_VALUE = 0;
