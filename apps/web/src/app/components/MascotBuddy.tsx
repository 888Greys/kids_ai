"use client";

import { motion } from "framer-motion";

type Mood = "idle" | "happy" | "thinking" | "celebrating";

const mouthPaths: Record<Mood, string> = {
    idle: "M 14 22 Q 20 27 26 22",
    happy: "M 12 20 Q 20 30 28 20",
    thinking: "M 15 24 Q 20 22 25 24",
    celebrating: "M 10 18 Q 20 32 30 18",
};

export default function MascotBuddy({
    mood = "idle",
    size = 120,
}: {
    mood?: Mood;
    size?: number;
}) {
    return (
        <motion.div
            animate={
                mood === "celebrating"
                    ? { rotate: [0, -5, 5, -5, 0], scale: [1, 1.1, 1] }
                    : mood === "happy"
                        ? { y: [0, -4, 0] }
                        : mood === "thinking"
                            ? { rotate: [0, -3, 3, 0] }
                            : { y: [0, -6, 0] }
            }
            transition={{
                duration: mood === "celebrating" ? 0.6 : mood === "thinking" ? 1.5 : 2.5,
                repeat: Infinity,
                ease: "easeInOut",
            }}
            style={{ width: size, height: size }}
        >
            <svg viewBox="0 0 40 44" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Antenna */}
                <circle cx="20" cy="3" r="3" fill="#f43f5e" />
                <rect x="19" y="5" width="2" height="5" rx="1" fill="#1e293b" />

                {/* Head */}
                <rect x="6" y="10" width="28" height="20" rx="8" fill="url(#headGrad)" />

                {/* Eyes */}
                <motion.circle
                    cx="15"
                    cy="19"
                    r={mood === "happy" || mood === "celebrating" ? 2.5 : 3}
                    fill="#d1fae5"
                    animate={
                        mood === "celebrating"
                            ? { scale: [1, 1.3, 1] }
                            : { scale: 1 }
                    }
                    transition={{ duration: 0.4, repeat: mood === "celebrating" ? Infinity : 0 }}
                />
                <motion.circle
                    cx="25"
                    cy="19"
                    r={mood === "happy" || mood === "celebrating" ? 2.5 : 3}
                    fill="#d1fae5"
                    animate={
                        mood === "celebrating"
                            ? { scale: [1, 1.3, 1] }
                            : { scale: 1 }
                    }
                    transition={{ duration: 0.4, repeat: mood === "celebrating" ? Infinity : 0, delay: 0.1 }}
                />

                {/* Mouth */}
                <motion.path
                    d={mouthPaths[mood]}
                    stroke="#a7f3d0"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                    initial={false}
                    animate={{ d: mouthPaths[mood] }}
                    transition={{ duration: 0.3 }}
                />

                {/* Body */}
                <rect x="8" y="31" width="24" height="10" rx="6" fill="url(#bodyGrad)" />

                {/* Arms */}
                <motion.rect
                    x="2" y="33" width="5" height="8" rx="2.5" fill="#059669"
                    animate={
                        mood === "celebrating"
                            ? { rotate: [0, -20, 0], y: [0, -3, 0] }
                            : { rotate: 0 }
                    }
                    transition={{ duration: 0.4, repeat: mood === "celebrating" ? Infinity : 0 }}
                />
                <motion.rect
                    x="33" y="33" width="5" height="8" rx="2.5" fill="#059669"
                    animate={
                        mood === "celebrating"
                            ? { rotate: [0, 20, 0], y: [0, -3, 0] }
                            : { rotate: 0 }
                    }
                    transition={{ duration: 0.4, repeat: mood === "celebrating" ? Infinity : 0, delay: 0.15 }}
                />

                <defs>
                    <linearGradient id="headGrad" x1="6" y1="10" x2="34" y2="30" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#1e293b" />
                        <stop offset="1" stopColor="#334155" />
                    </linearGradient>
                    <linearGradient id="bodyGrad" x1="8" y1="31" x2="32" y2="41" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#10b981" />
                        <stop offset="1" stopColor="#059669" />
                    </linearGradient>
                </defs>
            </svg>
        </motion.div>
    );
}
