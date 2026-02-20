import { NextResponse } from "next/server";

import { getParentUserId } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { startSession, validateStartSessionRequest } from "@/lib/api/sessions/start-session";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const parentUserId = getParentUserId(request);
    const json = (await request.json()) as unknown;
    const payload = validateStartSessionRequest(json);

    const result = await startSession({ prisma }, parentUserId, payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
