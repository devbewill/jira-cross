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
          // ─── Base ─────────────────────────────────────────────────────────
          bg:            "#F2F2F7",   // iOS-style cool off-white
          surface:       "#FFFFFF",
          surfaceHover:  "#F7F7FC",
          surfaceActive: "#EEEEF8",

          // ─── Borders ──────────────────────────────────────────────────────
          border:      "#E2E2EE",
          borderHover: "#C8C8E4",

          // ─── Text ─────────────────────────────────────────────────────────
          text:          "#0C0C1E",   // near-black with a purple cast — 19:1 on white
          textDim:       "#626280",   // 6.5:1 on white — was #ABABCC (failed WCAG)
          textSecondary: "#525270",   // 8.5:1 on white

          // ─── Accent — Deep Indigo ──────────────────────────────────────────
          accent:      "#5B4FE8",
          accentHover: "#7065F0",
          accentLight: "#5B4FE8",   // use with /8 /12 opacity modifiers
          accentDark:  "#4338CA",

          // ─── Secondary ────────────────────────────────────────────────────
          secondary:      "#F2F2F7",
          secondaryHover: "#E8E8F4",
          secondaryLight: "#EEEEF8",
          secondaryDark:  "#4A4A6A",   // was #E0E0F0 — too light for text use

          // ─── Danger ────────────────────────────────────────────────────────
          danger:      "#DC2626",
          dangerLight: "#EF4444",
          dangerDark:  "#B91C1C",

          // ─── Story Status — violet/fuchsia monochromatic ───────────────────
          todo:       "#C4B5FD",   // violet-300  — visible light violet
          inProgress: "#8B5CF6",   // violet-500
          done:       "#6D28D9",   // violet-700

          // ─── Release Status — violet/fuchsia ───────────────────────────────
          overdueSolid: "#C026D3",  // fuchsia-600 (was red)
          upcomingGold: "#7C3AED",  // violet-700  (was amber)
          overdueLight: "#C026D3",  // pair with /10
        },
      },
      boxShadow: {
        "linear-xs":    "0 1px 2px rgba(12,12,30,0.06)",
        "linear-sm":    "0 1px 4px rgba(12,12,30,0.08), 0 1px 2px rgba(12,12,30,0.04)",
        "linear-hover": "0 8px 24px rgba(12,12,30,0.12), 0 2px 8px rgba(12,12,30,0.06)",
        "linear-card":  "0 2px 8px rgba(12,12,30,0.08), 0 1px 3px rgba(12,12,30,0.04)",
        popover:        "0 16px 48px rgba(12,12,30,0.16), 0 4px 16px rgba(12,12,30,0.08)",
        panel:          "-4px 0 24px rgba(12,12,30,0.10)",
        "btn-active":   "0 1px 3px rgba(12,12,30,0.12)",
        "accent-glow":  "0 0 0 3px rgba(91,79,232,0.15)",
        "primary-glow": "0 0 0 4px rgba(91,79,232,0.12), 0 4px 16px rgba(91,79,232,0.10)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },
      keyframes: {
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to:   { transform: "translateX(0)",    opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.2s cubic-bezier(0.16,1,0.3,1)",
        "fade-up":        "fade-up 0.15s ease-out",
        "pulse-glow":     "pulse-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
