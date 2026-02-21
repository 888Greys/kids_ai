"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SpeechInputProps {
    onResult: (text: string) => void;
    disabled?: boolean;
}

export default function SpeechInput({ onResult, disabled = false }: SpeechInputProps) {
    const [isSupported, setIsSupported] = useState(false);
    const [isListening, setIsListening] = useState(false);

    // Use generic type to avoid TypeScript errors with vendor prefixes
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                setIsSupported(true);
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = false;
                recognitionRef.current.lang = 'en-US';

                recognitionRef.current.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    // Clean up the text (remove trailing periods, make lowercase for numbers)
                    const cleanText = transcript.replace(/\.$/, '').trim();
                    onResult(cleanText);
                    setIsListening(false);
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    setIsListening(false);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }
    }, [onResult]);

    const toggleListening = () => {
        if (!isSupported || disabled) return;

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current?.start();
                setIsListening(true);
            } catch (e) {
                console.error("Failed to start speech recognition", e);
            }
        }
    };

    if (!isSupported) {
        return null;
    }

    return (
        <motion.button
            type="button"
            onClick={toggleListening}
            disabled={disabled}
            className={`speech-input-btn ${isListening ? "speech-input-active" : ""}`}
            whileHover={{ scale: disabled ? 1 : 1.05 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                border: "none",
                background: isListening ? "var(--accent-red)" : "var(--bg-subtle)",
                color: isListening ? "white" : "var(--text-muted)",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.6 : 1,
                transition: "all 0.2s ease",
                boxShadow: isListening ? "0 4px 12px rgba(255, 100, 144, 0.4)" : "none"
            }}
            title="Speak Answer"
        >
            {isListening ? (
                <AnimatePresence>
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                        🎙️
                    </motion.div>
                </AnimatePresence>
            ) : (
                "🎤"
            )}
        </motion.button>
    );
}
