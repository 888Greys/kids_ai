import { describe, expect, test } from "bun:test";

import { ApiError } from "@/lib/api/errors";
import { listParentChildren } from "@/lib/api/parent/list-children";

const PARENT_ID = "22222222-2222-4222-8222-222222222222";

describe("listParentChildren", () => {
  test("rejects invalid parent id", async () => {
    const deps = {
      prisma: {
        child: {
          findMany: async () => []
        }
      }
    };

    await expect(listParentChildren(deps, "invalid")).rejects.toThrow(ApiError);
  });

  test("returns mapped children list", async () => {
    const deps = {
      prisma: {
        child: {
          findMany: async () => [
            {
              id: "11111111-1111-4111-8111-111111111111",
              firstName: "Amina",
              gradeLevel: 4
            },
            {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              firstName: "Baraka",
              gradeLevel: 4
            }
          ]
        }
      }
    };

    const result = await listParentChildren(deps, PARENT_ID);
    expect(result).toEqual({
      children: [
        {
          childId: "11111111-1111-4111-8111-111111111111",
          firstName: "Amina",
          gradeLevel: 4
        },
        {
          childId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          firstName: "Baraka",
          gradeLevel: 4
        }
      ]
    });
  });
});
