import { NextResponse } from "next/server";

import { getParentUserId } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const parentUserId = await getParentUserId(request);
    const rows = await prisma.child.findMany({
      where: { parentUserId },
      orderBy: { createdAt: "asc" },
      select: { id: true, firstName: true, gradeLevel: true, avatarName: true },
    });

    return NextResponse.json({
      children: rows.map((r) => ({
        childId: r.id,
        firstName: r.firstName,
        gradeLevel: r.gradeLevel,
        avatarName: r.avatarName,
      })),
    });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const parentUserId = await getParentUserId(request);
    const body = await request.json();
    const { firstName, gradeLevel, avatarName } = body;

    if (!firstName || typeof firstName !== "string") {
      return NextResponse.json({ error: "firstName is required." }, { status: 400 });
    }

    const grade = typeof gradeLevel === "number" ? gradeLevel : 4;
    if (grade < 1 || grade > 9) {
      return NextResponse.json({ error: "gradeLevel must be 1–9." }, { status: 400 });
    }

    const child = await prisma.child.create({
      data: {
        parentUserId,
        firstName: firstName.trim(),
        gradeLevel: grade,
        avatarName: avatarName ?? null,
      },
      select: { id: true, firstName: true, gradeLevel: true, avatarName: true },
    });

    return NextResponse.json({
      childId: child.id,
      firstName: child.firstName,
      gradeLevel: child.gradeLevel,
      avatarName: child.avatarName,
    }, { status: 201 });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
