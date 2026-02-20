"use client";

import { motion } from "framer-motion";

export default function XPBar({
    percent,
    label,
}: {
    percent: number;
    label: string;
}) {
    const safePercent = Math.min(100, Math.max(0, percent));

    return (
        <div className="xp-shell">
            <div className="xp-head">
                <span className="arena-kicker">{label}</span>
                <span className="arena-counter">{safePercent}%</span>
            </div>
            <div className="xp-track">
                <motion.div
                    className="xp-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${safePercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <span className="xp-spark" />
                </motion.div>
            </div>
        </div>
    );
}
