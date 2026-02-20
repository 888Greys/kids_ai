import { describe, expect, mock, test } from "bun:test";

import { ApiError } from "@/lib/api/errors";

const validateSubmitAttemptRequestMock = mock((payload: unknown) => payload);
const submitQuestionAttemptMock = mock(async () => ({
  attemptId: "88888888-8888-4888-8888-888888888888",
  isCorrect: true,
  feedbackText: "Great job. That answer is correct.",
  explanation: "7 + 4 = 11.",
  masteryUpdate: {
    topicId: "33333333-3333-4333-8333-333333333333",
    topicCode: "G4-MATH-FRC-001",
    accuracyPercent: 75,
    hintDependencyPercent: 40,
    masteryScore: 61,
    proficiency: "developing"
  },
  sessionProgress: {
    totalQuestions: 4,
    correctAnswers: 3,
    avgHintsUsed: 0.75
  },
  nextRecommendedDifficulty: "medium"
}));

mock.module("@/lib/prisma", () => ({
  prisma: {}
}));

mock.module("@/lib/api/questions/submit-attempt", () => ({
  validateSubmitAttemptRequest: validateSubmitAttemptRequestMock,
  submitQuestionAttempt: submitQuestionAttemptMock
}));

describe("POST /api/v1/questions/{questionId}/attempts", () => {
  test("returns 401 when parent header is missing", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/questions/id/attempts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });

    const response = await POST(request, { params: Promise.resolve({ questionId: "id" }) });
    const json = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  test("returns 201 for valid attempt request", async () => {
    validateSubmitAttemptRequestMock.mockImplementation((payload: unknown) => payload);
    submitQuestionAttemptMock.mockImplementation(async () => ({
      attemptId: "88888888-8888-4888-8888-888888888888",
      isCorrect: true,
      feedbackText: "Great job. That answer is correct.",
      explanation: "7 + 4 = 11.",
      masteryUpdate: {
        topicId: "33333333-3333-4333-8333-333333333333",
        topicCode: "G4-MATH-FRC-001",
        accuracyPercent: 75,
        hintDependencyPercent: 40,
        masteryScore: 61,
        proficiency: "developing"
      },
      sessionProgress: {
        totalQuestions: 4,
        correctAnswers: 3,
        avgHintsUsed: 0.75
      },
      nextRecommendedDifficulty: "medium"
    }));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/questions/id/attempts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-parent-user-id": "22222222-2222-4222-8222-222222222222"
      },
      body: JSON.stringify({
        childId: "11111111-1111-4111-8111-111111111111",
        submittedAnswer: { value: "11" },
        hintsUsed: 1
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({ questionId: "77777777-7777-4777-8777-777777777777" })
    });
    expect(response.status).toBe(201);
  });

  test("maps service errors using shared error shape", async () => {
    validateSubmitAttemptRequestMock.mockImplementation((payload: unknown) => payload);
    submitQuestionAttemptMock.mockImplementation(async () => {
      throw new ApiError("NOT_FOUND", 404, "Question not found");
    });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/questions/id/attempts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-parent-user-id": "22222222-2222-4222-8222-222222222222"
      },
      body: JSON.stringify({
        childId: "11111111-1111-4111-8111-111111111111",
        submittedAnswer: { value: "11" },
        hintsUsed: 1
      })
    });

    const response = await POST(request, {
      params: Promise.resolve({ questionId: "77777777-7777-4777-8777-777777777777" })
    });
    const json = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });
});
