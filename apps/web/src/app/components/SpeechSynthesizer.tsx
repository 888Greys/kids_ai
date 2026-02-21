"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface SpeechSynthesizerProps {
    text: string;
    autoPlay?: boolean;
}

export default function SpeechSynthesizer({ text, autoPlay = false }: SpeechSynthesizerProps) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            setIsSupported(true);
        }
    }, []);

    useEffect(() => {
        if (autoPlay && isSupported && text) {
            speak();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoPlay, isSupported, text]);

    // Clean up on unmount or text change
    useEffect(() => {
        return () => {
            if (isSupported) {
                window.speechSynthesis.cancel();
            }
        };
    }, [isSupported, text]);

    const speak = () => {
        if (!isSupported) return;

        window.speechSynthesis.cancel(); // Stop anything currently playing

        const utterance = new SpeechSynthesisUtterance(text);

        // Try to find a friendly voice (like Google US English or similar)
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Samantha") || v.lang === "en-US");
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.rate = 0.95; // Slightly slower for kids
        utterance.pitch = 1.1; // Slightly higher pitch for friendliness

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    const stop = () => {
        if (!isSupported) return;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    };

    if (!isSupported) {
        return null;
    }

    return (
        <motion.button
            type="button"
            onClick={isSpeaking ? stop : speak}
            className={`speech-btn ${isSpeaking ? "speech-btn-active" : ""}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "20px",
                border: "none",
                background: isSpeaking ? "var(--purple)" : "var(--purple-soft)",
                color: isSpeaking ? "white" : "var(--purple)",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "colors 0.2s",
                verticalAlign: "middle",
                marginLeft: "8px"
            }}
            title="Read Aloud"
        >
            {isSpeaking ? (
                <>
                    <motion.span
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                    >
                        🔊
                    </motion.span>
                    Stop
                </>
            ) : (
                <>
                    <span>🔈</span>
                    Read Aloud
                </>
            )}
        </motion.button>
    );
}
