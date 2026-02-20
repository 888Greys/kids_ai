import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";

type ChildRecord = {
  id: string;
  firstName: string;
  lastName: string | null;
  gradeLevel: number;
  parentUserId: string;
};

type AttemptRecord = {
  createdAt: Date;
  isCorrect: boolean;
  hintsUsed: number;
};

type MasterySnapshotRecord = {
  topicId: string;
  masteryScore: Prisma.Decimal;
  proficiency: "NEEDS_SUPPORT" | "DEVELOPING" | "PROFICIENT" | "ADVANCED";
  accuracyPercent: Prisma.Decimal;
  hintDependencyPercent: Prisma.Decimal;
  snapshotDate: Date;
  topic: {
    topicCode: string;
    topicTitle: string;
  };
};

type RecommendationRecord = {
  generatedOn: Date;
  recommendation: string;
  focusTopic: {
    topicCode: string;
  } | null;
};

type GetChildDashboardDeps = {
  prisma: {
    child: {
      findUnique: (args: {
        where: { id: string };
        select: {
          id: true;
          firstName: true;
          lastName: true;
          gradeLevel: true;
          parentUserId: true;
        };
      }) => Promise<ChildRecord | null>;
    };
    questionAttempt: {
      findMany: (args: {
        where: {
          childId: string;
          createdAt: { gte: Date };
        };
        orderBy: { createdAt: "asc" };
        select: {
          createdAt: true;
          isCorrect: true;
          hintsUsed: true;
        };
      }) => Promise<AttemptRecord[]>;
    };
    masterySnapshot: {
      findMany: (args: {
        where: { childId: string };
        orderBy: Array<{ topicId: "asc" } | { snapshotDate: "desc" }>;
        select: {
          topicId: true;
          masteryScore: true;
          proficiency: true;
          accuracyPercent: true;
          hintDependencyPercent: true;
          snapshotDate: true;
          topic: { select: { topicCode: true; topicTitle: true } };
        };
      }) => Promise<MasterySnapshotRecord[]>;
    };
    parentRecommendation: {
      findMany: (args: {
        where: { childId: string };
        orderBy: { generatedOn: "desc" };
        take: number;
        select: {
          generatedOn: true;
          recommendation: true;
          focusTopic: { select: { topicCode: true } };
        };
      }) => Promise<RecommendationRecord[]>;
    };
  };
};

type GetChildDashboardResponse = {
  child: {
    childId: string;
    name: string;
    gradeLevel: number;
  };
  overview: {
    attempts: number;
    accuracyPercent: number;
    avgHintsUsed: number;
    streakDays: number;
  };
  dailyTrend: Array<{
    date: string;
    attempts: number;
    accuracyPercent: number;
    avgHintsUsed: number;
  }>;
  topicMastery: Array<{
    topicId: string;
    topicCode: string;
    topicTitle: string;
    masteryScore: number;
    proficiency: "needs_support" | "developing" | "proficient" | "advanced";
    accuracyPercent: number;
    hintDependencyPercent: number;
  }>;
  recommendations: Array<{
    generatedOn: string;
    focusTopicCode: string | null;
    text: string;
  }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toRounded(value: number): number {
  return Math.round(value * 100) / 100;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toProficiencyLabel(value: MasterySnapshotRecord["proficiency"]): "needs_support" | "developing" | "proficient" | "advanced" {
  switch (value) {
    case "NEEDS_SUPPORT":
      return "needs_support";
    case "DEVELOPING":
      return "developing";
    case "PROFICIENT":
      return "proficient";
    case "ADVANCED":
      return "advanced";
  }
}

function computeStreakDays(attempts: AttemptRecord[]): number {
  const uniqueDaysDesc = [...new Set(attempts.map((a) => toDateKey(a.createdAt)))].sort().reverse();
  if (uniqueDaysDesc.length === 0) {
    return 0;
  }

  let streak = 0;
  let cursor = new Date();
  for (const dateKey of uniqueDaysDesc) {
    const cursorKey = toDateKey(cursor);
    if (dateKey !== cursorKey) {
      if (streak === 0) {
        const yesterday = new Date(cursor);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        if (dateKey !== toDateKey(yesterday)) {
          break;
        }
        cursor = yesterday;
      } else {
        break;
      }
    }

    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export function parseDashboardDays(rawDays: string | null): number {
  if (!rawDays) {
    return 7;
  }

  const parsed = Number.parseInt(rawDays, 10);
  if (!Number.isInteger(parsed)) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid days query", [{ field: "days", reason: "must_be_integer" }]);
  }

  if (parsed < 1 || parsed > 90) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid days query", [{ field: "days", reason: "out_of_range" }]);
  }

  return parsed;
}

export async function getChildDashboard(
  deps: GetChildDashboardDeps,
  parentUserId: string,
  childId: string,
  days: number
): Promise<GetChildDashboardResponse> {
  if (!UUID_RE.test(parentUserId)) {
    throw new ApiError("UNAUTHORIZED", 401, "Invalid authentication context");
  }
  if (!UUID_RE.test(childId)) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid child identifier", [{ field: "childId", reason: "invalid_uuid" }]);
  }

  const child = await deps.prisma.child.findUnique({
    where: { id: childId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gradeLevel: true,
      parentUserId: true
    }
  });

  if (!child) {
    throw new ApiError("NOT_FOUND", 404, "Child not found");
  }

  if (child.parentUserId !== parentUserId) {
    throw new ApiError("FORBIDDEN", 403, "Child does not belong to authenticated parent");
  }

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const attempts = await deps.prisma.questionAttempt.findMany({
    where: {
      childId,
      createdAt: { gte: since }
    },
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true,
      isCorrect: true,
      hintsUsed: true
    }
  });

  const attemptsCount = attempts.length;
  const correctAttempts = attempts.filter((a) => a.isCorrect).length;
  const accuracyPercent = attemptsCount === 0 ? 0 : toRounded((correctAttempts / attemptsCount) * 100);
  const avgHintsUsed = attemptsCount === 0 ? 0 : toRounded(attempts.reduce((sum, a) => sum + a.hintsUsed, 0) / attemptsCount);
  const streakDays = computeStreakDays(attempts);

  const byDay = new Map<string, { attempts: number; correct: number; hintsTotal: number }>();
  for (const attempt of attempts) {
    const key = toDateKey(attempt.createdAt);
    const current = byDay.get(key) ?? { attempts: 0, correct: 0, hintsTotal: 0 };
    current.attempts += 1;
    current.correct += attempt.isCorrect ? 1 : 0;
    current.hintsTotal += attempt.hintsUsed;
    byDay.set(key, current);
  }

  const dailyTrend = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      attempts: stats.attempts,
      accuracyPercent: stats.attempts === 0 ? 0 : toRounded((stats.correct / stats.attempts) * 100),
      avgHintsUsed: stats.attempts === 0 ? 0 : toRounded(stats.hintsTotal / stats.attempts)
    }));

  const snapshots = await deps.prisma.masterySnapshot.findMany({
    where: { childId },
    orderBy: [{ topicId: "asc" }, { snapshotDate: "desc" }],
    select: {
      topicId: true,
      masteryScore: true,
      proficiency: true,
      accuracyPercent: true,
      hintDependencyPercent: true,
      snapshotDate: true,
      topic: {
        select: {
          topicCode: true,
          topicTitle: true
        }
      }
    }
  });

  const latestByTopic = new Map<string, MasterySnapshotRecord>();
  for (const snapshot of snapshots) {
    if (!latestByTopic.has(snapshot.topicId)) {
      latestByTopic.set(snapshot.topicId, snapshot);
    }
  }

  const topicMastery = [...latestByTopic.values()].map((snapshot) => ({
    topicId: snapshot.topicId,
    topicCode: snapshot.topic.topicCode,
    topicTitle: snapshot.topic.topicTitle,
    masteryScore: toRounded(snapshot.masteryScore.toNumber()),
    proficiency: toProficiencyLabel(snapshot.proficiency),
    accuracyPercent: toRounded(snapshot.accuracyPercent.toNumber()),
    hintDependencyPercent: toRounded(snapshot.hintDependencyPercent.toNumber())
  }));

  const recommendations = await deps.prisma.parentRecommendation.findMany({
    where: { childId },
    orderBy: { generatedOn: "desc" },
    take: 5,
    select: {
      generatedOn: true,
      recommendation: true,
      focusTopic: {
        select: {
          topicCode: true
        }
      }
    }
  });

  const fullName = child.lastName ? `${child.firstName} ${child.lastName}` : child.firstName;

  return {
    child: {
      childId: child.id,
      name: fullName,
      gradeLevel: child.gradeLevel
    },
    overview: {
      attempts: attemptsCount,
      accuracyPercent,
      avgHintsUsed,
      streakDays
    },
    dailyTrend,
    topicMastery,
    recommendations: recommendations.map((row) => ({
      generatedOn: toDateKey(row.generatedOn),
      focusTopicCode: row.focusTopic?.topicCode ?? null,
      text: row.recommendation
    }))
  };
}
