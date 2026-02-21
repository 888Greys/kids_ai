"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function FloatingDecor() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null; // Avoid hydration mismatch

    return (
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
            {/* Soft animated gradient blobs */}
            <motion.div
                className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full mix-blend-multiply filter blur-[80px] opacity-60 bg-purple-200"
                animate={{
                    x: [0, 100, 0],
                    y: [0, 50, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute top-[20%] right-[-10%] w-[35vw] h-[35vw] rounded-full mix-blend-multiply filter blur-[80px] opacity-60 bg-sky-200"
                animate={{
                    x: [0, -80, 0],
                    y: [0, 100, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                }}
            />
            <motion.div
                className="absolute bottom-[-10%] left-[20%] w-[45vw] h-[45vw] rounded-full mix-blend-multiply filter blur-[80px] opacity-50 bg-yellow-100"
                animate={{
                    x: [0, 60, 0],
                    y: [0, -60, 0],
                    scale: [1, 1.05, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2,
                }}
            />

            {/* Floating math symbols & stars */}
            <motion.div
                className="absolute top-[15%] left-[10%] text-purple-300/40 text-4xl font-black rotate-12"
                animate={{ y: [0, -15, 0], rotate: [12, -5, 12] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
                +
            </motion.div>
            <motion.div
                className="absolute top-[35%] right-[15%] text-sky-300/40 text-5xl font-black -rotate-6"
                animate={{ y: [0, 20, 0], rotate: [-6, 10, -6] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            >
                ×
            </motion.div>
            <motion.div
                className="absolute bottom-[25%] left-[25%] text-teal-300/40 text-4xl font-black rotate-45"
                animate={{ y: [0, -20, 0], rotate: [45, 20, 45] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            >
                ÷
            </motion.div>
            <motion.div
                className="absolute bottom-[15%] right-[20%] text-orange-300/40 text-5xl font-black -rotate-12"
                animate={{ y: [0, 15, 0], rotate: [-12, 5, -12] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
                −
            </motion.div>
            <motion.div
                className="absolute top-[60%] left-[8%] text-yellow-300/50 text-3xl"
                animate={{ y: [0, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
                ⭐
            </motion.div>
            <motion.div
                className="absolute top-[10%] right-[30%] text-pink-300/50 text-2xl"
                animate={{ y: [0, 10, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            >
                ✨
            </motion.div>
        </div>
    );
}
