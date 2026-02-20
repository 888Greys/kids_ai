import { describe, expect, test } from "bun:test";
import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { getTopicDrilldown, parseTopicDrilldownDays } from "@/lib/api/parent/get-topic-drilldown";

const PARENT_ID = "22222222-2222-4222-8222-222222222222";
const CHILD_ID = "11111111-1111-4111-8111-111111111111";

describe("parseTopicDrilldownDays", () => {
  test("returns default when query missing", () => {
    expect(parseTopicDrilldownDays(null)).toBe(30);
  });

  test("rejects invalid days", () => {
    expect(() => parseTopicDrilldownDays("abc")).toThrow(ApiError);
    expect(() => parseTopicDrilldownDays("0")).toThrow(ApiError);
    expect(() => parseTopicDrilldownDays("181")).toThrow(ApiError);
  });
});

describe("getTopicDrilldown", () => {
  test("returns drilldown payload", async () => {
    const d1 = new Date("2026-02-18T10:00:00.000Z");
    const d2 = new Date("2026-02-18T12:00:00.000Z");
    const d3 = new Date("2026-02-19T11:00:00.000Z");

    const deps = {
      prisma: {
        child: {
          findUnique: async () => ({ id: CHILD_ID, parentUserId: PARENT_ID })
        },
        curriculumTopic: {
          findUnique: async () => ({
            id: "topic-1",
            topicCode: "G4-MATH-FRC-001",
            topicTitle: "Equivalent Fractions"
          })
        },
        questionAttempt: {
          findMany: async () => [
            { createdAt: d1, isCorrect: true, hintsUsed: 1 },
            { createdAt: d2, isCorrect: false, hintsUsed: 2 },
            { createdAt: d3, isCorrect: true, hintsUsed: 1 }
          ]
        },
        masterySnapshot: {
          findFirst: async () => ({
            masteryScore: new Prisma.Decimal(58.2),
            proficiency: "NEEDS_SUPPORT" as const
          })
        }
      }
    };

    const result = await getTopicDrilldown(deps, PARENT_ID, CHILD_ID, "G4-MATH-FRC-001", 30);
    expect(result.topicCode).toBe("G4-MATH-FRC-001");
    expect(result.attemptHistory.length).toBe(2);
    expect(result.latestMastery).toEqual({
      masteryScore: 58.2,
      proficiency: "needs_support"
    });
  });
});
