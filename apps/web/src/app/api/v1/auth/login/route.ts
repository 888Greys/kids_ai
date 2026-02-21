import { NextRequest, NextResponse } from "next/server";
import { loginUser, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required." },
                { status: 400 }
            );
        }

        const user = await loginUser(email, password);
        await createSession(user.id, user.email);

        return NextResponse.json({ success: true });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Login failed.";
        return NextResponse.json({ error: message }, { status: 401 });
    }
}
