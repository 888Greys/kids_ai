import { describe, expect, test } from "bun:test";

import { ApiError } from "@/lib/api/errors";
import { submitQuestionAttempt, validateSubmitAttemptRequest } from "@/lib/api/questions/submit-attempt";

const QUESTION_ID = "77777777-7777-4777-8777-777777777777";
const SESSION_ID = "55555555-5555-4555-8555-555555555555";
const CHILD_ID = "11111111-1111-4111-8111-111111111111";
const PARENT_ID = "22222222-2222-4222-8222-222222222222";
const TOPIC_ID = "33333333-3333-4333-8333-333333333333";

function baseRequest() {
  return {
    childId: CHILD_ID,
    submittedAnswer: { value: "11" },
    hintsUsed: 1,
    responseTimeSeconds: 15
  };
}

describe("validateSubmitAttemptRequest", () => {
  test("rejects out-of-range hintsUsed", () => {
    expect(() => validateSubmitAttemptRequest({ ...baseRequest(), hintsUsed: 9 })).toThrow(ApiError);
  });

  test("accepts valid payload", () => {
    const parsed = validateSubmitAttemptRequest(baseRequest());
    expect(parsed.childId).toBe(CHILD_ID);
    expect(parsed.hintsUsed).toBe(1);
  });
});

describe("submitQuestionAttempt", () => {
  test("rejects parent mismatch", async () => {
    const deps = {
      prisma: {
        generatedQuestion: {
          findUnique: async () => ({
            id: QUESTION_ID,
            childId: CHILD_ID,
            topicId: TOPIC_ID,
            correctAnswer: { value: "11" },
            explanation: "7 + 4 = 11.",
            topic: { id: TOPIC_ID, topicCode: "G4-MATH-FRC-001" },
            learningSession: {
              id: SESSION_ID,
              child: { parentUserId: "different-parent" }
            }
          })
        },
        questionAttempt: {
          create: async () => {
            throw new Error("should not execute");
          },
          count: async () => 0,
          aggregate: async () => ({ _avg: { hintsUsed: 0 } })
        },
        learningSession: {
          update: async () => ({})
        },
        masterySnapshot: {
          upsert: async () => ({})
        }
      }
    };

    await expect(submitQuestionAttempt(deps, PARENT_ID, QUESTION_ID, validateSubmitAttemptRequest(baseRequest()))).rejects.toThrow(ApiError);
  });

  test("creates attempt and returns contract shape", async () => {
    let updatedSessionTotal = -1;
    let upsertedAttemptsCount = -1;

    const deps = {
      prisma: {
        generatedQuestion: {
          findUnique: async () => ({
            id: QUESTION_ID,
            childId: CHILD_ID,
            topicId: TOPIC_ID,
            correctAnswer: { value: "11" },
            explanation: "7 + 4 = 11.",
            topic: { id: TOPIC_ID, topicCode: "G4-MATH-FRC-001" },
            learningSession: {
              id: SESSION_ID,
              child: { parentUserId: PARENT_ID }
            }
          })
        },
        questionAttempt: {
          create: async () => ({ id: "88888888-8888-4888-8888-888888888888" }),
          count: async (args: { where: { isCorrect?: boolean } }) => {
            if (args.where.isCorrect === true) {
              return 3;
            }
            return 4;
          },
          aggregate: async (args: { where: { question?: { sessionId?: string; topicId?: string } } }) => {
            if (args.where.question?.sessionId) {
              return { _avg: { hintsUsed: 0.75 } };
            }
            return { _avg: { hintsUsed: 1.2 } };
          }
        },
        learningSession: {
          update: async (args: { data: { totalQuestions: number } }) => {
            updatedSessionTotal = args.data.totalQuestions;
            return {};
          }
        },
        masterySnapshot: {
          upsert: async (args: { create: { attemptsCount: number } }) => {
            upsertedAttemptsCount = args.create.attemptsCount;
            return {};
          }
        }
      }
    };

    const result = await submitQuestionAttempt(deps, PARENT_ID, QUESTION_ID, validateSubmitAttemptRequest(baseRequest()));
    expect(updatedSessionTotal).toBe(4);
    expect(upsertedAttemptsCount).toBe(4);
    expect(result).toEqual({
      attemptId: "88888888-8888-4888-8888-888888888888",
      isCorrect: true,
      feedbackText: "Great job. That answer is correct.",
      explanation: "7 + 4 = 11.",
      masteryUpdate: {
        topicId: TOPIC_ID,
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
    });
  });
});
