import { describe, expect, mock, test } from "bun:test";

const generateQuestionDraftMock = mock(async () => ({
  questionText: "[G4-MATH-FRC-001] Which fraction is equivalent to 1/2?",
  answerFormat: "multiple_choice" as const,
  options: ["2/4", "3/5", "4/5"],
  correctAnswer: { value: "2/4" },
  hintLadder: ["Use equal parts.", "Scale numerator and denominator together.", "1/2 = 2/4."],
  explanation: "2/4 is equivalent to 1/2.",
  promptInput: {},
  modelOutput: {}
}));

mock.module("@/lib/ai/question-generator", () => ({
  generateQuestionDraft: generateQuestionDraftMock
}));

describe("POST /api/v1/prototype/question", () => {
  test("returns 201 with generated prototype payload", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/prototype/question", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        missionKey: "fractions",
        targetDifficulty: "adaptive",
        maxHints: 3,
        seed: 1
      })
    });

    const response = await POST(request);
    const json = (await response.json()) as {
      questionId: string;
      topic: { topicCode: string };
      hintCount: number;
      hints: string[];
      correctAnswer: string;
    };

    expect(response.status).toBe(201);
    expect(json.questionId).toContain("prototype-fractions");
    expect(json.topic.topicCode).toBe("G4-MATH-FRC-001");
    expect(json.hintCount).toBe(3);
    expect(json.hints.length).toBe(3);
    expect(json.correctAnswer).toBe("2/4");
  });

  test("returns 400 for invalid mission key", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/v1/prototype/question", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        missionKey: "invalid",
        targetDifficulty: "adaptive",
        maxHints: 3,
        seed: 1
      })
    });

    const response = await POST(request);
    const json = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });
});

