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
  build: {
    rollupOptions: {
      output: {
        // Só React/react-dom/react-router-dom aqui — usados sem
        // condição em toda página, então agrupar não quebra nenhum
        // lazy loading. Separar em vendor chunk não reduz bytes totais,
        // mas separa código que quase não muda (React) do código do
        // app (que muda a cada deploy) — o navegador reaproveita o
        // cache do vendor entre deploys em vez de rebaixar tudo de novo.
        //
        // NÃO incluir @cloudscape-design/components aqui: boa parte
        // dele (Table, Tabs, ColumnLayout...) só é usada nas telas
        // admin-only, importadas via React.lazy() de propósito (ver
        // PainelAdmin.tsx) pra não entrar no bundle de quem visita só
        // como cliente. Forçar tudo do Cloudscape num chunk manual
        // único ignora essa fronteira de import dinâmico e faz esse
        // CSS/JS admin-only carregar pra todo mundo — testado e
        // revertido (~600KB de CSS a mais pra clientes comuns).
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
