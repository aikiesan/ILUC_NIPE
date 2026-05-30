/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FAFAFA",
        card: "#FFFFFF",
        border: "#E5E5E5",
        foreground: "#0A0A0A",
        muted: "#6B6B6B",
        accent: "#1A1A1A",
        highlight: "#F0F0F0",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
      },
    },
  },
  plugins: [],
};
