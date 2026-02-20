import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";

type CompleteSessionPayload = {
  childId: string;
  engagementScore: number;
};

type SessionLookup = {
  id: string;
  childId: string;
  endedAt: Date | null;
  totalQuestions: number;
  correctAnswers: number;
  avgHintsUsed: Prisma.Decimal;
  child: {
    parentUserId: string;
  };
};

type CompleteSessionDeps = {
  prisma: {
    learningSession: {
      findUnique: (args: {
        where: { id: string };
        select: {
          id: true;
          childId: true;
          endedAt: true;
          totalQuestions: true;
          correctAnswers: true;
          avgHintsUsed: true;
          child: { select: { parentUserId: true } };
        };
      }) => Promise<SessionLookup | null>;
      update: (args: {
        where: { id: string };
        data: {
          endedAt: Date;
          engagementScore: Prisma.Decimal;
        };
        select: {
          id: true;
          endedAt: true;
          totalQuestions: true;
          correctAnswers: true;
          avgHintsUsed: true;
        };
      }) => Promise<{
        id: string;
        endedAt: Date | null;
        totalQuestions: number;
        correctAnswers: number;
        avgHintsUsed: Prisma.Decimal;
      }>;
    };
  };
};

type CompleteSessionResponse = {
  sessionId: string;
  endedAt: string;
  summary: {
    totalQuestions: number;
    correctAnswers: number;
    avgHintsUsed: number;
  };
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function toRounded(value: number): number {
  return Math.round(value * 100) / 100;
}

export function validateCompleteSessionPayload(payload: unknown): CompleteSessionPayload {
  if (!isPlainObject(payload)) {
    throw new ApiError("BAD_REQUEST", 400, "Request body must be a JSON object");
  }

  const childId = asTrimmedString(payload.childId);
  const engagementScore = asNumber(payload.engagementScore);
  const details: { field: string; reason: string }[] = [];

  if (!childId) {
    details.push({ field: "childId", reason: "missing" });
  } else if (!UUID_RE.test(childId)) {
    details.push({ field: "childId", reason: "invalid_uuid" });
  }

  if (engagementScore === null) {
    details.push({ field: "engagementScore", reason: "must_be_number" });
  } else if (engagementScore < 0 || engagementScore > 100) {
    details.push({ field: "engagementScore", reason: "out_of_range" });
  }

  if (details.length > 0) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid request payload", details);
  }

  return {
    childId: childId!,
    engagementScore: engagementScore!
  };
}

function validateSessionId(sessionId: string): void {
  if (!UUID_RE.test(sessionId)) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid session identifier", [{ field: "sessionId", reason: "invalid_uuid" }]);
  }
}

export async function completeSession(
  deps: CompleteSessionDeps,
  parentUserId: string,
  sessionId: string,
  payload: CompleteSessionPayload
): Promise<CompleteSessionResponse> {
  validateSessionId(sessionId);

  const session = await deps.prisma.learningSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      childId: true,
      endedAt: true,
      totalQuestions: true,
      correctAnswers: true,
      avgHintsUsed: true,
      child: {
        select: {
          parentUserId: true
        }
      }
    }
  });

  if (!session) {
    throw new ApiError("NOT_FOUND", 404, "Session not found");
  }

  if (session.child.parentUserId !== parentUserId) {
    throw new ApiError("FORBIDDEN", 403, "Session does not belong to authenticated parent");
  }

  if (session.childId !== payload.childId) {
    throw new ApiError("VALIDATION_ERROR", 400, "childId must match the session child", [{ field: "childId", reason: "mismatch" }]);
  }

  if (session.endedAt) {
    throw new ApiError("VALIDATION_ERROR", 400, "Session is already completed", [{ field: "sessionId", reason: "already_completed" }]);
  }

  const endedAt = new Date();
  const updated = await deps.prisma.learningSession.update({
    where: { id: session.id },
    data: {
      endedAt,
      engagementScore: new Prisma.Decimal(toRounded(payload.engagementScore))
    },
    select: {
      id: true,
      endedAt: true,
      totalQuestions: true,
      correctAnswers: true,
      avgHintsUsed: true
    }
  });

  if (!updated.endedAt) {
    throw new ApiError("INTERNAL_ERROR", 500, "Failed to finalize session");
  }

  return {
    sessionId: updated.id,
    endedAt: updated.endedAt.toISOString(),
    summary: {
      totalQuestions: updated.totalQuestions,
      correctAnswers: updated.correctAnswers,
      avgHintsUsed: toRounded(updated.avgHintsUsed.toNumber())
    }
  };
}
