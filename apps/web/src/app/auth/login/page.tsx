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

    function handleDemoLogin() {
        setEmail("demo@brightpath.com");
        setPassword("demo123");
        setError(null);
        setIsLoading(true);
        fetch("/api/v1/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "demo@brightpath.com", password: "demo123" }),
        })
            .then((res) => {
                if (!res.ok) throw new Error("Login failed");
                router.push(redirect);
            })
            .catch(() => {
                setError("Demo login failed.");
                setIsLoading(false);
            });
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

                    <div style={{ position: "relative", margin: "1rem 0", textAlign: "center" }}>
                        <hr style={{ borderColor: "rgba(0,0,0,0.1)" }} />
                        <span style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", background: "white", padding: "0 10px", fontSize: "14px", color: "var(--purple)", borderRadius: "10px" }}>or</span>
                    </div>

                    <button
                        type="button"
                        className="btn btn-quest btn-xl auth-submit"
                        onClick={handleDemoLogin}
                        disabled={isLoading}
                        style={{ width: "100%", background: "var(--yellow)", color: "var(--navy)", boxShadow: "0 4px 0 #ca8a04" }}
                    >
                        🚀 One-Click Demo Login
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
