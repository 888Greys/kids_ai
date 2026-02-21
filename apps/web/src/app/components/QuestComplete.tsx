"use client";

import { motion } from "framer-motion";
import MascotBuddy from "./MascotBuddy";

export default function QuestComplete({
    totalQuestions,
    correctAnswers,
    avgHintsUsed,
    onPlayAgain,
}: {
    totalQuestions: number;
    correctAnswers: number;
    avgHintsUsed: number;
    onPlayAgain: () => void;
}) {
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const stars = accuracy >= 90 ? 3 : accuracy >= 60 ? 2 : 1;

    return (
        <motion.div
            className="quest-complete"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
        >
            <MascotBuddy mood="celebrating" size={100} showSpeech />

            <h2 className="quest-complete-title">Quest Complete! 🏆</h2>

            <div className="quest-complete-stars">
                {Array.from({ length: 3 }).map((_, i) => (
                    <motion.span
                        key={i}
                        className={`quest-star ${i < stars ? "quest-star-earned" : "quest-star-empty"}`}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.3 + i * 0.15, duration: 0.4, type: "spring" }}
                    >
                        {i < stars ? "⭐" : "☆"}
                    </motion.span>
                ))}
            </div>

            <div className="quest-complete-stats">
                <div className="quest-complete-stat">
                    <span className="quest-complete-num">{correctAnswers}/{totalQuestions}</span>
                    <span className="quest-complete-label">Correct</span>
                </div>
                <div className="quest-complete-stat">
                    <span className="quest-complete-num">{accuracy}%</span>
                    <span className="quest-complete-label">Accuracy</span>
                </div>
                <div className="quest-complete-stat">
                    <span className="quest-complete-num">{avgHintsUsed.toFixed(1)}</span>
                    <span className="quest-complete-label">Avg Hints</span>
                </div>
            </div>

            <motion.button
                className="btn btn-quest"
                onClick={onPlayAgain}
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                🚀 Play Again!
            </motion.button>
        </motion.div>
    );
}
