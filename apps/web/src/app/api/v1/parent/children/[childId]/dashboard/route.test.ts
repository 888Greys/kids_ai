import { describe, expect, mock, test } from "bun:test";

import { ApiError } from "@/lib/api/errors";

const parseDashboardDaysMock = mock((rawDays: string | null) => (rawDays ? 7 : 7));
const getChildDashboardMock = mock(async () => ({
  child: {
    childId: "11111111-1111-4111-8111-111111111111",
    name: "Amina",
    gradeLevel: 4
  },
  overview: {
    attempts: 42,
    accuracyPercent: 73.8,
    avgHintsUsed: 1.04,
    streakDays: 4
  },
  dailyTrend: [],
  topicMastery: [],
  recommendations: []
}));

mock.module("@/lib/prisma", () => ({
  prisma: {}
}));

mock.module("@/lib/api/parent/get-child-dashboard", () => ({
  parseDashboardDays: parseDashboardDaysMock,
  getChildDashboard: getChildDashboardMock
}));

describe("GET /api/v1/parent/children/{childId}/dashboard", () => {
  test("returns 401 when auth context missing", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/v1/parent/children/id/dashboard?days=7", {
      method: "GET"
    });

    const response = await GET(request, { params: Promise.resolve({ childId: "id" }) });
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
    const request = new Request("http://localhost/api/v1/parent/children/111/dashboard?days=7", {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    const response = await GET(request, {
      params: Promise.resolve({ childId: "11111111-1111-4111-8111-111111111111" })
    });
    expect(response.status).toBe(200);
  });

  test("maps service errors using shared error shape", async () => {
    getChildDashboardMock.mockImplementation(async () => {
      throw new ApiError("FORBIDDEN", 403, "Child does not belong to authenticated parent");
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
    const request = new Request("http://localhost/api/v1/parent/children/111/dashboard?days=7", {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    const response = await GET(request, {
      params: Promise.resolve({ childId: "11111111-1111-4111-8111-111111111111" })
    });
    const json = (await response.json()) as { error: { code: string } };
    expect(response.status).toBe(403);
    expect(json.error.code).toBe("FORBIDDEN");
  });
});
