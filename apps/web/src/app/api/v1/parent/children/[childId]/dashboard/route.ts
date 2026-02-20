import { NextResponse } from "next/server";

import { getParentUserId } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/errors";
import { getChildDashboard, parseDashboardDays } from "@/lib/api/parent/get-child-dashboard";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ childId: string }>;
};

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const parentUserId = getParentUserId(request);
    const { childId } = await context.params;
    const url = new URL(request.url);
    const days = parseDashboardDays(url.searchParams.get("days"));

    const result = await getChildDashboard({ prisma }, parentUserId, childId, days);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
