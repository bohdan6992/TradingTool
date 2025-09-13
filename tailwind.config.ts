import type { Config } from "tailwindcss"
const config: Config = {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { brand: { DEFAULT: "#6cf3e7", violet: "#a98bff" } },
      boxShadow: { glow: "0 0 30px rgba(108,243,231,.35)" }
    }
  },
  plugins: []
}
export default config
