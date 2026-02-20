import { describe, expect, test } from "bun:test";
import { DifficultyLevel } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { generateNextQuestion, validateGenerateQuestionRequest } from "@/lib/api/sessions/generate-question";

const SESSION_ID = "55555555-5555-4555-8555-555555555555";
const CHILD_ID = "11111111-1111-4111-8111-111111111111";
const PARENT_ID = "22222222-2222-4222-8222-222222222222";
const TOPIC_ID = "33333333-3333-4333-8333-333333333333";

function baseRequest() {
  return {
    childId: CHILD_ID,
    targetDifficulty: "adaptive" as const,
    maxHints: 3
  };
}

describe("validateGenerateQuestionRequest", () => {
  test("rejects invalid maxHints", () => {
    expect(() => validateGenerateQuestionRequest({ ...baseRequest(), maxHints: 4 })).toThrow(ApiError);
  });

  test("accepts valid payload", () => {
    const parsed = validateGenerateQuestionRequest(baseRequest());
    expect(parsed.targetDifficulty).toBe("adaptive");
    expect(parsed.maxHints).toBe(3);
  });
});

describe("generateNextQuestion", () => {
  test("rejects parent mismatch", async () => {
    const deps = {
      prisma: {
        learningSession: {
          findUnique: async () => ({
            id: SESSION_ID,
            childId: CHILD_ID,
            focusTopicId: TOPIC_ID,
            child: { parentUserId: "different-parent", gradeLevel: 4 }
          })
        },
        curriculumTopic: {
          findUnique: async () => null,
          findFirst: async () => null
        },
        generatedQuestion: {
          count: async () => 0,
          findFirst: async () => null,
          create: async () => {
            throw new Error("should not execute");
          }
        }
      }
    };

    await expect(generateNextQuestion(deps, PARENT_ID, SESSION_ID, baseRequest())).rejects.toThrow(ApiError);
  });

  test("rejects mismatched child", async () => {
    const deps = {
      prisma: {
        learningSession: {
          findUnique: async () => ({
            id: SESSION_ID,
            childId: "99999999-9999-4999-8999-999999999999",
            focusTopicId: TOPIC_ID,
            child: { parentUserId: PARENT_ID, gradeLevel: 4 }
          })
        },
        curriculumTopic: {
          findUnique: async () => null,
          findFirst: async () => null
        },
        generatedQuestion: {
          count: async () => 0,
          findFirst: async () => null,
          create: async () => {
            throw new Error("should not execute");
          }
        }
      }
    };

    await expect(generateNextQuestion(deps, PARENT_ID, SESSION_ID, baseRequest())).rejects.toThrow(ApiError);
  });

  test("creates question and returns expected shape", async () => {
    const createdAt = new Date("2026-02-20T13:00:00.000Z");
    const deps = {
      prisma: {
        learningSession: {
          findUnique: async () => ({
            id: SESSION_ID,
            childId: CHILD_ID,
            focusTopicId: TOPIC_ID,
            child: { parentUserId: PARENT_ID, gradeLevel: 4 }
          })
        },
        curriculumTopic: {
          findUnique: async () => ({
            id: TOPIC_ID,
            topicCode: "G4-MATH-FRC-001",
            topicTitle: "Equivalent Fractions",
            strand: "Numbers",
            subStrand: "Fractions"
          }),
          findFirst: async () => null
        },
        generatedQuestion: {
          count: async () => 0,
          findFirst: async () => null,
          create: async () => ({
            id: "66666666-6666-4666-8666-666666666666",
            sessionId: SESSION_ID,
            createdAt,
            questionText: "[G4-MATH-FRC-001] What is 7 + 4?",
            answerFormat: "multiple_choice",
            options: ["11", "10", "13"],
            difficulty: DifficultyLevel.ADAPTIVE,
            topic: {
              id: TOPIC_ID,
              topicCode: "G4-MATH-FRC-001",
              topicTitle: "Equivalent Fractions",
              strand: "Numbers",
              subStrand: "Fractions"
            }
          })
        }
      }
    };

    const result = await generateNextQuestion(deps, PARENT_ID, SESSION_ID, baseRequest());
    expect(result).toEqual({
      questionId: "66666666-6666-4666-8666-666666666666",
      sessionId: SESSION_ID,
      topic: {
        id: TOPIC_ID,
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
    });
  });
});
