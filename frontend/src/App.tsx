import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PaginaPrincipal from "@/pages/PaginaPrincipal";
import PaginaCarrinho from "@/pages/PaginaCarrinho";

// ============================================================
// App — rotas da SPA. Espelha app/**/page.tsx da versão Next.js:
// "/" e "/carrinho" são páginas reais; "/cliente" e "/admin" eram
// stubs que só faziam `redirect("/")` (a distinção cliente/admin é
// decidida em runtime pelo PortaoAdmin, via localStorage — não por
// rota) — aqui isso é um <Navigate replace /> equivalente.
// ============================================================
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PaginaPrincipal />} />
        <Route path="/carrinho" element={<PaginaCarrinho />} />
        <Route path="/cliente" element={<Navigate to="/" replace />} />
        <Route path="/admin" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
