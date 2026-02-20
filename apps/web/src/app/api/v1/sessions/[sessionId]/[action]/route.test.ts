import { describe, expect, mock, test } from "bun:test";

import { ApiError } from "@/lib/api/errors";

const validateGenerateQuestionRequestMock = mock((payload: unknown) => payload);
const generateNextQuestionMock = mock(async () => ({
  questionId: "66666666-6666-4666-8666-666666666666",
  sessionId: "55555555-5555-4555-8555-555555555555",
  topic: {
    id: "33333333-3333-4333-8333-333333333333",
    topicCode: "G4-MATH-FRC-001",
    title: "Equivalent Fractions",
    strand: "Numbers",
    subStrand: "Fractions"
  },
  difficulty: "adaptive",
  questionText: "[G4-MATH-FRC-001] What is 7 + 4?",
  answerFormat: "multiple_choice",
  options: ["11", "10", "13"],
  hintCount: 3,
  createdAt: "2026-02-20T13:00:00.000Z"
}));

mock.module("@/lib/prisma", () => ({
  prisma: {}
}));

mock.module("@/lib/api/sessions/generate-question", () => ({
  validateGenerateQuestionRequest: validateGenerateQuestionRequestMock,
  generateNextQuestion: generateNextQuestionMock
}));

describe("POST /api/v1/sessions/{sessionId}/questions:generate", () => {
  test("returns 404 for unknown action", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/sessions/abc/not-found", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-parent-user-id": "22222222-2222-4222-8222-222222222222"
      },
      body: JSON.stringify({})
    });

    const response = await POST(request, { params: Promise.resolve({ sessionId: "abc", action: "unknown" }) });
    const json = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });

  test("returns 201 for valid generation request", async () => {
    validateGenerateQuestionRequestMock.mockImplementation((payload: unknown) => payload);
    generateNextQuestionMock.mockImplementation(async () => ({
      questionId: "66666666-6666-4666-8666-666666666666",
      sessionId: "55555555-5555-4555-8555-555555555555",
      topic: {
        id: "33333333-3333-4333-8333-333333333333",
        topicCode: "G4-MATH-FRC-001",
        title: "Equivalent Fractions",
        strand: "Numbers",
        subStrand: "Fractions"
      },
      difficulty: "adaptive",
      questionText: "[G4-MATH-FRC-001] What is 7 + 4?",
      answerFormat: "multiple_choice",
      options: ["11", "10", "13"],
      hintCount: 3,
      createdAt: "2026-02-20T13:00:00.000Z"
    }));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/sessions/555/questions:generate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-parent-user-id": "22222222-2222-4222-8222-222222222222"
      },
      body: JSON.stringify({
        childId: "11111111-1111-4111-8111-111111111111",
        targetDifficulty: "adaptive",
        maxHints: 3
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({
        sessionId: "55555555-5555-4555-8555-555555555555",
        action: "questions:generate"
      })
    });

    expect(response.status).toBe(201);
  });

  test("maps service errors using shared error shape", async () => {
    validateGenerateQuestionRequestMock.mockImplementation((payload: unknown) => payload);
    generateNextQuestionMock.mockImplementation(async () => {
      throw new ApiError("FORBIDDEN", 403, "Session does not belong to authenticated parent");
    });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/sessions/555/questions:generate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-parent-user-id": "22222222-2222-4222-8222-222222222222"
      },
      body: JSON.stringify({
        childId: "11111111-1111-4111-8111-111111111111",
        targetDifficulty: "adaptive",
        maxHints: 3
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({
        sessionId: "55555555-5555-4555-8555-555555555555",
        action: "questions:generate"
      })
    });
    const json = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });
});
