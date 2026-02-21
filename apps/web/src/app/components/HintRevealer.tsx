"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function HintRevealer({ hints }: { hints: string[] }) {
    if (hints.length === 0) return null;

    return (
        <div className="hint-revealer">
            <AnimatePresence>
                {hints.map((hint, index) => (
                    <motion.div
                        key={`hint-${index}`}
                        className="hint-card"
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ duration: 0.35, type: "spring", bounce: 0.3 }}
                    >
                        <span className="hint-bulb">
                            {index === 0 ? "💡" : index === 1 ? "🔍" : "🎯"}
                        </span>
                        <div className="hint-content">
                            <span className="hint-level">Hint {index + 1}</span>
                            <p className="hint-text">{hint}</p>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
