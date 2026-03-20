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
          bg: "#0A0A0A",
          surface: "#121212",
          surfaceHover: "#1A1A1A",
          surfaceActive: "#242424",
          border: "#202020",
          borderHover: "#2A2A2A",
          text: "#EEEEEE",
          textMuted: "#888888",
          textDim: "#555555",
          accent: "#5E6AD2",
          accentHover: "#6B77DF",
          success: "#1F7A4C",
          warning: "#B07D1C",
          danger: "#C1343A",
          info: "#2F65CB",
          todo: "#4A4D53",
          inProgress: "#B07D1C",
          done: "#1F7A4C",
        },
      },
      boxShadow: {
        'linear': '0 1px 2px 0 rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'linear-sm': '0 1px 1px 0 rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'linear-hover': '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'popover': '0 8px 16px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'linear-gradient': 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)',
      }
    },
  },
  plugins: [],
};

export default config;
