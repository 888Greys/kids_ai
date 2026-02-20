import { NextResponse } from "next/server";

import { getParentUserId } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/errors";
import { getTopicDrilldown, parseTopicDrilldownDays } from "@/lib/api/parent/get-topic-drilldown";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ childId: string; topicCode: string }>;
};

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const parentUserId = getParentUserId(request);
    const { childId, topicCode } = await context.params;
    const url = new URL(request.url);
    const days = parseTopicDrilldownDays(url.searchParams.get("days"));

    const result = await getTopicDrilldown({ prisma }, parentUserId, childId, topicCode, days);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
