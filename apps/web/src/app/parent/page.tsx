"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import type { DashboardResponse, TopicDrilldownResponse } from "../lib/types";
import {
    MATH_MISSIONS,
    proficiencyLabel,
    proficiencyClass,
    formatSignedValue,
    matchTopicForMission,
} from "../lib/constants";

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

export default function ParentDashboard() {
    const router = useRouter();

    const [children, setChildren] = useState<ChildProfile[]>([]);
    const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
    const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
    const [drilldown, setDrilldown] = useState<TopicDrilldownResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch children on mount
    useEffect(() => {
        async function fetchChildren() {
            try {
                const res = await fetch("/api/v1/parent/children");
                if (res.ok) {
                    const data = await res.json();
                    const kids = data.children ?? [];
                    setChildren(kids);
                    if (kids.length > 0) {
                        setSelectedChild(kids[0]);
                    }
                }
            } catch {
                // Silently fail
            } finally {
                setIsLoading(false);
            }
        }
        fetchChildren();
    }, []);

    // Fetch dashboard when child changes
    useEffect(() => {
        if (!selectedChild) return;
        async function fetchDashboard() {
            try {
                const res = await fetch(`/api/v1/parent/children/${selectedChild!.childId}/dashboard`);
                if (res.ok) {
                    setDashboard(await res.json());
                }
            } catch {
                // Silently fail — dashboard will show empty state
            }
        }
        fetchDashboard();
    }, [selectedChild]);

    async function handleLoadTopic(topicCode: string) {
        if (!selectedChild) return;
        try {
            const res = await fetch(`/api/v1/parent/children/${selectedChild.childId}/topics/${topicCode}`);
            if (res.ok) {
                setDrilldown(await res.json());
            }
        } catch {
            // Silently fail
        }
    }

    async function handleLogout() {
        await fetch("/api/v1/auth/logout", { method: "POST" });
        router.push("/");
    }

    function handlePlayAs(childId: string) {
        document.cookie = `active_child_id=${childId}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
        router.push("/play");
    }

    const topicsByMission = useMemo(() => {
        if (!dashboard) return {};
        return MATH_MISSIONS.reduce<Record<string, DashboardResponse["topicMastery"][number] | null>>((acc, m) => {
            acc[m.key] = matchTopicForMission(dashboard.topicMastery, m);
            return acc;
        }, {});
    }, [dashboard]);

    if (isLoading) {
        return (
            <main className="app-shell">
                <div className="empty-card">
                    <span className="result-wait-spinner" aria-hidden="true" />
                    <p>Loading your dashboard...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="app-shell">
            {/* ── Top Bar ── */}
            <header className="app-header">
                <div className="header-brand">
                    <Image src="/milo.png" alt="Milo" width={40} height={40} />
                    <span className="header-title">BrightPath</span>
                </div>
                <div className="parent-top-actions">
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => router.push("/onboarding/child")}
                    >
                        ➕ Add Child
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleLogout}
                    >
                        🚪 Log Out
                    </button>
                </div>
            </header>

            <h1 className="section-label" style={{ fontSize: 24 }}>
                👨‍👩‍👧‍👦 Parent Dashboard
            </h1>

            {/* ── Children Cards ── */}
            {children.length === 0 ? (
                <div className="empty-card">
                    <span className="success-emoji">🌟</span>
                    <p>No children yet. Add your first child to get started!</p>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => router.push("/onboarding/child")}
                    >
                        ➕ Add Child
                    </button>
                </div>
            ) : (
                <div className="child-cards-grid">
                    {children.map((child) => {
                        const emoji = AVATAR_EMOJIS[child.avatarName ?? ""] ?? "👤";
                        const isSelected = selectedChild?.childId === child.childId;
                        return (
                            <motion.div
                                key={child.childId}
                                className="child-card"
                                style={isSelected ? { borderLeft: `4px solid var(--purple)` } : {}}
                                whileHover={{ scale: 1.02 }}
                            >
                                <div className="child-card-header">
                                    <span className="child-card-avatar">{emoji}</span>
                                    <div className="child-card-info">
                                        <h3>{child.firstName}</h3>
                                        <p>Grade {child.gradeLevel}</p>
                                    </div>
                                </div>
                                <div className="child-card-actions">
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setSelectedChild(child)}
                                    >
                                        📊 View Stats
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-quest btn-sm"
                                        style={{ padding: "10px 16px", fontSize: 13 }}
                                        onClick={() => handlePlayAs(child.childId)}
                                    >
                                        🎮 Play
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ── Selected Child Dashboard ── */}
            {selectedChild && dashboard && (
                <>
                    <h2 className="section-label">
                        📈 {selectedChild.firstName}&apos;s Progress
                    </h2>

                    {/* Overview stats */}
                    <div className="stats-row">
                        <div className="stats-card stats-card-purple">
                            <span className="stats-num">{dashboard.overview.attempts}</span>
                            <span className="stats-label">Questions Done</span>
                        </div>
                        <div className="stats-card stats-card-green">
                            <span className="stats-num">{dashboard.overview.accuracyPercent}%</span>
                            <span className="stats-label">Accuracy</span>
                        </div>
                        <div className="stats-card stats-card-orange">
                            <span className="stats-num">{dashboard.overview.streakDays}</span>
                            <span className="stats-label">Day Streak</span>
                        </div>
                    </div>

                    {/* Topic Mastery */}
                    <h3 className="section-label">📊 Topic Mastery</h3>
                    <div className="mastery-list">
                        {MATH_MISSIONS.map((mission) => {
                            const topic = topicsByMission[mission.key];
                            if (!topic) return null;
                            return (
                                <motion.div
                                    key={mission.key}
                                    className="mastery-card"
                                    whileHover={{ scale: 1.01 }}
                                >
                                    <div className="mastery-card-top">
                                        <span>{mission.emoji} {mission.title}</span>
                                        <span className={proficiencyClass(topic.proficiency)}>
                                            {proficiencyLabel(topic.proficiency)}
                                        </span>
                                    </div>
                                    <div className="mission-mastery-bar">
                                        <div
                                            className="mission-mastery-fill"
                                            style={{ width: `${topic.masteryScore}%`, background: mission.color }}
                                        />
                                    </div>
                                    <div className="mastery-card-bottom">
                                        <span>{topic.masteryScore}% mastery</span>
                                        <span>{topic.accuracyPercent}% accuracy</span>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => handleLoadTopic(topic.topicCode)}
                                        >
                                            Details
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Topic Drilldown */}
                    {drilldown && (
                        <div className="drilldown-panel">
                            <div className="drilldown-header">
                                <h3>🔍 {drilldown.topicTitle}</h3>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setDrilldown(null)}
                                >
                                    ✕ Close
                                </button>
                            </div>
                            <div className="mastery-card-bottom" style={{ marginBottom: 12 }}>
                                <span>{drilldown.latestMastery.masteryScore}% mastery</span>
                                <span className={proficiencyClass(drilldown.latestMastery.proficiency)}>
                                    {proficiencyLabel(drilldown.latestMastery.proficiency)}
                                </span>
                            </div>
                            <table className="drilldown-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Attempts</th>
                                        <th>Correct</th>
                                        <th>Avg Hints</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {drilldown.attemptHistory.map((row) => (
                                        <tr key={row.date}>
                                            <td>{row.date}</td>
                                            <td>{row.attempts}</td>
                                            <td>{row.correctAttempts}</td>
                                            <td>{row.avgHintsUsed}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Recommendations */}
                    {dashboard.recommendations.length > 0 && (
                        <>
                            <h3 className="section-label">💡 Recommendations</h3>
                            <div className="recommendations-list">
                                {dashboard.recommendations.map((rec, i) => (
                                    <div key={i} className="recommendation-card">
                                        <span className="rec-date">{rec.generatedOn}</span>
                                        <p>{rec.text}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </main>
    );
}
