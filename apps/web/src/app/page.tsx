"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import MascotBuddy from "./components/MascotBuddy";
import ConfettiBlast from "./components/ConfettiBlast";
import XPBar from "./components/XPBar";
import HintRevealer from "./components/HintRevealer";
import FeedbackSplash from "./components/FeedbackSplash";
import QuestComplete from "./components/QuestComplete";
import Image from "next/image";

/* ── Type definitions (unchanged) ── */

type ChildListResponse = {
  children: Array<{
    childId: string;
    firstName: string;
    gradeLevel: number;
  }>;
};

type DashboardResponse = {
  child: { childId: string; name: string; gradeLevel: number };
  overview: {
    attempts: number;
    accuracyPercent: number;
    avgHintsUsed: number;
    streakDays: number;
  };
  dailyTrend: Array<{
    date: string;
    attempts: number;
    accuracyPercent: number;
    avgHintsUsed: number;
  }>;
  topicMastery: Array<{
    topicId: string;
    topicCode: string;
    topicTitle: string;
    masteryScore: number;
    proficiency: "needs_support" | "developing" | "proficient" | "advanced";
    accuracyPercent: number;
    hintDependencyPercent: number;
  }>;
  recommendations: Array<{
    generatedOn: string;
    focusTopicCode: string | null;
    text: string;
  }>;
};

type TopicDrilldownResponse = {
  topicCode: string;
  topicTitle: string;
  attemptHistory: Array<{
    date: string;
    attempts: number;
    correctAttempts: number;
    avgHintsUsed: number;
  }>;
  latestMastery: {
    masteryScore: number;
    proficiency: "needs_support" | "developing" | "proficient" | "advanced";
  };
};

type StartSessionResponse = {
  sessionId: string;
  childId: string;
  mode: "practice" | "challenge" | "revision";
  focusTopic: { id: string; topicCode: string; title: string } | null;
  startedAt: string;
};

type GenerateQuestionResponse = {
  questionId: string;
  sessionId: string;
  topic: { id: string; topicCode: string; title: string; strand: string; subStrand: string };
  difficulty: "easy" | "medium" | "hard" | "adaptive";
  questionText: string;
  answerFormat: string;
  options: string[] | null;
  hintCount: number;
  createdAt: string;
};

type HintResponse = { questionId: string; hintLevel: number; hintText: string };

type SubmitAttemptResponse = {
  attemptId: string;
  isCorrect: boolean;
  feedbackText: string;
  explanation: string;
  masteryUpdate: {
    topicId: string;
    topicCode: string;
    accuracyPercent: number;
    hintDependencyPercent: number;
    masteryScore: number;
    proficiency: "needs_support" | "developing" | "proficient" | "advanced";
  };
  sessionProgress: { totalQuestions: number; correctAnswers: number; avgHintsUsed: number };
  nextRecommendedDifficulty: "easy" | "medium" | "hard";
};

type CompleteSessionResponse = {
  sessionId: string;
  endedAt: string;
  summary: { totalQuestions: number; correctAnswers: number; avgHintsUsed: number };
};

type PrototypeQuestionApiResponse = {
  questionId: string;
  topic: { id: string; topicCode: string; title: string; strand: string; subStrand: string };
  difficulty: "easy" | "medium" | "hard" | "adaptive";
  questionText: string;
  answerFormat: "multiple_choice" | "number";
  options: string[] | null;
  hintCount: number;
  hints: string[];
  correctAnswer: string;
  explanation: string;
  createdAt: string;
};

type PrototypeQuestion = {
  id: string;
  missionKey: MathMission["key"];
  topicCode: string;
  topicTitle: string;
  strand: string;
  subStrand: string;
  difficulty: GenerateQuestionResponse["difficulty"];
  questionText: string;
  options: string[];
  correctAnswer: string;
  hints: string[];
  explanation: string;
};

type RetryChallenge = {
  questionText: string;
  options: string[];
  correctOption: string;
  selectedOption: string;
  status: "pending" | "passed" | "failed";
};

/* ── Constants ── */

const DEFAULT_PARENT_ID = "22222222-2222-4222-8222-222222222222";
const QUEST_TARGET_QUESTIONS = 5;
const ONBOARDING_STORAGE_KEY = "kids-ai-onboarding-v1";
const ONBOARDING_TOTAL_STEPS = 3;
const A11Y_STORAGE_KEY = "kids-ai-a11y-v1";

type UiMode = "kids" | "parent";

type MathMission = {
  key: "fractions" | "place-value" | "add-subtract" | "multiply-divide" | "word-problems";
  title: string;
  subtitle: string;
  dailyGoal: string;
  emoji: string;
  keywords: string[];
};

const MATH_MISSIONS: MathMission[] = [
  { key: "fractions", title: "Fractions", subtitle: "Compare, simplify & equivalent", dailyGoal: "5 fraction challenges", emoji: "🍕", keywords: ["fraction", "fractions", "frc"] },
  { key: "place-value", title: "Place Value", subtitle: "Thousands to ones", dailyGoal: "5 place value drills", emoji: "🔢", keywords: ["place value", "place", "pv"] },
  { key: "add-subtract", title: "Add & Subtract", subtitle: "Mental maths & regrouping", dailyGoal: "5 speed rounds", emoji: "⚡", keywords: ["addition", "subtract", "sum", "difference", "add", "sub"] },
  { key: "multiply-divide", title: "Multiply & Divide", subtitle: "Times tables & inverse", dailyGoal: "5 fact mastery rounds", emoji: "✖️", keywords: ["multiply", "division", "product", "quotient", "times"] },
  { key: "word-problems", title: "Word Problems", subtitle: "Real-world scenarios", dailyGoal: "5 story missions", emoji: "📖", keywords: ["word problem", "problem solving", "story", "application"] },
];

const OPTION_LETTERS = ["A", "B", "C", "D"];
const PROTOTYPE_PARENT_ID = "00000000-0000-4000-8000-000000000001";
const PROTOTYPE_CHILD = {
  childId: "00000000-0000-4000-8000-000000000002",
  firstName: "Ava",
  gradeLevel: 4,
};

const PROTOTYPE_TOPIC_MAP: Record<
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
  fractions: {
    topicCode: "G4-MATH-FRC-001",
    topicTitle: "Equivalent Fractions",
    strand: "Numbers",
    subStrand: "Fractions",
    masteryScore: 64,
    proficiency: "developing",
    accuracyPercent: 68,
    hintDependencyPercent: 25,
  },
  "place-value": {
    topicCode: "G4-MATH-PV-001",
    topicTitle: "Place Value to Thousands",
    strand: "Numbers",
    subStrand: "Place Value",
    masteryScore: 72,
    proficiency: "proficient",
    accuracyPercent: 75,
    hintDependencyPercent: 19,
  },
  "add-subtract": {
    topicCode: "G4-MATH-AS-001",
    topicTitle: "Addition and Subtraction",
    strand: "Numbers",
    subStrand: "Operations",
    masteryScore: 78,
    proficiency: "proficient",
    accuracyPercent: 80,
    hintDependencyPercent: 16,
  },
  "multiply-divide": {
    topicCode: "G4-MATH-MD-001",
    topicTitle: "Multiplication and Division Facts",
    strand: "Numbers",
    subStrand: "Operations",
    masteryScore: 54,
    proficiency: "developing",
    accuracyPercent: 59,
    hintDependencyPercent: 31,
  },
  "word-problems": {
    topicCode: "G4-MATH-WP-001",
    topicTitle: "Multi-step Word Problems",
    strand: "Problem Solving",
    subStrand: "Reasoning",
    masteryScore: 48,
    proficiency: "needs_support",
    accuracyPercent: 53,
    hintDependencyPercent: 36,
  },
};

const PROTOTYPE_QUESTION_BANK: Record<MathMission["key"], PrototypeQuestion[]> = {
  fractions: [
    {
      id: "proto-frc-1",
      missionKey: "fractions",
      topicCode: "G4-MATH-FRC-001",
      topicTitle: "Equivalent Fractions",
      strand: "Numbers",
      subStrand: "Fractions",
      difficulty: "adaptive",
      questionText: "Which fraction is equal to 1/2?",
      options: ["2/4", "3/5", "4/7", "5/8"],
      correctAnswer: "2/4",
      hints: ["Try multiplying both top and bottom by the same number.", "1/2 can become ?/4.", "1 x 2 = 2 and 2 x 2 = 4."],
      explanation: "2/4 is equal to 1/2 because numerator and denominator were multiplied by 2.",
    },
    {
      id: "proto-frc-2",
      missionKey: "fractions",
      topicCode: "G4-MATH-FRC-001",
      topicTitle: "Equivalent Fractions",
      strand: "Numbers",
      subStrand: "Fractions",
      difficulty: "adaptive",
      questionText: "Which is greater?",
      options: ["3/8", "1/2", "They are equal", "Cannot tell"],
      correctAnswer: "1/2",
      hints: ["Think in eighths.", "1/2 is the same as 4/8.", "Compare 3/8 and 4/8."],
      explanation: "1/2 equals 4/8, and 4/8 is greater than 3/8.",
    },
  ],
  "place-value": [
    {
      id: "proto-pv-1",
      missionKey: "place-value",
      topicCode: "G4-MATH-PV-001",
      topicTitle: "Place Value to Thousands",
      strand: "Numbers",
      subStrand: "Place Value",
      difficulty: "adaptive",
      questionText: "In 4,582, what is the value of 5?",
      options: ["5", "50", "500", "5,000"],
      correctAnswer: "500",
      hints: ["Read each digit's place from right to left.", "The 2 is ones, 8 is tens, 5 is hundreds.", "Hundreds means x100."],
      explanation: "The digit 5 is in the hundreds place, so its value is 500.",
    },
    {
      id: "proto-pv-2",
      missionKey: "place-value",
      topicCode: "G4-MATH-PV-001",
      topicTitle: "Place Value to Thousands",
      strand: "Numbers",
      subStrand: "Place Value",
      difficulty: "adaptive",
      questionText: "Which number is largest?",
      options: ["3,975", "3,759", "3,957", "3,795"],
      correctAnswer: "3,975",
      hints: ["Compare thousands first, then hundreds.", "All have 3 thousands.", "9 hundreds is greatest."],
      explanation: "All numbers have 3 thousands; 3,975 has the highest hundreds digit (9).",
    },
  ],
  "add-subtract": [
    {
      id: "proto-as-1",
      missionKey: "add-subtract",
      topicCode: "G4-MATH-AS-001",
      topicTitle: "Addition and Subtraction",
      strand: "Numbers",
      subStrand: "Operations",
      difficulty: "adaptive",
      questionText: "What is 358 + 247?",
      options: ["595", "605", "615", "625"],
      correctAnswer: "605",
      hints: ["Add ones: 8 + 7 = 15.", "Carry the 1 to the tens.", "Final answer is just above 600."],
      explanation: "358 + 247 = 605 after regrouping.",
    },
    {
      id: "proto-as-2",
      missionKey: "add-subtract",
      topicCode: "G4-MATH-AS-001",
      topicTitle: "Addition and Subtraction",
      strand: "Numbers",
      subStrand: "Operations",
      difficulty: "adaptive",
      questionText: "What is 900 - 487?",
      options: ["403", "413", "423", "433"],
      correctAnswer: "413",
      hints: ["Use borrowing from hundreds to tens and ones.", "10 - 7 = 3 in ones.", "Check: 487 + 413 = 900."],
      explanation: "900 - 487 = 413.",
    },
  ],
  "multiply-divide": [
    {
      id: "proto-md-1",
      missionKey: "multiply-divide",
      topicCode: "G4-MATH-MD-001",
      topicTitle: "Multiplication and Division Facts",
      strand: "Numbers",
      subStrand: "Operations",
      difficulty: "adaptive",
      questionText: "7 x 8 = ?",
      options: ["54", "56", "58", "64"],
      correctAnswer: "56",
      hints: ["Think 7 x 4, then double.", "7 x 4 = 28.", "28 x 2 = 56."],
      explanation: "7 multiplied by 8 equals 56.",
    },
    {
      id: "proto-md-2",
      missionKey: "multiply-divide",
      topicCode: "G4-MATH-MD-001",
      topicTitle: "Multiplication and Division Facts",
      strand: "Numbers",
      subStrand: "Operations",
      difficulty: "adaptive",
      questionText: "48 / 6 = ?",
      options: ["6", "7", "8", "9"],
      correctAnswer: "8",
      hints: ["Find a number that times 6 gives 48.", "6 x 7 = 42.", "6 x 8 = 48."],
      explanation: "48 divided by 6 is 8.",
    },
  ],
  "word-problems": [
    {
      id: "proto-wp-1",
      missionKey: "word-problems",
      topicCode: "G4-MATH-WP-001",
      topicTitle: "Multi-step Word Problems",
      strand: "Problem Solving",
      subStrand: "Reasoning",
      difficulty: "adaptive",
      questionText: "A class has 24 apples and buys 18 more. They share equally among 6 groups. How many per group?",
      options: ["6", "7", "8", "9"],
      correctAnswer: "7",
      hints: ["Find total apples first.", "24 + 18 = 42.", "42 / 6 = 7."],
      explanation: "Total apples are 42, and 42 divided by 6 groups gives 7 each.",
    },
    {
      id: "proto-wp-2",
      missionKey: "word-problems",
      topicCode: "G4-MATH-WP-001",
      topicTitle: "Multi-step Word Problems",
      strand: "Problem Solving",
      subStrand: "Reasoning",
      difficulty: "adaptive",
      questionText: "A bus has 48 seats. 19 are filled at first stop and 14 more at second stop. How many seats are still empty?",
      options: ["11", "13", "15", "17"],
      correctAnswer: "15",
      hints: ["How many are filled now?", "19 + 14 = 33.", "48 - 33 = 15."],
      explanation: "33 seats are filled, so 48 - 33 leaves 15 empty seats.",
    },
  ],
};

/* ── Helpers (unchanged) ── */

function proficiencyLabel(value: DashboardResponse["topicMastery"][number]["proficiency"]): string {
  return value.replace("_", " ");
}

function proficiencyClass(value: DashboardResponse["topicMastery"][number]["proficiency"]): string {
  if (value === "advanced") return "pill pill-advanced";
  if (value === "proficient") return "pill pill-proficient";
  if (value === "developing") return "pill pill-developing";
  return "pill pill-support";
}

function difficultyLabel(value: "easy" | "medium" | "hard" | "adaptive"): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatSignedValue(value: number, suffix = ""): string {
  if (value === 0) return `0${suffix}`;
  const sign = value > 0 ? "+" : "-";
  return `${sign}${Math.abs(value)}${suffix}`;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function scoreToProficiency(score: number): DashboardResponse["topicMastery"][number]["proficiency"] {
  if (score < 40) return "needs_support";
  if (score < 70) return "developing";
  if (score < 85) return "proficient";
  return "advanced";
}

function buildPrototypeDashboard(childId: string, childName: string, gradeLevel: number): DashboardResponse {
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
    child: {
      childId,
      name: childName,
      gradeLevel,
    },
    overview: {
      attempts: 24,
      accuracyPercent: 71.5,
      avgHintsUsed: 1.1,
      streakDays: 6,
    },
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
      {
        generatedOn: "2026-02-20",
        focusTopicCode: PROTOTYPE_TOPIC_MAP["word-problems"].topicCode,
        text: "Use draw-and-solve steps for word problems: underline numbers, pick operation, then check.",
      },
      {
        generatedOn: "2026-02-20",
        focusTopicCode: PROTOTYPE_TOPIC_MAP["multiply-divide"].topicCode,
        text: "Do a 5-minute multiplication facts sprint before each quest.",
      },
    ],
  };
}

function buildPrototypeDrilldown(topicCode: string): TopicDrilldownResponse | null {
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
    latestMastery: {
      masteryScore: entry.masteryScore,
      proficiency: entry.proficiency,
    },
  };
}

function matchTopicForMission(
  topics: DashboardResponse["topicMastery"],
  mission: MathMission
): DashboardResponse["topicMastery"][number] | null {
  return topics.find((topic) => {
    const joined = `${topic.topicTitle} ${topic.topicCode}`.toLowerCase();
    return mission.keywords.some((kw) => joined.includes(kw));
  }) ?? null;
}

async function readErrorMessage(response: Response): Promise<string> {
  let message = `Request failed (${response.status})`;
  try {
    const errorJson = (await response.json()) as { error?: { message?: string } };
    if (errorJson.error?.message) message = errorJson.error.message;
  } catch { /* ignore */ }
  return message;
}

async function apiGet<T>(url: string, parentUserId: string): Promise<T> {
  const response = await fetch(url, { method: "GET", headers: { "x-parent-user-id": parentUserId } });
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return (await response.json()) as T;
}

async function apiPost<T>(url: string, parentUserId: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-parent-user-id": parentUserId },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return (await response.json()) as T;
}

/* ── Page Component ── */

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<UiMode>("kids");
  const [parentUserId, setParentUserId] = useState(PROTOTYPE_PARENT_ID);
  const [children, setChildren] = useState<ChildListResponse["children"]>([PROTOTYPE_CHILD]);
  const [selectedChildId, setSelectedChildId] = useState<string>(PROTOTYPE_CHILD.childId);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(
    buildPrototypeDashboard(PROTOTYPE_CHILD.childId, PROTOTYPE_CHILD.firstName, PROTOTYPE_CHILD.gradeLevel)
  );
  const [drilldown, setDrilldown] = useState<TopicDrilldownResponse | null>(null);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [isLoadingDrilldown, setIsLoadingDrilldown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMissionKey, setSelectedMissionKey] = useState<MathMission["key"]>(MATH_MISSIONS[0].key);
  const [questMessage, setQuestMessage] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<GenerateQuestionResponse | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [latestAttempt, setLatestAttempt] = useState<SubmitAttemptResponse | null>(null);
  const [sessionSummary, setSessionSummary] = useState<CompleteSessionResponse | null>(null);
  const [questionStartedAtMs, setQuestionStartedAtMs] = useState<number | null>(null);
  const [isStartingQuest, setIsStartingQuest] = useState(false);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isRequestingHint, setIsRequestingHint] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isCompletingQuest, setIsCompletingQuest] = useState(false);
  const [isResultRevealPending, setIsResultRevealPending] = useState(false);
  const [isAdvancingQuestion, setIsAdvancingQuestion] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [isPrototypeMode, setIsPrototypeMode] = useState(true);
  const [prototypeQuestion, setPrototypeQuestion] = useState<PrototypeQuestion | null>(null);
  const [prototypeCorrectCount, setPrototypeCorrectCount] = useState(0);
  const [prototypeHintsTotal, setPrototypeHintsTotal] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingMode, setOnboardingMode] = useState<UiMode>("kids");
  const [retryChallenge, setRetryChallenge] = useState<RetryChallenge | null>(null);
  const [dyslexiaMode, setDyslexiaMode] = useState(false);
  const [largeTextMode, setLargeTextMode] = useState(false);
  const [reduceMotionMode, setReduceMotionMode] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);

  /* ── Derived state ── */

  const selectedChild = useMemo(
    () => children.find((c) => c.childId === selectedChildId) ?? null,
    [children, selectedChildId]
  );

  const weakestTopic = useMemo(() => {
    if (!dashboard?.topicMastery.length) return null;
    return [...dashboard.topicMastery].sort((a, b) => a.masteryScore - b.masteryScore)[0] ?? null;
  }, [dashboard]);

  const missionTopicLookup = useMemo(() => {
    const topics = dashboard?.topicMastery ?? [];
    return MATH_MISSIONS.reduce<Record<MathMission["key"], DashboardResponse["topicMastery"][number] | null>>(
      (acc, m) => { acc[m.key] = matchTopicForMission(topics, m); return acc; },
      { fractions: null, "place-value": null, "add-subtract": null, "multiply-divide": null, "word-problems": null }
    );
  }, [dashboard]);

  const selectedMission = useMemo(
    () => MATH_MISSIONS.find((m) => m.key === selectedMissionKey) ?? MATH_MISSIONS[0],
    [selectedMissionKey]
  );

  const questCoins = useMemo(() => {
    const attempts = dashboard?.overview.attempts ?? 0;
    const streak = dashboard?.overview.streakDays ?? 0;
    return attempts * 8 + streak * 20;
  }, [dashboard]);

  const questLevel = useMemo(() => Math.max(1, Math.floor(questCoins / 120) + 1), [questCoins]);

  const questProgressPercent = useMemo(
    () => Math.round((Math.min(answeredCount, QUEST_TARGET_QUESTIONS) / QUEST_TARGET_QUESTIONS) * 100),
    [answeredCount]
  );

  const nextHintLevel = revealedHints.length + 1;
  const canRequestHint = Boolean(activeQuestion) && nextHintLevel <= (activeQuestion?.hintCount ?? 0) && !latestAttempt && !isResultRevealPending;
  const canSubmitAnswer = Boolean(activeQuestion) && selectedAnswer.trim().length > 0 && !latestAttempt && !isResultRevealPending;
  const isQuestBusy =
    isStartingQuest || isGeneratingQuestion || isRequestingHint || isSubmittingAnswer || isCompletingQuest || isResultRevealPending || isAdvancingQuestion;

  const mascotMood = latestAttempt?.isCorrect
    ? "celebrating"
    : latestAttempt && !latestAttempt.isCorrect
      ? "thinking"
      : activeQuestion
        ? "happy"
        : "idle";

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
      startDate: first.date,
      endDate: last.date,
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

  const tonightActionPlan = useMemo(() => {
    if (!dashboard) return [];
    const focusName = weakestTopic?.topicTitle ?? selectedMission.title;
    return [
      `Warm-up (2 min): review one solved example in ${focusName}.`,
      focusedRecommendation ? `Practice (6 min): ${focusedRecommendation.text}` : `Practice (6 min): solve 5 questions in ${selectedMission.title}.`,
      "Reflect (2 min): child explains one correct answer out loud.",
    ];
  }, [dashboard, weakestTopic, focusedRecommendation, selectedMission.title]);

  const hintEconomy = useMemo(() => {
    const total = activeQuestion?.hintCount ?? 3;
    const used = revealedHints.length;
    const remaining = Math.max(0, total - used);
    const masteryPenalty = used * 6;
    return {
      total,
      used,
      remaining,
      masteryPenalty,
      level: used === 0 ? "Low" : used === 1 ? "Medium" : "High",
    };
  }, [activeQuestion, revealedHints.length]);

  const sessionMap = useMemo(() => {
    return Array.from({ length: QUEST_TARGET_QUESTIONS }, (_, index) => {
      if (index < answeredCount) return "complete";
      if (index === answeredCount && activeSessionId) return "current";
      return "upcoming";
    });
  }, [activeSessionId, answeredCount]);

  const aiCoachNote = useMemo(() => {
    if (latestAttempt) {
      return latestAttempt.isCorrect
        ? `Strong work. Next challenge will move toward ${difficultyLabel(latestAttempt.nextRecommendedDifficulty)} difficulty.`
        : `Let's recover this concept before moving on. Focus on: ${latestAttempt.explanation}`;
    }

    if (activeQuestion) {
      return `Why this question: it trains ${activeQuestion.topic.title} for ${selectedMission.title.toLowerCase()} mastery.`;
    }

    return `Coach tip: choose one mission and complete ${QUEST_TARGET_QUESTIONS} questions for consistent growth.`;
  }, [activeQuestion, latestAttempt, selectedMission.title]);

  const parentInsight = useMemo(() => {
    if (!dashboard) return null;

    const winText =
      weeklyInsight && weeklyInsight.accuracyDelta >= 0
        ? `Accuracy improved by ${formatSignedValue(weeklyInsight.accuracyDelta, "%")} over the last week.`
        : `Consistency is building with ${dashboard.overview.attempts} attempts logged this cycle.`;

    const riskText = weakestTopic
      ? `${weakestTopic.topicTitle} is the main risk area (mastery ${weakestTopic.masteryScore}, hints ${weakestTopic.hintDependencyPercent}%).`
      : "No risk topic identified yet. Load more activity to surface one.";

    const tonightText = tonightActionPlan.length > 0
      ? tonightActionPlan[1] ?? tonightActionPlan[0]
      : "Run a short 10-minute focused practice session tonight.";

    return {
      winTitle: "Win",
      winText,
      riskTitle: "Risk",
      riskText,
      tonightTitle: "Tonight Plan",
      tonightText,
    };
  }, [dashboard, weeklyInsight, weakestTopic, tonightActionPlan]);

  useEffect(() => {
    try {
      const completed = window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "done";
      if (!completed) {
        setShowOnboarding(true);
        setOnboardingStep(0);
        setOnboardingMode("kids");
      }
    } catch {
      setShowOnboarding(true);
      setOnboardingStep(0);
      setOnboardingMode("kids");
    }
  }, []);

  useEffect(() => {
    if (pathname === "/kid" && mode !== "kids") {
      setMode("kids");
    }
  }, [pathname, mode]);

  function handleKidModeClick(): void {
    setMode("kids");
    if (pathname !== "/kid") {
      router.push("/kid");
    }
  }

  function handleParentModeClick(): void {
    setMode("parent");
    if (pathname === "/kid") {
      router.push("/");
    }
  }

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(A11Y_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as {
        dyslexiaMode?: boolean;
        largeTextMode?: boolean;
        reduceMotionMode?: boolean;
        highContrastMode?: boolean;
      };
      setDyslexiaMode(Boolean(parsed.dyslexiaMode));
      setLargeTextMode(Boolean(parsed.largeTextMode));
      setReduceMotionMode(Boolean(parsed.reduceMotionMode));
      setHighContrastMode(Boolean(parsed.highContrastMode));
    } catch {
      // Ignore invalid persisted preferences.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        A11Y_STORAGE_KEY,
        JSON.stringify({ dyslexiaMode, largeTextMode, reduceMotionMode, highContrastMode })
      );
    } catch {
      // Ignore storage errors.
    }

    const root = document.documentElement;
    root.classList.toggle("a11y-dyslexia", dyslexiaMode);
    root.classList.toggle("a11y-large-text", largeTextMode);
    root.classList.toggle("a11y-reduced-motion", reduceMotionMode);
    root.classList.toggle("a11y-high-contrast", highContrastMode);
  }, [dyslexiaMode, largeTextMode, reduceMotionMode, highContrastMode]);

  function closeOnboarding(markAsDone: boolean): void {
    if (markAsDone) {
      try {
        window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "done");
      } catch {
        // Ignore storage errors and continue.
      }
    }

    setMode(onboardingMode);
    setShowOnboarding(false);
    setOnboardingStep(0);
    setQuestMessage(`Tour finished. ${onboardingMode === "kids" ? "Start a mission when ready." : "Open parent analytics when ready."}`);
  }

  function openOnboarding(): void {
    setOnboardingMode(mode);
    setOnboardingStep(0);
    setShowOnboarding(true);
  }

  function goToNextOnboardingStep(): void {
    if (onboardingStep >= ONBOARDING_TOTAL_STEPS - 1) {
      closeOnboarding(true);
      return;
    }
    setOnboardingStep((current) => current + 1);
  }

  function resetQuestState(): void {
    setActiveSessionId(null);
    setActiveQuestion(null);
    setSelectedAnswer("");
    setRevealedHints([]);
    setAnsweredCount(0);
    setLatestAttempt(null);
    setSessionSummary(null);
    setQuestionStartedAtMs(null);
    setPrototypeQuestion(null);
    setPrototypeCorrectCount(0);
    setPrototypeHintsTotal(0);
    setRetryChallenge(null);
    setIsResultRevealPending(false);
    setIsAdvancingQuestion(false);
  }

  async function waitMs(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  async function revealAttemptWithPacing(attempt: SubmitAttemptResponse): Promise<void> {
    setIsResultRevealPending(true);
    await waitMs(520);
    setLatestAttempt(attempt);
    setIsResultRevealPending(false);
  }

  function buildRetryChallenge(topicTitle: string): RetryChallenge {
    return {
      questionText: `Quick fix: what helps most when solving ${topicTitle}?`,
      options: [
        "Break it into steps and check each step.",
        "Guess quickly and move on.",
        "Skip hints even when stuck.",
      ],
      correctOption: "Break it into steps and check each step.",
      selectedOption: "",
      status: "pending",
    };
  }

  function handleRetryOptionSelect(option: string): void {
    setRetryChallenge((current) => {
      if (!current || current.status !== "pending") return current;
      return { ...current, selectedOption: option };
    });
  }

  function handleRetrySubmit(): void {
    setRetryChallenge((current) => {
      if (!current || current.status !== "pending" || current.selectedOption.length === 0) {
        return current;
      }

      const passed = current.selectedOption === current.correctOption;
      setQuestMessage(
        passed
          ? "Great recovery. You're ready for the next question."
          : "Good effort. Read the coach tip and move to the next question."
      );
      return { ...current, status: passed ? "passed" : "failed" };
    });
  }

  function togglePrototypeMode(): void {
    if (isPrototypeMode) {
      setIsPrototypeMode(false);
      setParentUserId(DEFAULT_PARENT_ID);
      setChildren([]);
      setSelectedChildId("");
      setDashboard(null);
      setDrilldown(null);
      setQuestMessage("Prototype mode disabled. Connect to live backend data.");
      setError(null);
      resetQuestState();
      return;
    }

    const demoDashboard = buildPrototypeDashboard(PROTOTYPE_CHILD.childId, PROTOTYPE_CHILD.firstName, PROTOTYPE_CHILD.gradeLevel);
    setIsPrototypeMode(true);
    setParentUserId(PROTOTYPE_PARENT_ID);
    setChildren([PROTOTYPE_CHILD]);
    setSelectedChildId(PROTOTYPE_CHILD.childId);
    setDashboard(demoDashboard);
    setDrilldown(null);
    setMode("kids");
    setError(null);
    setQuestMessage("Prototype mode active. Demo data loaded.");
    resetQuestState();
  }

  /* ── API handlers (unchanged logic) ── */

  async function handleLoadChildren(): Promise<void> {
    if (isPrototypeMode) {
      setError(null);
      setChildren([PROTOTYPE_CHILD]);
      setSelectedChildId(PROTOTYPE_CHILD.childId);
      return;
    }

    setError(null); setIsLoadingChildren(true); setDashboard(null); setDrilldown(null);
    try {
      const res = await apiGet<ChildListResponse>("/api/v1/parent/children", parentUserId.trim());
      setChildren(res.children);
      setSelectedChildId(res.children[0]?.childId ?? "");
    } catch (e) {
      setChildren([]); setSelectedChildId("");
      setError(e instanceof Error ? e.message : "Failed to load children");
    } finally { setIsLoadingChildren(false); }
  }

  async function handleLoadDashboard(): Promise<void> {
    if (!selectedChildId) { setError("Select a child first"); return; }

    if (isPrototypeMode) {
      const demoChild = children.find((child) => child.childId === selectedChildId) ?? PROTOTYPE_CHILD;
      setError(null);
      setDashboard(buildPrototypeDashboard(demoChild.childId, demoChild.firstName, demoChild.gradeLevel));
      return;
    }

    setError(null); setIsLoadingDashboard(true); setDrilldown(null);
    try {
      const res = await apiGet<DashboardResponse>(`/api/v1/parent/children/${selectedChildId}/dashboard?days=7`, parentUserId.trim());
      setDashboard(res);
    } catch (e) {
      setDashboard(null);
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally { setIsLoadingDashboard(false); }
  }

  async function handleLoadTopic(topicCode: string): Promise<void> {
    if (!selectedChildId) return;

    if (isPrototypeMode) {
      setError(null);
      setIsLoadingDrilldown(true);
      const demoDrilldown = buildPrototypeDrilldown(topicCode);
      setDrilldown(demoDrilldown);
      setIsLoadingDrilldown(false);
      if (!demoDrilldown) {
        setError("Prototype topic data not found");
      }
      return;
    }

    setError(null); setIsLoadingDrilldown(true);
    try {
      const res = await apiGet<TopicDrilldownResponse>(`/api/v1/parent/children/${selectedChildId}/topics/${encodeURIComponent(topicCode)}?days=30`, parentUserId.trim());
      setDrilldown(res);
    } catch (e) {
      setDrilldown(null);
      setError(e instanceof Error ? e.message : "Failed to load topic drilldown");
    } finally { setIsLoadingDrilldown(false); }
  }

  async function generateQuestionForSession(sessionId: string, targetDifficulty: GenerateQuestionResponse["difficulty"]): Promise<void> {
    if (isPrototypeMode) {
      try {
        const apiQuestion = await apiPost<PrototypeQuestionApiResponse>(
          "/api/v1/prototype/question",
          parentUserId.trim(),
          {
            missionKey: selectedMission.key,
            targetDifficulty,
            maxHints: 3,
            seed: answeredCount + 1
          }
        );

        const picked: PrototypeQuestion = {
          id: apiQuestion.questionId,
          missionKey: selectedMission.key,
          topicCode: apiQuestion.topic.topicCode,
          topicTitle: apiQuestion.topic.title,
          strand: apiQuestion.topic.strand,
          subStrand: apiQuestion.topic.subStrand,
          difficulty: apiQuestion.difficulty,
          questionText: apiQuestion.questionText,
          options: apiQuestion.options ?? [],
          correctAnswer: apiQuestion.correctAnswer,
          hints: apiQuestion.hints,
          explanation: apiQuestion.explanation
        };

        const questionPayload: GenerateQuestionResponse = {
          questionId: apiQuestion.questionId,
          sessionId,
          topic: apiQuestion.topic,
          difficulty: apiQuestion.difficulty,
          questionText: apiQuestion.questionText,
          answerFormat: apiQuestion.answerFormat,
          options: apiQuestion.options,
          hintCount: apiQuestion.hintCount,
          createdAt: apiQuestion.createdAt
        };

        setPrototypeQuestion(picked);
        setActiveQuestion(questionPayload);
      } catch {
        const bank = PROTOTYPE_QUESTION_BANK[selectedMission.key];
        const index = answeredCount % bank.length;
        const picked = bank[index];
        const questionPayload: GenerateQuestionResponse = {
          questionId: `${picked.id}-${Date.now()}`,
          sessionId,
          topic: {
            id: `prototype-topic-${selectedMission.key}`,
            topicCode: picked.topicCode,
            title: picked.topicTitle,
            strand: picked.strand,
            subStrand: picked.subStrand,
          },
          difficulty: targetDifficulty,
          questionText: picked.questionText,
          answerFormat: "multiple_choice",
          options: picked.options,
          hintCount: picked.hints.length,
          createdAt: new Date().toISOString(),
        };
        setPrototypeQuestion(picked);
        setActiveQuestion(questionPayload);
      }

      setSelectedAnswer("");
      setRevealedHints([]);
      setLatestAttempt(null);
      setRetryChallenge(null);
      setQuestionStartedAtMs(Date.now());
      setQuestMessage(`Question ${Math.min(answeredCount + 1, QUEST_TARGET_QUESTIONS)} ready`);
      return;
    }

    if (!selectedChildId) return;

    setError(null); setIsGeneratingQuestion(true);
    try {
      const q = await apiPost<GenerateQuestionResponse>(`/api/v1/sessions/${sessionId}/questions:generate`, parentUserId.trim(), { childId: selectedChildId, targetDifficulty, maxHints: 3 });
      setActiveQuestion(q); setSelectedAnswer(""); setRevealedHints([]); setLatestAttempt(null); setRetryChallenge(null); setQuestionStartedAtMs(Date.now());
      setQuestMessage(`Question ${Math.min(answeredCount + 1, QUEST_TARGET_QUESTIONS)} ready`);
    } catch (e) {
      setActiveQuestion(null);
      setError(e instanceof Error ? e.message : "Failed to generate question");
    } finally { setIsGeneratingQuestion(false); }
  }

  async function handleCompleteQuest(sessionId: string, completed: number, lastCorrect: boolean, hintsOnLast: number): Promise<void> {
    if (!selectedChildId) return;

    if (isPrototypeMode) {
      const correctAnswers = prototypeCorrectCount + (lastCorrect ? 1 : 0);
      const avgHintsUsed = roundToTwo((prototypeHintsTotal + hintsOnLast) / Math.max(1, completed));
      const summary: CompleteSessionResponse = {
        sessionId,
        endedAt: new Date().toISOString(),
        summary: {
          totalQuestions: completed,
          correctAnswers,
          avgHintsUsed,
        },
      };
      setSessionSummary(summary);
      setActiveQuestion(null);
      setQuestionStartedAtMs(null);
      setQuestMessage("Prototype quest complete. Ready for demo replay.");
      setConfettiTrigger((prev) => !prev);
      return;
    }

    setIsCompletingQuest(true); setError(null);
    try {
      const engBase = completed * 16 + (lastCorrect ? 8 : 0);
      const engPenalty = Math.min(18, hintsOnLast * 4);
      const engScore = Math.max(20, Math.min(100, engBase - engPenalty + 20));
      const summary = await apiPost<CompleteSessionResponse>(`/api/v1/sessions/${sessionId}/complete`, parentUserId.trim(), { childId: selectedChildId, engagementScore: engScore });
      setSessionSummary(summary); setActiveQuestion(null); setQuestionStartedAtMs(null); setQuestMessage("Quest complete. Great work today.");
      setConfettiTrigger((prev) => !prev);
      await handleLoadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete quest");
    } finally { setIsCompletingQuest(false); }
  }

  async function handleStartQuest(): Promise<void> {
    if (!isPrototypeMode && !selectedChildId) { setError("Select a child first"); return; }
    setError(null); setQuestMessage(null); setIsStartingQuest(true);
    resetQuestState();
    try {
      if (isPrototypeMode) {
        if (!selectedChildId) {
          setChildren([PROTOTYPE_CHILD]);
          setSelectedChildId(PROTOTYPE_CHILD.childId);
        }
        if (!dashboard) {
          setDashboard(buildPrototypeDashboard(PROTOTYPE_CHILD.childId, PROTOTYPE_CHILD.firstName, PROTOTYPE_CHILD.gradeLevel));
        }
        const prototypeSessionId = `prototype-session-${Date.now()}`;
        setActiveSessionId(prototypeSessionId);
        const topicMeta = PROTOTYPE_TOPIC_MAP[selectedMission.key];
        const demoDrilldown = buildPrototypeDrilldown(topicMeta.topicCode);
        if (demoDrilldown) {
          setDrilldown(demoDrilldown);
        }
        await generateQuestionForSession(prototypeSessionId, "adaptive");
        setQuestMessage(`Prototype quest started: ${selectedMission.title}`);
        return;
      }

      if (!dashboard) await handleLoadDashboard();
      const topic = missionTopicLookup[selectedMission.key];
      const session = await apiPost<StartSessionResponse>("/api/v1/sessions", parentUserId.trim(), {
        childId: selectedChildId, mode: "practice", focusTopicCode: topic?.topicCode, aiModel: "gpt-5-mini", promptVersion: "math-v1.0",
      });
      setActiveSessionId(session.sessionId);
      if (topic) await handleLoadTopic(topic.topicCode);
      await generateQuestionForSession(session.sessionId, "adaptive");
      setQuestMessage(`Quest started: ${selectedMission.title} | ${QUEST_TARGET_QUESTIONS} questions`);
    } catch (e) {
      setActiveSessionId(null);
      setError(e instanceof Error ? e.message : "Failed to start quest");
    } finally { setIsStartingQuest(false); }
  }

  async function handleRequestHint(): Promise<void> {
    if (!activeQuestion || !selectedChildId) return;
    const hintLevel = revealedHints.length + 1;
    if (hintLevel > activeQuestion.hintCount) return;

    if (isPrototypeMode) {
      if (!prototypeQuestion) return;
      const hintText = prototypeQuestion.hints[hintLevel - 1];
      if (!hintText) return;
      setRevealedHints((cur) => [...cur, hintText]);
      return;
    }

    setError(null); setIsRequestingHint(true);
    try {
      const result = await apiPost<HintResponse>(`/api/v1/questions/${activeQuestion.questionId}/hints`, parentUserId.trim(), { childId: selectedChildId, hintLevel });
      setRevealedHints((cur) => [...cur, result.hintText]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load hint");
    } finally { setIsRequestingHint(false); }
  }

  async function handleSubmitQuestAnswer(): Promise<void> {
    if (!activeQuestion || !selectedChildId || !selectedAnswer.trim()) return;

    if (isPrototypeMode) {
      if (!prototypeQuestion) {
        setError("Prototype question not ready");
        return;
      }

      const isCorrect = selectedAnswer.trim().toLowerCase() === prototypeQuestion.correctAnswer.trim().toLowerCase();
      const questionHintsUsed = revealedHints.length;
      const nextAnsweredCount = Math.min(QUEST_TARGET_QUESTIONS, answeredCount + 1);
      const nextCorrectCount = prototypeCorrectCount + (isCorrect ? 1 : 0);
      const nextHintsTotal = prototypeHintsTotal + questionHintsUsed;
      const accuracyPercent = roundToTwo((nextCorrectCount / Math.max(1, nextAnsweredCount)) * 100);
      const avgHintsUsed = roundToTwo(nextHintsTotal / Math.max(1, nextAnsweredCount));
      const hintDependencyPercent = roundToTwo((avgHintsUsed / 3) * 100);
      const masteryScore = roundToTwo(Math.max(0, Math.min(100, accuracyPercent - hintDependencyPercent * 0.35)));
      const proficiency = scoreToProficiency(masteryScore);
      const nextDifficulty: SubmitAttemptResponse["nextRecommendedDifficulty"] =
        isCorrect && questionHintsUsed === 0 ? "hard" : isCorrect ? "medium" : "easy";

      const prototypeAttempt: SubmitAttemptResponse = {
        attemptId: `prototype-attempt-${Date.now()}`,
        isCorrect,
        feedbackText: isCorrect ? "Great job. That answer is correct." : "Good try. Let's use the explanation and go again.",
        explanation: prototypeQuestion.explanation,
        masteryUpdate: {
          topicId: `prototype-topic-${prototypeQuestion.missionKey}`,
          topicCode: prototypeQuestion.topicCode,
          accuracyPercent,
          hintDependencyPercent,
          masteryScore,
          proficiency,
        },
        sessionProgress: {
          totalQuestions: nextAnsweredCount,
          correctAnswers: nextCorrectCount,
          avgHintsUsed,
        },
        nextRecommendedDifficulty: nextDifficulty,
      };

      await revealAttemptWithPacing(prototypeAttempt);
      setAnsweredCount(nextAnsweredCount);
      setPrototypeCorrectCount(nextCorrectCount);
      setPrototypeHintsTotal(nextHintsTotal);
      if (prototypeAttempt.isCorrect) {
        setConfettiTrigger((prev) => !prev);
        setRetryChallenge(null);
      } else if (activeQuestion) {
        setRetryChallenge(buildRetryChallenge(activeQuestion.topic.title));
      }

      setDashboard((current) => {
        if (!current) return current;
        const updatedTopicMastery = current.topicMastery.map((topic) => {
          if (topic.topicCode !== prototypeQuestion.topicCode) return topic;
          return {
            ...topic,
            masteryScore,
            proficiency,
            accuracyPercent,
            hintDependencyPercent,
          };
        });

        const newestTrend = {
          date: "2026-02-20",
          attempts: nextAnsweredCount,
          accuracyPercent,
          avgHintsUsed,
        };

        const recomputedAccuracy = roundToTwo(
          updatedTopicMastery.reduce((sum, topic) => sum + topic.accuracyPercent, 0) / Math.max(1, updatedTopicMastery.length)
        );
        const recomputedHints = roundToTwo(
          updatedTopicMastery.reduce((sum, topic) => sum + topic.hintDependencyPercent / 100 * 3, 0) /
            Math.max(1, updatedTopicMastery.length)
        );

        return {
          ...current,
          overview: {
            attempts: current.overview.attempts + 1,
            accuracyPercent: recomputedAccuracy,
            avgHintsUsed: recomputedHints,
            streakDays: current.overview.streakDays,
          },
          dailyTrend: [...current.dailyTrend.slice(1), newestTrend],
          topicMastery: updatedTopicMastery,
        };
      });

      setDrilldown((current) => {
        if (!current || current.topicCode !== prototypeQuestion.topicCode) return current;
        return {
          ...current,
          attemptHistory: [
            ...current.attemptHistory,
            {
              date: "2026-02-20",
              attempts: 1,
              correctAttempts: isCorrect ? 1 : 0,
              avgHintsUsed: questionHintsUsed,
            },
          ].slice(-6),
          latestMastery: {
            masteryScore,
            proficiency,
          },
        };
      });

      if (activeSessionId && nextAnsweredCount >= QUEST_TARGET_QUESTIONS) {
        await waitMs(260);
        await handleCompleteQuest(activeSessionId, nextAnsweredCount, isCorrect, questionHintsUsed);
      } else {
        const remaining = QUEST_TARGET_QUESTIONS - nextAnsweredCount;
        setQuestMessage(`Prototype run: ${remaining} question${remaining === 1 ? "" : "s"} left.`);
      }
      return;
    }

    const responseTimeSec = questionStartedAtMs ? Math.max(1, Math.round((Date.now() - questionStartedAtMs) / 1000)) : undefined;
    setError(null); setIsSubmittingAnswer(true);
    try {
      const attempt = await apiPost<SubmitAttemptResponse>(`/api/v1/questions/${activeQuestion.questionId}/attempts`, parentUserId.trim(), {
        childId: selectedChildId, submittedAnswer: { value: selectedAnswer }, hintsUsed: revealedHints.length, responseTimeSeconds: responseTimeSec,
      });
      await revealAttemptWithPacing(attempt);
      if (attempt.isCorrect) setConfettiTrigger((prev) => !prev);
      if (attempt.isCorrect) {
        setRetryChallenge(null);
      } else {
        setRetryChallenge(buildRetryChallenge(activeQuestion.topic.title));
      }
      const nextCount = Math.min(QUEST_TARGET_QUESTIONS, answeredCount + 1);
      setAnsweredCount(nextCount);
      await handleLoadTopic(attempt.masteryUpdate.topicCode);
      if (activeSessionId && nextCount >= QUEST_TARGET_QUESTIONS) {
        await waitMs(260);
        await handleCompleteQuest(activeSessionId, nextCount, attempt.isCorrect, revealedHints.length);
      } else {
        const rem = QUEST_TARGET_QUESTIONS - nextCount;
        setQuestMessage(`Nice! ${rem} question${rem === 1 ? "" : "s"} left 🚀`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit answer");
    } finally { setIsSubmittingAnswer(false); }
  }

  async function handleNextQuestQuestion(): Promise<void> {
    if (!activeSessionId || !latestAttempt || answeredCount >= QUEST_TARGET_QUESTIONS) return;
    setIsAdvancingQuestion(true);
    setQuestMessage("Loading next challenge...");
    try {
      await waitMs(220);
      await generateQuestionForSession(activeSessionId, latestAttempt.nextRecommendedDifficulty);
    } finally {
      setIsAdvancingQuestion(false);
    }
  }

  /* ════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════ */

  return (
    <MotionConfig reducedMotion={reduceMotionMode ? "always" : "never"}>
      <main className="app-shell">
      <div className="ambient-orb ambient-orb-a" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-b" aria-hidden="true" />
      <div className="ambient-grid-glow" aria-hidden="true" />
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            className="onboarding-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              className="glass onboarding-card"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.28 }}
            >
              <div className="onboarding-head">
                <span className="hero-badge">Quick Tour</span>
                <button className="onboarding-close" type="button" onClick={() => closeOnboarding(true)} aria-label="Close onboarding">
                  ✕
                </button>
              </div>

              <h2 className="onboarding-title">
                {onboardingStep === 0 && "Choose your pilot mode"}
                {onboardingStep === 1 && "Pick your first mission"}
                {onboardingStep === 2 && "Learn how hints and support work"}
              </h2>
              <p className="onboarding-subtitle">
                {onboardingStep === 0 && "Switch between child training flow and parent insights in one tap."}
                {onboardingStep === 1 && "Start with the topic that feels hardest right now. You can change anytime."}
                {onboardingStep === 2 && (onboardingMode === "kids"
                  ? "Hints unlock gradually: level 1 nudges, level 2 guides, level 3 almost solves."
                  : "Parent view shows growth trends, weak-topic spotlight, and a short plan for tonight.")}
              </p>

              {onboardingStep === 0 && (
                <div className="onboarding-mode-grid">
                  <button
                    type="button"
                    className={onboardingMode === "kids" ? "onboarding-mode-card onboarding-mode-card-active" : "onboarding-mode-card"}
                    onClick={() => setOnboardingMode("kids")}
                  >
                    <strong>🎮 Kid Mode</strong>
                    <span>Quest flow, hints, and rewards.</span>
                  </button>
                  <button
                    type="button"
                    className={onboardingMode === "parent" ? "onboarding-mode-card onboarding-mode-card-active" : "onboarding-mode-card"}
                    onClick={() => setOnboardingMode("parent")}
                  >
                    <strong>📊 Parent Mode</strong>
                    <span>Progress trends and focus plan.</span>
                  </button>
                </div>
              )}

              {onboardingStep === 1 && (
                <div className="onboarding-mission-grid">
                  {MATH_MISSIONS.map((mission) => (
                    <button
                      type="button"
                      key={mission.key}
                      className={selectedMissionKey === mission.key ? "onboarding-mission onboarding-mission-active" : "onboarding-mission"}
                      onClick={() => setSelectedMissionKey(mission.key)}
                    >
                      <span>{mission.emoji}</span>
                      <strong>{mission.title}</strong>
                    </button>
                  ))}
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="onboarding-hint-panel">
                  <p><strong>💡 Hint 1:</strong> gentle clue, no spoilers.</p>
                  <p><strong>🔍 Hint 2:</strong> points to method and pattern.</p>
                  <p><strong>🎯 Hint 3:</strong> almost-complete path to answer.</p>
                </div>
              )}

              <div className="onboarding-progress" aria-hidden="true">
                {Array.from({ length: ONBOARDING_TOTAL_STEPS }).map((_, index) => (
                  <span key={index} className={index <= onboardingStep ? "onboarding-dot onboarding-dot-active" : "onboarding-dot"} />
                ))}
              </div>

              <div className="onboarding-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => closeOnboarding(true)}>
                  Skip tour
                </button>
                <div className="onboarding-actions-right">
                  {onboardingStep > 0 && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOnboardingStep((current) => current - 1)}>
                      Back
                    </button>
                  )}
                  <button type="button" className="btn btn-quest btn-sm" onClick={goToNextOnboardingStep}>
                    {onboardingStep === ONBOARDING_TOTAL_STEPS - 1 ? "Enter Arena" : "Next"}
                  </button>
                </div>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfettiBlast trigger={confettiTrigger} />

      {/* ── Hero ── */}
      <motion.section
        className="glass hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <span className="hero-badge">🤖 AI Learning Playground</span>
          <h1>Enter the Math Arena and level up fast.</h1>
          <p className="hero-text">
            Blast through adaptive quests, unlock streak powerups, and train with a smart AI coach built for Grade 4 mastery.
          </p>
          <div className="hero-cta">
            <motion.button
              className="btn btn-quest"
              onClick={() => {
                const el = document.getElementById("missions");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              type="button"
            >
              🚀 Start Today&apos;s Quest
            </motion.button>
            <button
              className="btn btn-ghost"
              onClick={() => setMode("parent")}
              type="button"
            >
              👨‍👩‍👦 Parent View
            </button>
          </div>
        </div>

        <div className="hero-mascot animate-float">
          <Image src="/milo.png" alt="Milo the AI mascot" width={200} height={200} priority />
        </div>
      </motion.section>

      {/* ── Controls Panel ── */}
      <motion.section
        className="glass controls"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
      >
        <div className="mode-switch" role="tablist" aria-label="Mode switch">
          <button
            className={mode === "kids" ? "mode-btn mode-btn-active" : "mode-btn"}
            onClick={handleKidModeClick}
            type="button"
          >
            🎮 Kid Mode
          </button>
          <button
            className={mode === "parent" ? "mode-btn mode-btn-active" : "mode-btn"}
            onClick={handleParentModeClick}
            type="button"
          >
            📊 Parent Mode
          </button>
        </div>

        <div className="control-field">
          <span className="control-label">Parent User ID</span>
          <input
            value={parentUserId}
            onChange={(e) => setParentUserId(e.target.value)}
            placeholder="UUID"
            className="control-input"
            readOnly={isPrototypeMode}
          />
        </div>

        <button onClick={handleLoadChildren} disabled={isLoadingChildren} className="btn btn-primary btn-sm" type="button">
          {isLoadingChildren ? "Loading..." : "Load Children"}
        </button>
        <button onClick={handleLoadDashboard} disabled={isLoadingDashboard || !selectedChildId} className="btn btn-secondary btn-sm" type="button">
          {isLoadingDashboard ? "Loading..." : "Load Dashboard"}
        </button>
        <button onClick={togglePrototypeMode} className="btn btn-hint btn-sm" type="button">
          {isPrototypeMode ? "Exit Prototype" : "Instant Prototype"}
        </button>
        <button onClick={openOnboarding} className="btn btn-ghost btn-sm" type="button">
          Replay Tour
        </button>
        <div className="a11y-row" role="group" aria-label="Accessibility controls">
          <button
            type="button"
            className={dyslexiaMode ? "a11y-chip a11y-chip-active" : "a11y-chip"}
            onClick={() => setDyslexiaMode((current) => !current)}
          >
            Dyslexia Font
          </button>
          <button
            type="button"
            className={largeTextMode ? "a11y-chip a11y-chip-active" : "a11y-chip"}
            onClick={() => setLargeTextMode((current) => !current)}
          >
            Large Text
          </button>
          <button
            type="button"
            className={reduceMotionMode ? "a11y-chip a11y-chip-active" : "a11y-chip"}
            onClick={() => setReduceMotionMode((current) => !current)}
          >
            Reduced Motion
          </button>
          <button
            type="button"
            className={highContrastMode ? "a11y-chip a11y-chip-active" : "a11y-chip"}
            onClick={() => setHighContrastMode((current) => !current)}
          >
            High Contrast
          </button>
        </div>

        {isPrototypeMode && (
          <p className="prototype-note">
            Prototype mode is ON. This demo runs with local sample data.
          </p>
        )}

        {error && <p className="error-toast" aria-live="polite">{error}</p>}
      </motion.section>

      {/* ── Main Grid ── */}
      <div className="main-grid">
        {/* ── Sidebar: Children ── */}
        <motion.aside
          className="glass sidebar"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
        >
          <h2 className="sidebar-title">🧒 Learners</h2>
          <p className="sidebar-subtitle">Select a child to begin.</p>
          <div className="child-list">
            {children.length === 0 ? (
              <p className="empty-text" style={{ textAlign: "left", padding: "8px 0" }}>Press &quot;Load Children&quot; to start.</p>
            ) : (
              children.map((child, index) => (
                <motion.button
                  key={child.childId}
                  onClick={() => setSelectedChildId(child.childId)}
                  type="button"
                  className={selectedChildId === child.childId ? "child-card child-card-active" : "child-card"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="child-name">{child.firstName}</span>
                  <span className="child-grade">Grade {child.gradeLevel}</span>
                </motion.button>
              ))
            )}
          </div>
        </motion.aside>

        {/* ── Content ── */}
        <div className="content-stack">

          {/* ════ KID MODE ════ */}
          <AnimatePresence mode="wait">
            {mode === "kids" && (
              <motion.section
                key="kid-mode"
                className="glass section-card section-card-glow kid-mode-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h2 className="section-title">🎮 Math Quest</h2>
                    <p className="section-subtitle">
                      {dashboard
                        ? `${dashboard.child.name} is ready to level up!`
                        : selectedChild
                          ? `${selectedChild.firstName} selected — load dashboard to unlock missions.`
                          : "Select a child and load dashboard."}
                    </p>
                  </div>
                  <MascotBuddy mood={mascotMood} size={80} />
                </div>

                <div className="kid-laptop-shell">
                  <div className="kid-left-col">
                    {/* Reward strip */}
                    <div className="reward-strip">
                      <div className="reward-card">
                        <span className="reward-label">🔥 Streak</span>
                        <span className="reward-value">{dashboard?.overview.streakDays ?? 0} days</span>
                      </div>
                      <div className="reward-card">
                        <span className="reward-label">🪙 Coins</span>
                        <span className="reward-value">{questCoins}</span>
                      </div>
                      <div className="reward-card">
                        <span className="reward-label">📈 Level</span>
                        <span className="reward-value">L{questLevel}</span>
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="metric-strip">
                      <div className="metric-card">
                        <span>Attempts</span>
                        <strong>{dashboard?.overview.attempts ?? 0}</strong>
                      </div>
                      <div className="metric-card">
                        <span>Accuracy</span>
                        <strong>{dashboard?.overview.accuracyPercent ?? 0}%</strong>
                      </div>
                      <div className="metric-card">
                        <span>Avg Hints</span>
                        <strong>{dashboard?.overview.avgHintsUsed ?? 0}</strong>
                      </div>
                      <div className="metric-card">
                        <span>Streak</span>
                        <strong>{dashboard?.overview.streakDays ?? 0}d</strong>
                      </div>
                    </div>

                    {weakestTopic && (
                      <p className="focus-note">
                        🎯 Focus on <strong>{weakestTopic.topicTitle}</strong> to boost mastery this week!
                      </p>
                    )}

                    {/* Quest launcher */}
                    <div className="quest-launcher">
                      <div>
                        <p className="quest-label">Selected mission</p>
                        <h3 className="quest-title">{selectedMission.emoji} {selectedMission.title}</h3>
                        <p className="quest-subtitle">{selectedMission.subtitle}</p>
                        <p className="quest-goal-text">Goal: {selectedMission.dailyGoal}</p>
                      </div>
                      <motion.button
                        onClick={handleStartQuest}
                        disabled={(!isPrototypeMode && (!selectedChildId || isLoadingDashboard || isLoadingDrilldown)) || isQuestBusy}
                        className="btn btn-quest"
                        type="button"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                      >
                        {isStartingQuest ? "Starting..." : "🚀 Start Quest"}
                      </motion.button>
                    </div>

                    {questMessage && <p className="quest-msg" aria-live="polite">{questMessage}</p>}

                    {/* Mission notebook */}
                    <div className="mission-notebook" id="missions">
                      <div className="mission-notebook-head">
                        <span className="mission-notebook-title">Notebook Missions</span>
                        <span className="mission-notebook-sub">Pick one and practice now</span>
                      </div>
                      <div className="mission-notebook-list">
                        {MATH_MISSIONS.map((mission, index) => {
                          const topic = missionTopicLookup[mission.key];
                          const mastery = topic?.masteryScore;
                          const prof = topic?.proficiency;
                          const isSelected = selectedMissionKey === mission.key;
                          return (
                            <motion.button
                              key={mission.key}
                              onClick={() => {
                                setSelectedMissionKey(mission.key);
                                setQuestMessage(null);
                                if (topic) void handleLoadTopic(topic.topicCode);
                              }}
                              type="button"
                              className={isSelected ? "mission-notebook-row mission-notebook-row-active" : "mission-notebook-row"}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.24, delay: index * 0.05 }}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="mission-score-block">
                                <span className="mission-score-value">{mastery ?? "?"}</span>
                              </div>
                              <div className="mission-notebook-main">
                                <h3>{mission.emoji} {mission.title}</h3>
                                <p>{mission.subtitle}</p>
                                <p className="mission-goal">{mission.dailyGoal}</p>
                              </div>
                              <div className="mission-notebook-tail">
                                <span className={prof ? proficiencyClass(prof) : "pill pill-empty"}>
                                  {prof ? proficiencyLabel(prof) : "not started"}
                                </span>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="kid-right-col">
                    {/* ── Quest Arena ── */}
                    <div className="quest-arena">
                  <div className="arena-header">
                    <span className="arena-kicker">🎯 Question Play</span>
                    <span className="arena-counter">
                      {answeredCount}/{QUEST_TARGET_QUESTIONS} complete
                    </span>
                  </div>

                  <XPBar percent={questProgressPercent} label="Quest Progress" />
                  <div className="session-map" aria-label="Quest checkpoints">
                    {sessionMap.map((state, index) => (
                      <div
                        key={`checkpoint-${index}`}
                        className={`session-node session-node-${state}`}
                      >
                        <span>Q{index + 1}</span>
                      </div>
                    ))}
                    <div className={answeredCount >= QUEST_TARGET_QUESTIONS ? "session-goal session-goal-active" : "session-goal"}>
                      🏁
                    </div>
                  </div>

                  {sessionSummary ? (
                    <QuestComplete
                      totalQuestions={sessionSummary.summary.totalQuestions}
                      correctAnswers={sessionSummary.summary.correctAnswers}
                      avgHintsUsed={sessionSummary.summary.avgHintsUsed}
                      onPlayAgain={handleStartQuest}
                    />
                  ) : !activeSessionId ? (
                    <p className="empty-text">🎮 Start a quest to unlock the play screen!</p>
                  ) : isGeneratingQuestion && !activeQuestion ? (
                    <p className="empty-text">🤖 Milo is thinking of a great question...</p>
                  ) : activeQuestion ? (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeQuestion.questionId}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3 }}
                        style={{ display: "flex", flexDirection: "column", gap: 16 }}
                      >
                        <span className="topic-tag">
                          📚 {activeQuestion.topic.topicCode} • {difficultyLabel(activeQuestion.difficulty)}
                        </span>

                        <div className="question-workbench">
                          <aside className="question-ai-pane">
                            <MascotBuddy mood={mascotMood} size={68} />
                            <div className="coach-card">
                              <p className="coach-kicker">Coach Milo</p>
                              <p className="coach-text">{aiCoachNote}</p>
                            </div>
                            <div className="hint-economy">
                              <div className="hint-economy-head">
                                <span>Hint ladder</span>
                                <span>{hintEconomy.used}/{hintEconomy.total} used</span>
                              </div>
                              <div className="hint-economy-steps" aria-hidden="true">
                                {Array.from({ length: hintEconomy.total }).map((_, index) => {
                                  const step = index + 1;
                                  const state =
                                    step <= hintEconomy.used ? "used" : step === hintEconomy.used + 1 ? "next" : "locked";
                                  return (
                                    <span key={`hint-step-${step}`} className={`hint-step hint-step-${state}`}>
                                      H{step}
                                    </span>
                                  );
                                })}
                              </div>
                              <p className="hint-impact">
                                Impact: {hintEconomy.level} • Mastery pressure: -{hintEconomy.masteryPenalty}
                              </p>
                            </div>
                          </aside>

                          <div className="question-main-pane">
                            <h3 className="question-text">{activeQuestion.questionText}</h3>

                            {activeQuestion.options?.length ? (
                              <div className="option-grid">
                                {activeQuestion.options.map((option, i) => (
                                  <motion.button
                                    key={option}
                                    type="button"
                                    disabled={Boolean(latestAttempt) || isSubmittingAnswer || isResultRevealPending || isAdvancingQuestion}
                                    className={selectedAnswer === option ? "option-btn option-btn-selected" : "option-btn"}
                                    onClick={() => setSelectedAnswer(option)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                  >
                                    <span className="option-letter">{OPTION_LETTERS[i] ?? ""}</span>
                                    {option}
                                  </motion.button>
                                ))}
                              </div>
                            ) : (
                              <label className="answer-field">
                                <span className="control-label">Your Answer</span>
                                <input
                                  value={selectedAnswer}
                                  onChange={(e) => setSelectedAnswer(e.target.value)}
                                  disabled={Boolean(latestAttempt) || isSubmittingAnswer || isResultRevealPending || isAdvancingQuestion}
                                  className="control-input"
                                  placeholder="Type your answer..."
                                />
                              </label>
                            )}

                            <div className="action-row">
                              <motion.button
                                type="button"
                                className="btn btn-hint"
                                onClick={handleRequestHint}
                                disabled={!canRequestHint || isRequestingHint || isSubmittingAnswer || isResultRevealPending || isAdvancingQuestion}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                              >
                                {isRequestingHint ? "Loading..." : `💡 Hint ${Math.min(nextHintLevel, activeQuestion.hintCount)}`}
                              </motion.button>
                              <motion.button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleSubmitQuestAnswer}
                                disabled={!canSubmitAnswer || isSubmittingAnswer || isCompletingQuest || isResultRevealPending || isAdvancingQuestion}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                              >
                                {isSubmittingAnswer ? "Checking..." : "✅ Submit Answer"}
                              </motion.button>
                            </div>

                            {(isSubmittingAnswer || isResultRevealPending || isAdvancingQuestion) && (
                              <motion.div
                                className="result-wait-card"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <span className="result-wait-spinner" aria-hidden="true" />
                                <span>
                                  {isSubmittingAnswer
                                    ? "Checking your answer..."
                                    : isResultRevealPending
                                      ? "Preparing feedback..."
                                      : "Loading next challenge..."}
                                </span>
                              </motion.div>
                            )}

                            <HintRevealer hints={revealedHints} />
                          </div>
                        </div>

                        {latestAttempt && (
                          <FeedbackSplash
                            isCorrect={latestAttempt.isCorrect}
                            feedbackText={latestAttempt.feedbackText}
                            explanation={latestAttempt.explanation}
                            masteryScore={latestAttempt.masteryUpdate.masteryScore}
                            nextDifficulty={difficultyLabel(latestAttempt.nextRecommendedDifficulty)}
                          />
                        )}

                        {retryChallenge && (
                          <div className="retry-card">
                            <p className="retry-title">Fix My Mistake</p>
                            <p className="retry-question">{retryChallenge.questionText}</p>
                            <div className="retry-options">
                              {retryChallenge.options.map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  className={retryChallenge.selectedOption === option ? "retry-option retry-option-selected" : "retry-option"}
                                  disabled={retryChallenge.status !== "pending"}
                                  onClick={() => handleRetryOptionSelect(option)}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                            {retryChallenge.status === "pending" ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={handleRetrySubmit}
                                disabled={retryChallenge.selectedOption.length === 0}
                              >
                                Check recovery
                              </button>
                            ) : (
                              <p className={retryChallenge.status === "passed" ? "retry-status retry-status-pass" : "retry-status retry-status-fail"}>
                                {retryChallenge.status === "passed"
                                  ? "Recovered. Nice correction."
                                  : "Keep the strategy in mind on the next question."}
                              </p>
                            )}
                          </div>
                        )}

                        {latestAttempt && answeredCount < QUEST_TARGET_QUESTIONS && (!retryChallenge || retryChallenge.status !== "pending") && (
                          <motion.button
                            type="button"
                            className="btn btn-quest"
                            onClick={handleNextQuestQuestion}
                            disabled={isGeneratingQuestion || isCompletingQuest || isAdvancingQuestion || isResultRevealPending}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                          >
                            {isGeneratingQuestion || isAdvancingQuestion ? "Preparing..." : "➡️ Next Question"}
                          </motion.button>
                        )}

                        {isCompletingQuest && <p className="empty-text">🏆 Finalizing quest...</p>}
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <p className="empty-text">Quest active — generating question...</p>
                  )}
                    </div>
                  </div>
                </div>

                {!dashboard && <p className="empty-text">Load dashboard to attach live mastery data to missions.</p>}
              </motion.section>
            )}

            {/* ════ PARENT MODE ════ */}
            {mode === "parent" && (
              <motion.section
                key="parent-mode"
                className="glass section-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <div className="section-header">
                  <h2 className="section-title">📊 Parent / Lecturer Dashboard</h2>
                  <p className="section-subtitle">Weekly trend, recommendations, and curriculum-level evidence.</p>
                </div>

                {dashboard ? (
                  <>
                    <div className="parent-insight-grid">
                      <div className="insight-card insight-card-win">
                        <p className="insight-kicker">✅ {parentInsight?.winTitle ?? "Win"}</p>
                        <p className="insight-text">{parentInsight?.winText ?? "No win signal yet."}</p>
                      </div>
                      <div className="insight-card insight-card-risk">
                        <p className="insight-kicker">⚠️ {parentInsight?.riskTitle ?? "Risk"}</p>
                        <p className="insight-text">{parentInsight?.riskText ?? "No current risk signal."}</p>
                      </div>
                      <div className="insight-card insight-card-plan">
                        <p className="insight-kicker">🌙 {parentInsight?.tonightTitle ?? "Tonight Plan"}</p>
                        <p className="insight-text">{parentInsight?.tonightText ?? "No plan available yet."}</p>
                      </div>
                    </div>

                    <div className="parent-evidence-strip">
                      <span>Attempts: <strong>{dashboard.overview.attempts}</strong></span>
                      <span>Accuracy: <strong>{dashboard.overview.accuracyPercent}%</strong></span>
                      <span>Hints: <strong>{dashboard.overview.avgHintsUsed}</strong></span>
                      <span>Streak: <strong>{dashboard.overview.streakDays} days</strong></span>
                    </div>

                    {focusedRecommendation && (
                      <div className="coach-card">
                        <p className="coach-kicker">Recommendation</p>
                        <p className="coach-text">{focusedRecommendation.text}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="empty-text">Load dashboard to view parent analytics.</p>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {mode === "parent" && (
            <motion.section
              className="glass section-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="section-header">
                <h2 className="section-title">🔎 Topic Focus</h2>
                <p className="section-subtitle">Tap a mission to inspect attempt history.</p>
              </div>
              {isLoadingDrilldown && <p className="empty-text">Loading topic details...</p>}
              {drilldown ? (
                <>
                  <p className="section-subtitle">
                    {drilldown.topicTitle} ({drilldown.topicCode}) • Mastery {drilldown.latestMastery.masteryScore} ({proficiencyLabel(drilldown.latestMastery.proficiency)})
                  </p>
                  <div className="data-list">
                    {drilldown.attemptHistory.length === 0 ? (
                      <p className="empty-text">No history for this topic yet.</p>
                    ) : (
                      drilldown.attemptHistory.map((row, index) => (
                        <motion.div
                          key={row.date}
                          className="data-row"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.24, delay: index * 0.05 }}
                        >
                          <span>{row.date}</span>
                          <span>{row.attempts} attempts</span>
                          <span>{row.correctAttempts} correct</span>
                          <span>{row.avgHintsUsed} hints</span>
                        </motion.div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <p className="empty-text">No topic selected yet.</p>
              )}
            </motion.section>
          )}
        </div>
      </div>
      </main>
    </MotionConfig>
  );
}


