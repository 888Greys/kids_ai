import { NextResponse } from "next/server";

import { getParentUserId } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/errors";
import { requestQuestionHint, validateRequestHintPayload } from "@/lib/api/questions/request-hint";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ questionId: string }>;
};

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { questionId } = await context.params;
    const parentUserId = await getParentUserId(request);
    const json = (await request.json()) as unknown;
    const payload = validateRequestHintPayload(json);

    const result = await requestQuestionHint({ prisma }, parentUserId, questionId, payload);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
