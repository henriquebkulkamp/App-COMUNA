"use client";

// ============================================================
// LOJA CONTEXT — Estado global da loja (estoque + cestas)
//
// Analogia Python:
//   class Loja:
//     produtos: list[Produto]
//     config_cesta: ConfigCestaSemana
//
// Em vez de uma instância de classe, usamos React Context +
// useReducer. É equivalente a um singleton com métodos.
//
// Persistência: localStorage (como salvar um dict em JSON)
//   with open('loja_state.json', 'w') as f:
//     json.dump(state, f)
// ============================================================

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { Produto, EstadoLoja, ConfigCestaSemana } from "./types";
import { PRODUTOS_INICIAIS, CONFIG_CESTA_INICIAL } from "./dados";

// Chave usada para salvar/recuperar do localStorage
// Pense como o nome do arquivo JSON onde gravamos o estado
const STORAGE_KEY = "comuna_loja_v1";

// ─── Actions (ações que mudam o estado) ────────────────────
// Analogia: cada action é como um método da classe Loja
// ex: loja.toggle_estoque("abacate") → dispatch({ type: "TOGGLE_ESTOQUE", id: "abacate" })
type Action =
  | { type: "TOGGLE_CESTA_GRANDE"; id: string }
  | { type: "TOGGLE_CESTA_PEQUENA"; id: string }
  | { type: "ATUALIZAR_PRECO"; id: string; novoPreco: number }
  | { type: "ATUALIZAR_PRECO_REAL"; id: string; novoPrecoReal: number | null }
  | { type: "ATUALIZAR_UNIDADE"; id: string; novaUnidade: string }
  | { type: "ADICIONAR_PRODUTO"; produto: Produto }
  | { type: "REMOVER_PRODUTO"; id: string }
  | { type: "ATUALIZAR_CONFIG_CESTA"; config: Partial<ConfigCestaSemana> }
  | { type: "CARREGAR_ESTADO"; estado: EstadoLoja }
  | { type: "CARREGAR_PRODUTOS_DA_API"; produtos: Produto[] }
  | { type: "ATUALIZAR_QUANTIDADE"; id: string; quantidade: number };

// ─── Reducer (função pura que calcula o novo estado) ────────
// Analogia Python: é como um switch/case que retorna uma cópia
// modificada do dicionário de estado. NUNCA muta o original —
// assim como você faria: new_state = {**old_state, 'campo': novo_valor}
function reducer(estado: EstadoLoja, action: Action): EstadoLoja {
  switch (action.type) {
    case "CARREGAR_ESTADO":
      return action.estado;

    // Substitui apenas a lista de produtos mantendo a config da cesta
    // (configCesta pode ter sido editada pela Elizete nessa sessão)
    case "CARREGAR_PRODUTOS_DA_API":
      return { ...estado, produtos: action.produtos };

    case "TOGGLE_CESTA_GRANDE":
      return {
        ...estado,
        produtos: estado.produtos.map((p) =>
          p.id === action.id ? { ...p, naCestaGrande: !p.naCestaGrande } : p
        ),
      };

    case "TOGGLE_CESTA_PEQUENA":
      return {
        ...estado,
        produtos: estado.produtos.map((p) =>
          p.id === action.id ? { ...p, naCestaPequena: !p.naCestaPequena } : p
        ),
      };

    case "ATUALIZAR_PRECO":
      return {
        ...estado,
        produtos: estado.produtos.map((p) =>
          p.id === action.id ? { ...p, preco: action.novoPreco } : p
        ),
      };

    case "ATUALIZAR_PRECO_REAL":
      return {
        ...estado,
        produtos: estado.produtos.map((p) =>
          p.id === action.id
            ? { ...p, precoReal: action.novoPrecoReal ?? undefined }
            : p
        ),
      };

    case "ATUALIZAR_UNIDADE":
      return {
        ...estado,
        produtos: estado.produtos.map((p) =>
          p.id === action.id ? { ...p, unidade: action.novaUnidade } : p
        ),
      };

    case "ATUALIZAR_QUANTIDADE":
      return {
        ...estado,
        produtos: estado.produtos.map((p) =>
          p.id === action.id
            ? { ...p, quantidade: action.quantidade, emEstoque: action.quantidade > 0 }
            : p
        ),
      };

    case "ADICIONAR_PRODUTO":
      return {
        ...estado,
        produtos: [...estado.produtos, action.produto],
      };

    case "REMOVER_PRODUTO":
      return {
        ...estado,
        produtos: estado.produtos.filter((p) => p.id !== action.id),
      };

    case "ATUALIZAR_CONFIG_CESTA":
      return {
        ...estado,
        configCesta: { ...estado.configCesta, ...action.config },
      };

    default:
      return estado;
  }
}

// Estado inicial — carregado do localStorage ou dos dados iniciais
const ESTADO_INICIAL: EstadoLoja = {
  produtos: PRODUTOS_INICIAIS,
  configCesta: CONFIG_CESTA_INICIAL,
};

// ─── Context e Provider ─────────────────────────────────────
// O Context é como um módulo Python importado em qualquer lugar.
// O Provider é o "escopo" dentro do qual o estado existe.
interface LojaContextType {
  estado: EstadoLoja;
  carregandoProdutos: boolean; // true enquanto a API do Google Sheets está respondendo
  toggleCestaGrande: (id: string) => void;
  toggleCestaPequena: (id: string) => void;
  atualizarPreco: (id: string, novoPreco: number) => void;
  atualizarPrecoReal: (id: string, novoPrecoReal: number | null) => void;
  atualizarUnidade: (id: string, novaUnidade: string) => void;
  adicionarProduto: (produto: Produto) => void;
  removerProduto: (id: string) => void;
  atualizarQuantidade: (id: string, quantidade: number) => void;
  // Getters computados — como @property em Python
  produtosEmEstoque: Produto[];
  itenscestaGrande: Produto[];
  itensCestaPequena: Produto[];
}

const LojaContext = createContext<LojaContextType | null>(null);

export function LojaProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(reducer, ESTADO_INICIAL);
  // true enquanto aguardamos a resposta da API do Google Sheets
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);

  // ── Busca produtos do Google Sheets via /api/produtos ─────
  // Este useEffect roda uma vez quando o app abre.
  // É a substituição do "arquivo dados.ts" — agora lemos da nuvem.
  //
  // Analogia Python: requests.get("/api/produtos").json()
  // O try/except cai no localStorage se a API falhar (ex: sem internet)
  useEffect(() => {
    async function carregarProdutos() {
      try {
        const resposta = await fetch("/api/produtos");
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

        const produtosDaApi: Produto[] = await resposta.json();
        dispatch({ type: "CARREGAR_PRODUTOS_DA_API", produtos: produtosDaApi });
      } catch (erro) {
        // Fallback: tenta carregar do localStorage (sessão anterior)
        console.warn("[LojaContext] API indisponível, usando cache local:", erro);
        try {
          const salvo = localStorage.getItem(STORAGE_KEY);
          if (salvo) {
            const estadoSalvo: EstadoLoja = JSON.parse(salvo);
            dispatch({ type: "CARREGAR_ESTADO", estado: estadoSalvo });
          }
        } catch {
          console.warn("Cache local inválido, usando dados iniciais.");
        }
      } finally {
        setCarregandoProdutos(false);
      }
    }

    carregarProdutos();
  }, []);

  // Salva no localStorage sempre que o estado mudar (cache offline).
  // Analogia: json.dump() automático após cada mudança.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  }, [estado]);

  // ─── Funções expostas para os componentes ─────────────────
  const toggleCestaGrande = useCallback(
    (id: string) => dispatch({ type: "TOGGLE_CESTA_GRANDE", id }),
    []
  );
  const toggleCestaPequena = useCallback(
    (id: string) => dispatch({ type: "TOGGLE_CESTA_PEQUENA", id }),
    []
  );
  const atualizarPreco = useCallback(
    (id: string, novoPreco: number) =>
      dispatch({ type: "ATUALIZAR_PRECO", id, novoPreco }),
    []
  );
  const atualizarPrecoReal = useCallback(
    (id: string, novoPrecoReal: number | null) =>
      dispatch({ type: "ATUALIZAR_PRECO_REAL", id, novoPrecoReal }),
    []
  );
  const atualizarUnidade = useCallback(
    (id: string, novaUnidade: string) =>
      dispatch({ type: "ATUALIZAR_UNIDADE", id, novaUnidade }),
    []
  );
  const adicionarProduto = useCallback(
    (produto: Produto) => dispatch({ type: "ADICIONAR_PRODUTO", produto }),
    []
  );
  const removerProduto = useCallback(
    (id: string) => dispatch({ type: "REMOVER_PRODUTO", id }),
    []
  );
  const atualizarQuantidade = useCallback(
    (id: string, quantidade: number) =>
      dispatch({ type: "ATUALIZAR_QUANTIDADE", id, quantidade }),
    []
  );

  // Getters computados — como fazer um filter() em Python
  // produtos_em_estoque = [p for p in produtos if p['em_estoque']]
  const produtosEmEstoque = estado.produtos.filter(
    (p) => p.emEstoque && p.categoria !== "Cestas"
  );
  const itenscestaGrande = estado.produtos.filter((p) => p.naCestaGrande);
  const itensCestaPequena = estado.produtos.filter((p) => p.naCestaPequena);

  return (
    <LojaContext.Provider
      value={{
        estado,
        carregandoProdutos,
        toggleCestaGrande,
        toggleCestaPequena,
        atualizarPreco,
        atualizarPrecoReal,
        atualizarUnidade,
        adicionarProduto,
        removerProduto,
        atualizarQuantidade,
        produtosEmEstoque,
        itenscestaGrande,
        itensCestaPequena,
      }}
    >
      {children}
    </LojaContext.Provider>
  );
}

// Hook personalizado — forma de "importar" o contexto em qualquer componente
// Analogia: é como fazer `from loja import loja_instance`
export function useLoja() {
  const ctx = useContext(LojaContext);
  if (!ctx) throw new Error("useLoja deve ser usado dentro de <LojaProvider>");
  return ctx;
}
