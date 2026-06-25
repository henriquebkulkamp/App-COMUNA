import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta verde — identidade orgânica da cooperativa
        verde: {
          50: "#f0faf4",
          100: "#d1f0e0",
          200: "#a3e0c0",
          300: "#74c69d",
          400: "#52b788",
          500: "#40916c",
          600: "#2d6a4f",
          700: "#1b4332",
          800: "#0d2b1f",
          900: "#081a13",
        },
        // Paleta terrosa — complementa o verde, evoca a terra
        terra: {
          50: "#fdf8f0",
          100: "#f5e6d0",
          200: "#eacca0",
          300: "#d4a574",
          400: "#c48b4e",
          500: "#8b5e3c",
          600: "#6b4423",
          700: "#4a2d14",
          800: "#2e1a09",
          900: "#150c04",
        },
        // Fundo creme — mais aconchegante que branco puro
        creme: "#F8F4E3",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
