"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import FloatingDecor from "../../components/FloatingDecor";

export default function RegisterPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch("/api/v1/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, email, password }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Registration failed.");
                return;
            }

            router.push("/onboarding/child");
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
                    <h1>Create Your Account</h1>
                    <p>Start your child&apos;s math adventure today</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <label className="auth-field">
                        <span className="auth-label">Full Name</span>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Jane Doe"
                            required
                            className="auth-input"
                            autoComplete="name"
                        />
                    </label>

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
                            placeholder="At least 6 characters"
                            required
                            minLength={6}
                            className="auth-input"
                            autoComplete="new-password"
                        />
                    </label>

                    <label className="auth-field">
                        <span className="auth-label">Confirm Password</span>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat your password"
                            required
                            minLength={6}
                            className="auth-input"
                            autoComplete="new-password"
                        />
                    </label>

                    {error && <p className="auth-error">{error}</p>}

                    <button
                        type="submit"
                        className="btn btn-primary btn-xl auth-submit"
                        disabled={isLoading}
                    >
                        {isLoading ? "Creating Account..." : "🚀 Create Account"}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account?{" "}
                    <Link href="/auth/login" className="auth-link">
                        Log in
                    </Link>
                </p>
            </motion.div>
        </main>
    );
}
