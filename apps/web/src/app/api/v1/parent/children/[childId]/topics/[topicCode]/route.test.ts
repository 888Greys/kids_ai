import { describe, expect, mock, test } from "bun:test";

import { ApiError } from "@/lib/api/errors";

const parseTopicDrilldownDaysMock = mock((rawDays: string | null) => (rawDays ? 30 : 30));
const getTopicDrilldownMock = mock(async () => ({
  topicCode: "G4-MATH-FRC-001",
  topicTitle: "Equivalent Fractions",
  attemptHistory: [],
  latestMastery: {
    masteryScore: 58.2,
    proficiency: "needs_support"
  }
}));

mock.module("@/lib/prisma", () => ({
  prisma: {}
}));

mock.module("@/lib/api/parent/get-topic-drilldown", () => ({
  parseTopicDrilldownDays: parseTopicDrilldownDaysMock,
  getTopicDrilldown: getTopicDrilldownMock
}));

describe("GET /api/v1/parent/children/{childId}/topics/{topicCode}", () => {
  test("returns 401 when auth context missing", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/v1/parent/children/id/topics/code?days=30", {
      method: "GET"
    });

    const response = await GET(request, {
      params: Promise.resolve({ childId: "id", topicCode: "code" })
    });
    const json = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  test("returns 200 for valid request", async () => {
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
    const request = new Request("http://localhost/api/v1/parent/children/111/topics/G4-MATH-FRC-001?days=30", {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    const response = await GET(request, {
      params: Promise.resolve({
        childId: "11111111-1111-4111-8111-111111111111",
        topicCode: "G4-MATH-FRC-001"
      })
    });
    expect(response.status).toBe(200);
  });

  test("maps service errors using shared error shape", async () => {
    getTopicDrilldownMock.mockImplementation(async () => {
      throw new ApiError("NOT_FOUND", 404, "Topic not found");
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
    const request = new Request("http://localhost/api/v1/parent/children/111/topics/G4-MATH-FRC-001?days=30", {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    const response = await GET(request, {
      params: Promise.resolve({
        childId: "11111111-1111-4111-8111-111111111111",
        topicCode: "G4-MATH-FRC-001"
      })
    });
    const json = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(404);
    expect(json.error.code).toBe("NOT_FOUND");
  });
});
