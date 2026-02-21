"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { DashboardResponse, TopicDrilldownResponse } from "../lib/types";
import {
    MATH_MISSIONS,
    PROTOTYPE_CHILD,
    proficiencyLabel,
    proficiencyClass,
    formatSignedValue,
    matchTopicForMission,
} from "../lib/constants";
import {
    buildPrototypeDashboard,
    buildPrototypeDrilldown,
} from "../lib/prototype-data";

export default function ParentDashboard() {
    const [dashboard] = useState<DashboardResponse>(
        buildPrototypeDashboard(PROTOTYPE_CHILD.childId, PROTOTYPE_CHILD.firstName, PROTOTYPE_CHILD.gradeLevel)
    );
    const [drilldown, setDrilldown] = useState<TopicDrilldownResponse | null>(null);

    const weakestTopic = useMemo(() => {
        if (!dashboard?.topicMastery.length) return null;
        return [...dashboard.topicMastery].sort((a, b) => a.masteryScore - b.masteryScore)[0] ?? null;
    }, [dashboard]);

    const weeklyInsight = useMemo(() => {
        if (!dashboard || dashboard.dailyTrend.length === 0) return null;
        const trend = [...dashboard.dailyTrend].sort((a, b) => a.date.localeCompare(b.date));
        const first = trend[0];
        const last = trend[trend.length - 1];
        return {
            attemptsTotal: trend.reduce((s, r) => s + r.attempts, 0),
            activeDays: trend.filter((r) => r.attempts > 0).length,
            accuracyDelta: Math.round((last.accuracyPercent - first.accuracyPercent) * 10) / 10,
            hintDelta: Math.round((last.avgHintsUsed - first.avgHintsUsed) * 100) / 100,
        };
    }, [dashboard]);

    const focusedRecommendation = useMemo(() => {
        if (!dashboard) return null;
        if (weakestTopic) {
            const targeted = dashboard.recommendations.find((r) => r.focusTopicCode === weakestTopic.topicCode);
            if (targeted) return targeted;
        }
        return dashboard.recommendations[0] ?? null;
    }, [dashboard, weakestTopic]);

    function handleLoadTopic(topicCode: string): void {
        const result = buildPrototypeDrilldown(topicCode);
        setDrilldown(result);
    }

    return (
        <main className="app-shell parent-shell">
            <header className="parent-header">
                <a href="/" className="parent-back">← Back to Kids App</a>
                <h1>📊 Parent Dashboard</h1>
                <p className="parent-subtitle">
                    Tracking <strong>{dashboard.child.name}</strong>&apos;s Grade {dashboard.child.gradeLevel} Math progress
                </p>
            </header>

            {/* Overview cards */}
            <div className="parent-overview">
                <div className="overview-card">
                    <span className="overview-num">{dashboard.overview.attempts}</span>
                    <span className="overview-label">Total Attempts</span>
                </div>
                <div className="overview-card">
                    <span className="overview-num">{dashboard.overview.accuracyPercent}%</span>
                    <span className="overview-label">Accuracy</span>
                </div>
                <div className="overview-card">
                    <span className="overview-num">{dashboard.overview.avgHintsUsed}</span>
                    <span className="overview-label">Avg Hints</span>
                </div>
                <div className="overview-card">
                    <span className="overview-num">{dashboard.overview.streakDays}</span>
                    <span className="overview-label">Day Streak</span>
                </div>
            </div>

            {/* Insights */}
            <section className="parent-insights">
                <h2>Weekly Insights</h2>
                <div className="insight-grid">
                    <div className="insight-card insight-win">
                        <p className="insight-kicker">✅ Win</p>
                        <p>{weeklyInsight && weeklyInsight.accuracyDelta >= 0
                            ? `Accuracy improved by ${formatSignedValue(weeklyInsight.accuracyDelta, "%")} this week.`
                            : `${dashboard.overview.attempts} attempts logged — building consistency.`}</p>
                    </div>
                    <div className="insight-card insight-risk">
                        <p className="insight-kicker">⚠️ Focus Area</p>
                        <p>{weakestTopic
                            ? `${weakestTopic.topicTitle} needs attention (mastery ${weakestTopic.masteryScore}, hints ${weakestTopic.hintDependencyPercent}%).`
                            : "No risk areas identified yet."}</p>
                    </div>
                    {focusedRecommendation && (
                        <div className="insight-card insight-rec">
                            <p className="insight-kicker">💡 Recommendation</p>
                            <p>{focusedRecommendation.text}</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Topic mastery */}
            <section className="parent-mastery">
                <h2>Topic Mastery</h2>
                <div className="mastery-table">
                    {dashboard.topicMastery.map((topic) => {
                        const mission = MATH_MISSIONS.find((m) => matchTopicForMission([topic], m));
                        return (
                            <motion.button
                                key={topic.topicCode}
                                type="button"
                                className="mastery-table-row"
                                onClick={() => handleLoadTopic(topic.topicCode)}
                                whileHover={{ scale: 1.01 }}
                            >
                                <span className="mastery-table-emoji">{mission?.emoji ?? "📘"}</span>
                                <div className="mastery-table-info">
                                    <span className="mastery-table-title">{topic.topicTitle}</span>
                                    <span className="mastery-table-code">{topic.topicCode}</span>
                                </div>
                                <div className="mastery-table-bar">
                                    <div className="mastery-bar-track">
                                        <div className="mastery-bar-fill" style={{ width: `${topic.masteryScore}%` }} />
                                    </div>
                                </div>
                                <span className="mastery-table-score">{topic.masteryScore}</span>
                                <span className={proficiencyClass(topic.proficiency)}>
                                    {proficiencyLabel(topic.proficiency)}
                                </span>
                            </motion.button>
                        );
                    })}
                </div>
            </section>

            {/* Drilldown */}
            {drilldown && (
                <section className="parent-drilldown">
                    <h2>🔎 {drilldown.topicTitle}</h2>
                    <p className="drilldown-meta">
                        {drilldown.topicCode} • Mastery {drilldown.latestMastery.masteryScore} ({proficiencyLabel(drilldown.latestMastery.proficiency)})
                    </p>
                    <div className="drilldown-history">
                        {drilldown.attemptHistory.map((row) => (
                            <div key={row.date} className="drilldown-row">
                                <span>{row.date}</span>
                                <span>{row.attempts} attempts</span>
                                <span>{row.correctAttempts} correct</span>
                                <span>{row.avgHintsUsed} hints avg</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Daily trend */}
            <section className="parent-trend">
                <h2>Daily Trend (7 days)</h2>
                <div className="trend-table">
                    <div className="trend-header">
                        <span>Date</span>
                        <span>Attempts</span>
                        <span>Accuracy</span>
                        <span>Hints</span>
                    </div>
                    {dashboard.dailyTrend.map((row) => (
                        <div key={row.date} className="trend-row">
                            <span>{row.date}</span>
                            <span>{row.attempts}</span>
                            <span>{row.accuracyPercent}%</span>
                            <span>{row.avgHintsUsed}</span>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
