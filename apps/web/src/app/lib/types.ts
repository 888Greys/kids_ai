/* ── Shared Type Definitions ── */

export type UiMode = "kids" | "parent";

export type ChildListResponse = {
    children: Array<{
        childId: string;
        firstName: string;
        gradeLevel: number;
    }>;
};

export type DashboardResponse = {
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

export type TopicDrilldownResponse = {
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

export type StartSessionResponse = {
    sessionId: string;
    childId: string;
    mode: "practice" | "challenge" | "revision";
    focusTopic: { id: string; topicCode: string; title: string } | null;
    startedAt: string;
};

export type GenerateQuestionResponse = {
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

export type HintResponse = { questionId: string; hintLevel: number; hintText: string };

export type SubmitAttemptResponse = {
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

export type CompleteSessionResponse = {
    sessionId: string;
    endedAt: string;
    summary: { totalQuestions: number; correctAnswers: number; avgHintsUsed: number };
};

export type PrototypeQuestionApiResponse = {
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

export type MathMission = {
    key: "fractions" | "place-value" | "add-subtract" | "multiply-divide" | "word-problems";
    title: string;
    subtitle: string;
    dailyGoal: string;
    emoji: string;
    color: string;
    keywords: string[];
};

export type PrototypeQuestion = {
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

export type RetryChallenge = {
    questionText: string;
    options: string[];
    correctOption: string;
    selectedOption: string;
    status: "pending" | "passed" | "failed";
};
