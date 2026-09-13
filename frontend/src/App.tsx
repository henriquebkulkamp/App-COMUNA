import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PaginaPrincipal from "@/pages/PaginaPrincipal";
import PaginaProduto from "@/pages/PaginaProduto";
import PaginaCarrinho from "@/pages/PaginaCarrinho";
import PaginaLogin from "@/pages/PaginaLogin";
import PaginaCadastro from "@/pages/PaginaCadastro";
import PaginaAdmin from "@/pages/PaginaAdmin";

// ============================================================
// App — rotas da SPA.
//
// "/cliente" continua sendo puro stub (`redirect("/")` — a versão
// Next.js original já não distinguia cliente por rota).
//
// "/produto/:id" é a tela de detalhe — CartaoProduto (vitrine e
// carrossel de destaques) navega pra cá ao clicar num produto.
//
// "/admin" e "/login" NÃO são mais stub: antes, "Área da COMUNA" abria
// um Modal por cima da própria home (PortaoAdmin.tsx, removido) — só
// dava pra logar estando na home, e o painel substituía a home
// inteira. Agora são páginas de verdade, então dá pra logar estando
// em qualquer página (ex: no meio do carrinho) e a Elizete acessa o
// painel sem depender de estar na home. PaginaLogin.tsx guarda de
// onde veio (`location.state.from`) e volta pra lá depois de logar —
// não força ir pra home. PaginaAdmin.tsx redireciona pra "/login" com
// esse mesmo "from" quando não autenticado.
// ============================================================
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PaginaPrincipal />} />
        <Route path="/produto/:id" element={<PaginaProduto />} />
        <Route path="/carrinho" element={<PaginaCarrinho />} />
        <Route path="/cliente" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<PaginaLogin />} />
        <Route path="/cadastro" element={<PaginaCadastro />} />
        <Route path="/admin" element={<PaginaAdmin />} />
      </Routes>
    </BrowserRouter>
  );
}
