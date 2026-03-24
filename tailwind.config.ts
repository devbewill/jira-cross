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
          bg:            "#F4F4F7",
          surface:       "#FFFFFF",
          surfaceHover:  "#F8F8FB",
          surfaceActive: "#EEEEF4",
          border:        "#E8E8EF",
          borderHover:   "#D0D0DC",
          text:          "#1A1A1B",
          textMuted:     "#4A4A4A",
          textDim:       "#A0A0A8",
          textSecondary: "#717171",
          accent:        "hsl(43 96% 56%)",
          accentHover:   "hsl(43 96% 46%)",
          accentLight:   "#FEF3E8",
          success:       "#22C55E",
          warning:       "#F59E0B",
          danger:        "#EF4444",
          todo:          "#E5E7EB",
          inProgress:    "hsl(43 96% 56%)",
          done:          "#22C55E",
        },
      },
      boxShadow: {
        "linear-xs":    "0 1px 2px rgba(0,0,0,0.05)",
        "linear-sm":    "0 1px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        "linear-hover": "0 4px 16px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.05)",
        "linear-card":  "0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        "popover":      "0 8px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
        "panel":        "-4px 0 24px rgba(0,0,0,0.08)",
        "btn-active":   "0 1px 3px rgba(0,0,0,0.08)",
        "accent-glow":  "0 1px 4px hsla(43, 96%, 56%, 0.30)",
      },
      fontFamily: {
        sans: ["Inter", "Montserrat", "system-ui", "sans-serif"],
      },
      keyframes: {
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to:   { transform: "translateX(0)" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.15s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
