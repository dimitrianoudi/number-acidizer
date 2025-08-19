import { DynamoDBClient, TransactWriteItemsCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { TABLE_COUNTER, TABLE_IDEMPOTENCY, IDEMPOTENCY_TTL_SECONDS, MAX_VALUE, MIN_VALUE } from "./env.js";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);

const COUNTER_PK = "COUNTER";

export async function getCurrent(): Promise<{value:number; updatedAt:string; version:number}> {
  const res = await doc.send(new GetCommand({
    TableName: TABLE_COUNTER,
    Key: { pk: COUNTER_PK },
    ConsistentRead: true
  }));
  const item = res.Item as any;
  if (!item) {
    return { value: 0, updatedAt: new Date().toISOString(), version: 0 };
  }
  return { value: item.value ?? 0, updatedAt: item.updatedAt, version: item.version ?? 0 };
}

export async function applyAction(action: 'increment' | 'decrement', idemKey?: string) {
  const now = new Date().toISOString();
  const id = idemKey || uuidv4();
  const expiresAt = Math.floor(Date.now()/1000) + IDEMPOTENCY_TTL_SECONDS;

  const isIncrement = action === 'increment';
  const delta = isIncrement ? 1 : -1;

  const condition = isIncrement
    ? "attribute_exists(pk) AND #v < :max"
    : "attribute_exists(pk) AND #v > :min";

  const tx = new TransactWriteItemsCommand({
    TransactItems: [
      {
        Put: {
          TableName: TABLE_IDEMPOTENCY,
          Item: { id, action, createdAt: now, expiresAt },
          ConditionExpression: "attribute_not_exists(id)",
        }
      },
      {
        Update: {
          TableName: TABLE_COUNTER,
          Key: { pk: COUNTER_PK },
          UpdateExpression: "SET #v = #v + :one, updatedAt = :now, version = if_not_exists(version, :zero) + :one",
          ConditionExpression: condition,
          ExpressionAttributeNames: { "#v": "value" },
          ExpressionAttributeValues: {
            ":one": delta,
            ":now": now,
            ":max": MAX_VALUE,
            ":min": MIN_VALUE,
            ":zero": 0
          }
        }
      }
    ]
  });

  try {
    await client.send(tx);
    return { ...(await getCurrent()), idempotent: false };
  } catch (err: any) {
    const msg = `${err?.name || ""} ${err?.message || ""}`;
    // If idempotency Put failed (key existed), treat as idempotent and return current
    const isIdem = msg.includes("ConditionalCheckFailed") && msg.includes("Put");
    if (isIdem) {
      const cur = await getCurrent();
      return { ...cur, idempotent: true };
    }
    // If bounds condition failed, bubble up with a recognizable code
    const boundsFailed = msg.includes("ConditionalCheckFailed");
    if (boundsFailed) {
      const cur = await getCurrent();
      const reason = isIncrement ? "MAX_REACHED" : "MIN_REACHED";
      throw Object.assign(new Error(reason), { code: reason, current: cur });
    }
    throw err;
  }
}
