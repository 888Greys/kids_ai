"use client";

import { motion } from "framer-motion";

type Mood = "idle" | "happy" | "thinking" | "celebrating";

const SPEECH: Record<Mood, string[]> = {
    idle: ["Hey there! Ready to learn? 🎯", "Pick a mission! 🚀", "Let's do math! 🧮"],
    happy: ["You're doing great! ⭐", "Keep going! 💪", "Nice work! 🌟"],
    thinking: ["Hmm, let me think... 🤔", "Try using a hint! 💡", "You got this! 🧠"],
    celebrating: ["AMAZING! 🎉", "You're a superstar! ⭐", "WOW! 🏆"],
};

function getRandomSpeech(mood: Mood): string {
    const options = SPEECH[mood];
    return options[Math.floor(Math.random() * options.length)];
}

const mouthPaths: Record<Mood, string> = {
    idle: "M 14 22 Q 20 27 26 22",
    happy: "M 12 20 Q 20 30 28 20",
    thinking: "M 15 24 Q 20 22 25 24",
    celebrating: "M 10 18 Q 20 32 30 18",
};

export default function MascotBuddy({
    mood = "idle",
    size = 120,
    showSpeech = false,
}: {
    mood?: Mood;
    size?: number;
    showSpeech?: boolean;
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            {showSpeech && (
                <motion.div
                    className="mascot-speech"
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    key={mood}
                    transition={{ duration: 0.3, type: "spring" }}
                >
                    {getRandomSpeech(mood)}
                </motion.div>
            )}
            <motion.div
                animate={
                    mood === "celebrating"
                        ? { rotate: [0, -8, 8, -8, 0], scale: [1, 1.15, 1] }
                        : mood === "happy"
                            ? { y: [0, -6, 0] }
                            : mood === "thinking"
                                ? { rotate: [0, -4, 4, 0] }
                                : { y: [0, -8, 0] }
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
                    <motion.circle
                        cx="20" cy="3" r="3" fill="#f43f5e"
                        animate={mood === "celebrating" ? { scale: [1, 1.5, 1], fill: ["#f43f5e", "#facc15", "#f43f5e"] } : {}}
                        transition={{ duration: 0.5, repeat: mood === "celebrating" ? Infinity : 0 }}
                    />
                    <rect x="19" y="5" width="2" height="5" rx="1" fill="#6366f1" />

                    {/* Head */}
                    <rect x="6" y="10" width="28" height="20" rx="8" fill="url(#headGrad2)" />

                    {/* Blush spots */}
                    <circle cx="11" cy="22" r="3" fill="rgba(244, 114, 182, 0.3)" />
                    <circle cx="29" cy="22" r="3" fill="rgba(244, 114, 182, 0.3)" />

                    {/* Eyes */}
                    <motion.circle
                        cx="15" cy="19"
                        r={mood === "happy" || mood === "celebrating" ? 2.5 : 3}
                        fill="white"
                        animate={mood === "celebrating" ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                        transition={{ duration: 0.4, repeat: mood === "celebrating" ? Infinity : 0 }}
                    />
                    <circle cx="15" cy="19" r="1.5" fill="#1e293b" />
                    <circle cx="14" cy="18" r="0.7" fill="white" />

                    <motion.circle
                        cx="25" cy="19"
                        r={mood === "happy" || mood === "celebrating" ? 2.5 : 3}
                        fill="white"
                        animate={mood === "celebrating" ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                        transition={{ duration: 0.4, repeat: mood === "celebrating" ? Infinity : 0, delay: 0.1 }}
                    />
                    <circle cx="25" cy="19" r="1.5" fill="#1e293b" />
                    <circle cx="24" cy="18" r="0.7" fill="white" />

                    {/* Mouth */}
                    <motion.path
                        d={mouthPaths[mood]}
                        stroke="#f472b6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        fill="none"
                        initial={false}
                        animate={{ d: mouthPaths[mood] }}
                        transition={{ duration: 0.3 }}
                    />

                    {/* Body */}
                    <rect x="8" y="31" width="24" height="10" rx="6" fill="url(#bodyGrad2)" />

                    {/* Arms */}
                    <motion.rect
                        x="2" y="33" width="5" height="8" rx="2.5" fill="#818cf8"
                        animate={mood === "celebrating" ? { rotate: [0, -25, 0], y: [0, -5, 0] } : { rotate: 0 }}
                        transition={{ duration: 0.4, repeat: mood === "celebrating" ? Infinity : 0 }}
                    />
                    <motion.rect
                        x="33" y="33" width="5" height="8" rx="2.5" fill="#818cf8"
                        animate={mood === "celebrating" ? { rotate: [0, 25, 0], y: [0, -5, 0] } : { rotate: 0 }}
                        transition={{ duration: 0.4, repeat: mood === "celebrating" ? Infinity : 0, delay: 0.15 }}
                    />

                    <defs>
                        <linearGradient id="headGrad2" x1="6" y1="10" x2="34" y2="30" gradientUnits="userSpaceOnUse">
                            <stop offset="0" stopColor="#818cf8" />
                            <stop offset="1" stopColor="#6366f1" />
                        </linearGradient>
                        <linearGradient id="bodyGrad2" x1="8" y1="31" x2="32" y2="41" gradientUnits="userSpaceOnUse">
                            <stop offset="0" stopColor="#a78bfa" />
                            <stop offset="1" stopColor="#7c3aed" />
                        </linearGradient>
                    </defs>
                </svg>
            </motion.div>
        </div>
    );
}
