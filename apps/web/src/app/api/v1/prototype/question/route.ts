import { NextResponse } from "next/server";

import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { generateQuestionDraft } from "@/lib/ai/question-generator";

type MissionKey = "fractions" | "place-value" | "add-subtract" | "multiply-divide" | "word-problems";

type PrototypeQuestionRequest = {
  missionKey: MissionKey;
  targetDifficulty: "easy" | "medium" | "hard" | "adaptive";
  maxHints: number;
  seed?: number;
};

type PrototypeTopic = {
  topicCode: string;
  topicTitle: string;
  strand: string;
  subStrand: string;
};

const PROTOTYPE_TOPIC_MAP: Record<MissionKey, PrototypeTopic> = {
  fractions: {
    topicCode: "G4-MATH-FRC-001",
    topicTitle: "Equivalent Fractions",
    strand: "Numbers",
    subStrand: "Fractions"
  },
  "place-value": {
    topicCode: "G4-MATH-PV-001",
    topicTitle: "Place Value to Thousands",
    strand: "Numbers",
    subStrand: "Place Value"
  },
  "add-subtract": {
    topicCode: "G4-MATH-AS-001",
    topicTitle: "Addition and Subtraction",
    strand: "Numbers",
    subStrand: "Operations"
  },
  "multiply-divide": {
    topicCode: "G4-MATH-MD-001",
    topicTitle: "Multiplication and Division Facts",
    strand: "Numbers",
    subStrand: "Operations"
  },
  "word-problems": {
    topicCode: "G4-MATH-WP-001",
    topicTitle: "Multi-step Word Problems",
    strand: "Problem Solving",
    subStrand: "Reasoning"
  }
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

function asInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }
  return value;
}

function validatePayload(payload: unknown): PrototypeQuestionRequest {
  if (!isPlainObject(payload)) {
    throw new ApiError("BAD_REQUEST", 400, "Request body must be a JSON object");
  }

  const missionKey = asTrimmedString(payload.missionKey);
  const targetDifficulty = asTrimmedString(payload.targetDifficulty);
  const maxHints = asInteger(payload.maxHints);
  const seedRaw = payload.seed;
  const seed = seedRaw === undefined ? undefined : asInteger(seedRaw);

  const details: { field: string; reason: string }[] = [];

  if (!missionKey) {
    details.push({ field: "missionKey", reason: "missing" });
  } else if (!(missionKey in PROTOTYPE_TOPIC_MAP)) {
    details.push({ field: "missionKey", reason: "invalid_value" });
  }

  if (!targetDifficulty) {
    details.push({ field: "targetDifficulty", reason: "missing" });
  } else if (targetDifficulty !== "easy" && targetDifficulty !== "medium" && targetDifficulty !== "hard" && targetDifficulty !== "adaptive") {
    details.push({ field: "targetDifficulty", reason: "invalid_value" });
  }

  if (maxHints === null) {
    details.push({ field: "maxHints", reason: "must_be_integer" });
  } else if (maxHints < 1 || maxHints > 3) {
    details.push({ field: "maxHints", reason: "out_of_range" });
  }

  if (seedRaw !== undefined) {
    if (seed === null) {
      details.push({ field: "seed", reason: "must_be_integer" });
    } else if (typeof seed === "number" && seed < 1) {
      details.push({ field: "seed", reason: "must_be_positive" });
    }
  }

  if (details.length > 0) {
    throw new ApiError("VALIDATION_ERROR", 400, "Invalid request payload", details);
  }

  return {
    missionKey: missionKey as MissionKey,
    targetDifficulty: targetDifficulty as PrototypeQuestionRequest["targetDifficulty"],
    maxHints: maxHints!,
    seed: seed ?? undefined
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const json = (await request.json()) as unknown;
    const payload = validatePayload(json);
    const topic = PROTOTYPE_TOPIC_MAP[payload.missionKey];
    const seed = payload.seed ?? 1;

    const draft = await generateQuestionDraft({
      gradeLevel: 4,
      topicCode: topic.topicCode,
      topicTitle: topic.topicTitle,
      strand: topic.strand,
      subStrand: topic.subStrand,
      targetDifficulty: payload.targetDifficulty,
      maxHints: payload.maxHints,
      seed
    });

    return NextResponse.json(
      {
        questionId: `prototype-${payload.missionKey}-${seed}-${Date.now()}`,
        topic: {
          id: `prototype-topic-${payload.missionKey}`,
          topicCode: topic.topicCode,
          title: topic.topicTitle,
          strand: topic.strand,
          subStrand: topic.subStrand
        },
        difficulty: payload.targetDifficulty,
        questionText: draft.questionText,
        answerFormat: draft.answerFormat,
        options: draft.options,
        hintCount: draft.hintLadder.length,
        hints: draft.hintLadder,
        correctAnswer: draft.correctAnswer.value,
        explanation: draft.explanation,
        createdAt: new Date().toISOString()
      },
      { status: 201 }
    );
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
