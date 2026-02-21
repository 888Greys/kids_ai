"use client";

import { motion } from "framer-motion";

export default function FeedbackSplash({
    isCorrect,
    feedbackText,
    explanation,
    masteryScore,
    nextDifficulty,
}: {
    isCorrect: boolean;
    feedbackText: string;
    explanation: string;
    masteryScore: number;
    nextDifficulty: string;
}) {
    return (
        <motion.div
            className={`feedback-splash ${isCorrect ? "feedback-correct" : "feedback-wrong"}`}
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, type: "spring", bounce: 0.35 }}
        >
            <div className="feedback-icon-wrap">
                <motion.span
                    className="feedback-icon"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.15, duration: 0.5, type: "spring" }}
                >
                    {isCorrect ? "🌟" : "💪"}
                </motion.span>
            </div>

            <h3 className="feedback-title">
                {isCorrect ? "Awesome!" : "Good Try!"}
            </h3>

            <p className="feedback-text">{feedbackText}</p>

            <div className="feedback-detail">
                <p className="feedback-explanation">{explanation}</p>
            </div>

            <div className="feedback-stats">
                <div className="feedback-stat">
                    <span className="feedback-stat-label">Mastery</span>
                    <span className="feedback-stat-value">{Math.round(masteryScore)}</span>
                </div>
                <div className="feedback-stat">
                    <span className="feedback-stat-label">Next</span>
                    <span className="feedback-stat-value">{nextDifficulty}</span>
                </div>
            </div>
        </motion.div>
    );
}
