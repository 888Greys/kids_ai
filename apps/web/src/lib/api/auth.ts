import { ApiError } from "@/lib/api/errors";
import { jwtVerify, type JWTPayload } from "jose";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "brightpath-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim();
}

function decodeBase64UrlSegment(segment: string): string | null {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  try {
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function extractParentIdFromJwt(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const payloadJson = decodeBase64UrlSegment(parts[1] ?? "");
  if (!payloadJson) {
    return null;
  }

  try {
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;
    const raw =
      payload.parentUserId ??
      payload.parent_user_id ??
      payload.userId ??
      payload.user_id ??
      payload.sub;
    if (typeof raw !== "string") {
      return null;
    }
    const parentId = raw.trim();
    return UUID_RE.test(parentId) ? parentId : null;
  } catch {
    return null;
  }
}

function extractParentIdFromDevToken(token: string): string | null {
  if (!token.startsWith("parent:")) {
    return null;
  }

  const parentId = token.slice("parent:".length).trim();
  return UUID_RE.test(parentId) ? parentId : null;
}

function extractSessionCookieToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/(?:^|;\s*)session_token=([^;]+)/);
  return match?.[1]?.trim() ?? null;
}

async function extractParentIdFromSessionCookie(request: Request): Promise<string | null> {
  const token = extractSessionCookieToken(request);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const data = payload as JWTPayload & { userId?: string };
    if (!data.userId || typeof data.userId !== "string") return null;
    return UUID_RE.test(data.userId) ? data.userId : null;
  } catch {
    return null;
  }
}

export async function getParentUserId(request: Request): Promise<string> {
  // 1. Try Authorization header (existing flow)
  const token = extractBearerToken(request);
  if (token) {
    const fromJwt = extractParentIdFromJwt(token);
    if (fromJwt) {
      return fromJwt;
    }

    if (process.env.NODE_ENV !== "production") {
      const fromDevToken = extractParentIdFromDevToken(token);
      if (fromDevToken) {
        return fromDevToken;
      }
    }

    throw new ApiError("UNAUTHORIZED", 401, "Invalid bearer token");
  }

  // 2. Try session cookie (new cookie-based auth flow)
  const fromCookie = await extractParentIdFromSessionCookie(request);
  if (fromCookie) {
    return fromCookie;
  }

  // 3. Dev fallback via x-parent-user-id header
  const fallbackParentId = request.headers.get("x-parent-user-id")?.trim();
  if (process.env.NODE_ENV !== "production" && fallbackParentId && UUID_RE.test(fallbackParentId)) {
    return fallbackParentId;
  }

  throw new ApiError("UNAUTHORIZED", 401, "Missing authentication context");
}

