import { describe, expect, test } from "bun:test";
import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { completeSession, validateCompleteSessionPayload } from "@/lib/api/sessions/complete-session";

const SESSION_ID = "55555555-5555-4555-8555-555555555555";
const CHILD_ID = "11111111-1111-4111-8111-111111111111";
const PARENT_ID = "22222222-2222-4222-8222-222222222222";

function basePayload() {
  return {
    childId: CHILD_ID,
    engagementScore: 82.4
  };
}

describe("validateCompleteSessionPayload", () => {
  test("rejects out-of-range engagementScore", () => {
    expect(() => validateCompleteSessionPayload({ ...basePayload(), engagementScore: 120 })).toThrow(ApiError);
  });

  test("accepts valid payload", () => {
    const parsed = validateCompleteSessionPayload(basePayload());
    expect(parsed.childId).toBe(CHILD_ID);
    expect(parsed.engagementScore).toBe(82.4);
  });
});

describe("completeSession", () => {
  test("rejects already completed session", async () => {
    const deps = {
      prisma: {
        learningSession: {
          findUnique: async () => ({
            id: SESSION_ID,
            childId: CHILD_ID,
            endedAt: new Date("2026-02-20T10:00:00.000Z"),
            totalQuestions: 8,
            correctAnswers: 6,
            avgHintsUsed: new Prisma.Decimal(1.12),
            child: { parentUserId: PARENT_ID }
          }),
          update: async () => {
            throw new Error("should not execute");
          }
        }
      }
    };

    await expect(completeSession(deps, PARENT_ID, SESSION_ID, basePayload())).rejects.toThrow(ApiError);
  });

  test("completes session and returns summary", async () => {
    const deps = {
      prisma: {
        learningSession: {
          findUnique: async () => ({
            id: SESSION_ID,
            childId: CHILD_ID,
            endedAt: null,
            totalQuestions: 8,
            correctAnswers: 6,
            avgHintsUsed: new Prisma.Decimal(1.12),
            child: { parentUserId: PARENT_ID }
          }),
          update: async () => ({
            id: SESSION_ID,
            endedAt: new Date("2026-02-20T14:12:45.000Z"),
            totalQuestions: 8,
            correctAnswers: 6,
            avgHintsUsed: new Prisma.Decimal(1.12)
          })
        }
      }
    };

    const result = await completeSession(deps, PARENT_ID, SESSION_ID, basePayload());
    expect(result).toEqual({
      sessionId: SESSION_ID,
      endedAt: "2026-02-20T14:12:45.000Z",
      summary: {
        totalQuestions: 8,
        correctAnswers: 6,
        avgHintsUsed: 1.12
      }
    });
  });
});
