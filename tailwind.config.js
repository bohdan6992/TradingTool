// tailwind.config.js
export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 20px rgba(255, 255, 255, 0.6)", // універсальне біле світіння
        "glow-blue": "0 0 20px rgba(0, 191, 255, 0.7)",
        "glow-green": "0 0 20px rgba(0, 255, 127, 0.7)",
        "glow-pink": "0 0 20px rgba(255, 105, 180, 0.7)",
        "glow-purple": "0 0 20px rgba(186, 85, 211, 0.7)",
      },
    },
  },
  plugins: [],
};
