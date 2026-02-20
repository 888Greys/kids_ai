import { SessionMode } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";

type StartSessionRequest = {
  childId: string;
  mode: "practice" | "challenge" | "revision";
  focusTopicCode?: string;
  aiModel: string;
  promptVersion: string;
};

type TopicSummary = {
  id: string;
  topicCode: string;
  topicTitle: string;
};

type StartSessionResponse = {
  sessionId: string;
  childId: string;
  mode: "practice" | "challenge" | "revision";
  focusTopic: {
    id: string;
    topicCode: string;
    title: string;
  } | null;
  startedAt: string;
};

type ChildLookup = {
  id: string;
  gradeLevel: number;
  parentUserId: string;
};

type SessionRecord = {
  id: string;
  childId: string;
  mode: SessionMode;
  startedAt: Date;
};

type StartSessionDeps = {
  prisma: {
    child: {
      findUnique: (args: { where: { id: string }; select: { id: true; gradeLevel: true; parentUserId: true } }) => Promise<ChildLookup | null>;
    };
    curriculumTopic: {
      findFirst: (args: {
        where: { topicCode: string; gradeLevel: number; isActive: boolean };
        select: { id: true; topicCode: true; topicTitle: true };
      }) => Promise<TopicSummary | null>;
    };
    learningSession: {
      create: (args: {
        data: {
          childId: string;
          focusTopicId: string | null;
          mode: SessionMode;
          aiModel: string;
          promptVersion: string;
        };
        select: { id: true; childId: true; mode: true; startedAt: true };
      }) => Promise<SessionRecord>;
    };
  };
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MODE_TO_ENUM: Record<StartSessionRequest["mode"], SessionMode> = {
  practice: SessionMode.PRACTICE,
  challenge: SessionMode.CHALLENGE,
  revision: SessionMode.REVISION
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

export function validateStartSessionRequest(payload: unknown): StartSessionRequest {
  if (!isPlainObject(payload)) {
    throw new ApiError("BAD_REQUEST", 400, "Request body must be a JSON object");
  }

  const childId = asTrimmedString(payload.childId);
  const aiModel = asTrimmedString(payload.aiModel);
  const promptVersion = asTrimmedString(payload.promptVersion);
  const rawMode = asTrimmedString(payload.mode);
  const focusTopicCode = asTrimmedString(payload.focusTopicCode ?? "");

  const details: { field: string; reason: string }[] = [];

  if (!childId) {
    details.push({ field: "childId", reason: "missing" });
  } else if (!UUID_RE.test(childId)) {
    details.push({ field: "childId", reason: "invalid_uuid" });
  }

  if (!rawMode) {
    details.push({ field: "mode", reason: "missing" });
  } else if (rawMode !== "practice" && rawMode !== "challenge" && rawMode !== "revision") {
    details.push({ field: "mode", reason: "invalid_value" });
  }

  if (!aiModel) {
    details.push({ field: "aiModel", reason: "missing" });
  }

  if (!promptVersion) {
    details.push({ field: "promptVersion", reason: "missing" });
  }

  if (details.length > 0) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid request payload", details);
  }

  return {
    childId: childId!,
    mode: rawMode as StartSessionRequest["mode"],
    focusTopicCode: focusTopicCode || undefined,
    aiModel: aiModel!,
    promptVersion: promptVersion!
  };
}

export async function startSession(
  deps: StartSessionDeps,
  parentUserId: string,
  request: StartSessionRequest
): Promise<StartSessionResponse> {
  const child = await deps.prisma.child.findUnique({
    where: { id: request.childId },
    select: { id: true, gradeLevel: true, parentUserId: true }
  });

  if (!child) {
    throw new ApiError("NOT_FOUND", 404, "Child not found");
  }

  if (child.parentUserId !== parentUserId) {
    throw new ApiError("FORBIDDEN", 403, "Child does not belong to authenticated parent");
  }

  let focusTopic: TopicSummary | null = null;
  if (request.focusTopicCode) {
    focusTopic = await deps.prisma.curriculumTopic.findFirst({
      where: {
        topicCode: request.focusTopicCode,
        gradeLevel: child.gradeLevel,
        isActive: true
      },
      select: { id: true, topicCode: true, topicTitle: true }
    });

    if (!focusTopic) {
      throw new ApiError("VALIDATION_ERROR", 400, "focusTopicCode must be active and grade-appropriate", [
        { field: "focusTopicCode", reason: "not_found_or_not_allowed" }
      ]);
    }
  }

  const session = await deps.prisma.learningSession.create({
    data: {
      childId: child.id,
      focusTopicId: focusTopic?.id ?? null,
      mode: MODE_TO_ENUM[request.mode],
      aiModel: request.aiModel,
      promptVersion: request.promptVersion
    },
    select: {
      id: true,
      childId: true,
      mode: true,
      startedAt: true
    }
  });

  return {
    sessionId: session.id,
    childId: session.childId,
    mode: request.mode,
    focusTopic: focusTopic
      ? {
          id: focusTopic.id,
          topicCode: focusTopic.topicCode,
          title: focusTopic.topicTitle
        }
      : null,
    startedAt: session.startedAt.toISOString()
  };
}
