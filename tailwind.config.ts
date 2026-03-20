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
        // Board colors - fluo style flat
        cef: "#00E5FF", // Cyan
        agr: "#FF00E5", // Magenta

        // Fluorescent palette (vivid but solid)
        fluo: {
          cyan: "#00E5FF",
          magenta: "#FF00E5",
          lime: "#39FF14",
          yellow: "#FFFF00",
          orange: "#FF5F00",
          pink: "#FF007F",
          purple: "#9D00FF",
          blue: "#0055FF",
          green: "#00FE00",
          red: "#FF003F",
        },

        // Background colors - Super clean & white
        bg: {
          primary: "#FFFFFF",
          secondary: "#F7F7F7",
          tertiary: "#EFEFEF",
          card: "#FFFFFF",
        },

        // Text colors - High contrast for white bg
        text: {
          primary: "#000000",
          secondary: "#444444",
          muted: "#888888",
        },
      },
      boxShadow: {
        // Flat design means no shadows or sharp solid shadows
        hard: "4px 4px 0px 0px rgba(0,0,0,1)",
        "hard-sm": "2px 2px 0px 0px rgba(0,0,0,1)",
        none: "none",
      },
    },
  },
  plugins: [],
};

export default config;
