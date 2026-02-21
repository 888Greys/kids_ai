import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";

const SESSION_COOKIE = "session_token";
const ACTIVE_CHILD_COOKIE = "active_child_id";

function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET ?? "brightpath-dev-secret-change-me";
    return new TextEncoder().encode(secret);
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return false;

    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        const data = payload as JWTPayload & { userId?: string };
        return !!data.userId;
    } catch {
        return false;
    }
}

/* ── Public routes that never require auth ── */
const PUBLIC_PATHS = ["/", "/auth/register", "/auth/login"];

function isPublicPath(pathname: string): boolean {
    return (
        PUBLIC_PATHS.includes(pathname) ||
        pathname.startsWith("/api/") ||
        pathname.startsWith("/_next/") ||
        pathname.startsWith("/favicon")
    );
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes — always allowed
    if (isPublicPath(pathname)) {
        return NextResponse.next();
    }

    // Everything else requires a valid session
    const authenticated = await hasValidSession(request);

    if (!authenticated) {
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // /play requires an active child — redirect to profile selection if missing
    if (pathname === "/play" || pathname.startsWith("/play/")) {
        const activeChildId = request.cookies.get(ACTIVE_CHILD_COOKIE)?.value;
        if (!activeChildId) {
            return NextResponse.redirect(new URL("/profiles", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all paths except static files and Next.js internals.
         * The middleware function itself handles granular logic.
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
