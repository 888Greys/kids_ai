"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import FloatingDecor from "../../components/FloatingDecor";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") ?? "/parent";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const res = await fetch("/api/v1/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Login failed.");
                return;
            }

            router.push(redirect);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="auth-page relative overflow-hidden">
            <FloatingDecor />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="auth-card relative z-10"
            >
                <div className="auth-header">
                    <Image src="/milo.png" alt="Milo" width={64} height={64} priority />
                    <h1>Welcome Back!</h1>
                    <p>Log in to your BrightPath account</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <label className="auth-field">
                        <span className="auth-label">Email</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="jane@example.com"
                            required
                            className="auth-input"
                            autoComplete="email"
                        />
                    </label>

                    <label className="auth-field">
                        <span className="auth-label">Password</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Your password"
                            required
                            className="auth-input"
                            autoComplete="current-password"
                        />
                    </label>

                    {error && <p className="auth-error">{error}</p>}

                    <button
                        type="submit"
                        className="btn btn-primary btn-xl auth-submit"
                        disabled={isLoading}
                    >
                        {isLoading ? "Logging in..." : "🔑 Log In"}
                    </button>
                </form>

                <p className="auth-footer">
                    Don&apos;t have an account?{" "}
                    <Link href="/auth/register" className="auth-link">
                        Sign up
                    </Link>
                </p>
            </motion.div>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
