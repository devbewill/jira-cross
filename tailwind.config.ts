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
          bg: "#F7F7FA",
          surface: "#FFFFFF",
          surfaceHover: "#F0F0F5",
          surfaceActive: "#E8E8F0",
          border: "#E0E0EA",
          borderHover: "#C8C8D8",
          text: "#0D0D14",
          textMuted: "#6B6B82",
          textDim: "#A0A0B8",
          accent: "#5E6AD2",
          accentHover: "#4A56C8",
          success: "#00B85C",
          warning: "#F5A623",
          danger: "#E53935",
          info: "#2F65CB",
          // Epic block status colors — fluorescent light variants
          todo: "#8B8BF8",
          inProgress: "#F5A623",
          done: "#00CC66",
        },
      },
      boxShadow: {
        'linear': '0 1px 2px 0 rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(0, 0, 0, 0.04)',
        'linear-sm': '0 1px 1px 0 rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(0, 0, 0, 0.04)',
        'linear-hover': '0 4px 12px rgba(0, 0, 0, 0.12), inset 0 0 0 1px rgba(0, 0, 0, 0.06)',
        'popover': '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'linear-gradient': 'linear-gradient(180deg, rgba(0,0,0,0.01) 0%, rgba(0,0,0,0) 100%)',
      }
    },
  },
  plugins: [],
};

export default config;
