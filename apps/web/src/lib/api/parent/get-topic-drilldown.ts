import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";

type ChildRecord = {
  id: string;
  parentUserId: string;
};

type TopicRecord = {
  id: string;
  topicCode: string;
  topicTitle: string;
};

type AttemptRecord = {
  createdAt: Date;
  isCorrect: boolean;
  hintsUsed: number;
};

type SnapshotRecord = {
  masteryScore: Prisma.Decimal;
  proficiency: "NEEDS_SUPPORT" | "DEVELOPING" | "PROFICIENT" | "ADVANCED";
};

type GetTopicDrilldownDeps = {
  prisma: {
    child: {
      findUnique: (args: {
        where: { id: string };
        select: { id: true; parentUserId: true };
      }) => Promise<ChildRecord | null>;
    };
    curriculumTopic: {
      findUnique: (args: {
        where: { topicCode: string };
        select: { id: true; topicCode: true; topicTitle: true };
      }) => Promise<TopicRecord | null>;
    };
    questionAttempt: {
      findMany: (args: {
        where: {
          childId: string;
          createdAt: { gte: Date };
          question: { topicId: string };
        };
        orderBy: { createdAt: "asc" };
        select: { createdAt: true; isCorrect: true; hintsUsed: true };
      }) => Promise<AttemptRecord[]>;
    };
    masterySnapshot: {
      findFirst: (args: {
        where: { childId: string; topicId: string };
        orderBy: { snapshotDate: "desc" };
        select: { masteryScore: true; proficiency: true };
      }) => Promise<SnapshotRecord | null>;
    };
  };
};

type GetTopicDrilldownResponse = {
  topicCode: string;
  topicTitle: string;
  attemptHistory: Array<{
    date: string;
    attempts: number;
    correctAttempts: number;
    avgHintsUsed: number;
  }>;
  latestMastery: {
    masteryScore: number;
    proficiency: "needs_support" | "developing" | "proficient" | "advanced";
  };
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOPIC_CODE_RE = /^[A-Za-z0-9_-]{3,64}$/;

function toRounded(value: number): number {
  return Math.round(value * 100) / 100;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toProficiencyLabel(value: SnapshotRecord["proficiency"]): "needs_support" | "developing" | "proficient" | "advanced" {
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

export function parseTopicDrilldownDays(rawDays: string | null): number {
  if (!rawDays) {
    return 30;
  }

  const parsed = Number.parseInt(rawDays, 10);
  if (!Number.isInteger(parsed)) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid days query", [{ field: "days", reason: "must_be_integer" }]);
  }
  if (parsed < 1 || parsed > 180) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid days query", [{ field: "days", reason: "out_of_range" }]);
  }

  return parsed;
}

export async function getTopicDrilldown(
  deps: GetTopicDrilldownDeps,
  parentUserId: string,
  childId: string,
  topicCode: string,
  days: number
): Promise<GetTopicDrilldownResponse> {
  if (!UUID_RE.test(parentUserId)) {
    throw new ApiError("UNAUTHORIZED", 401, "Invalid authentication context");
  }
  if (!UUID_RE.test(childId)) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid child identifier", [{ field: "childId", reason: "invalid_uuid" }]);
  }
  if (!TOPIC_CODE_RE.test(topicCode)) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid topic code", [{ field: "topicCode", reason: "invalid_format" }]);
  }

  const child = await deps.prisma.child.findUnique({
    where: { id: childId },
    select: { id: true, parentUserId: true }
  });
  if (!child) {
    throw new ApiError("NOT_FOUND", 404, "Child not found");
  }
  if (child.parentUserId !== parentUserId) {
    throw new ApiError("FORBIDDEN", 403, "Child does not belong to authenticated parent");
  }

  const topic = await deps.prisma.curriculumTopic.findUnique({
    where: { topicCode },
    select: { id: true, topicCode: true, topicTitle: true }
  });
  if (!topic) {
    throw new ApiError("NOT_FOUND", 404, "Topic not found");
  }

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const attempts = await deps.prisma.questionAttempt.findMany({
    where: {
      childId,
      createdAt: { gte: since },
      question: { topicId: topic.id }
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, isCorrect: true, hintsUsed: true }
  });

  const byDay = new Map<string, { attempts: number; correctAttempts: number; hintsTotal: number }>();
  for (const attempt of attempts) {
    const key = toDateKey(attempt.createdAt);
    const row = byDay.get(key) ?? { attempts: 0, correctAttempts: 0, hintsTotal: 0 };
    row.attempts += 1;
    row.correctAttempts += attempt.isCorrect ? 1 : 0;
    row.hintsTotal += attempt.hintsUsed;
    byDay.set(key, row);
  }

  const attemptHistory = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, row]) => ({
      date,
      attempts: row.attempts,
      correctAttempts: row.correctAttempts,
      avgHintsUsed: row.attempts === 0 ? 0 : toRounded(row.hintsTotal / row.attempts)
    }));

  const latest = await deps.prisma.masterySnapshot.findFirst({
    where: { childId, topicId: topic.id },
    orderBy: { snapshotDate: "desc" },
    select: { masteryScore: true, proficiency: true }
  });

  return {
    topicCode: topic.topicCode,
    topicTitle: topic.topicTitle,
    attemptHistory,
    latestMastery: {
      masteryScore: latest ? toRounded(latest.masteryScore.toNumber()) : 0,
      proficiency: latest ? toProficiencyLabel(latest.proficiency) : "developing"
    }
  };
}
