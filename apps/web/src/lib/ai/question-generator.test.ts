import { afterEach, describe, expect, mock, test } from "bun:test";

import { ApiError } from "@/lib/api/errors";
import { generateQuestionDraft, type QuestionGenerationContext } from "@/lib/ai/question-generator";

const baseContext: QuestionGenerationContext = {
  gradeLevel: 4,
  topicCode: "G4-MATH-FRC-001",
  topicTitle: "Equivalent Fractions",
  strand: "Numbers",
  subStrand: "Fractions",
  targetDifficulty: "adaptive",
  maxHints: 3,
  seed: 1
};

const ENV_KEYS = [
  "AI_PROVIDER",
  "AI_ENABLE_IN_TEST",
  "OPENAI_API_KEY",
  "OPENAI_ENABLE_IN_DEV",
  "OPENAI_MODEL",
  "CEREBRAS_API_KEY",
  "CEREBRAS_ENABLE_IN_DEV",
  "CEREBRAS_MODEL"
] as const;

const originalEnv = new Map<string, string | undefined>(ENV_KEYS.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (typeof value === "undefined") {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe("generateQuestionDraft", () => {
  test("uses deterministic fallback in test env when AI_ENABLE_IN_TEST is not true", async () => {
    process.env.AI_PROVIDER = "cerebras";
    process.env.CEREBRAS_API_KEY = "test-key";
    delete process.env.AI_ENABLE_IN_TEST;

    const fetchMock = mock(() => {
      throw new Error("fetch should not be called");
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const draft = await generateQuestionDraft(baseContext);

    expect(draft.promptInput).toEqual({
      generator: "deterministic_v1",
      topicCode: baseContext.topicCode,
      targetDifficulty: baseContext.targetDifficulty,
      maxHints: baseContext.maxHints
    });
    expect(draft.modelOutput).toEqual({
      provider: "deterministic",
      version: "v1"
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("calls Cerebras and parses JSON schema output when enabled", async () => {
    process.env.AI_PROVIDER = "cerebras";
    process.env.CEREBRAS_API_KEY = "test-key";
    process.env.CEREBRAS_MODEL = "gpt-oss-120b";
    process.env.AI_ENABLE_IN_TEST = "true";

    const responsePayload = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              questionText: "[G4-MATH-FRC-001] Which fraction equals 1/2?",
              answerFormat: "multiple_choice",
              options: ["2/4", "3/5", "1/3"],
              correctAnswer: { value: "2/4" },
              hintLadder: [
                "Equivalent fractions represent the same value.",
                "Try multiplying numerator and denominator of 1/2 by 2.",
                "1/2 can be written as 2/4."
              ],
              explanation: "2/4 equals 1/2 because both numerator and denominator are multiplied by 2."
            })
          }
        }
      ]
    };

    const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://api.cerebras.ai/v1/chat/completions");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({
        "Content-Type": "application/json",
        Authorization: "Bearer test-key"
      });
      return new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const draft = await generateQuestionDraft(baseContext);

    expect(draft.questionText).toBe("[G4-MATH-FRC-001] Which fraction equals 1/2?");
    expect(draft.correctAnswer.value).toBe("2/4");
    expect(draft.hintLadder).toHaveLength(3);
    expect(draft.promptInput).toEqual({
      provider: "cerebras",
      model: "gpt-oss-120b",
      attempt: 1,
      topicCode: "G4-MATH-FRC-001",
      targetDifficulty: "adaptive",
      maxHints: 3
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("throws clear error for configured cerebras provider without key", async () => {
    process.env.AI_PROVIDER = "cerebras";
    process.env.AI_ENABLE_IN_TEST = "true";
    delete process.env.CEREBRAS_API_KEY;

    await expect(generateQuestionDraft(baseContext)).rejects.toBeInstanceOf(ApiError);
    await expect(generateQuestionDraft(baseContext)).rejects.toThrow(
      "CEREBRAS_API_KEY is missing for AI_PROVIDER=cerebras"
    );
  });
});
