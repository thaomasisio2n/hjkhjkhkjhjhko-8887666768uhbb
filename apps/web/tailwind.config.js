/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Figtree", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#071824",
          900: "#0f212e",
          800: "#1a2c38",
          700: "#213743",
          600: "#2f4553",
          500: "#3d5564",
          400: "#557086",
          300: "#b1bad3",
        },
        accent: {
          DEFAULT: "#00e701",
          hover: "#1fff20",
          ink: "#05121a",
        },
        blue: {
          DEFAULT: "#1475e1",
          hover: "#1a82f5",
        },
        gold: "#f4c542",
      },
      boxShadow: {
        bar: "0 4px 12px -2px rgba(0, 0, 0, 0.35)",
        card: "0 4px 10px -2px rgba(0, 0, 0, 0.3)",
        lift: "0 12px 24px -8px rgba(0, 0, 0, 0.55)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "slide-in": { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "pop-in": "pop-in 180ms ease-out",
        "slide-in": "slide-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};
