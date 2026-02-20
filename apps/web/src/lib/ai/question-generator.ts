import { Prisma } from "@prisma/client";

import { ApiError } from "@/lib/api/errors";

export type QuestionGenerationContext = {
  gradeLevel: number;
  topicCode: string;
  topicTitle: string;
  strand: string;
  subStrand: string;
  targetDifficulty: "easy" | "medium" | "hard" | "adaptive";
  maxHints: number;
  seed: number;
};

export type QuestionDraft = {
  questionText: string;
  answerFormat: "multiple_choice" | "number";
  options: string[] | null;
  correctAnswer: { value: string };
  hintLadder: string[];
  explanation: string;
  promptInput: Prisma.InputJsonValue;
  modelOutput: Prisma.InputJsonValue;
};

const OPENAI_URL = "https://api.openai.com/v1/responses";
const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const DEFAULT_CEREBRAS_MODEL = "gpt-oss-120b";
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

type AiProvider = "openai" | "cerebras";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function shouldUseProvider(provider: AiProvider): boolean {
  if (process.env.NODE_ENV === "production") {
    return true;
  }

  if (process.env.NODE_ENV === "test") {
    return process.env.AI_ENABLE_IN_TEST === "true";
  }

  if (process.env.AI_ENABLE_IN_DEV === "true") {
    return true;
  }

  if (provider === "openai") {
    return process.env.OPENAI_ENABLE_IN_DEV === "true";
  }

  return process.env.CEREBRAS_ENABLE_IN_DEV === "true";
}

function getConfiguredProvider(): AiProvider | null {
  const configuredRaw = process.env.AI_PROVIDER?.trim().toLowerCase();
  const configured = configuredRaw === "" ? undefined : configuredRaw;

  if (configured && configured !== "openai" && configured !== "cerebras") {
    throw new ApiError("INTERNAL_ERROR", 500, "AI_PROVIDER must be one of: openai, cerebras");
  }

  if (configured === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      throw new ApiError("INTERNAL_ERROR", 500, "OPENAI_API_KEY is missing for AI_PROVIDER=openai");
    }
    return "openai";
  }

  if (configured === "cerebras") {
    if (!process.env.CEREBRAS_API_KEY) {
      throw new ApiError("INTERNAL_ERROR", 500, "CEREBRAS_API_KEY is missing for AI_PROVIDER=cerebras");
    }
    return "cerebras";
  }

  if (process.env.CEREBRAS_API_KEY) {
    return "cerebras";
  }

  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }

  return null;
}

function deterministicDraft(context: QuestionGenerationContext): QuestionDraft {
  const left = 6 + (context.seed % 5);
  const right = 3 + (context.seed % 4);
  const answer = left + right;
  const options = [String(answer), String(answer - 1), String(answer + 2)];
  const hints = [
    "Start by adding the ones place first.",
    "Count forward from the larger number.",
    `The answer should be just above ${left + right - 2}.`
  ].slice(0, context.maxHints);

  return {
    questionText: `[${context.topicCode}] What is ${left} + ${right}?`,
    answerFormat: "multiple_choice",
    options,
    correctAnswer: { value: String(answer) },
    hintLadder: hints,
    explanation: `${left} + ${right} = ${answer}.`,
    promptInput: {
      generator: "deterministic_v1",
      topicCode: context.topicCode,
      targetDifficulty: context.targetDifficulty,
      maxHints: context.maxHints
    },
    modelOutput: {
      provider: "deterministic",
      version: "v1"
    }
  };
}

function validateDraft(context: QuestionGenerationContext, draft: Omit<QuestionDraft, "promptInput" | "modelOutput">): void {
  if (!draft.questionText.includes(`[${context.topicCode}]`)) {
    throw new ApiError("INTERNAL_ERROR", 500, "Generated question missing topic tag");
  }

  if (draft.hintLadder.length !== context.maxHints) {
    throw new ApiError("INTERNAL_ERROR", 500, "Generated hint count does not match requested maxHints");
  }

  if (draft.answerFormat === "multiple_choice") {
    if (!Array.isArray(draft.options) || draft.options.length < 3) {
      throw new ApiError("INTERNAL_ERROR", 500, "Generated multiple choice question must include at least 3 options");
    }
  }

  if (typeof draft.correctAnswer.value !== "string" || draft.correctAnswer.value.trim() === "") {
    throw new ApiError("INTERNAL_ERROR", 500, "Generated correct answer is invalid");
  }
}

function extractOpenAIJsonText(responseBody: unknown): string {
  if (typeof responseBody !== "object" || responseBody === null) {
    throw new ApiError("INTERNAL_ERROR", 500, "OpenAI response is not a JSON object");
  }

  const body = responseBody as Record<string, unknown>;
  if (typeof body.output_text === "string" && body.output_text.trim().length > 0) {
    return body.output_text;
  }

  if (Array.isArray(body.output)) {
    for (const outputItem of body.output) {
      if (typeof outputItem !== "object" || outputItem === null) {
        continue;
      }
      const item = outputItem as Record<string, unknown>;
      if (!Array.isArray(item.content)) {
        continue;
      }
      for (const contentItem of item.content) {
        if (typeof contentItem !== "object" || contentItem === null) {
          continue;
        }
        const content = contentItem as Record<string, unknown>;
        if (typeof content.text === "string" && content.text.trim().length > 0) {
          return content.text;
        }
      }
    }
  }

  throw new ApiError("INTERNAL_ERROR", 500, "OpenAI response did not include text output");
}

function parseDraftFromJsonText(context: QuestionGenerationContext, rawText: string): Omit<QuestionDraft, "promptInput" | "modelOutput"> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new ApiError("INTERNAL_ERROR", 500, "Model returned invalid JSON");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new ApiError("INTERNAL_ERROR", 500, "Generated draft JSON must be an object");
  }

  const obj = parsed as Record<string, unknown>;
  const questionText = typeof obj.questionText === "string" ? obj.questionText.trim() : "";
  const answerFormat: "multiple_choice" | "number" = obj.answerFormat === "number" ? "number" : "multiple_choice";
  const options = Array.isArray(obj.options) ? obj.options.filter((v): v is string => typeof v === "string") : null;
  const correctAnswerRaw = obj.correctAnswer;
  const correctValue =
    typeof correctAnswerRaw === "object" &&
    correctAnswerRaw !== null &&
    typeof (correctAnswerRaw as Record<string, unknown>).value === "string"
      ? ((correctAnswerRaw as Record<string, unknown>).value as string).trim()
      : "";
  const hints = Array.isArray(obj.hintLadder) ? obj.hintLadder.filter((v): v is string => typeof v === "string") : [];
  const explanation = typeof obj.explanation === "string" ? obj.explanation.trim() : "";

  const draft = {
    questionText,
    answerFormat,
    options,
    correctAnswer: { value: correctValue },
    hintLadder: hints,
    explanation
  };
  validateDraft(context, draft);
  return draft;
}

async function callOpenAIOnce(context: QuestionGenerationContext, attempt: number): Promise<QuestionDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ApiError("INTERNAL_ERROR", 500, "OPENAI_API_KEY is missing");
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
  const timeoutMs = parsePositiveInt(process.env.OPENAI_TIMEOUT_MS ?? process.env.AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      questionText: { type: "string" },
      answerFormat: { type: "string", enum: ["multiple_choice", "number"] },
      options: { type: ["array", "null"], items: { type: "string" } },
      correctAnswer: {
        type: "object",
        additionalProperties: false,
        properties: { value: { type: "string" } },
        required: ["value"]
      },
      hintLadder: { type: "array", items: { type: "string" }, minItems: context.maxHints, maxItems: context.maxHints },
      explanation: { type: "string" }
    },
    required: ["questionText", "answerFormat", "options", "correctAnswer", "hintLadder", "explanation"]
  };

  const systemPrompt =
    "You generate Grade 4 math questions aligned to the provided topic. Return only valid JSON matching the schema.";
  const userPrompt = `Create one question for Grade ${context.gradeLevel}.
Topic code: ${context.topicCode}
Topic title: ${context.topicTitle}
Strand: ${context.strand}
Sub-strand: ${context.subStrand}
Difficulty: ${context.targetDifficulty}
Hint count: ${context.maxHints}
Requirements:
- Include the topic code in questionText as [${context.topicCode}] prefix.
- Age-appropriate for Grade 4.
- If answerFormat is multiple_choice, provide 3-4 options.
- correctAnswer.value must match one valid answer.
- hintLadder must have exactly ${context.maxHints} progressive hints.`;

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userPrompt }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "grade4_question",
            schema,
            strict: true
          }
        }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ApiError("INTERNAL_ERROR", 500, `OpenAI request failed: ${response.status} ${body.slice(0, 200)}`);
    }

    const json = (await response.json()) as unknown;
    const rawText = extractOpenAIJsonText(json);
    const draft = parseDraftFromJsonText(context, rawText);
    return {
      ...draft,
      promptInput: {
        provider: "openai",
        model,
        attempt,
        topicCode: context.topicCode,
        targetDifficulty: context.targetDifficulty,
        maxHints: context.maxHints
      },
      modelOutput: json as Prisma.InputJsonValue
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractCerebrasJsonText(responseBody: unknown): string {
  if (typeof responseBody !== "object" || responseBody === null) {
    throw new ApiError("INTERNAL_ERROR", 500, "Cerebras response is not a JSON object");
  }

  const body = responseBody as Record<string, unknown>;
  const choices = body.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new ApiError("INTERNAL_ERROR", 500, "Cerebras response did not include choices");
  }

  const firstChoice = choices[0];
  if (typeof firstChoice !== "object" || firstChoice === null) {
    throw new ApiError("INTERNAL_ERROR", 500, "Cerebras choice payload is invalid");
  }

  const message = (firstChoice as Record<string, unknown>).message;
  if (typeof message !== "object" || message === null) {
    throw new ApiError("INTERNAL_ERROR", 500, "Cerebras choice did not include message");
  }

  const content = (message as Record<string, unknown>).content;
  if (typeof content === "string" && content.trim().length > 0) {
    return content;
  }

  if (Array.isArray(content)) {
    for (const contentPart of content) {
      if (typeof contentPart !== "object" || contentPart === null) {
        continue;
      }
      const text = (contentPart as Record<string, unknown>).text;
      if (typeof text === "string" && text.trim().length > 0) {
        return text;
      }
    }
  }

  throw new ApiError("INTERNAL_ERROR", 500, "Cerebras response did not include message content");
}

async function callCerebrasOnce(context: QuestionGenerationContext, attempt: number): Promise<QuestionDraft> {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    throw new ApiError("INTERNAL_ERROR", 500, "CEREBRAS_API_KEY is missing");
  }

  const model = process.env.CEREBRAS_MODEL || DEFAULT_CEREBRAS_MODEL;
  const timeoutMs = parsePositiveInt(process.env.CEREBRAS_TIMEOUT_MS ?? process.env.AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      questionText: { type: "string" },
      answerFormat: { type: "string", enum: ["multiple_choice", "number"] },
      options: { type: ["array", "null"], items: { type: "string" } },
      correctAnswer: {
        type: "object",
        additionalProperties: false,
        properties: { value: { type: "string" } },
        required: ["value"]
      },
      hintLadder: { type: "array", items: { type: "string" }, minItems: context.maxHints, maxItems: context.maxHints },
      explanation: { type: "string" }
    },
    required: ["questionText", "answerFormat", "options", "correctAnswer", "hintLadder", "explanation"]
  };

  const systemPrompt =
    "You generate Grade 4 math questions aligned to the provided topic. Return only valid JSON matching the schema.";
  const userPrompt = `Create one question for Grade ${context.gradeLevel}.
Topic code: ${context.topicCode}
Topic title: ${context.topicTitle}
Strand: ${context.strand}
Sub-strand: ${context.subStrand}
Difficulty: ${context.targetDifficulty}
Hint count: ${context.maxHints}
Requirements:
- Include the topic code in questionText as [${context.topicCode}] prefix.
- Age-appropriate for Grade 4.
- If answerFormat is multiple_choice, provide 3-4 options.
- correctAnswer.value must match one valid answer.
- hintLadder must have exactly ${context.maxHints} progressive hints.`;

  try {
    const response = await fetch(CEREBRAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "grade4_question",
            strict: true,
            schema
          }
        }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ApiError("INTERNAL_ERROR", 500, `Cerebras request failed: ${response.status} ${body.slice(0, 200)}`);
    }

    const json = (await response.json()) as unknown;
    const rawText = extractCerebrasJsonText(json);
    const draft = parseDraftFromJsonText(context, rawText);

    return {
      ...draft,
      promptInput: {
        provider: "cerebras",
        model,
        attempt,
        topicCode: context.topicCode,
        targetDifficulty: context.targetDifficulty,
        maxHints: context.maxHints
      },
      modelOutput: json as Prisma.InputJsonValue
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function generateQuestionDraft(context: QuestionGenerationContext): Promise<QuestionDraft> {
  const provider = getConfiguredProvider();
  if (!provider || !shouldUseProvider(provider)) {
    return deterministicDraft(context);
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
    try {
      if (provider === "openai") {
        return await callOpenAIOnce(context, attempt);
      }
      return await callCerebrasOnce(context, attempt);
    } catch (error) {
      lastError = error;
      if (attempt > MAX_RETRIES) {
        break;
      }
    }
  }

  if (lastError instanceof ApiError) {
    throw lastError;
  }
  throw new ApiError("INTERNAL_ERROR", 500, `Failed to generate question from ${provider}`);
}
