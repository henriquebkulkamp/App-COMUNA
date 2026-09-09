-- ============================================================
-- SCHEMA — banco Postgres da COMUNA
--
-- Substitui as abas da planilha Google Sheets:
--   Estoque        -> produtos
--   Configurações  -> configuracoes
--   Pedidos        -> pedidos
--   Solicitações   -> solicitacoes
--
-- A aba "Etiqueta" (cópia transposta dos pedidos, usada só para
-- facilitar a impressão manual) não foi recriada — era um truque
-- específico de planilha. Com os pedidos numa tabela normal, dá
-- pra gerar a etiqueta de impressão direto de uma consulta em
-- "pedidos" quando for necessário.
-- ============================================================

CREATE TABLE IF NOT EXISTS produtos (
  id                TEXT PRIMARY KEY,
  nome              TEXT NOT NULL,
  -- Preço base (de tabela) — sempre exibido, é o único preço quando
  -- não há desconto.
  preco             NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (preco >= 0),
  -- Preço real (com desconto) — opcional. NULL = sem desconto, mostra
  -- só o `preco` normalmente. Quando preenchido e diferente de `preco`,
  -- o cliente vê o preço base cortado e o preço real em destaque.
  preco_real        NUMERIC(10, 2) CHECK (preco_real IS NULL OR preco_real >= 0),
  unidade           TEXT NOT NULL,
  categoria         TEXT NOT NULL CHECK (categoria IN (
                      'Cestas',
                      'Frutas',
                      'Verduras e Legumes',
                      'Ervas e Temperos',
                      'Proteínas',
                      'Grãos e Cereais',
                      'Derivados e Processados',
                      'Bebidas',
                      'Pães e Panificação',
                      'Mel e Apícolas'
                    )),
  -- Disponibilidade é 100% derivada da quantidade (mesma regra do google-sheets.ts
  -- original) — não existe coluna separada de "em estoque".
  quantidade        INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  na_cesta_grande   BOOLEAN NOT NULL DEFAULT FALSE,
  na_cesta_pequena  BOOLEAN NOT NULL DEFAULT FALSE,
  descricao         TEXT,
  imagem_url        TEXT,
  -- Tags livres e opcionais (0, 1 ou várias por produto) — diferente
  -- de `categoria`, que é única e obrigatória. Ex: {'Orgânico','Vegano'}.
  tags              TEXT[] NOT NULL DEFAULT '{}',
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotente: garante a coluna em bancos criados antes dela existir
-- (CREATE TABLE IF NOT EXISTS acima não altera uma tabela já existente).
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS preco_real NUMERIC(10, 2) CHECK (preco_real IS NULL OR preco_real >= 0);

CREATE TABLE IF NOT EXISTS configuracoes (
  chave  TEXT PRIMARY KEY,
  valor  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS pedidos (
  id                 BIGSERIAL PRIMARY KEY,
  numero_pedido      TEXT UNIQUE NOT NULL,
  criado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  nome_cliente       TEXT NOT NULL,
  celular            TEXT NOT NULL,
  tipo_entrega       TEXT NOT NULL CHECK (tipo_entrega IN ('retirada', 'entrega')),
  endereco_entrega   TEXT,
  itens              TEXT NOT NULL,
  total_preco        NUMERIC(10, 2) NOT NULL CHECK (total_preco >= 0),
  observacoes        TEXT,
  status             TEXT NOT NULL DEFAULT 'Pendente'
);

CREATE TABLE IF NOT EXISTS solicitacoes (
  id                     BIGSERIAL PRIMARY KEY,
  criado_em              TIMESTAMPTZ NOT NULL DEFAULT now(),
  numero_pedido          TEXT NOT NULL,
  nome_cliente           TEXT NOT NULL,
  celular                TEXT NOT NULL,
  produtos_solicitados   TEXT NOT NULL
);

-- ============================================================
-- PERF_LOGS — removida. Guardava métricas de performance (Web
-- Vitals/long tasks) só pra alimentar um dashboard do Grafana que
-- nunca chegou a ser usado (ver docker-compose.yml e lib/observabilidade.ts,
-- ambos removidos junto). DROP explícito aqui porque este schema.sql
-- roda de novo a cada `npm run db:migrate`/`db:setup` — limpa também
-- quem já tinha essa tabela numa base local.
-- ============================================================
DROP TABLE IF EXISTS perf_logs;

-- Mantém atualizado_em em dia a cada UPDATE em produtos
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_produtos_atualizado_em ON produtos;
CREATE TRIGGER trg_produtos_atualizado_em
  BEFORE UPDATE ON produtos
  FOR EACH ROW
  EXECUTE FUNCTION set_atualizado_em();
