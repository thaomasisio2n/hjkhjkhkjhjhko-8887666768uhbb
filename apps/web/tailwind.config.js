/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          950: "#0b0d14",
          900: "#11141f",
          800: "#181c2a",
          700: "#232838",
        },
        brand: {
          500: "#6d5efc",
          400: "#8a7bff",
        },
        gold: "#f4c542",
      },
    },
  },
  plugins: [],
};
