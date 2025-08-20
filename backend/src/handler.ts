import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { applyAction, getCurrent } from "./dynamo.js";
import { PostBody } from "./types.js";

function response(statusCode: number, body: unknown, extraHeaders: Record<string, string> = {}): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, idempotency-key",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  if (event.requestContext.http.method === "OPTIONS") {
    return response(200, { ok: true });
  }

  try {
    if (event.requestContext.http.method === "GET" && event.rawPath === "/number") {
      const cur = await getCurrent();
      return response(200, cur);
    }

    if (event.requestContext.http.method === "POST" && event.rawPath === "/number") {
      const idemKey = event.headers?.["idempotency-key"] || event.headers?.["Idempotency-Key"];
      const body = event.body ? JSON.parse(event.body) as PostBody : null;
      if (!body || (body.action !== "increment" && body.action !== "decrement")) {
        return response(400, { error: "Invalid body; expected { action: 'increment'|'decrement' }" });
      }
      try {
        const result = await applyAction(body.action, typeof idemKey === "string" ? idemKey : undefined);
        return response(200, result);
      } catch (e: any) {
        if (e?.code === "MAX_REACHED" || e?.code === "MIN_REACHED") {
          return response(409, { error: e.code, current: e.current });
        }
        console.error("Unhandled error", e);
        return response(500, { error: "Internal error" });
      }
    }

    return response(404, { error: "Not Found" });
  } catch (e) {
    console.error("Fatal error", e);
    return response(500, { error: "Internal error" });
  }
}
