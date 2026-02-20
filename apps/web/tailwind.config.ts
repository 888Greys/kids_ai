import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ocean: "#2563eb",
        sky: "#38bdf8",
        mint: "#34d399",
        mango: "#fb923c",
        cherry: "#f43f5e",
        grape: "#a855f7",
        lemon: "#facc15",
        navy: "#1e293b",
        cream: "#fffbeb",
      },
      fontFamily: {
        display: ["var(--font-display)", "Trebuchet MS", "sans-serif"],
        body: ["var(--font-body)", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        game: "24px",
        card: "20px",
        btn: "14px",
      },
      boxShadow: {
        game: "0 20px 40px rgba(15, 23, 42, 0.12)",
        card: "0 12px 28px rgba(15, 23, 42, 0.1)",
        glow: "0 0 30px rgba(56, 189, 248, 0.3)",
      },
      keyframes: {
        "bounce-in": {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.08)" },
          "70%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "bounce-in": "bounce-in 0.5s ease-out",
        wiggle: "wiggle 0.6s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
