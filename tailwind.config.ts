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
          bg: "#FAFAFA",           // cool near-white
          surface: "#FFFFFF",
          surfaceHover: "#F5F5F5",
          surfaceActive: "#EEEEEE",
          border: "#E0E0E0",
          borderHover: "#C8C8C8",
          text: "#111111",         // cool near-black
          textMuted: "#666666",
          textDim: "#AAAAAA",
          accent: "#0047FF",       // electric klein blue
          accentHover: "#0035CC",
          success: "#00C864",
          warning: "#FF9500",
          danger: "#FF2D55",
          info: "#0047FF",
          // Epic bar fills
          todo: "#DDFF00",         // acid chartreuse
          inProgress: "#fafafa",    // white — defined by border
          done: "#00F5A0",         // neon mint
        },
      },
      boxShadow: {
        // Flat offset shadows — design agency signature
        'linear':       '2px 2px 0px #E0E0E0',
        'linear-sm':    '1px 1px 0px #E0E0E0',
        'linear-hover': '4px 4px 0px #C8C8C8',
        'popover':      '6px 6px 0px #111111',
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
