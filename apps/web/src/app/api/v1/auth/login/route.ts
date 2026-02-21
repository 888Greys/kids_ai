import { NextRequest, NextResponse } from "next/server";
import { loginUser, registerUser, createSession } from "@/lib/auth";

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

        let user;
        try {
            user = await loginUser(email, password);
        } catch (e) {
            // Auto-provision demo account if it doesn't exist
            if (email === "demo@brightpath.com" && password === "demo123") {
                user = await registerUser("Demo Parent", email, password);
            } else {
                throw e; // rethrow if it's not the demo account
            }
        }

        await createSession(user.id, user.email);

        return NextResponse.json({ success: true });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Login failed.";
        return NextResponse.json({ error: message }, { status: 401 });
    }
}
