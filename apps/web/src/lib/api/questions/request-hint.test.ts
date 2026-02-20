import { describe, expect, test } from "bun:test";
import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { requestQuestionHint, validateRequestHintPayload } from "@/lib/api/questions/request-hint";

const QUESTION_ID = "77777777-7777-4777-8777-777777777777";
const CHILD_ID = "11111111-1111-4111-8111-111111111111";
const PARENT_ID = "22222222-2222-4222-8222-222222222222";

function basePayload() {
  return {
    childId: CHILD_ID,
    hintLevel: 1
  };
}

describe("validateRequestHintPayload", () => {
  test("rejects out-of-range hint level", () => {
    expect(() => validateRequestHintPayload({ ...basePayload(), hintLevel: 4 })).toThrow(ApiError);
  });

  test("accepts valid payload", () => {
    const parsed = validateRequestHintPayload(basePayload());
    expect(parsed.hintLevel).toBe(1);
    expect(parsed.childId).toBe(CHILD_ID);
  });
});

describe("requestQuestionHint", () => {
  test("rejects skipping hint levels", async () => {
    const deps = {
      prisma: {
        generatedQuestion: {
          findUnique: async () => ({
            id: QUESTION_ID,
            childId: CHILD_ID,
            hintLadder: ["h1", "h2", "h3"],
            modelOutput: {
              hintProgressByChild: {
                [CHILD_ID]: 0
              }
            },
            learningSession: {
              child: {
                parentUserId: PARENT_ID
              }
            }
          }),
          update: async () => ({})
        }
      }
    };

    await expect(requestQuestionHint(deps, PARENT_ID, QUESTION_ID, { childId: CHILD_ID, hintLevel: 2 })).rejects.toThrow(ApiError);
  });

  test("returns hint and persists progress", async () => {
    let savedLevel = 0;

    const deps = {
      prisma: {
        generatedQuestion: {
          findUnique: async () => ({
            id: QUESTION_ID,
            childId: CHILD_ID,
            hintLadder: ["h1", "h2", "h3"],
            modelOutput: {},
            learningSession: {
              child: {
                parentUserId: PARENT_ID
              }
            }
          }),
          update: async (args: { where: { id: string }; data: { modelOutput: Prisma.InputJsonValue } }) => {
            const modelOutput = args.data.modelOutput as { hintProgressByChild?: Record<string, number> };
            savedLevel = modelOutput.hintProgressByChild?.[CHILD_ID] ?? 0;
            return {};
          }
        }
      }
    };

    const result = await requestQuestionHint(deps, PARENT_ID, QUESTION_ID, basePayload());
    expect(savedLevel).toBe(1);
    expect(result).toEqual({
      questionId: QUESTION_ID,
      hintLevel: 1,
      hintText: "h1"
    });
  });
});
