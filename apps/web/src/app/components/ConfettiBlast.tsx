"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const COLORS = ["#2563eb", "#38bdf8", "#34d399", "#fb923c", "#f43f5e", "#a855f7", "#facc15"];

interface Piece {
    id: number;
    left: number;
    color: string;
    delay: number;
    duration: number;
    size: number;
}

export default function ConfettiBlast({ trigger }: { trigger: boolean }) {
    const [pieces, setPieces] = useState<Piece[]>([]);
    const counter = useRef(0);

    const fire = useCallback(() => {
        const batch: Piece[] = [];
        for (let i = 0; i < 40; i++) {
            batch.push({
                id: counter.current++,
                left: Math.random() * 100,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                delay: Math.random() * 0.3,
                duration: 1.2 + Math.random() * 1.5,
                size: 6 + Math.random() * 8,
            });
        }
        setPieces((prev) => [...prev, ...batch]);
        setTimeout(() => {
            setPieces((prev) => prev.filter((p) => !batch.includes(p)));
        }, 3000);
    }, []);

    useEffect(() => {
        if (!trigger) return;

        const timer = window.setTimeout(() => {
            fire();
        }, 0);

        return () => {
            window.clearTimeout(timer);
        };
    }, [trigger, fire]);

    if (pieces.length === 0) return null;

    return (
        <div className="confetti-container" aria-hidden="true">
            {pieces.map((piece) => (
                <span
                    key={piece.id}
                    className="confetti-piece"
                    style={{
                        left: `${piece.left}%`,
                        top: "-10px",
                        width: piece.size,
                        height: piece.size,
                        background: piece.color,
                        animationDelay: `${piece.delay}s`,
                        animationDuration: `${piece.duration}s`,
                    }}
                />
            ))}
        </div>
    );
}
