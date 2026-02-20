"use client";

import { motion } from "framer-motion";

interface QuestCompleteProps {
    totalQuestions: number;
    correctAnswers: number;
    avgHintsUsed: number;
    onPlayAgain?: () => void;
}

function starCount(correct: number, total: number): number {
    const ratio = total > 0 ? correct / total : 0;
    if (ratio >= 0.9) return 3;
    if (ratio >= 0.6) return 2;
    return 1;
}

export default function QuestComplete({
    totalQuestions,
    correctAnswers,
    avgHintsUsed,
    onPlayAgain,
}: QuestCompleteProps) {
    const stars = starCount(correctAnswers, totalQuestions);

    return (
        <motion.div
            className="quest-summary"
            initial={{ opacity: 0, scale: 0.86, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
        >
            <span className="quest-summary-emoji">🏆</span>
            <h3>Quest Complete!</h3>

            <div className="quest-stars">
                {[1, 2, 3].map((n) => (
                    <motion.span
                        key={n}
                        initial={{ opacity: 0, scale: 0, rotate: -90 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ delay: 0.24 + n * 0.16, duration: 0.36, type: "spring" }}
                        style={{ filter: n <= stars ? "none" : "grayscale(1) opacity(0.3)" }}
                    >
                        ⭐
                    </motion.span>
                ))}
            </div>

            <p>
                <strong>{correctAnswers}/{totalQuestions}</strong> correct • avg hints <strong>{avgHintsUsed.toFixed(1)}</strong>
            </p>
            <p className="quest-summary-note">Great work today. Keep your streak alive.</p>

            {onPlayAgain ? (
                <motion.button
                    className="btn btn-quest"
                    onClick={onPlayAgain}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ marginTop: 8 }}
                >
                    Play Another Quest
                </motion.button>
            ) : null}
        </motion.div>
    );
}
