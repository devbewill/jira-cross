import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        linear: {
          // ─── Background & Surface ──────────────────────────────────────────
          bg: "#ffffff",
          surface: "#1a2747",
          surfaceHover: "#243157",
          surfaceActive: "#192542",

          // ─── Borders ───────────────────────────────────────────────────────
          border: "#394c6b",
          borderHover: "#334155",

          // ─── Text ──────────────────────────────────────────────────────────
          text: "#fafafa",
          textDim: "#64748B",
          textSecondary: "#8c8d8e",

          // ─── Accent (Gold #FABD22) ─────────────────────────────────────────
          accent: "#FABD22",
          accentHover: "#FCD34D",
          accentLight: "#FEF3C7",
          accentDark: "#D97706",

          // ─── Secondary (Dark Blue #1C2F54) ─────────────────────────────────
          secondary: "#1C2F54",
          secondaryHover: "#2D4A7A",
          secondaryLight: "#3D5A8A",
          secondaryDark: "#0F1F38",

          // ─── Danger ────────────────────────────────────────────────────────
          danger: "#EF4444",
          dangerLight: "#F87171",
          dangerDark: "#B91C1C",

          // ─── Story Status ──────────────────────────────────────────────────
          todo: "#e8e8e8",
          inProgress: "#7985b8",
          done: "#22c55e",

          // ─── Release Status ────────────────────────────────────────────────
          overdueSolid: "#DC2626",
          upcomingGold: "#FFD700",
          overdueLight: "#FEE2E2",
        },
      },
      boxShadow: {
        "linear-xs": "0 1px 2px rgba(0, 0, 0, 0.08)",
        "linear-sm":
          "0 1px 4px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06)",
        "linear-hover":
          "0 4px 16px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.10)",
        "linear-card":
          "0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.08)",
        popover:
          "0 8px 32px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15)",
        panel: "-4px 0 24px rgba(0, 0, 0, 0.18)",
        "btn-active": "0 1px 3px rgba(0, 0, 0, 0.12)",
        "accent-glow":
          "0 1px 4px rgba(250, 189, 34, 0.50), 0 0 8px rgba(250, 189, 34, 0.30)",
        "primary-glow":
          "0 0 20px rgba(250, 189, 34, 0.35), 0 0 10px rgba(250, 189, 34, 0.20)",
      },
      fontFamily: {
        sans: ["Inter", "Montserrat", "system-ui", "sans-serif"],
      },
      keyframes: {
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.15s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
