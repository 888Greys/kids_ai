"use client";

import { motion } from "framer-motion";

export default function XPBar({
    percent,
    label,
}: {
    percent: number;
    label?: string;
}) {
    const stars = [20, 40, 60, 80, 100];

    return (
        <div className="xp-bar-wrapper">
            {label && <span className="xp-bar-label">{label}</span>}
            <div className="xp-track">
                <motion.div
                    className="xp-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, percent)}%` }}
                    transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
                />
                {stars.map((pos) => (
                    <div
                        key={pos}
                        className={`xp-star ${percent >= pos ? "xp-star-earned" : ""}`}
                        style={{ left: `${pos}%` }}
                    >
                        ⭐
                    </div>
                ))}
            </div>
            <span className="xp-bar-percent">{percent}%</span>
        </div>
    );
}
