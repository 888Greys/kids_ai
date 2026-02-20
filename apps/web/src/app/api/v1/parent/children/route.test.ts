import { describe, expect, mock, test } from "bun:test";

import { ApiError } from "@/lib/api/errors";

const listParentChildrenMock = mock(async () => ({
  children: [
    {
      childId: "11111111-1111-4111-8111-111111111111",
      firstName: "Amina",
      gradeLevel: 4
    }
  ]
}));

mock.module("@/lib/prisma", () => ({
  prisma: {}
}));

mock.module("@/lib/api/parent/list-children", () => ({
  listParentChildren: listParentChildrenMock
}));

describe("GET /api/v1/parent/children", () => {
  test("returns 401 when auth context is missing", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/v1/parent/children", {
      method: "GET"
    });

    const response = await GET(request);
    const json = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  test("returns 200 for valid bearer auth", async () => {
    listParentChildrenMock.mockImplementation(async () => ({
      children: [
        {
          childId: "11111111-1111-4111-8111-111111111111",
          firstName: "Amina",
          gradeLevel: 4
        }
      ]
    }));

    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const payload = Buffer.from(JSON.stringify({ sub: "22222222-2222-4222-8222-222222222222" }), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const token = `${header}.${payload}.sig`;

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/v1/parent/children", {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
  });

  test("maps service errors using shared error shape", async () => {
    listParentChildrenMock.mockImplementation(async () => {
      throw new ApiError("INTERNAL_ERROR", 500, "Unexpected");
    });

    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const payload = Buffer.from(JSON.stringify({ sub: "22222222-2222-4222-8222-222222222222" }), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const token = `${header}.${payload}.sig`;

    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/v1/parent/children", {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    const response = await GET(request);
    const json = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });
});
