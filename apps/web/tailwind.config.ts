import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        skyfun: "#7bdff2",
        mango: "#ff8c42",
        mint: "#b2f7ef"
      }
    }
  },
  plugins: []
};

export default config;
