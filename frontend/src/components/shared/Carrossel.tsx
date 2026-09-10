import { useCallback, useEffect, useRef, useState } from "react";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import {
  spaceScaledXs,
  spaceScaledS,
  spaceScaledM,
  colorTextAccent,
  colorBorderDividerDefault,
} from "@cloudscape-design/design-tokens";

interface CarrosselProps<T> {
  /** Título mostrado no cabeçalho do carrossel. */
  titulo: React.ReactNode;
  /** Itens a exibir — o carrossel não sabe (nem precisa saber) o que são. */
  itens: readonly T[];
  /** Chave estável de cada item, pro React (e pra medir o primeiro). */
  chave: (item: T) => string;
  /** Como renderizar cada item. Só o conteúdo — a largura do "cartão"
   *  quem decide é quem chama, o carrossel só mede o que renderizou. */
  renderItem: (item: T) => React.ReactNode;
  /** Id opcional no container raiz — útil quando há mais de um
   *  carrossel na mesma página (ex: escopar seletores em testes). */
  id?: string;
}

// ============================================================
// Carrossel — componente genérico e reutilizável (não sabe nada
// sobre "produto"): recebe um título e uma lista de itens quaisquer.
//
// "Quantos cabem por vez" NÃO é um número fixo — é medido de verdade
// no navegador: a largura do container disponível dividido pela
// largura real do primeiro item renderizado (+ o gap entre eles).
// Redimensionou a tela? Um ResizeObserver remede e recalcula.
//
// Navegar pro lado sempre desliza exatamente uma "tela cheia" de
// itens (a mesma largura usada pra calcular quantos cabem) — nunca
// um item de cada vez. É em loop: da última página, "próximo" volta
// pra primeira; da primeira, "anterior" vai pra última. Sem fim.
//
// Todo espaçamento/cor vem de @cloudscape-design/design-tokens. O
// Container fica com a cor branca padrão do Cloudscape — quem contrasta
// com o fundo colorido da página é ele, não o contrário.
// ============================================================
export default function Carrossel<T>({ titulo, itens, chave, renderItem, id }: CarrosselProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trilhaRef = useRef<HTMLDivElement>(null);
  const primeiroItemRef = useRef<HTMLDivElement>(null);

  const [itensPorPagina, setItensPorPagina] = useState(1);
  // Distância (em px) entre o início de uma página e o início da
  // próxima — é a soma da largura real dos itens daquela página,
  // NÃO a largura do container. Como a divisão quase nunca é exata
  // (ex: cabem 2.5 itens, então 2 por página), deslocar pela largura
  // do container acumula um desvio a cada página e estoura o
  // conteúdo de verdade perto do fim. Deslocando pela largura real
  // ocupada pelos itens, cada página começa exatamente onde a
  // anterior terminou.
  const [passoPagina, setPassoPagina] = useState(0);
  const [paginaAtual, setPaginaAtual] = useState(0);

  // Mede o container e o primeiro item de verdade no DOM — nada de
  // "cabe X por breakpoint" decidido a priori.
  const recalcular = useCallback(() => {
    const container = containerRef.current;
    const trilha = trilhaRef.current;
    const item = primeiroItemRef.current;
    if (!container || !trilha || !item) return;

    const larguraDisponivel = container.clientWidth;
    const larguraItem = item.getBoundingClientRect().width;
    if (larguraItem <= 0 || larguraDisponivel <= 0) return;

    const gap = parseFloat(getComputedStyle(trilha).columnGap || "0") || 0;
    const porPagina = Math.max(1, Math.floor((larguraDisponivel + gap) / (larguraItem + gap)));

    setItensPorPagina(porPagina);
    setPassoPagina(porPagina * (larguraItem + gap));
  }, []);

  useEffect(() => {
    recalcular();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => recalcular());
    observer.observe(container);
    return () => observer.disconnect();
  }, [recalcular, itens.length]);

  const totalPaginas = Math.max(1, Math.ceil(itens.length / itensPorPagina));

  // Se a tela mudou de tamanho e agora cabem mais itens por página, o
  // total de páginas encolhe — garante que a página atual continua válida.
  useEffect(() => {
    setPaginaAtual((atual) => (atual > totalPaginas - 1 ? 0 : atual));
  }, [totalPaginas]);

  function irParaPagina(pagina: number) {
    setPaginaAtual(pagina);
  }

  // Usam a forma funcional do setState (em vez de ler `paginaAtual` da
  // closure) de propósito: se o botão for clicado várias vezes antes do
  // React re-renderizar entre um clique e outro, cada atualização ainda
  // enxerga o resultado da anterior — sem isso, cliques rápidos em
  // sequência podiam "perder" avanços por lerem a mesma página desatualizada.
  //
  // Loop sempre animado: da última página, "próximo" desliza de volta até
  // a primeira (e vice-versa em "anterior") — a transição do CSS já cuida
  // disso sozinha, sem precisar duplicar itens na trilha.
  function proximo() {
    setPaginaAtual((atual) => (atual >= totalPaginas - 1 ? 0 : atual + 1));
  }

  function anterior() {
    setPaginaAtual((atual) => (atual <= 0 ? totalPaginas - 1 : atual - 1));
  }

  const temNavegacao = itens.length > itensPorPagina;

  if (itens.length === 0) return null;

  return (
    <Container
      id={id}
      // Sem borda/sombra: o fundo da página já contrasta com o branco
      // do Container, então a moldura é redundante.
      style={{ root: { borderWidth: "0", boxShadow: "none" } }}
      header={
        <Header
          variant="h2"
          actions={
            temNavegacao ? (
              <div style={{ display: "flex", gap: spaceScaledXs }}>
                <Button
                  variant="icon"
                  iconName="angle-left"
                  ariaLabel="Ver anteriores"
                  onClick={anterior}
                />
                <Button
                  variant="icon"
                  iconName="angle-right"
                  ariaLabel="Ver próximos"
                  onClick={proximo}
                />
              </div>
            ) : undefined
          }
        >
          {titulo}
        </Header>
      }
    >
      <div ref={containerRef} data-testid="carrossel-viewport" style={{ overflow: "hidden" }}>
        <div
          ref={trilhaRef}
          data-testid="carrossel-trilha"
          style={{
            display: "flex",
            gap: spaceScaledM,
            transform: `translateX(-${paginaAtual * passoPagina}px)`,
            transition: "transform 0.3s ease-in-out",
          }}
        >
          {itens.map((item, indice) => (
            <div
              key={chave(item)}
              ref={indice === 0 ? primeiroItemRef : undefined}
              style={{ flex: "0 0 auto" }}
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      </div>

      {temNavegacao && (
        <Box textAlign="center" padding={{ top: "s" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: spaceScaledXs }}>
            {Array.from({ length: totalPaginas }, (_, indice) => (
              <button
                key={indice}
                type="button"
                aria-label={`Ir para página ${indice + 1} de ${totalPaginas}`}
                aria-current={indice === paginaAtual}
                onClick={() => irParaPagina(indice)}
                style={{
                  width: spaceScaledS,
                  height: spaceScaledS,
                  borderRadius: "9999px",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  backgroundColor:
                    indice === paginaAtual ? colorTextAccent : colorBorderDividerDefault,
                }}
              />
            ))}
          </div>
        </Box>
      )}
    </Container>
  );
}
