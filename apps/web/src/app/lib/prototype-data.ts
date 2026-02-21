import type { MathMission, DashboardResponse, TopicDrilldownResponse, PrototypeQuestion } from "./types";

/* ── Prototype Topic Map ── */

export const PROTOTYPE_TOPIC_MAP: Record<
    MathMission["key"],
    {
        topicCode: string;
        topicTitle: string;
        strand: string;
        subStrand: string;
        masteryScore: number;
        proficiency: DashboardResponse["topicMastery"][number]["proficiency"];
        accuracyPercent: number;
        hintDependencyPercent: number;
    }
> = {
    fractions: { topicCode: "G4-MATH-FRC-001", topicTitle: "Equivalent Fractions", strand: "Numbers", subStrand: "Fractions", masteryScore: 64, proficiency: "developing", accuracyPercent: 68, hintDependencyPercent: 25 },
    "place-value": { topicCode: "G4-MATH-PV-001", topicTitle: "Place Value to Thousands", strand: "Numbers", subStrand: "Place Value", masteryScore: 72, proficiency: "proficient", accuracyPercent: 75, hintDependencyPercent: 19 },
    "add-subtract": { topicCode: "G4-MATH-AS-001", topicTitle: "Addition and Subtraction", strand: "Numbers", subStrand: "Operations", masteryScore: 78, proficiency: "proficient", accuracyPercent: 80, hintDependencyPercent: 16 },
    "multiply-divide": { topicCode: "G4-MATH-MD-001", topicTitle: "Multiplication and Division Facts", strand: "Numbers", subStrand: "Operations", masteryScore: 54, proficiency: "developing", accuracyPercent: 59, hintDependencyPercent: 31 },
    "word-problems": { topicCode: "G4-MATH-WP-001", topicTitle: "Multi-step Word Problems", strand: "Problem Solving", subStrand: "Reasoning", masteryScore: 48, proficiency: "needs_support", accuracyPercent: 53, hintDependencyPercent: 36 },
};

/* ── Prototype Question Bank ── */

export const PROTOTYPE_QUESTION_BANK: Record<MathMission["key"], PrototypeQuestion[]> = {
    fractions: [
        { id: "proto-frc-1", missionKey: "fractions", topicCode: "G4-MATH-FRC-001", topicTitle: "Equivalent Fractions", strand: "Numbers", subStrand: "Fractions", difficulty: "adaptive", questionText: "Which fraction is equal to 1/2?", options: ["2/4", "3/5", "4/7", "5/8"], correctAnswer: "2/4", hints: ["Try multiplying both top and bottom by the same number.", "1/2 can become ?/4.", "1 x 2 = 2 and 2 x 2 = 4."], explanation: "2/4 is equal to 1/2 because numerator and denominator were multiplied by 2." },
        { id: "proto-frc-2", missionKey: "fractions", topicCode: "G4-MATH-FRC-001", topicTitle: "Equivalent Fractions", strand: "Numbers", subStrand: "Fractions", difficulty: "adaptive", questionText: "Which is greater?", options: ["3/8", "1/2", "They are equal", "Cannot tell"], correctAnswer: "1/2", hints: ["Think in eighths.", "1/2 is the same as 4/8.", "Compare 3/8 and 4/8."], explanation: "1/2 equals 4/8, and 4/8 is greater than 3/8." },
    ],
    "place-value": [
        { id: "proto-pv-1", missionKey: "place-value", topicCode: "G4-MATH-PV-001", topicTitle: "Place Value to Thousands", strand: "Numbers", subStrand: "Place Value", difficulty: "adaptive", questionText: "In 4,582, what is the value of 5?", options: ["5", "50", "500", "5,000"], correctAnswer: "500", hints: ["Read each digit's place from right to left.", "The 2 is ones, 8 is tens, 5 is hundreds.", "Hundreds means x100."], explanation: "The digit 5 is in the hundreds place, so its value is 500." },
        { id: "proto-pv-2", missionKey: "place-value", topicCode: "G4-MATH-PV-001", topicTitle: "Place Value to Thousands", strand: "Numbers", subStrand: "Place Value", difficulty: "adaptive", questionText: "Which number is largest?", options: ["3,975", "3,759", "3,957", "3,795"], correctAnswer: "3,975", hints: ["Compare thousands first, then hundreds.", "All have 3 thousands.", "9 hundreds is greatest."], explanation: "All numbers have 3 thousands; 3,975 has the highest hundreds digit (9)." },
    ],
    "add-subtract": [
        { id: "proto-as-1", missionKey: "add-subtract", topicCode: "G4-MATH-AS-001", topicTitle: "Addition and Subtraction", strand: "Numbers", subStrand: "Operations", difficulty: "adaptive", questionText: "What is 358 + 247?", options: ["595", "605", "615", "625"], correctAnswer: "605", hints: ["Add ones: 8 + 7 = 15.", "Carry the 1 to the tens.", "Final answer is just above 600."], explanation: "358 + 247 = 605 after regrouping." },
        { id: "proto-as-2", missionKey: "add-subtract", topicCode: "G4-MATH-AS-001", topicTitle: "Addition and Subtraction", strand: "Numbers", subStrand: "Operations", difficulty: "adaptive", questionText: "What is 900 - 487?", options: ["403", "413", "423", "433"], correctAnswer: "413", hints: ["Use borrowing from hundreds to tens and ones.", "10 - 7 = 3 in ones.", "Check: 487 + 413 = 900."], explanation: "900 - 487 = 413." },
    ],
    "multiply-divide": [
        { id: "proto-md-1", missionKey: "multiply-divide", topicCode: "G4-MATH-MD-001", topicTitle: "Multiplication and Division Facts", strand: "Numbers", subStrand: "Operations", difficulty: "adaptive", questionText: "7 x 8 = ?", options: ["54", "56", "58", "64"], correctAnswer: "56", hints: ["Think 7 x 4, then double.", "7 x 4 = 28.", "28 x 2 = 56."], explanation: "7 multiplied by 8 equals 56." },
        { id: "proto-md-2", missionKey: "multiply-divide", topicCode: "G4-MATH-MD-001", topicTitle: "Multiplication and Division Facts", strand: "Numbers", subStrand: "Operations", difficulty: "adaptive", questionText: "48 / 6 = ?", options: ["6", "7", "8", "9"], correctAnswer: "8", hints: ["Find a number that times 6 gives 48.", "6 x 7 = 42.", "6 x 8 = 48."], explanation: "48 divided by 6 is 8." },
    ],
    "word-problems": [
        { id: "proto-wp-1", missionKey: "word-problems", topicCode: "G4-MATH-WP-001", topicTitle: "Multi-step Word Problems", strand: "Problem Solving", subStrand: "Reasoning", difficulty: "adaptive", questionText: "A class has 24 apples and buys 18 more. They share equally among 6 groups. How many per group?", options: ["6", "7", "8", "9"], correctAnswer: "7", hints: ["Find total apples first.", "24 + 18 = 42.", "42 / 6 = 7."], explanation: "Total apples are 42, and 42 divided by 6 groups gives 7 each." },
        { id: "proto-wp-2", missionKey: "word-problems", topicCode: "G4-MATH-WP-001", topicTitle: "Multi-step Word Problems", strand: "Problem Solving", subStrand: "Reasoning", difficulty: "adaptive", questionText: "A bus has 48 seats. 19 are filled at first stop and 14 more at second stop. How many seats are still empty?", options: ["11", "13", "15", "17"], correctAnswer: "15", hints: ["How many are filled now?", "19 + 14 = 33.", "48 - 33 = 15."], explanation: "33 seats are filled, so 48 - 33 leaves 15 empty seats." },
    ],
};

/* ── Prototype Builders ── */

export function buildPrototypeDashboard(childId: string, childName: string, gradeLevel: number): DashboardResponse {
    const topicMastery = Object.entries(PROTOTYPE_TOPIC_MAP).map(([key, topic]) => ({
        topicId: `prototype-topic-${key}`,
        topicCode: topic.topicCode,
        topicTitle: topic.topicTitle,
        masteryScore: topic.masteryScore,
        proficiency: topic.proficiency,
        accuracyPercent: topic.accuracyPercent,
        hintDependencyPercent: topic.hintDependencyPercent,
    }));

    return {
        child: { childId, name: childName, gradeLevel },
        overview: { attempts: 24, accuracyPercent: 71.5, avgHintsUsed: 1.1, streakDays: 6 },
        dailyTrend: [
            { date: "2026-02-14", attempts: 3, accuracyPercent: 62, avgHintsUsed: 1.8 },
            { date: "2026-02-15", attempts: 4, accuracyPercent: 68, avgHintsUsed: 1.4 },
            { date: "2026-02-16", attempts: 5, accuracyPercent: 70, avgHintsUsed: 1.2 },
            { date: "2026-02-17", attempts: 3, accuracyPercent: 74, avgHintsUsed: 1.1 },
            { date: "2026-02-18", attempts: 4, accuracyPercent: 76, avgHintsUsed: 0.9 },
            { date: "2026-02-19", attempts: 2, accuracyPercent: 73, avgHintsUsed: 1.3 },
            { date: "2026-02-20", attempts: 3, accuracyPercent: 78, avgHintsUsed: 0.8 },
        ],
        topicMastery,
        recommendations: [
            { generatedOn: "2026-02-20", focusTopicCode: PROTOTYPE_TOPIC_MAP["word-problems"].topicCode, text: "Use draw-and-solve steps for word problems: underline numbers, pick operation, then check." },
            { generatedOn: "2026-02-20", focusTopicCode: PROTOTYPE_TOPIC_MAP["multiply-divide"].topicCode, text: "Do a 5-minute multiplication facts sprint before each quest." },
        ],
    };
}

export function buildPrototypeDrilldown(topicCode: string): TopicDrilldownResponse | null {
    const entry = Object.values(PROTOTYPE_TOPIC_MAP).find((topic) => topic.topicCode === topicCode);
    if (!entry) return null;
    return {
        topicCode: entry.topicCode,
        topicTitle: entry.topicTitle,
        attemptHistory: [
            { date: "2026-02-16", attempts: 2, correctAttempts: 1, avgHintsUsed: 2 },
            { date: "2026-02-18", attempts: 3, correctAttempts: 2, avgHintsUsed: 1.3 },
            { date: "2026-02-20", attempts: 2, correctAttempts: 2, avgHintsUsed: 1 },
        ],
        latestMastery: { masteryScore: entry.masteryScore, proficiency: entry.proficiency },
    };
}
