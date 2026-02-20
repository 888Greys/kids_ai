import { afterEach, describe, expect, test } from "bun:test";

import { ApiError } from "@/lib/api/errors";
import { getParentUserId } from "@/lib/api/auth";

const PARENT_ID = "22222222-2222-4222-8222-222222222222";

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request("http://localhost/api", {
    method: "GET",
    headers
  });
}

const originalNodeEnv = process.env.NODE_ENV;

function setNodeEnv(value: string | undefined): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

afterEach(() => {
  setNodeEnv(originalNodeEnv);
});

describe("getParentUserId", () => {
  test("extracts parent from bearer JWT sub claim", () => {
    setNodeEnv("production");
    const token = makeJwt({ sub: PARENT_ID });
    const request = requestWithHeaders({ authorization: `Bearer ${token}` });
    expect(getParentUserId(request)).toBe(PARENT_ID);
  });

  test("accepts x-parent-user-id fallback outside production", () => {
    setNodeEnv("development");
    const request = requestWithHeaders({ "x-parent-user-id": PARENT_ID });
    expect(getParentUserId(request)).toBe(PARENT_ID);
  });

  test("rejects x-parent-user-id fallback in production", () => {
    setNodeEnv("production");
    const request = requestWithHeaders({ "x-parent-user-id": PARENT_ID });
    expect(() => getParentUserId(request)).toThrow(ApiError);
  });

  test("accepts dev bearer token format outside production", () => {
    setNodeEnv("test");
    const request = requestWithHeaders({ authorization: `Bearer parent:${PARENT_ID}` });
    expect(getParentUserId(request)).toBe(PARENT_ID);
  });

  test("rejects invalid bearer token", () => {
    setNodeEnv("production");
    const request = requestWithHeaders({ authorization: "Bearer invalid-token" });
    expect(() => getParentUserId(request)).toThrow(ApiError);
  });
});
