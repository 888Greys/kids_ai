import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/* ── Constants ── */

const SESSION_COOKIE = "session_token";
const ACTIVE_CHILD_COOKIE = "active_child_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET ?? "brightpath-dev-secret-change-me";
    return new TextEncoder().encode(secret);
}

/* ── Types ── */

export type SessionPayload = {
    userId: string;
    email: string;
};

/* ── Registration ── */

export async function registerUser(
    fullName: string,
    email: string,
    password: string
) {
    const existing = await prisma.appUser.findUnique({ where: { email } });
    if (existing) {
        throw new Error("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.appUser.create({
        data: {
            authProvider: "local",
            authProviderUserId: email, // use email as the provider user ID for local auth
            fullName,
            email,
            passwordHash,
        },
    });

    return user;
}

/* ── Login ── */

export async function loginUser(email: string, password: string) {
    const user = await prisma.appUser.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
        throw new Error("Invalid email or password.");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        throw new Error("Invalid email or password.");
    }

    return user;
}

/* ── Session Management ── */

export async function createSession(userId: string, email: string) {
    const token = await new SignJWT({ userId, email } satisfies SessionPayload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(getJwtSecret());

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
    });
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        const data = payload as JWTPayload & Partial<SessionPayload>;
        if (!data.userId || !data.email) return null;
        return { userId: data.userId, email: data.email };
    } catch {
        return null;
    }
}

export async function verifySessionToken(
    token: string
): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        const data = payload as JWTPayload & Partial<SessionPayload>;
        if (!data.userId || !data.email) return null;
        return { userId: data.userId, email: data.email };
    } catch {
        return null;
    }
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    cookieStore.delete(ACTIVE_CHILD_COOKIE);
}

/* ── Active Child ── */

export async function setActiveChild(childId: string) {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_CHILD_COOKIE, childId, {
        httpOnly: false, // readable by client-side JS
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
    });
}

export async function getActiveChildId(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(ACTIVE_CHILD_COOKIE)?.value ?? null;
}
