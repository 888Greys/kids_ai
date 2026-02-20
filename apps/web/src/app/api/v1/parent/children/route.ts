import { NextResponse } from "next/server";

import { getParentUserId } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/errors";
import { listParentChildren } from "@/lib/api/parent/list-children";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const parentUserId = getParentUserId(request);
    const result = await listParentChildren({ prisma }, parentUserId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
