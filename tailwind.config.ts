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
          bg: "#F2F2EA",           // warm paper off-white
          surface: "#FFFFFF",
          surfaceHover: "#EBEBDF",
          surfaceActive: "#E2E2D4",
          border: "#D4D4C4",
          borderHover: "#B8B8A4",
          text: "#0C0C08",         // warm near-black
          textMuted: "#6B6B54",
          textDim: "#A8A888",
          accent: "#0047FF",       // electric klein blue
          accentHover: "#0035CC",
          success: "#00C864",
          warning: "#FF9500",
          danger: "#FF2D55",
          info: "#0047FF",
          // Epic bar fills — full-saturation fluo
          todo: "#DDFF00",         // acid chartreuse
          inProgress: "#FF3D8A",   // hot magenta
          done: "#00F5A0",         // neon mint
        },
      },
      boxShadow: {
        // Flat offset shadows — design agency signature
        'linear':       '2px 2px 0px #D4D4C4',
        'linear-sm':    '1px 1px 0px #D4D4C4',
        'linear-hover': '4px 4px 0px #B8B8A4',
        'popover':      '6px 6px 0px #0C0C08',
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
