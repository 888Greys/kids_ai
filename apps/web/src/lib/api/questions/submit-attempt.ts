import { ProficiencyBand, Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";

type SubmitAttemptRequest = {
  childId: string;
  submittedAnswer: Prisma.InputJsonValue;
  hintsUsed: number;
  responseTimeSeconds?: number;
};

type QuestionLookup = {
  id: string;
  childId: string;
  topicId: string;
  correctAnswer: Prisma.JsonValue;
  explanation: string;
  topic: {
    id: string;
    topicCode: string;
  };
  learningSession: {
    id: string;
    child: {
      parentUserId: string;
    };
  };
};

type SubmitAttemptDeps = {
  prisma: {
    generatedQuestion: {
      findUnique: (args: {
        where: { id: string };
        select: {
          id: true;
          childId: true;
          topicId: true;
          correctAnswer: true;
          explanation: true;
          topic: { select: { id: true; topicCode: true } };
          learningSession: { select: { id: true; child: { select: { parentUserId: true } } } };
        };
      }) => Promise<QuestionLookup | null>;
    };
    questionAttempt: {
      create: (args: {
        data: {
          questionId: string;
          childId: string;
          submittedAnswer: Prisma.InputJsonValue;
          isCorrect: boolean;
          hintsUsed: number;
          responseTimeSeconds: number | null;
          feedbackText: string;
        };
        select: { id: true };
      }) => Promise<{ id: string }>;
      count: (args: { where: { question: { sessionId: string }; isCorrect?: boolean; childId?: string } | { childId: string; question: { topicId: string }; isCorrect?: boolean } }) => Promise<number>;
      aggregate: (args: {
        where: { question: { sessionId: string } } | { childId: string; question: { topicId: string } };
        _avg: { hintsUsed: true };
      }) => Promise<{ _avg: { hintsUsed: number | null } }>;
    };
    learningSession: {
      update: (args: {
        where: { id: string };
        data: {
          totalQuestions: number;
          correctAnswers: number;
          avgHintsUsed: Prisma.Decimal;
        };
      }) => Promise<unknown>;
    };
    masterySnapshot: {
      upsert: (args: {
        where: {
          childId_topicId_snapshotDate: {
            childId: string;
            topicId: string;
            snapshotDate: Date;
          };
        };
        create: {
          childId: string;
          topicId: string;
          snapshotDate: Date;
          attemptsCount: number;
          accuracyPercent: Prisma.Decimal;
          hintDependencyPercent: Prisma.Decimal;
          masteryScore: Prisma.Decimal;
          proficiency: ProficiencyBand;
        };
        update: {
          attemptsCount: number;
          accuracyPercent: Prisma.Decimal;
          hintDependencyPercent: Prisma.Decimal;
          masteryScore: Prisma.Decimal;
          proficiency: ProficiencyBand;
        };
      }) => Promise<unknown>;
    };
  };
};

type SubmitAttemptResponse = {
  attemptId: string;
  isCorrect: boolean;
  feedbackText: string;
  explanation: string;
  masteryUpdate: {
    topicId: string;
    topicCode: string;
    accuracyPercent: number;
    hintDependencyPercent: number;
    masteryScore: number;
    proficiency: "needs_support" | "developing" | "proficient" | "advanced";
  };
  sessionProgress: {
    totalQuestions: number;
    correctAnswers: number;
    avgHintsUsed: number;
  };
  nextRecommendedDifficulty: "easy" | "medium" | "hard";
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

function asInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }
  return value;
}

function toPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function toProficiency(masteryScore: number): ProficiencyBand {
  if (masteryScore < 40) {
    return ProficiencyBand.NEEDS_SUPPORT;
  }
  if (masteryScore < 70) {
    return ProficiencyBand.DEVELOPING;
  }
  if (masteryScore < 85) {
    return ProficiencyBand.PROFICIENT;
  }
  return ProficiencyBand.ADVANCED;
}

function toProficiencyLabel(value: ProficiencyBand): SubmitAttemptResponse["masteryUpdate"]["proficiency"] {
  switch (value) {
    case ProficiencyBand.NEEDS_SUPPORT:
      return "needs_support";
    case ProficiencyBand.DEVELOPING:
      return "developing";
    case ProficiencyBand.PROFICIENT:
      return "proficient";
    case ProficiencyBand.ADVANCED:
      return "advanced";
  }
}

function normalizeAnswer(value: unknown): string {
  if (isPlainObject(value) && typeof value.value === "string") {
    return value.value.trim().toLowerCase();
  }
  if (isPlainObject(value) && typeof value.value === "number") {
    return String(value.value);
  }
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }
  if (typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
}

function computeNextDifficulty(accuracyPercent: number, hintDependencyPercent: number): SubmitAttemptResponse["nextRecommendedDifficulty"] {
  if (accuracyPercent >= 80 && hintDependencyPercent < 20) {
    return "hard";
  }
  if (accuracyPercent >= 60) {
    return "medium";
  }
  return "easy";
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function validateSubmitAttemptRequest(payload: unknown): SubmitAttemptRequest {
  if (!isPlainObject(payload)) {
    throw new ApiError("BAD_REQUEST", 400, "Request body must be a JSON object");
  }

  const childId = asTrimmedString(payload.childId);
  const hintsUsed = asInteger(payload.hintsUsed);
  const responseTimeSecondsRaw = payload.responseTimeSeconds;
  const responseTimeSeconds = responseTimeSecondsRaw === undefined ? undefined : asInteger(responseTimeSecondsRaw);

  const details: { field: string; reason: string }[] = [];

  if (!childId) {
    details.push({ field: "childId", reason: "missing" });
  } else if (!UUID_RE.test(childId)) {
    details.push({ field: "childId", reason: "invalid_uuid" });
  }

  if (!("submittedAnswer" in payload)) {
    details.push({ field: "submittedAnswer", reason: "missing" });
  }

  if (hintsUsed === null) {
    details.push({ field: "hintsUsed", reason: "must_be_integer" });
  } else if (hintsUsed < 0 || hintsUsed > 3) {
    details.push({ field: "hintsUsed", reason: "out_of_range" });
  }

  if (responseTimeSecondsRaw !== undefined) {
    if (responseTimeSeconds === null) {
      details.push({ field: "responseTimeSeconds", reason: "must_be_integer" });
    } else if (typeof responseTimeSeconds === "number" && responseTimeSeconds < 1) {
      details.push({ field: "responseTimeSeconds", reason: "must_be_positive" });
    }
  }

  if (details.length > 0) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid request payload", details);
  }

  return {
    childId: childId!,
    submittedAnswer: payload.submittedAnswer as Prisma.InputJsonValue,
    hintsUsed: hintsUsed!,
    responseTimeSeconds: responseTimeSeconds ?? undefined
  };
}

function validateQuestionId(questionId: string): void {
  if (!UUID_RE.test(questionId)) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid question identifier", [{ field: "questionId", reason: "invalid_uuid" }]);
  }
}

export async function submitQuestionAttempt(
  deps: SubmitAttemptDeps,
  parentUserId: string,
  questionId: string,
  request: SubmitAttemptRequest
): Promise<SubmitAttemptResponse> {
  validateQuestionId(questionId);

  const question = await deps.prisma.generatedQuestion.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      childId: true,
      topicId: true,
      correctAnswer: true,
      explanation: true,
      topic: { select: { id: true, topicCode: true } },
      learningSession: {
        select: {
          id: true,
          child: { select: { parentUserId: true } }
        }
      }
    }
  });

  if (!question) {
    throw new ApiError("NOT_FOUND", 404, "Question not found");
  }

  if (question.learningSession.child.parentUserId !== parentUserId) {
    throw new ApiError("FORBIDDEN", 403, "Question does not belong to authenticated parent");
  }

  if (question.childId !== request.childId) {
    throw new ApiError("VALIDATION_ERROR", 400, "childId must match question child", [{ field: "childId", reason: "mismatch" }]);
  }

  const isCorrect = normalizeAnswer(request.submittedAnswer) === normalizeAnswer(question.correctAnswer);
  const feedbackText = isCorrect ? "Great job. That answer is correct." : "Good try. Review the explanation and try again.";

  const attempt = await deps.prisma.questionAttempt.create({
    data: {
      questionId,
      childId: request.childId,
      submittedAnswer: request.submittedAnswer,
      isCorrect,
      hintsUsed: request.hintsUsed,
      responseTimeSeconds: request.responseTimeSeconds ?? null,
      feedbackText
    },
    select: { id: true }
  });

  const totalQuestions = await deps.prisma.questionAttempt.count({
    where: { question: { sessionId: question.learningSession.id } }
  });
  const correctAnswers = await deps.prisma.questionAttempt.count({
    where: { question: { sessionId: question.learningSession.id }, isCorrect: true }
  });
  const sessionHintsAgg = await deps.prisma.questionAttempt.aggregate({
    where: { question: { sessionId: question.learningSession.id } },
    _avg: { hintsUsed: true }
  });

  const avgHintsUsed = toPercent(sessionHintsAgg._avg.hintsUsed ?? 0);

  await deps.prisma.learningSession.update({
    where: { id: question.learningSession.id },
    data: {
      totalQuestions,
      correctAnswers,
      avgHintsUsed: new Prisma.Decimal(avgHintsUsed)
    }
  });

  const attemptsCount = await deps.prisma.questionAttempt.count({
    where: { childId: request.childId, question: { topicId: question.topicId } }
  });
  const topicCorrectCount = await deps.prisma.questionAttempt.count({
    where: { childId: request.childId, question: { topicId: question.topicId }, isCorrect: true }
  });
  const topicHintsAgg = await deps.prisma.questionAttempt.aggregate({
    where: { childId: request.childId, question: { topicId: question.topicId } },
    _avg: { hintsUsed: true }
  });

  const accuracyPercent = attemptsCount === 0 ? 0 : toPercent((topicCorrectCount / attemptsCount) * 100);
  const hintDependencyPercent = toPercent(((topicHintsAgg._avg.hintsUsed ?? 0) / 3) * 100);
  const masteryScore = toPercent(Math.max(0, accuracyPercent - hintDependencyPercent * 0.35));
  const proficiency = toProficiency(masteryScore);
  const snapshotDate = startOfTodayUTC();

  await deps.prisma.masterySnapshot.upsert({
    where: {
      childId_topicId_snapshotDate: {
        childId: request.childId,
        topicId: question.topicId,
        snapshotDate
      }
    },
    create: {
      childId: request.childId,
      topicId: question.topicId,
      snapshotDate,
      attemptsCount,
      accuracyPercent: new Prisma.Decimal(accuracyPercent),
      hintDependencyPercent: new Prisma.Decimal(hintDependencyPercent),
      masteryScore: new Prisma.Decimal(masteryScore),
      proficiency
    },
    update: {
      attemptsCount,
      accuracyPercent: new Prisma.Decimal(accuracyPercent),
      hintDependencyPercent: new Prisma.Decimal(hintDependencyPercent),
      masteryScore: new Prisma.Decimal(masteryScore),
      proficiency
    }
  });

  return {
    attemptId: attempt.id,
    isCorrect,
    feedbackText,
    explanation: question.explanation,
    masteryUpdate: {
      topicId: question.topic.id,
      topicCode: question.topic.topicCode,
      accuracyPercent,
      hintDependencyPercent,
      masteryScore,
      proficiency: toProficiencyLabel(proficiency)
    },
    sessionProgress: {
      totalQuestions,
      correctAnswers,
      avgHintsUsed
    },
    nextRecommendedDifficulty: computeNextDifficulty(accuracyPercent, hintDependencyPercent)
  };
}
