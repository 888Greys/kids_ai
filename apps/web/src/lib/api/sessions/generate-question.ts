import { DifficultyLevel, Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";
import { generateQuestionDraft } from "@/lib/ai/question-generator";

type GenerateQuestionRequest = {
  childId: string;
  targetDifficulty: "easy" | "medium" | "hard" | "adaptive";
  maxHints: number;
};

type SessionLookup = {
  id: string;
  childId: string;
  focusTopicId: string | null;
  child: {
    parentUserId: string;
    gradeLevel: number;
  };
};

type TopicSummary = {
  id: string;
  topicCode: string;
  topicTitle: string;
  strand: string;
  subStrand: string;
};

type CreatedQuestion = {
  id: string;
  sessionId: string;
  createdAt: Date;
  questionText: string;
  answerFormat: string;
  options: Prisma.JsonValue | null;
  difficulty: DifficultyLevel;
  topic: TopicSummary;
};

type GenerateQuestionDeps = {
  prisma: {
    learningSession: {
      findUnique: (args: {
        where: { id: string };
        select: {
          id: true;
          childId: true;
          focusTopicId: true;
          child: { select: { parentUserId: true; gradeLevel: true } };
        };
      }) => Promise<SessionLookup | null>;
    };
    curriculumTopic: {
      findUnique: (args: {
        where: { id: string };
        select: { id: true; topicCode: true; topicTitle: true; strand: true; subStrand: true };
      }) => Promise<TopicSummary | null>;
      findFirst: (args: {
        where: { gradeLevel: number; isActive: boolean };
        orderBy: { createdAt: "asc" };
        select: { id: true; topicCode: true; topicTitle: true; strand: true; subStrand: true };
      }) => Promise<TopicSummary | null>;
    };
    generatedQuestion: {
      count: (args: { where: { sessionId: string } }) => Promise<number>;
      findFirst: (args: {
        where: { sessionId: string; questionText: string };
        select: { id: true };
      }) => Promise<{ id: string } | null>;
      create: (args: {
        data: {
          sessionId: string;
          childId: string;
          topicId: string;
          difficulty: DifficultyLevel;
          questionText: string;
          answerFormat: string;
          correctAnswer: Prisma.InputJsonValue;
          options: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
          hintLadder: Prisma.InputJsonValue;
          explanation: string;
          promptInput: Prisma.InputJsonValue;
          modelOutput: Prisma.InputJsonValue;
        };
        select: {
          id: true;
          sessionId: true;
          createdAt: true;
          questionText: true;
          answerFormat: true;
          options: true;
          difficulty: true;
          topic: { select: { id: true; topicCode: true; topicTitle: true; strand: true; subStrand: true } };
        };
      }) => Promise<CreatedQuestion>;
    };
  };
};

type GenerateQuestionResponse = {
  questionId: string;
  sessionId: string;
  topic: {
    id: string;
    topicCode: string;
    title: string;
    strand: string;
    subStrand: string;
  };
  difficulty: "easy" | "medium" | "hard" | "adaptive";
  questionText: string;
  answerFormat: string;
  options: string[] | null;
  hintCount: number;
  createdAt: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DIFFICULTY_TO_ENUM: Record<GenerateQuestionRequest["targetDifficulty"], DifficultyLevel> = {
  easy: DifficultyLevel.EASY,
  medium: DifficultyLevel.MEDIUM,
  hard: DifficultyLevel.HARD,
  adaptive: DifficultyLevel.ADAPTIVE
};

const ENUM_TO_DIFFICULTY: Record<DifficultyLevel, GenerateQuestionResponse["difficulty"]> = {
  [DifficultyLevel.EASY]: "easy",
  [DifficultyLevel.MEDIUM]: "medium",
  [DifficultyLevel.HARD]: "hard",
  [DifficultyLevel.ADAPTIVE]: "adaptive"
};

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

function asPositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return null;
  }
  return value;
}

export function validateGenerateQuestionRequest(payload: unknown): GenerateQuestionRequest {
  if (!isPlainObject(payload)) {
    throw new ApiError("BAD_REQUEST", 400, "Request body must be a JSON object");
  }

  const childId = asTrimmedString(payload.childId);
  const targetDifficulty = asTrimmedString(payload.targetDifficulty);
  const maxHints = asPositiveInteger(payload.maxHints);

  const details: { field: string; reason: string }[] = [];

  if (!childId) {
    details.push({ field: "childId", reason: "missing" });
  } else if (!UUID_RE.test(childId)) {
    details.push({ field: "childId", reason: "invalid_uuid" });
  }

  if (!targetDifficulty) {
    details.push({ field: "targetDifficulty", reason: "missing" });
  } else if (targetDifficulty !== "easy" && targetDifficulty !== "medium" && targetDifficulty !== "hard" && targetDifficulty !== "adaptive") {
    details.push({ field: "targetDifficulty", reason: "invalid_value" });
  }

  if (maxHints === null) {
    details.push({ field: "maxHints", reason: "must_be_positive_integer" });
  } else if (maxHints > 3) {
    details.push({ field: "maxHints", reason: "out_of_range" });
  }

  if (details.length > 0) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid request payload", details);
  }

  return {
    childId: childId!,
    targetDifficulty: targetDifficulty as GenerateQuestionRequest["targetDifficulty"],
    maxHints: maxHints!
  };
}

function validateSessionId(sessionId: string): void {
  if (!UUID_RE.test(sessionId)) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid session identifier", [{ field: "sessionId", reason: "invalid_uuid" }]);
  }
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  if (!value.every((item) => typeof item === "string")) {
    return null;
  }
  return value as string[];
}

export async function generateNextQuestion(
  deps: GenerateQuestionDeps,
  parentUserId: string,
  sessionId: string,
  request: GenerateQuestionRequest
): Promise<GenerateQuestionResponse> {
  validateSessionId(sessionId);

  const session = await deps.prisma.learningSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      childId: true,
      focusTopicId: true,
      child: {
        select: {
          parentUserId: true,
          gradeLevel: true
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

  if (session.childId !== request.childId) {
    throw new ApiError("VALIDATION_ERROR", 400, "childId must match the session child", [{ field: "childId", reason: "mismatch" }]);
  }

  const topic = session.focusTopicId
    ? await deps.prisma.curriculumTopic.findUnique({
        where: { id: session.focusTopicId },
        select: {
          id: true,
          topicCode: true,
          topicTitle: true,
          strand: true,
          subStrand: true
        }
      })
    : await deps.prisma.curriculumTopic.findFirst({
        where: { gradeLevel: session.child.gradeLevel, isActive: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          topicCode: true,
          topicTitle: true,
          strand: true,
          subStrand: true
        }
      });

  if (!topic) {
    throw new ApiError("NOT_FOUND", 404, "No active topic found for session");
  }

  const existingCount = await deps.prisma.generatedQuestion.count({
    where: { sessionId }
  });

  let draft = await generateQuestionDraft({
    gradeLevel: session.child.gradeLevel,
    topicCode: topic.topicCode,
    topicTitle: topic.topicTitle,
    strand: topic.strand,
    subStrand: topic.subStrand,
    targetDifficulty: request.targetDifficulty,
    maxHints: request.maxHints,
    seed: existingCount + 1
  });
  let duplicate = await deps.prisma.generatedQuestion.findFirst({
    where: { sessionId, questionText: draft.questionText },
    select: { id: true }
  });

  if (duplicate) {
    draft = await generateQuestionDraft({
      gradeLevel: session.child.gradeLevel,
      topicCode: topic.topicCode,
      topicTitle: topic.topicTitle,
      strand: topic.strand,
      subStrand: topic.subStrand,
      targetDifficulty: request.targetDifficulty,
      maxHints: request.maxHints,
      seed: existingCount + 2
    });
    duplicate = await deps.prisma.generatedQuestion.findFirst({
      where: { sessionId, questionText: draft.questionText },
      select: { id: true }
    });
    if (duplicate) {
      throw new ApiError("INTERNAL_ERROR", 500, "Unable to generate a fresh question");
    }
  }

  const created = await deps.prisma.generatedQuestion.create({
    data: {
      sessionId,
      childId: request.childId,
      topicId: topic.id,
      difficulty: DIFFICULTY_TO_ENUM[request.targetDifficulty],
      questionText: draft.questionText,
      answerFormat: "multiple_choice",
      correctAnswer: draft.correctAnswer,
      options: draft.options ?? Prisma.JsonNull,
      hintLadder: draft.hintLadder,
      explanation: draft.explanation,
      promptInput: draft.promptInput,
      modelOutput: draft.modelOutput
    },
    select: {
      id: true,
      sessionId: true,
      createdAt: true,
      questionText: true,
      answerFormat: true,
      options: true,
      difficulty: true,
      topic: {
        select: {
          id: true,
          topicCode: true,
          topicTitle: true,
          strand: true,
          subStrand: true
        }
      }
    }
  });

  return {
    questionId: created.id,
    sessionId: created.sessionId,
    topic: {
      id: created.topic.id,
      topicCode: created.topic.topicCode,
      title: created.topic.topicTitle,
      strand: created.topic.strand,
      subStrand: created.topic.subStrand
    },
    difficulty: ENUM_TO_DIFFICULTY[created.difficulty],
    questionText: created.questionText,
    answerFormat: created.answerFormat,
    options: asStringArray(created.options),
    hintCount: request.maxHints,
    createdAt: created.createdAt.toISOString()
  };
}
