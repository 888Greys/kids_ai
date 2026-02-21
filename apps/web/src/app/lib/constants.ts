import type { MathMission, DashboardResponse } from "./types";

/* ── Constants ── */

export const DEFAULT_PARENT_ID = "22222222-2222-4222-8222-222222222222";
export const QUEST_TARGET_QUESTIONS = 5;
export const ONBOARDING_STORAGE_KEY = "kids-ai-onboarding-v1";
export const A11Y_STORAGE_KEY = "kids-ai-a11y-v1";
export const OPTION_LETTERS = ["A", "B", "C", "D"];
export const PROTOTYPE_PARENT_ID = "00000000-0000-4000-8000-000000000001";

export const PROTOTYPE_CHILD = {
    childId: "00000000-0000-4000-8000-000000000002",
    firstName: "Ava",
    gradeLevel: 4,
};

export const MATH_MISSIONS: MathMission[] = [
    { key: "fractions", title: "Fractions", subtitle: "Compare, simplify & equivalent", dailyGoal: "5 fraction challenges", emoji: "🍕", color: "#fb923c", keywords: ["fraction", "fractions", "frc"] },
    { key: "place-value", title: "Place Value", subtitle: "Thousands to ones", dailyGoal: "5 place value drills", emoji: "🔢", color: "#38bdf8", keywords: ["place value", "place", "pv"] },
    { key: "add-subtract", title: "Add & Subtract", subtitle: "Mental maths & regrouping", dailyGoal: "5 speed rounds", emoji: "⚡", color: "#f43f5e", keywords: ["addition", "subtract", "sum", "difference", "add", "sub"] },
    { key: "multiply-divide", title: "Multiply & Divide", subtitle: "Times tables & inverse", dailyGoal: "5 fact mastery rounds", emoji: "✖️", color: "#a855f7", keywords: ["multiply", "division", "product", "quotient", "times"] },
    { key: "word-problems", title: "Word Problems", subtitle: "Real-world scenarios", dailyGoal: "5 story missions", emoji: "📖", color: "#34d399", keywords: ["word problem", "problem solving", "story", "application"] },
];

/* ── Helpers ── */

export function proficiencyLabel(value: DashboardResponse["topicMastery"][number]["proficiency"]): string {
    return value.replace("_", " ");
}

export function proficiencyClass(value: DashboardResponse["topicMastery"][number]["proficiency"]): string {
    if (value === "advanced") return "pill pill-advanced";
    if (value === "proficient") return "pill pill-proficient";
    if (value === "developing") return "pill pill-developing";
    return "pill pill-support";
}

export function difficultyLabel(value: "easy" | "medium" | "hard" | "adaptive"): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatSignedValue(value: number, suffix = ""): string {
    if (value === 0) return `0${suffix}`;
    const sign = value > 0 ? "+" : "-";
    return `${sign}${Math.abs(value)}${suffix}`;
}

export function roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
}

export function scoreToProficiency(score: number): DashboardResponse["topicMastery"][number]["proficiency"] {
    if (score < 40) return "needs_support";
    if (score < 70) return "developing";
    if (score < 85) return "proficient";
    return "advanced";
}

export function matchTopicForMission(
    topics: DashboardResponse["topicMastery"],
    mission: MathMission
): DashboardResponse["topicMastery"][number] | null {
    return topics.find((topic) => {
        const joined = `${topic.topicTitle} ${topic.topicCode}`.toLowerCase();
        return mission.keywords.some((kw) => joined.includes(kw));
    }) ?? null;
}
