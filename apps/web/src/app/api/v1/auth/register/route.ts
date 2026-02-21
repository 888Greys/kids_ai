import { NextRequest, NextResponse } from "next/server";
import { registerUser, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fullName, email, password } = body;

        if (!fullName || !email || !password) {
            return NextResponse.json(
                { error: "Full name, email, and password are required." },
                { status: 400 }
            );
        }

        if (typeof password !== "string" || password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters." },
                { status: 400 }
            );
        }

        const user = await registerUser(fullName, email, password);
        await createSession(user.id, user.email);

        return NextResponse.json({ success: true });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Registration failed.";
        const status = message.includes("already exists") ? 409 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
