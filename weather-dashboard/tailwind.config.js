/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
      },
      boxShadow: {
        glass: "0 20px 50px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.38)",
      },
    },
  },
  plugins: [],
};
