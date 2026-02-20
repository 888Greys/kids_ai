import { describe, expect, mock, test } from "bun:test";

import { ApiError } from "@/lib/api/errors";

const validateCompleteSessionPayloadMock = mock((payload: unknown) => payload);
const completeSessionMock = mock(async () => ({
  sessionId: "55555555-5555-4555-8555-555555555555",
  endedAt: "2026-02-20T14:12:45.000Z",
  summary: {
    totalQuestions: 8,
    correctAnswers: 6,
    avgHintsUsed: 1.12
  }
}));

mock.module("@/lib/prisma", () => ({
  prisma: {}
}));

mock.module("@/lib/api/sessions/complete-session", () => ({
  validateCompleteSessionPayload: validateCompleteSessionPayloadMock,
  completeSession: completeSessionMock
}));

describe("POST /api/v1/sessions/{sessionId}/complete", () => {
  test("returns 401 when parent header is missing", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/sessions/id/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });

    const response = await POST(request, { params: Promise.resolve({ sessionId: "id" }) });
    const json = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  test("returns 200 for valid completion request", async () => {
    validateCompleteSessionPayloadMock.mockImplementation((payload: unknown) => payload);
    completeSessionMock.mockImplementation(async () => ({
      sessionId: "55555555-5555-4555-8555-555555555555",
      endedAt: "2026-02-20T14:12:45.000Z",
      summary: {
        totalQuestions: 8,
        correctAnswers: 6,
        avgHintsUsed: 1.12
      }
    }));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/sessions/id/complete", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-parent-user-id": "22222222-2222-4222-8222-222222222222"
      },
      body: JSON.stringify({
        childId: "11111111-1111-4111-8111-111111111111",
        engagementScore: 82.4
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({ sessionId: "55555555-5555-4555-8555-555555555555" })
    });
    expect(response.status).toBe(200);
  });

  test("maps validation errors using shared error shape", async () => {
    validateCompleteSessionPayloadMock.mockImplementation((payload: unknown) => payload);
    completeSessionMock.mockImplementation(async () => {
      throw new ApiError("VALIDATION_ERROR", 400, "Session is already completed");
    });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/sessions/id/complete", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-parent-user-id": "22222222-2222-4222-8222-222222222222"
      },
      body: JSON.stringify({
        childId: "11111111-1111-4111-8111-111111111111",
        engagementScore: 82.4
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({ sessionId: "55555555-5555-4555-8555-555555555555" })
    });
    const json = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});
