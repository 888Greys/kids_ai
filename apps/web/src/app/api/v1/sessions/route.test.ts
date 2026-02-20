import { describe, expect, mock, test } from "bun:test";

import { ApiError } from "@/lib/api/errors";

const validateStartSessionRequestMock = mock((payload: unknown) => payload);
const startSessionMock = mock(async () => ({
  sessionId: "session-1",
  childId: "11111111-1111-4111-8111-111111111111",
  mode: "practice",
  focusTopic: null,
  startedAt: "2026-02-20T14:00:00.000Z"
}));

mock.module("@/lib/prisma", () => ({
  prisma: {}
}));

mock.module("@/lib/api/sessions/start-session", () => ({
  validateStartSessionRequest: validateStartSessionRequestMock,
  startSession: startSessionMock
}));

describe("POST /api/v1/sessions", () => {
  test("returns 401 when parent header is missing", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const json = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  test("returns 201 for valid request", async () => {
    validateStartSessionRequestMock.mockImplementation((payload: unknown) => payload);
    startSessionMock.mockImplementation(async () => ({
      sessionId: "session-1",
      childId: "11111111-1111-4111-8111-111111111111",
      mode: "practice",
      focusTopic: null,
      startedAt: "2026-02-20T14:00:00.000Z"
    }));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-parent-user-id": "22222222-2222-4222-8222-222222222222"
      },
      body: JSON.stringify({
        childId: "11111111-1111-4111-8111-111111111111",
        mode: "practice",
        aiModel: "gpt-5-mini",
        promptVersion: "math-v1.0"
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  test("returns 201 for bearer-only auth", async () => {
    validateStartSessionRequestMock.mockImplementation((payload: unknown) => payload);
    startSessionMock.mockImplementation(async () => ({
      sessionId: "session-1",
      childId: "11111111-1111-4111-8111-111111111111",
      mode: "practice",
      focusTopic: null,
      startedAt: "2026-02-20T14:00:00.000Z"
    }));

    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const payload = Buffer.from(JSON.stringify({ sub: "22222222-2222-4222-8222-222222222222" }), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const token = `${header}.${payload}.sig`;

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        childId: "11111111-1111-4111-8111-111111111111",
        mode: "practice",
        aiModel: "gpt-5-mini",
        promptVersion: "math-v1.0"
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  test("maps service errors using shared error shape", async () => {
    validateStartSessionRequestMock.mockImplementation((payload: unknown) => payload);
    startSessionMock.mockImplementation(async () => {
      throw new ApiError("NOT_FOUND", 404, "Child not found");
    });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-parent-user-id": "22222222-2222-4222-8222-222222222222"
      },
      body: JSON.stringify({
        childId: "11111111-1111-4111-8111-111111111111",
        mode: "practice",
        aiModel: "gpt-5-mini",
        promptVersion: "math-v1.0"
      })
    });

    const response = await POST(request);
    const json = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });
});
