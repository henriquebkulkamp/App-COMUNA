import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mesmo alias "@/..." usado no projeto Next.js original (ver
      // tsconfig.json daqui) — assim os imports dos componentes/lib
      // portados não precisaram mudar.
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
