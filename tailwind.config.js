/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14161A",
        panel: "#1B1E24",
        panel2: "#22262E",
        line: "#2C313A",
        accent: "#5B8CFF",
        accent2: "#7CE0C6",
        warn: "#F2A65A",
        danger: "#F0596B",
        mute: "#8A93A3",
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        pixel: "10px",
      },
    },
  },
  plugins: [],
};
