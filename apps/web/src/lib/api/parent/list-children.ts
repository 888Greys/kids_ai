import { ApiError } from "@/lib/api/errors";

type ChildRecord = {
  id: string;
  firstName: string;
  gradeLevel: number;
};

type ListParentChildrenDeps = {
  prisma: {
    child: {
      findMany: (args: {
        where: { parentUserId: string };
        orderBy: { createdAt: "asc" };
        select: { id: true; firstName: true; gradeLevel: true };
      }) => Promise<ChildRecord[]>;
    };
  };
};

type ListParentChildrenResponse = {
  children: Array<{
    childId: string;
    firstName: string;
    gradeLevel: number;
  }>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listParentChildren(
  deps: ListParentChildrenDeps,
  parentUserId: string
): Promise<ListParentChildrenResponse> {
  if (!UUID_RE.test(parentUserId)) {
    throw new ApiError("UNAUTHORIZED", 401, "Invalid authentication context");
  }

  const rows = await deps.prisma.child.findMany({
    where: { parentUserId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      firstName: true,
      gradeLevel: true
    }
  });

  return {
    children: rows.map((row) => ({
      childId: row.id,
      firstName: row.firstName,
      gradeLevel: row.gradeLevel
    }))
  };
}
