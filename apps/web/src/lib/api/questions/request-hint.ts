import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";

type RequestHintPayload = {
  childId: string;
  hintLevel: number;
};

type QuestionLookup = {
  id: string;
  childId: string;
  hintLadder: Prisma.JsonValue;
  modelOutput: Prisma.JsonValue | null;
  learningSession: {
    child: {
      parentUserId: string;
    };
  };
};

type RequestHintDeps = {
  prisma: {
    generatedQuestion: {
      findUnique: (args: {
        where: { id: string };
        select: {
          id: true;
          childId: true;
          hintLadder: true;
          modelOutput: true;
          learningSession: { select: { child: { select: { parentUserId: true } } } };
        };
      }) => Promise<QuestionLookup | null>;
      update: (args: {
        where: { id: string };
        data: {
          modelOutput: Prisma.InputJsonValue;
        };
      }) => Promise<unknown>;
    };
  };
};

type RequestHintResponse = {
  questionId: string;
  hintLevel: number;
  hintText: string;
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

function parseHintLadder(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new ApiError("INTERNAL_ERROR", 500, "Question hint ladder is invalid");
  }
  return value as string[];
}

function readHintProgress(modelOutput: Prisma.JsonValue | null, childId: string): number {
  if (!isPlainObject(modelOutput)) {
    return 0;
  }
  const progress = modelOutput.hintProgressByChild;
  if (!isPlainObject(progress)) {
    return 0;
  }
  const value = progress[childId];
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function buildUpdatedModelOutput(
  modelOutput: Prisma.JsonValue | null,
  childId: string,
  newLevel: number
): Prisma.InputJsonValue {
  const base = isPlainObject(modelOutput) ? modelOutput : {};
  const progress = isPlainObject(base.hintProgressByChild) ? base.hintProgressByChild : {};
  return {
    ...base,
    hintProgressByChild: {
      ...progress,
      [childId]: newLevel
    }
  } as Prisma.InputJsonValue;
}

export function validateRequestHintPayload(payload: unknown): RequestHintPayload {
  if (!isPlainObject(payload)) {
    throw new ApiError("BAD_REQUEST", 400, "Request body must be a JSON object");
  }

  const childId = asTrimmedString(payload.childId);
  const hintLevel = asInteger(payload.hintLevel);
  const details: { field: string; reason: string }[] = [];

  if (!childId) {
    details.push({ field: "childId", reason: "missing" });
  } else if (!UUID_RE.test(childId)) {
    details.push({ field: "childId", reason: "invalid_uuid" });
  }

  if (hintLevel === null) {
    details.push({ field: "hintLevel", reason: "must_be_integer" });
  } else if (hintLevel < 1 || hintLevel > 3) {
    details.push({ field: "hintLevel", reason: "out_of_range" });
  }

  if (details.length > 0) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid request payload", details);
  }

  return {
    childId: childId!,
    hintLevel: hintLevel!
  };
}

function validateQuestionId(questionId: string): void {
  if (!UUID_RE.test(questionId)) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid question identifier", [{ field: "questionId", reason: "invalid_uuid" }]);
  }
}

export async function requestQuestionHint(
  deps: RequestHintDeps,
  parentUserId: string,
  questionId: string,
  payload: RequestHintPayload
): Promise<RequestHintResponse> {
  validateQuestionId(questionId);

  const question = await deps.prisma.generatedQuestion.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      childId: true,
      hintLadder: true,
      modelOutput: true,
      learningSession: {
        select: {
          child: {
            select: {
              parentUserId: true
            }
          }
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

  if (question.childId !== payload.childId) {
    throw new ApiError("VALIDATION_ERROR", 400, "childId must match question child", [{ field: "childId", reason: "mismatch" }]);
  }

  const hints = parseHintLadder(question.hintLadder);
  if (payload.hintLevel > hints.length) {
    throw new ApiError("VALIDATION_ERROR", 400, "hintLevel exceeds available hints", [{ field: "hintLevel", reason: "not_available" }]);
  }

  const currentLevel = readHintProgress(question.modelOutput, payload.childId);
  if (payload.hintLevel > currentLevel + 1) {
    throw new ApiError("VALIDATION_ERROR", 400, "Cannot skip hint levels", [{ field: "hintLevel", reason: "must_request_sequentially" }]);
  }

  if (payload.hintLevel > currentLevel) {
    const updatedModelOutput = buildUpdatedModelOutput(question.modelOutput, payload.childId, payload.hintLevel);
    await deps.prisma.generatedQuestion.update({
      where: { id: question.id },
      data: {
        modelOutput: updatedModelOutput
      }
    });
  }

  return {
    questionId: question.id,
    hintLevel: payload.hintLevel,
    hintText: hints[payload.hintLevel - 1] ?? ""
  };
}
