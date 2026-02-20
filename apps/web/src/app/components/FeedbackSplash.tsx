"use client";

import { motion } from "framer-motion";

interface FeedbackSplashProps {
    isCorrect: boolean;
    feedbackText: string;
    explanation: string;
    masteryScore: number;
    nextDifficulty: string;
}

export default function FeedbackSplash({
    isCorrect,
    feedbackText,
    explanation,
    masteryScore,
    nextDifficulty,
}: FeedbackSplashProps) {
    return (
        <motion.div
            className={isCorrect ? "feedback-card feedback-correct" : "feedback-card feedback-wrong"}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.42, ease: "easeOut" }}
        >
            <div className="feedback-head">
                <motion.span
                    className="feedback-emoji"
                    initial={{ rotate: -8, scale: 0.9 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 18 }}
                >
                    {isCorrect ? "🎉" : "🤔"}
                </motion.span>
                <h4 className="feedback-title">
                    {isCorrect ? "Awesome job!" : "Almost there!"}
                </h4>
            </div>
            <p className="feedback-text">{feedbackText}</p>
            <p className="feedback-text">{explanation}</p>
            <p className="feedback-meta">
                Mastery {masteryScore} • Next: {nextDifficulty}
            </p>
        </motion.div>
    );
}
