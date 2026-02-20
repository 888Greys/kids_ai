import { describe, expect, test } from "bun:test";
import { SessionMode } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { startSession, validateStartSessionRequest } from "@/lib/api/sessions/start-session";

const CHILD_ID = "11111111-1111-4111-8111-111111111111";
const PARENT_ID = "22222222-2222-4222-8222-222222222222";
const TOPIC_ID = "33333333-3333-4333-8333-333333333333";

function baseRequest() {
  return {
    childId: CHILD_ID,
    mode: "practice" as const,
    focusTopicCode: "G4-MATH-FRC-001",
    aiModel: "gpt-5-mini",
    promptVersion: "math-v1.0"
  };
}

describe("validateStartSessionRequest", () => {
  test("rejects invalid mode", () => {
    expect(() =>
      validateStartSessionRequest({
        ...baseRequest(),
        mode: "arcade"
      })
    ).toThrow(ApiError);
  });

  test("accepts valid payload", () => {
    const parsed = validateStartSessionRequest(baseRequest());
    expect(parsed.mode).toBe("practice");
    expect(parsed.childId).toBe(CHILD_ID);
  });
});

describe("startSession", () => {
  test("rejects child from different parent", async () => {
    const deps = {
      prisma: {
        child: {
          findUnique: async () => ({ id: CHILD_ID, gradeLevel: 4, parentUserId: "other-parent" })
        },
        curriculumTopic: {
          findFirst: async () => null
        },
        learningSession: {
          create: async () => {
            throw new Error("should not execute");
          }
        }
      }
    };

    await expect(startSession(deps, PARENT_ID, baseRequest())).rejects.toThrow(ApiError);
  });

  test("rejects non grade-appropriate focus topic", async () => {
    const deps = {
      prisma: {
        child: {
          findUnique: async () => ({ id: CHILD_ID, gradeLevel: 4, parentUserId: PARENT_ID })
        },
        curriculumTopic: {
          findFirst: async () => null
        },
        learningSession: {
          create: async () => {
            throw new Error("should not execute");
          }
        }
      }
    };

    await expect(startSession(deps, PARENT_ID, baseRequest())).rejects.toThrow(ApiError);
  });

  test("creates session and returns contract shape", async () => {
    const startedAt = new Date("2026-02-20T12:00:00.000Z");

    const deps = {
      prisma: {
        child: {
          findUnique: async () => ({ id: CHILD_ID, gradeLevel: 4, parentUserId: PARENT_ID })
        },
        curriculumTopic: {
          findFirst: async () => ({ id: TOPIC_ID, topicCode: "G4-MATH-FRC-001", topicTitle: "Equivalent Fractions" })
        },
        learningSession: {
          create: async (args: {
            data: {
              childId: string;
              focusTopicId: string | null;
              mode: SessionMode;
              aiModel: string;
              promptVersion: string;
            };
            select: { id: true; childId: true; mode: true; startedAt: true };
          }) => {
            expect(args.data.mode).toBe(SessionMode.PRACTICE);
            return {
              id: "44444444-4444-4444-8444-444444444444",
              childId: args.data.childId,
              mode: args.data.mode,
              startedAt
            };
          }
        }
      }
    };

    const result = await startSession(deps, PARENT_ID, baseRequest());
    expect(result).toEqual({
      sessionId: "44444444-4444-4444-8444-444444444444",
      childId: CHILD_ID,
      mode: "practice",
      focusTopic: {
        id: TOPIC_ID,
        topicCode: "G4-MATH-FRC-001",
        title: "Equivalent Fractions"
      },
      startedAt: "2026-02-20T12:00:00.000Z"
    });
  });
});
