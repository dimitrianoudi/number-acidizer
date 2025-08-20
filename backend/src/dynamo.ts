import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  TABLE_COUNTER,
  TABLE_IDEMPOTENCY,
  IDEMPOTENCY_TTL_SECONDS,
  MAX_VALUE,
  MIN_VALUE,
} from "./env.js";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);
const COUNTER_PK = "COUNTER";

export async function getCurrent(): Promise<{ value: number; updatedAt: string; version: number }> {
  const res = await doc.send(new GetCommand({
    TableName: TABLE_COUNTER,
    Key: { pk: COUNTER_PK },
    ConsistentRead: true
  }));
  const item = res.Item as any;
  if (!item) return { value: 0, updatedAt: new Date().toISOString(), version: 0 };
  return { value: item.value ?? 0, updatedAt: item.updatedAt, version: item.version ?? 0 };
}

export async function applyAction(action: "increment" | "decrement", idemKey?: string) {
  const now = new Date().toISOString();
  const id = idemKey || uuidv4();
  const expiresAt = Math.floor(Date.now() / 1000) + IDEMPOTENCY_TTL_SECONDS;

  const isIncrement = action === "increment";
  const delta = isIncrement ? 1 : -1;

  const condition = isIncrement
    ? "attribute_exists(pk) AND #v < :max"
    : "attribute_exists(pk) AND #v > :min";

  // Build only the values actually referenced in expressions
  const exprValues: Record<string, any> = {
    ":delta": delta,
    ":one": 1,
    ":now": now,
    ":zero": 0,
  };
  if (isIncrement) {
    exprValues[":max"] = MAX_VALUE;
  } else {
    exprValues[":min"] = MIN_VALUE;
  }

  const tx = new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: TABLE_IDEMPOTENCY,
          Item: { id, action, createdAt: now, expiresAt },
          ConditionExpression: "attribute_not_exists(id)",
        },
      },
      {
        Update: {
          TableName: TABLE_COUNTER,
          Key: { pk: COUNTER_PK },
          UpdateExpression:
            "SET #v = if_not_exists(#v, :zero) + :delta, updatedAt = :now, version = if_not_exists(version, :zero) + :one",
          ConditionExpression: condition,
          ExpressionAttributeNames: { "#v": "value" },
          ExpressionAttributeValues: exprValues,
        },
      },
    ],
  });

  try {
    await doc.send(tx);
    return { ...(await getCurrent()), idempotent: false };
  } catch (e: any) {
    // If idempotency key exists; treat as idempotent retry
    const idem = await doc.send(new GetCommand({
      TableName: TABLE_IDEMPOTENCY,
      Key: { id },
      ConsistentRead: true
    }));
    if (idem.Item) {
      const cur = await getCurrent();
      return { ...cur, idempotent: true };
    }
    // Otherwise; map likely bounds issues to friendly codes
    const cur = await getCurrent();
    if (isIncrement && cur.value >= MAX_VALUE) {
      throw Object.assign(new Error("MAX_REACHED"), { code: "MAX_REACHED", current: cur });
    }
    if (!isIncrement && cur.value <= MIN_VALUE) {
      throw Object.assign(new Error("MIN_REACHED"), { code: "MIN_REACHED", current: cur });
    }
    console.error("TX failure (unexpected)", { name: e?.name, message: e?.message, meta: e?.$metadata });
    throw e;
  }
}
