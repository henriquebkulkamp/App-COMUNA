import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// O CSS base do Cloudscape precisa carregar antes de qualquer CSS
// específico de componente — por isso vem primeiro que o globals.css.
import "@cloudscape-design/global-styles/index.css";
// Tema de marca (verde) — CSS gerado, ver o cabeçalho do arquivo pra
// como regerar. Carrega bloqueando o primeiro paint (o Vite extrai
// todo CSS importado estaticamente pra um <link> real no build de
// produção), então a página já nasce verde — sem o flash de
// azul-padrão-do-Cloudscape virando verde depois que o React monta.
import "./styles/tema-marca.generated.css";
import "./styles/globals.css";
import { CarrinhoProvider } from "@/lib/carrinho-context";
import CloudscapeThemeInit from "@/components/shared/CloudscapeThemeInit";
import App from "./App";

// document.title substitui `export const metadata` do app/layout.tsx
// (Next.js) — sem servidor, não existe onde gerar <head> antes do
// primeiro paint; isso é ajustado direto no index.html (ver esse
// arquivo) e aqui não precisa ser repetido.

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CloudscapeThemeInit />
    {/* CarrinhoProvider fornece o estado do carrinho pra todo o app.
        LojaProvider não mora aqui — só o painel admin precisa dele,
        e fica escopado lá dentro (components/admin/PainelAdmin.tsx). */}
    <CarrinhoProvider>
      <App />
    </CarrinhoProvider>
  </StrictMode>
);
