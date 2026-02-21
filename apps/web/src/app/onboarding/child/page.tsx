"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const AVATAR_OPTIONS = [
    { name: "milo", emoji: "🦊", label: "Milo the Fox" },
    { name: "luna", emoji: "🐱", label: "Luna the Cat" },
    { name: "rocky", emoji: "🐻", label: "Rocky the Bear" },
    { name: "pip", emoji: "🐧", label: "Pip the Penguin" },
    { name: "sky", emoji: "🦋", label: "Sky the Butterfly" },
    { name: "blaze", emoji: "🐉", label: "Blaze the Dragon" },
    { name: "coco", emoji: "🐵", label: "Coco the Monkey" },
    { name: "star", emoji: "⭐", label: "Star" },
];

const GRADE_OPTIONS = Array.from({ length: 9 }, (_, i) => i + 1);

type Step = 1 | 2 | 3;

export default function ChildOnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>(1);
    const [firstName, setFirstName] = useState("");
    const [gradeLevel, setGradeLevel] = useState(4);
    const [avatarName, setAvatarName] = useState("milo");
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [childName, setChildName] = useState("");

    async function handleCreateChild() {
        if (!firstName.trim()) {
            setError("Please enter your child's name.");
            return;
        }

        setError(null);
        setIsCreating(true);

        try {
            const res = await fetch("/api/v1/parent/children", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName: firstName.trim(), gradeLevel, avatarName }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error ?? "Failed to create profile.");
                return;
            }

            setChildName(firstName.trim());
            setStep(3);
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsCreating(false);
        }
    }

    return (
        <main className="auth-page">
            <div className="auth-card onboarding-card">
                <div className="auth-header">
                    <Image src="/milo.png" alt="Milo" width={56} height={56} priority />
                    <h1>Add Your Child</h1>
                    <div className="onboarding-progress">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`onboarding-dot ${s === step ? "onboarding-dot-active" : s < step ? "onboarding-dot-done" : ""}`}
                            />
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {/* ── Step 1: Name & Grade ── */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.25 }}
                            className="onboarding-step"
                        >
                            <h2>What&apos;s their name?</h2>
                            <label className="auth-field">
                                <span className="auth-label">First Name</span>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="e.g. Amara"
                                    required
                                    className="auth-input"
                                    autoFocus
                                />
                            </label>

                            <label className="auth-field">
                                <span className="auth-label">Grade Level</span>
                                <select
                                    value={gradeLevel}
                                    onChange={(e) => setGradeLevel(Number(e.target.value))}
                                    className="auth-input"
                                >
                                    {GRADE_OPTIONS.map((g) => (
                                        <option key={g} value={g}>
                                            Grade {g}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <button
                                type="button"
                                className="btn btn-primary btn-xl auth-submit"
                                onClick={() => {
                                    if (!firstName.trim()) {
                                        setError("Please enter a name.");
                                        return;
                                    }
                                    setError(null);
                                    setStep(2);
                                }}
                            >
                                Next →
                            </button>
                            {error && <p className="auth-error">{error}</p>}
                        </motion.div>
                    )}

                    {/* ── Step 2: Avatar ── */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.25 }}
                            className="onboarding-step"
                        >
                            <h2>Choose an avatar for {firstName}</h2>
                            <div className="avatar-grid">
                                {AVATAR_OPTIONS.map((av) => (
                                    <button
                                        key={av.name}
                                        type="button"
                                        className={`avatar-card ${avatarName === av.name ? "avatar-card-selected" : ""}`}
                                        onClick={() => setAvatarName(av.name)}
                                    >
                                        <span className="avatar-emoji">{av.emoji}</span>
                                        <span className="avatar-label">{av.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="onboarding-actions">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setStep(1)}
                                >
                                    ← Back
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-xl"
                                    onClick={handleCreateChild}
                                    disabled={isCreating}
                                >
                                    {isCreating ? "Creating..." : "✨ Create Profile"}
                                </button>
                            </div>
                            {error && <p className="auth-error">{error}</p>}
                        </motion.div>
                    )}

                    {/* ── Step 3: Success ── */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.35, type: "spring" }}
                            className="onboarding-step onboarding-success"
                        >
                            <span className="success-emoji">🎉</span>
                            <h2>{childName}&apos;s profile is ready!</h2>
                            <p>Head to your dashboard to see their progress or jump straight into a math adventure.</p>

                            <div className="onboarding-actions">
                                <button
                                    type="button"
                                    className="btn btn-primary btn-xl"
                                    onClick={() => router.push("/parent")}
                                >
                                    📊 Go to Dashboard
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-quest btn-xl"
                                    onClick={() => router.push("/profiles")}
                                >
                                    🎮 Start Playing
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
