import { NextResponse } from "next/server";

import { getParentUserId } from "@/lib/api/auth";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { generateNextQuestion, validateGenerateQuestionRequest } from "@/lib/api/sessions/generate-question";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ sessionId: string; action: string }>;
};

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { sessionId, action } = await context.params;
    if (action !== "questions:generate") {
      throw new ApiError("NOT_FOUND", 404, "Endpoint not found");
    }

    const parentUserId = getParentUserId(request);
    const json = (await request.json()) as unknown;
    const payload = validateGenerateQuestionRequest(json);
    const result = await generateNextQuestion({ prisma }, parentUserId, sessionId, payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
