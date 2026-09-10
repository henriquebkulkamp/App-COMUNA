# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Clientes** (consumidores conscientes): navegam a cesta da semana e o catálogo de produtos avulsos, montam um carrinho e finalizam o pedido preenchendo nome/celular/tipo de recebimento — o app então monta uma mensagem pronta e abre o WhatsApp para o fechamento real do pedido.
- **Elizete**, administradora única da cooperativa: autentica com PIN (verificado no servidor) num painel dedicado para gerenciar estoque, preços, montar a cesta grande/pequena da semana e ajustar configurações (ex.: número de WhatsApp de contato).

Confirmado com o usuário: só existem esses dois papéis hoje, e nenhum outro está planejado (ex.: os agricultores/produtores não interagem diretamente com o app).

## Product Purpose

COMUNA é a loja online de uma cooperativa orgânica agroflorestal que conecta agricultores familiares a consumidores conscientes. O app substitui um fluxo antes baseado em planilha Google Sheets (abas Estoque/Configurações/Pedidos/Solicitações) por um cardápio web com carrinho — mas o fechamento do pedido continua deliberadamente manual: o carrinho vira uma mensagem pré-formatada enviada por WhatsApp, com pagamento e confirmação final de disponibilidade combinados fora do app. Sucesso = Elizete consegue operar estoque/cesta sozinha, e clientes conseguem montar e enviar pedidos sem fricção.

## Positioning

Conexão direta entre pequenos agricultores familiares (produção agroflorestal orgânica) e o consumidor final, sem intermediários. A cesta semanal curada (Grande/Pequena) é o produto-âncora, complementada por um catálogo extenso de itens avulsos (frutas, verduras, ervas, proteínas, grãos, derivados, bebidas, pães, mel). O pedido é finalizado por WhatsApp, não por checkout/pagamento online — diferente de um e-commerce convencional.

## Operating Context

- Cooperativa real, confirmada pelo usuário como **pré-lançamento**: o app ainda não está no ar com clientes reais. O número de WhatsApp no código é um placeholder explícito ("substitua pelo número real da Elizete antes de ir para produção").
- Endereço de retirada já cadastrado: Bela Liria, Rua Cerqueira Cesar, 1826, Jardim Sumaré (região com DDD 17 — São José do Rio Preto/SP).
- Catálogo de produtos extenso e já povoado (centenas de itens, extraídos de um PDF de requisitos real da cooperativa), organizado em 10 categorias fixas: Cestas, Frutas, Verduras e Legumes, Ervas e Temperos, Proteínas, Grãos e Cereais, Derivados e Processados, Bebidas, Pães e Panificação, Mel e Apícolas.
- Idioma do produto: português (pt-BR) — copy, domínio de dados e nomes de campos são todos em português.
- Disponibilidade de cada produto é 100% derivada da quantidade em estoque (sem coluna separada de "em estoque").

## Capabilities and Constraints

- **Sem pagamento online**: o pedido é gravado no banco (Postgres) e enviado como mensagem via `wa.me`; forma de pagamento e confirmação final de disponibilidade são combinadas manualmente fora do app.
- Autenticação do admin é um PIN único verificado no servidor — sem contas nem múltiplos administradores.
- Preço com desconto é opcional por produto (`precoReal`): quando presente e diferente do preço base, o cliente vê o preço base riscado e o preço real em destaque.
- Categoria de produto é única e obrigatória por item; tags são livres, opcionais e múltiplas por produto.
- Stack existente (não é uma decisão em aberto): Next.js 15 (App Router) + React 18, Postgres via `pg`, Cloudscape Design System (componentes e tokens da AWS) como biblioteca de UI, FlexSearch para busca de produtos, Playwright para e2e e Lighthouse CI para performance.

## Brand Commitments

- Nome confirmado: **COMUNA**. Tagline/copy institucional já existente e em uso na home: "Somos uma cooperativa orgânica agroflorestal que conecta agricultores familiares e consumidores conscientes... Mais do que uma feira, somos um projeto de vida — semeando alimento, saúde e comunidade." Rodapé: "🌱 COMUNA — Cooperativa Orgânica Agroflorestal" / "Semeando amor e vida!".
- Nenhum outro asset de marca (logo, paleta oficial, tipografia definida) foi encontrado no repositório ou confirmado pelo usuário.

## Evidence on Hand

- Catálogo de produtos real e extenso já carregado em `lib/dados.ts` (centenas de itens com nomes, preços e unidades reais de uma feira orgânica).
- Copy institucional real (ver Brand Commitments) já em produção no código, não deve ser tratada como placeholder.
- Nenhum depoimento, estudo de caso, dado de imprensa ou benchmark real está disponível — trabalho futuro não deve inventar nenhum desses.
- Nenhum asset visual de marca (logo, paleta oficial) foi encontrado — o visual atual usa o design system Cloudscape "as-is", sem skin própria.

## Product Principles

1. O pedido sempre termina numa mensagem de WhatsApp clara e completa — não substituir esse fechamento por um checkout/pagamento dentro do app sem decisão explícita do usuário.
2. Elizete precisa conseguir operar tudo sozinha (estoque, cesta da semana, preços, configurações) — telas de admin priorizam velocidade e clareza operacional.
3. Disponibilidade é sempre provisória até a separação do pedido — a comunicação com o cliente deve deixar isso explícito (como já ocorre no alerta de confirmação do checkout).
4. A cesta da semana é o produto-âncora e ocupa o espaço mais privilegiado da home, logo abaixo do header, antes de qualquer outra seção.
5. Não inventar prova social, dados de negócio ou reivindicações que a cooperativa não confirmou.

## Accessibility & Inclusion

Nenhum requisito específico de acessibilidade foi estabelecido pelo usuário até o momento.
