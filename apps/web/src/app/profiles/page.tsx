"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";

const AVATAR_EMOJIS: Record<string, string> = {
    milo: "🦊",
    luna: "🐱",
    rocky: "🐻",
    pip: "🐧",
    sky: "🦋",
    blaze: "🐉",
    coco: "🐵",
    star: "⭐",
};

type ChildProfile = {
    childId: string;
    firstName: string;
    gradeLevel: number;
    avatarName?: string | null;
};

export default function ProfilesPage() {
    const router = useRouter();
    const [children, setChildren] = useState<ChildProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selecting, setSelecting] = useState<string | null>(null);

    useEffect(() => {
        async function fetchChildren() {
            try {
                const res = await fetch("/api/v1/parent/children");
                if (res.ok) {
                    const data = await res.json();
                    setChildren(data.children ?? []);
                }
            } catch {
                // Silently fail — will show empty state
            } finally {
                setIsLoading(false);
            }
        }
        fetchChildren();
    }, []);

    async function selectChild(childId: string) {
        setSelecting(childId);
        // Set the active_child_id cookie via a lightweight endpoint
        document.cookie = `active_child_id=${childId}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
        // Short delay for transition feel
        await new Promise((r) => setTimeout(r, 300));
        router.push("/play");
    }

    return (
        <main className="profiles-page">
            <div className="profiles-container">
                <div className="profiles-header">
                    <Image src="/milo.png" alt="Milo" width={56} height={56} priority />
                    <h1>Who&apos;s Playing?</h1>
                    <p>Choose a profile to start the math adventure</p>
                </div>

                {isLoading ? (
                    <div className="profiles-loading">
                        <span className="result-wait-spinner" aria-hidden="true" />
                        <p>Loading profiles...</p>
                    </div>
                ) : children.length === 0 ? (
                    <div className="profiles-empty">
                        <span className="success-emoji">🌟</span>
                        <p>No profiles yet! Add your first child to get started.</p>
                        <button
                            type="button"
                            className="btn btn-primary btn-xl"
                            onClick={() => router.push("/onboarding/child")}
                        >
                            ➕ Add Child
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="profiles-grid">
                            {children.map((child, index) => {
                                const emoji = AVATAR_EMOJIS[child.avatarName ?? ""] ?? "👤";
                                const isSelecting = selecting === child.childId;
                                return (
                                    <motion.button
                                        key={child.childId}
                                        type="button"
                                        className={`profile-card ${isSelecting ? "profile-card-selecting" : ""}`}
                                        onClick={() => selectChild(child.childId)}
                                        disabled={!!selecting}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.08, duration: 0.3 }}
                                        whileHover={{ scale: 1.06, y: -4 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <span className="profile-avatar">{emoji}</span>
                                        <span className="profile-name">{child.firstName}</span>
                                        <span className="profile-grade">Grade {child.gradeLevel}</span>
                                        {isSelecting && (
                                            <span className="profile-loading">Loading...</span>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            className="btn btn-ghost profiles-add-btn"
                            onClick={() => router.push("/onboarding/child")}
                        >
                            ➕ Add Another Child
                        </button>
                    </>
                )}
            </div>
        </main>
    );
}
