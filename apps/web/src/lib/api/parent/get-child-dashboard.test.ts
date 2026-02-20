import { describe, expect, test } from "bun:test";
import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { getChildDashboard, parseDashboardDays } from "@/lib/api/parent/get-child-dashboard";

const PARENT_ID = "22222222-2222-4222-8222-222222222222";
const CHILD_ID = "11111111-1111-4111-8111-111111111111";

describe("parseDashboardDays", () => {
  test("returns default when query missing", () => {
    expect(parseDashboardDays(null)).toBe(7);
  });

  test("rejects invalid days", () => {
    expect(() => parseDashboardDays("abc")).toThrow(ApiError);
    expect(() => parseDashboardDays("0")).toThrow(ApiError);
    expect(() => parseDashboardDays("91")).toThrow(ApiError);
  });
});

describe("getChildDashboard", () => {
  test("returns aggregated dashboard payload", async () => {
    const now = new Date();
    const d1 = new Date(now);
    d1.setUTCHours(10, 0, 0, 0);
    const d2 = new Date(now);
    d2.setUTCHours(12, 0, 0, 0);

    const deps = {
      prisma: {
        child: {
          findUnique: async () => ({
            id: CHILD_ID,
            firstName: "Amina",
            lastName: null,
            gradeLevel: 4,
            parentUserId: PARENT_ID
          })
        },
        questionAttempt: {
          findMany: async () => [
            { createdAt: d1, isCorrect: true, hintsUsed: 1 },
            { createdAt: d2, isCorrect: false, hintsUsed: 2 }
          ]
        },
        masterySnapshot: {
          findMany: async () => [
            {
              topicId: "topic-1",
              masteryScore: new Prisma.Decimal(58.2),
              proficiency: "NEEDS_SUPPORT" as const,
              accuracyPercent: new Prisma.Decimal(54.0),
              hintDependencyPercent: new Prisma.Decimal(48.5),
              snapshotDate: d2,
              topic: {
                topicCode: "G4-MATH-FRC-001",
                topicTitle: "Equivalent Fractions"
              }
            }
          ]
        },
        parentRecommendation: {
          findMany: async () => [
            {
              generatedOn: d2,
              recommendation: "Practice equivalent fractions for 10 minutes.",
              focusTopic: { topicCode: "G4-MATH-FRC-001" }
            }
          ]
        }
      }
    };

    const result = await getChildDashboard(deps, PARENT_ID, CHILD_ID, 7);
    expect(result.child.childId).toBe(CHILD_ID);
    expect(result.overview.attempts).toBe(2);
    expect(result.overview.accuracyPercent).toBe(50);
    expect(result.topicMastery.length).toBe(1);
    expect(result.recommendations.length).toBe(1);
  });
});
