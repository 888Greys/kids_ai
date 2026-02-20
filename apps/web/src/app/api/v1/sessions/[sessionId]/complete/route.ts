import { NextResponse } from "next/server";

import { getParentUserId } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/errors";
import { completeSession, validateCompleteSessionPayload } from "@/lib/api/sessions/complete-session";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { sessionId } = await context.params;
    const parentUserId = getParentUserId(request);
    const json = (await request.json()) as unknown;
    const payload = validateCompleteSessionPayload(json);

    const result = await completeSession({ prisma }, parentUserId, sessionId, payload);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
