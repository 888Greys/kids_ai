import { describe, expect, mock, test } from "bun:test";

import { ApiError } from "@/lib/api/errors";

const validateRequestHintPayloadMock = mock((payload: unknown) => payload);
const requestQuestionHintMock = mock(async () => ({
  questionId: "77777777-7777-4777-8777-777777777777",
  hintLevel: 1,
  hintText: "Start by adding the ones place first."
}));

mock.module("@/lib/prisma", () => ({
  prisma: {}
}));

mock.module("@/lib/api/questions/request-hint", () => ({
  validateRequestHintPayload: validateRequestHintPayloadMock,
  requestQuestionHint: requestQuestionHintMock
}));

describe("POST /api/v1/questions/{questionId}/hints", () => {
  test("returns 401 when parent header is missing", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/questions/id/hints", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });

    const response = await POST(request, { params: Promise.resolve({ questionId: "id" }) });
    const json = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  test("returns 200 for valid hint request", async () => {
    validateRequestHintPayloadMock.mockImplementation((payload: unknown) => payload);
    requestQuestionHintMock.mockImplementation(async () => ({
      questionId: "77777777-7777-4777-8777-777777777777",
      hintLevel: 1,
      hintText: "Start by adding the ones place first."
    }));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/questions/id/hints", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-parent-user-id": "22222222-2222-4222-8222-222222222222"
      },
      body: JSON.stringify({
        childId: "11111111-1111-4111-8111-111111111111",
        hintLevel: 1
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({ questionId: "77777777-7777-4777-8777-777777777777" })
    });
    expect(response.status).toBe(200);
  });

  test("maps validation errors using shared error shape", async () => {
    validateRequestHintPayloadMock.mockImplementation((payload: unknown) => payload);
    requestQuestionHintMock.mockImplementation(async () => {
      throw new ApiError("VALIDATION_ERROR", 400, "Cannot skip hint levels");
    });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/questions/id/hints", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-parent-user-id": "22222222-2222-4222-8222-222222222222"
      },
      body: JSON.stringify({
        childId: "11111111-1111-4111-8111-111111111111",
        hintLevel: 2
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({ questionId: "77777777-7777-4777-8777-777777777777" })
    });
    const json = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});
