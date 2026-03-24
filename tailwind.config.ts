import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        linear: {
          // ─── Background & Surface (Fluid Disruptive Theme) ───────────────
          bg: "#0A0E1A", // Ultra dark blue - almost black
          surface: "#0F172A", // Deep dark blue for panels
          surfaceHover: "#1E293B", // Lighter dark for hover
          surfaceActive: "#1F2937", // Active states

          // ─── Borders ─────────────────────────────────────────────────────────────
          border: "#1E293B",
          borderHover: "#334155",

          // ─── Text ───────────────────────────────────────────────────────────────
          text: "#FFFFFF", // Pure white for maximum contrast
          textMuted: "#94A3B8", // Light gray for muted text
          textDim: "#64748B", // Medium gray for dim text
          textSecondary: "#CBD5E1", // Lighter gray for secondary text

          // ─── Primary Brand Colors (Gold #fabd22 & Dark Blue #1c2f54) ───────────
          primary: "#FABD22", // Gold - main accent
          primaryHover: "#FCD34D", // Lighter gold for hover
          primaryLight: "#FEF3C7", // Very light gold for backgrounds
          primaryDark: "#D97706", // Darker gold for contrast

          secondary: "#1C2F54", // Dark blue - main brand
          secondaryHover: "#2D4A7A", // Lighter dark blue for hover
          secondaryLight: "#3D5A8A", // Even lighter dark blue
          secondaryDark: "#0F1F38", // Darker dark blue for contrast

          // ─── Accent (Gold-based) ────────────────────────────────────────────────
          accent: "#FABD22",
          accentHover: "#FCD34D",
          accentLight: "#FEF3C7",

          // ─── Status Colors (Vibrant & Disruptive) ─────────────────────────
          success: "#10B981", // Vibrant emerald green
          successLight: "#34D399",
          successDark: "#059669",

          warning: "#F59E0B",
          warningLight: "#FBBF24",
          warningDark: "#B45309",

          danger: "#EF4444",
          dangerLight: "#F87171",
          dangerDark: "#B91C1C",

          // ─── Status Colors (Solid & Vibrant) ───────────────────────────────
          successSolid: "#059669", // Solid emerald green
          warningSolid: "#B45309", // Solid amber
          dangerSolid: "#DC2626", // Solid red

          // ─── Story Status Colors ────────────────────────────────────────────────
          todo: "#1E293B", // Dark gray for pending
          todoHover: "#334155", // Slightly lighter for hover
          inProgress: "#FABD22", // Gold for active work
          done: "#1C2F54", // Dark blue for completed
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
