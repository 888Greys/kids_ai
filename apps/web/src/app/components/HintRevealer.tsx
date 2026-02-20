"use client";

import { motion, AnimatePresence } from "framer-motion";

interface HintRevealer {
    hints: string[];
}

export default function HintRevealer({ hints }: HintRevealer) {
    if (hints.length === 0) return null;

    return (
        <div className="hint-stack">
            <AnimatePresence>
                {hints.map((hint, i) => (
                    <motion.div
                        key={`hint-${i}`}
                        className="hint-card"
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ duration: 0.35, delay: 0.1 }}
                    >
                        <span className="hint-emoji">{i === 0 ? "💡" : i === 1 ? "🔍" : "🎯"}</span>
                        <div className="hint-content">
                            <span className="hint-label">Hint {i + 1}</span>
                            <p className="hint-text">{hint}</p>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
