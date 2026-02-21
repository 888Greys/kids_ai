"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import MascotBuddy from "../components/MascotBuddy";
import ConfettiBlast from "../components/ConfettiBlast";
import XPBar from "../components/XPBar";
import HintRevealer from "../components/HintRevealer";
import FeedbackSplash from "../components/FeedbackSplash";
import QuestComplete from "../components/QuestComplete";
import SpeechSynthesizer from "../components/SpeechSynthesizer";
import SpeechInput from "../components/SpeechInput";
import Image from "next/image";

import type {
  DashboardResponse,
  GenerateQuestionResponse,
  SubmitAttemptResponse,
  CompleteSessionResponse,
  PrototypeQuestionApiResponse,
  PrototypeQuestion,
  RetryChallenge,
  MathMission,
} from "../lib/types";

import { apiPost, waitMs } from "../lib/api";
import {
  QUEST_TARGET_QUESTIONS,
  MATH_MISSIONS,
  OPTION_LETTERS,
  PROTOTYPE_PARENT_ID,
  PROTOTYPE_CHILD,
  roundToTwo,
  scoreToProficiency,
  difficultyLabel,
  matchTopicForMission,
} from "../lib/constants";
import {
  PROTOTYPE_TOPIC_MAP,
  PROTOTYPE_QUESTION_BANK,
  buildPrototypeDashboard,
  buildPrototypeDrilldown,
} from "../lib/prototype-data";

/* ── Tab type ── */
type Tab = "home" | "quest" | "rewards";

const NARRATIVE_THEMES = [
  { id: "space", icon: "🚀", label: "Space Explorers" },
  { id: "jungle", icon: "🦁", label: "Jungle Safari" },
  { id: "magic", icon: "🧙‍♂️", label: "Wizard School" },
  { id: "ocean", icon: "🌊", label: "Deep Sea" },
];

/* ── Page Component ── */
export default function HomePage() {
  const [tab, setTab] = useState<Tab>("home");
  const [parentUserId] = useState(PROTOTYPE_PARENT_ID);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(
    buildPrototypeDashboard(PROTOTYPE_CHILD.childId, PROTOTYPE_CHILD.firstName, PROTOTYPE_CHILD.gradeLevel)
  );
  const [selectedMissionKey, setSelectedMissionKey] = useState<MathMission["key"]>(MATH_MISSIONS[0].key);
  const [selectedTheme, setSelectedTheme] = useState<string>(NARRATIVE_THEMES[0].id);
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
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isCompletingQuest, setIsCompletingQuest] = useState(false);
  const [isResultRevealPending, setIsResultRevealPending] = useState(false);
  const [isAdvancingQuestion, setIsAdvancingQuestion] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [prototypeQuestion, setPrototypeQuestion] = useState<PrototypeQuestion | null>(null);
  const [prototypeCorrectCount, setPrototypeCorrectCount] = useState(0);
  const [prototypeHintsTotal, setPrototypeHintsTotal] = useState(0);
  const [retryChallenge, setRetryChallenge] = useState<RetryChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── Derived ── */
  const selectedMission = useMemo(
    () => MATH_MISSIONS.find((m) => m.key === selectedMissionKey) ?? MATH_MISSIONS[0],
    [selectedMissionKey]
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
  const isQuestBusy = isStartingQuest || isGeneratingQuestion || isSubmittingAnswer || isCompletingQuest || isResultRevealPending || isAdvancingQuestion;

  const mascotMood = latestAttempt?.isCorrect
    ? "celebrating"
    : latestAttempt && !latestAttempt.isCorrect
      ? "thinking"
      : activeQuestion
        ? "happy"
        : "idle";

  const hintEconomy = useMemo(() => {
    const total = activeQuestion?.hintCount ?? 3;
    const used = revealedHints.length;
    const remaining = Math.max(0, total - used);
    return { total, used, remaining };
  }, [activeQuestion, revealedHints.length]);

  const sessionMap = useMemo(() => {
    return Array.from({ length: QUEST_TARGET_QUESTIONS }, (_, index) => {
      if (index < answeredCount) return "complete";
      if (index === answeredCount && activeSessionId) return "current";
      return "upcoming";
    });
  }, [activeSessionId, answeredCount]);

  /* ── Quest handlers ── */

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

  async function generateQuestionForSession(sessionId: string, targetDifficulty: GenerateQuestionResponse["difficulty"]): Promise<void> {
    try {
      const activeThemeLabel = NARRATIVE_THEMES.find(t => t.id === selectedTheme)?.label;
      const apiQuestion = await apiPost<PrototypeQuestionApiResponse>(
        "/api/v1/prototype/question",
        parentUserId.trim(),
        {
          missionKey: selectedMission.key,
          targetDifficulty,
          maxHints: 3,
          seed: answeredCount + 1,
          narrativeTheme: activeThemeLabel
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
        explanation: apiQuestion.explanation,
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
        createdAt: apiQuestion.createdAt,
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
  }

  async function handleCompleteQuest(sessionId: string, completed: number, lastCorrect: boolean, hintsOnLast: number): Promise<void> {
    const correctAnswers = prototypeCorrectCount + (lastCorrect ? 1 : 0);
    const avgHintsUsed = roundToTwo((prototypeHintsTotal + hintsOnLast) / Math.max(1, completed));
    const summary: CompleteSessionResponse = {
      sessionId,
      endedAt: new Date().toISOString(),
      summary: { totalQuestions: completed, correctAnswers, avgHintsUsed },
    };
    setSessionSummary(summary);
    setActiveQuestion(null);
    setQuestionStartedAtMs(null);
    setQuestMessage("Quest complete! 🎉");
    setConfettiTrigger((prev) => !prev);
  }

  async function handleStartQuest(): Promise<void> {
    setError(null);
    setQuestMessage(null);
    setIsStartingQuest(true);
    resetQuestState();
    try {
      if (!dashboard) {
        setDashboard(buildPrototypeDashboard(PROTOTYPE_CHILD.childId, PROTOTYPE_CHILD.firstName, PROTOTYPE_CHILD.gradeLevel));
      }
      const prototypeSessionId = `prototype-session-${Date.now()}`;
      setActiveSessionId(prototypeSessionId);
      const topicMeta = PROTOTYPE_TOPIC_MAP[selectedMission.key];
      const demoDrilldown = buildPrototypeDrilldown(topicMeta.topicCode);
      void demoDrilldown; // drilldown not used in kid view
      await generateQuestionForSession(prototypeSessionId, "adaptive");
      setTab("quest");
      setQuestMessage(`Quest started: ${selectedMission.title}`);
    } catch (e) {
      setActiveSessionId(null);
      setError(e instanceof Error ? e.message : "Failed to start quest");
    } finally {
      setIsStartingQuest(false);
    }
  }

  function handleRequestHint(): void {
    if (!activeQuestion || !prototypeQuestion) return;
    const hintLevel = revealedHints.length + 1;
    if (hintLevel > activeQuestion.hintCount) return;
    const hintText = prototypeQuestion.hints[hintLevel - 1];
    if (!hintText) return;
    setRevealedHints((cur) => [...cur, hintText]);
  }

  async function handleSubmitQuestAnswer(): Promise<void> {
    if (!activeQuestion || !prototypeQuestion || !selectedAnswer.trim()) return;

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
      feedbackText: isCorrect ? "Amazing! You got it right! 🌟" : "Good try! Let's learn from this. 💪",
      explanation: prototypeQuestion.explanation,
      masteryUpdate: {
        topicId: `prototype-topic-${prototypeQuestion.missionKey}`,
        topicCode: prototypeQuestion.topicCode,
        accuracyPercent,
        hintDependencyPercent,
        masteryScore,
        proficiency,
      },
      sessionProgress: { totalQuestions: nextAnsweredCount, correctAnswers: nextCorrectCount, avgHintsUsed },
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

    // Update dashboard mastery
    setDashboard((current) => {
      if (!current) return current;
      const updatedTopicMastery = current.topicMastery.map((topic) => {
        if (topic.topicCode !== prototypeQuestion.topicCode) return topic;
        return { ...topic, masteryScore, proficiency, accuracyPercent, hintDependencyPercent };
      });
      const recomputedAccuracy = roundToTwo(
        updatedTopicMastery.reduce((sum, t) => sum + t.accuracyPercent, 0) / Math.max(1, updatedTopicMastery.length)
      );
      return {
        ...current,
        overview: { ...current.overview, attempts: current.overview.attempts + 1, accuracyPercent: recomputedAccuracy },
        topicMastery: updatedTopicMastery,
      };
    });

    if (activeSessionId && nextAnsweredCount >= QUEST_TARGET_QUESTIONS) {
      await waitMs(260);
      await handleCompleteQuest(activeSessionId, nextAnsweredCount, isCorrect, questionHintsUsed);
    } else {
      const remaining = QUEST_TARGET_QUESTIONS - nextAnsweredCount;
      setQuestMessage(`${remaining} question${remaining === 1 ? "" : "s"} left! 🚀`);
    }
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

  function handleRetryOptionSelect(option: string): void {
    setRetryChallenge((current) => {
      if (!current || current.status !== "pending") return current;
      return { ...current, selectedOption: option };
    });
  }

  function handleRetrySubmit(): void {
    setRetryChallenge((current) => {
      if (!current || current.status !== "pending" || current.selectedOption.length === 0) return current;
      const passed = current.selectedOption === current.correctOption;
      setQuestMessage(passed ? "Great recovery! 💪" : "Keep that in mind next time! 🧠");
      return { ...current, status: passed ? "passed" : "failed" };
    });
  }

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */

  return (
    <MotionConfig reducedMotion="never">
      <main className="app-shell">
        <ConfettiBlast trigger={confettiTrigger} />

        {/* ── Header Strip ── */}
        <header className="app-header">
          <div className="header-brand">
            <Image src="/milo.png" alt="Milo" width={44} height={44} priority />
            <span className="header-title">BrightPath</span>
          </div>
          <div className="header-stats">
            <span className="stat-chip stat-chip-fire">🔥 {dashboard?.overview.streakDays ?? 0}</span>
            <span className="stat-chip stat-chip-coin">🪙 {questCoins}</span>
            <span className="stat-chip stat-chip-level">⭐ L{questLevel}</span>
          </div>
        </header>

        {/* ── Tab Content ── */}
        <AnimatePresence mode="wait">
          {/* ════ HOME TAB ════ */}
          {tab === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="tab-content"
            >
              {/* Welcome section */}
              <section className="welcome-card">
                <div className="welcome-left">
                  <h1 className="welcome-title">
                    Hey {PROTOTYPE_CHILD.firstName}! 👋
                  </h1>
                  <p className="welcome-sub">Ready for today&apos;s math adventure?</p>
                  {weakestTopic && (
                    <p className="focus-badge">
                      🎯 Focus: <strong>{weakestTopic.topicTitle}</strong>
                    </p>
                  )}
                </div>
                <div className="welcome-mascot">
                  <MascotBuddy mood="idle" size={120} showSpeech />
                </div>
              </section>

              {/* Theme selector */}
              <section className="themes-section" style={{ marginBottom: "2rem" }}>
                <h2 className="section-label">✨ Choose Your Theme</h2>
                <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
                  {NARRATIVE_THEMES.map((theme) => {
                    const isSelected = selectedTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => setSelectedTheme(theme.id)}
                        type="button"
                        style={{
                          flex: "0 0 auto",
                          padding: "0.5rem 1rem",
                          borderRadius: "1rem",
                          border: isSelected ? "2px solid var(--purple)" : "2px solid rgba(0,0,0,0.05)",
                          background: isSelected ? "var(--purple-soft)" : "white",
                          color: isSelected ? "var(--purple)" : "var(--text-main)",
                          fontWeight: isSelected ? 600 : 500,
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <span style={{ marginRight: "0.5rem" }}>{theme.icon}</span>
                        {theme.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Mission selector */}
              <section className="missions-section">
                <h2 className="section-label">🗺️ Choose Your Mission</h2>
                <div className="mission-grid">
                  {MATH_MISSIONS.map((mission, index) => {
                    const topic = missionTopicLookup[mission.key];
                    const mastery = topic?.masteryScore ?? 0;
                    const isSelected = selectedMissionKey === mission.key;
                    return (
                      <motion.button
                        key={mission.key}
                        onClick={() => setSelectedMissionKey(mission.key)}
                        type="button"
                        className={`mission-card ${isSelected ? "mission-card-selected" : ""}`}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.06 }}
                        whileHover={{ scale: 1.03, y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        style={{ "--mission-color": mission.color } as React.CSSProperties}
                      >
                        <span className="mission-emoji-big">{mission.emoji}</span>
                        <span className="mission-name">{mission.title}</span>
                        <span className="mission-desc">{mission.subtitle}</span>
                        <div className="mission-mastery-bar">
                          <div
                            className="mission-mastery-fill"
                            style={{ width: `${mastery}%`, background: mission.color }}
                          />
                        </div>
                        <span className="mission-mastery-text">{mastery}% mastery</span>
                      </motion.button>
                    );
                  })}
                </div>
              </section>

              {/* Start quest CTA */}
              <section className="cta-section">
                <motion.button
                  className="btn btn-quest btn-xl"
                  onClick={handleStartQuest}
                  disabled={isQuestBusy}
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  {isStartingQuest ? "Starting..." : `🚀 Start ${selectedMission.title} Quest!`}
                </motion.button>
                {error && <p className="error-toast">{error}</p>}
              </section>

              {/* Quick stats */}
              <section className="stats-row">
                <div className="stats-card stats-card-purple">
                  <span className="stats-num">{dashboard?.overview.attempts ?? 0}</span>
                  <span className="stats-label">Questions Done</span>
                </div>
                <div className="stats-card stats-card-green">
                  <span className="stats-num">{dashboard?.overview.accuracyPercent ?? 0}%</span>
                  <span className="stats-label">Accuracy</span>
                </div>
                <div className="stats-card stats-card-orange">
                  <span className="stats-num">{dashboard?.overview.streakDays ?? 0}</span>
                  <span className="stats-label">Day Streak</span>
                </div>
              </section>
            </motion.div>
          )}

          {/* ════ QUEST TAB ════ */}
          {tab === "quest" && (
            <motion.div
              key="quest"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="tab-content"
            >
              {/* Quest header */}
              <div className="quest-header-strip">
                <span className="quest-mission-tag" style={{ background: selectedMission.color }}>
                  {selectedMission.emoji} {selectedMission.title}
                </span>
                <span className="quest-counter">
                  {answeredCount}/{QUEST_TARGET_QUESTIONS}
                </span>
              </div>

              <XPBar percent={questProgressPercent} label="Quest Progress" />

              {/* Quest checkpoints */}
              <div className="session-map">
                {sessionMap.map((state, index) => (
                  <div key={`cp-${index}`} className={`session-node session-node-${state}`}>
                    {state === "complete" ? "✅" : state === "current" ? "🎯" : `Q${index + 1}`}
                  </div>
                ))}
                <div className={answeredCount >= QUEST_TARGET_QUESTIONS ? "session-goal session-goal-active" : "session-goal"}>
                  🏁
                </div>
              </div>

              {/* Question area */}
              {sessionSummary ? (
                <QuestComplete
                  totalQuestions={sessionSummary.summary.totalQuestions}
                  correctAnswers={sessionSummary.summary.correctAnswers}
                  avgHintsUsed={sessionSummary.summary.avgHintsUsed}
                  onPlayAgain={() => { resetQuestState(); setTab("home"); }}
                />
              ) : !activeSessionId ? (
                <div className="empty-card">
                  <MascotBuddy mood="idle" size={80} />
                  <p>Start a quest from the home screen! 🎮</p>
                </div>
              ) : isGeneratingQuestion && !activeQuestion ? (
                <div className="empty-card">
                  <MascotBuddy mood="thinking" size={80} />
                  <p>Milo is thinking of a great question... 🤔</p>
                </div>
              ) : activeQuestion ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeQuestion.questionId}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="question-zone"
                  >
                    <div className="quest-desktop-layout">
                      {/* ── Left: Question Area ── */}
                      <div className="quest-main">
                        {/* Topic tag */}
                        <span className="topic-tag">
                          📚 {activeQuestion.topic.title} • {difficultyLabel(activeQuestion.difficulty)}
                        </span>

                        {/* Question text */}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem" }}>
                          <h3 className="question-text" style={{ margin: 0, flex: 1 }}>{activeQuestion.questionText}</h3>
                          <SpeechSynthesizer text={activeQuestion.questionText} />
                        </div>

                        {/* Options */}
                        {activeQuestion.options?.length ? (
                          <div className="option-grid">
                            {activeQuestion.options.map((option, i) => (
                              <motion.button
                                key={option}
                                type="button"
                                disabled={Boolean(latestAttempt) || isSubmittingAnswer || isResultRevealPending || isAdvancingQuestion}
                                className={`option-btn ${selectedAnswer === option ? "option-btn-selected" : ""}`}
                                onClick={() => setSelectedAnswer(option)}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.96 }}
                              >
                                <span className="option-letter">{OPTION_LETTERS[i] ?? ""}</span>
                                {option}
                              </motion.button>
                            ))}
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", maxWidth: "400px", margin: "0 auto 1rem auto" }}>
                            <label className="answer-field" style={{ flex: 1, margin: 0 }}>
                              <input
                                value={selectedAnswer}
                                onChange={(e) => setSelectedAnswer(e.target.value)}
                                disabled={Boolean(latestAttempt) || isSubmittingAnswer || isResultRevealPending || isAdvancingQuestion}
                                className="control-input"
                                placeholder="Type your answer..."
                                style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "2px solid rgba(0,0,0,0.1)", fontSize: "1.1rem" }}
                              />
                            </label>
                            <SpeechInput
                              onResult={(t) => setSelectedAnswer(t)}
                              disabled={Boolean(latestAttempt) || isSubmittingAnswer || isResultRevealPending || isAdvancingQuestion}
                            />
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="action-row">
                          <motion.button
                            type="button"
                            className="btn btn-hint"
                            onClick={handleRequestHint}
                            disabled={!canRequestHint || isSubmittingAnswer || isResultRevealPending || isAdvancingQuestion}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            💡 Hint {Math.min(nextHintLevel, activeQuestion.hintCount)} ({hintEconomy.remaining} left)
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

                        {/* Loading indicator */}
                        {(isSubmittingAnswer || isResultRevealPending || isAdvancingQuestion) && (
                          <motion.div
                            className="result-wait-card"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <span className="result-wait-spinner" aria-hidden="true" />
                            <span>
                              {isSubmittingAnswer ? "Checking..." : isResultRevealPending ? "Preparing feedback..." : "Loading next..."}
                            </span>
                          </motion.div>
                        )}

                        {/* Feedback */}
                        {latestAttempt && (
                          <FeedbackSplash
                            isCorrect={latestAttempt.isCorrect}
                            feedbackText={latestAttempt.feedbackText}
                            explanation={latestAttempt.explanation}
                            masteryScore={latestAttempt.masteryUpdate.masteryScore}
                            nextDifficulty={difficultyLabel(latestAttempt.nextRecommendedDifficulty)}
                          />
                        )}

                        {/* Retry challenge */}
                        {retryChallenge && (
                          <div className="retry-card">
                            <p className="retry-title">🔧 Fix My Mistake</p>
                            <p className="retry-question">{retryChallenge.questionText}</p>
                            <div className="retry-options">
                              {retryChallenge.options.map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  className={`retry-option ${retryChallenge.selectedOption === option ? "retry-option-selected" : ""}`}
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
                              <p className={retryChallenge.status === "passed" ? "retry-pass" : "retry-fail"}>
                                {retryChallenge.status === "passed" ? "Recovered! Nice! ✅" : "Keep that strategy in mind! 🧠"}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── Right: Coach Sidebar ── */}
                      <aside className="quest-sidebar">
                        <div className="coach-panel">
                          <MascotBuddy mood={mascotMood} size={80} showSpeech />
                          <div className="coach-bubble">
                            {latestAttempt
                              ? latestAttempt.isCorrect
                                ? "Amazing work! You really know this! ⭐"
                                : "Don't worry! Read the explanation and try the next one! 💪"
                              : "Think carefully and pick the best answer! 🧠"
                            }
                          </div>
                        </div>

                        {/* Hint ladder */}
                        <div className="hint-economy-panel">
                          <h4>💡 Hint Ladder</h4>
                          <div className="hint-steps">
                            {Array.from({ length: hintEconomy.total }).map((_, i) => (
                              <div key={i} className={`hint-step ${i < hintEconomy.used ? "hint-step-used" : ""}`}>
                                {i < hintEconomy.used ? "✅" : `${i + 1}`}
                              </div>
                            ))}
                          </div>
                          <span className="hint-economy-text">{hintEconomy.used}/{hintEconomy.total} used</span>
                        </div>

                        <HintRevealer hints={revealedHints} />
                      </aside>
                    </div>

                    {/* Next question button — full width below the grid */}
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
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="empty-card">
                  <p>Quest active — generating question...</p>
                </div>
              )}

              {questMessage && <p className="quest-msg">{questMessage}</p>}
            </motion.div>
          )}

          {/* ════ REWARDS TAB ════ */}
          {tab === "rewards" && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="tab-content"
            >
              <section className="rewards-hero">
                <MascotBuddy mood="celebrating" size={100} showSpeech />
                <h2 className="rewards-title">Your Rewards 🏆</h2>
              </section>

              <div className="rewards-grid">
                <div className="reward-big-card reward-card-gold">
                  <span className="reward-emoji-big">🔥</span>
                  <span className="reward-big-value">{dashboard?.overview.streakDays ?? 0}</span>
                  <span className="reward-big-label">Day Streak</span>
                </div>
                <div className="reward-big-card reward-card-pink">
                  <span className="reward-emoji-big">🪙</span>
                  <span className="reward-big-value">{questCoins}</span>
                  <span className="reward-big-label">Total Coins</span>
                </div>
                <div className="reward-big-card reward-card-green">
                  <span className="reward-emoji-big">⭐</span>
                  <span className="reward-big-value">L{questLevel}</span>
                  <span className="reward-big-label">Current Level</span>
                </div>
                <div className="reward-big-card reward-card-blue">
                  <span className="reward-emoji-big">🎯</span>
                  <span className="reward-big-value">{dashboard?.overview.accuracyPercent ?? 0}%</span>
                  <span className="reward-big-label">Accuracy</span>
                </div>
              </div>

              {/* Topic mastery */}
              <h3 className="section-label">📊 Mastery by Topic</h3>
              <div className="mastery-list">
                {(dashboard?.topicMastery ?? []).map((topic) => (
                  <div key={topic.topicCode} className="mastery-row">
                    <div className="mastery-info">
                      <span className="mastery-topic-name">{topic.topicTitle}</span>
                      <span className="mastery-topic-code">{topic.topicCode}</span>
                    </div>
                    <div className="mastery-bar-wrap">
                      <div className="mastery-bar-track">
                        <div
                          className="mastery-bar-fill"
                          style={{ width: `${topic.masteryScore}%` }}
                        />
                      </div>
                      <span className="mastery-score">{topic.masteryScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Bottom Navigation ── */}
        <nav className="bottom-nav">
          <button
            type="button"
            className={`nav-btn ${tab === "home" ? "nav-btn-active" : ""}`}
            onClick={() => setTab("home")}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
          </button>
          <button
            type="button"
            className={`nav-btn ${tab === "quest" ? "nav-btn-active" : ""}`}
            onClick={() => setTab("quest")}
          >
            <span className="nav-icon">🎮</span>
            <span className="nav-label">Quest</span>
          </button>
          <button
            type="button"
            className={`nav-btn ${tab === "rewards" ? "nav-btn-active" : ""}`}
            onClick={() => setTab("rewards")}
          >
            <span className="nav-icon">🏆</span>
            <span className="nav-label">Rewards</span>
          </button>
          <a href="/parent" className="nav-btn">
            <span className="nav-icon">👨‍👩‍👧</span>
            <span className="nav-label">Parent</span>
          </a>
        </nav>
      </main >
    </MotionConfig >
  );
}
