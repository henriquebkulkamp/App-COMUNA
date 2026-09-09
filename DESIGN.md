---
name: COMUNA
description: Loja online de uma cooperativa orgânica agroflorestal, construída 100% sobre o Cloudscape (AWS) com uma única semente de marca — verde — enxertada no sistema.
colors:
  verde-copa: "#2a794c"
  verde-copa-profunda: "#003219"
  verde-broto: "#f3fcf1"
  verde-sucesso: "#00802f"
  ambar-alerta: "#855900"
  creme-alerta: "#fffef0"
  vermelho-erro: "#db0000"
  azul-informativo: "#006ce0"
  areia-suave: "#f0f0e8"
  branco: "#ffffff"
  texto-padrao: "#0f141a"
  texto-secundario: "#424650"
  divisor: "#c6c6cd"
typography:
  body:
    fontFamily: "'Open Sans', 'Helvetica Neue', Roboto, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "'Open Sans', 'Helvetica Neue', Roboto, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  title:
    fontFamily: "'Open Sans', 'Helvetica Neue', Roboto, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "22px"
  headline:
    fontFamily: "'Open Sans', 'Helvetica Neue', Roboto, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "30px"
rounded:
  badge: "4px"
  input: "8px"
  container: "16px"
  button: "20px"
spacing:
  xxs: "4px"
  xs: "8px"
  s: "12px"
  m: "16px"
  l: "20px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.verde-copa}"
    textColor: "{colors.branco}"
    rounded: "{rounded.button}"
  button-primary-hover:
    backgroundColor: "{colors.verde-copa-profunda}"
    textColor: "{colors.branco}"
    rounded: "{rounded.button}"
  button-normal:
    backgroundColor: "{colors.branco}"
    textColor: "{colors.verde-copa}"
    rounded: "{rounded.button}"
  container:
    backgroundColor: "{colors.branco}"
    rounded: "{rounded.container}"
  input:
    backgroundColor: "{colors.branco}"
    rounded: "{rounded.input}"
---

# Design System: COMUNA

## Overview

**Creative North Star: "O Kit Disciplinado"**

COMUNA não desenha componentes — importa o Cloudscape (o design system da AWS para consoles de nuvem) inteiro, sem reescrever um único átomo, e enxerta nele uma única decisão de marca: a semente de cor primária, trocada do azul padrão do console por um verde de copa de árvore. Todo o resto — espaçamento, raio, tipografia, sombra, densidade — é herdado sem adaptação. Essa disciplina é o ponto: nada aqui foi inventado à mão quando o design system já resolvia, e a única liberdade tomada (a cor) foi tomada de forma sistêmica (via a API de theming oficial do Cloudscape, gerando uma rampa tonal inteira a partir de uma semente), não como CSS solto por cima.

O calor humano da cooperativa não vem de ilustração nem de gradiente — vem de dois lugares pontuais: emojis como sistema de ícone inteiro do produto (🌿🧺📦🛒🔒👩‍🌾), e copy em primeira pessoa ("Olá, Elizete!", "Semeando amor e vida!"). Fora esses dois pontos, a superfície é a de um console de operação: tabelas, chips de filtro, formulários densos, sem decoração.

**Key Characteristics:**
- Zero componente customizado — Container, Button, Table, Tabs, Modal, StatusIndicator são todos Cloudscape puro.
- Uma única semente de marca (verde) propagada via API de theming, nunca hexadecimais soltos nos componentes.
- Emoji como sistema de ícone completo — nenhum outro conjunto de ícones existe no produto.
- Superfícies planas em repouso; a única sombra viva é a barra fixa do topo e diálogos.

## Colors

Duas famílias de verde que **nunca devem se misturar**, mais os semânticos de status herdados intactos do Cloudscape.

### Primary
- **Verde Copa** (`#2a794c`): cor de marca — fundo de botão primário, barra do Header, ícone de foco, links, checkbox/radio marcados, aba ativa, filtro selecionado. É a semente de `referenceTokens.color.primary` no tema Cloudscape; toda a rampa (50 a 1000) deriva dela.
- **Verde Copa Profunda** (`#003219`): hover e active de tudo que usa Verde Copa — botão primário pressionado, link em hover, borda de card de ação em hover.
- **Verde Broto** (`#f3fcf1`): fundo de hover suave (item de dropdown, botão normal em hover, card de ação em hover) — o tom mais claro da mesma rampa.

### Neutral
- **Branco** (`#ffffff`): fundo de todo Container, Modal, Input — nunca a página em si.
- **Areia Suave** (`#f0f0e8`): fundo da página do cliente (não do admin). Um degrau mais escuro que `creme-alerta` do próprio Cloudscape, mas aquém do próximo degrau saturado da paleta de aviso — escolhido a dedo para contrastar com o branco dos Containers sem virar cor de marca.
- **Texto Padrão** (`#0f141a`): corpo de texto, nomes de produto, títulos.
- **Texto Secundário** (`#424650`): descrições, preço riscado, metadados.
- **Divisor** (`#c6c6cd`): toda borda/linha de separação — não há sombra fazendo esse papel.

### Status (herdados do Cloudscape, propositalmente fora do verde de marca)
- **Verde Sucesso** (`#00802f`): preço com desconto em destaque, StatusIndicator de "disponível"/"itens à vontade". Mais amarelado e mais escuro que o Verde Copa — perto o bastante pra ler como a mesma família orgânica, longe o bastante pra nunca ser confundido com uma ação de marca.
- **Âmbar de Alerta** (`#855900` texto/borda sobre `#fffef0` fundo): aviso de disponibilidade sujeita a confirmação, estoque baixo.
- **Vermelho de Erro** (`#db0000`): PIN incorreto, badge de contagem do carrinho.
- **Azul Informativo** (`#006ce0`): o único lugar onde o azul original do Cloudscape sobrevive — StatusIndicator/Alert do tipo "info", diálogos. Deliberado: ver Named Rule abaixo.

### Named Rules
**The One Canopy Rule.** Só existe uma cor de marca (Verde Copa). Nunca usar Verde Sucesso, Âmbar ou Vermelho como substituto de marca — eles têm significado de status, não de identidade, e essa distinção é o que impede a interface de virar "tudo verde, nada quer dizer nada".

**The Info Stays Blue Rule.** Trocar a marca pra verde não significa varrer o azul do produto. Qualquer token que resolvia para `colorInfoNNN` no Cloudscape (não `colorPrimaryNNN`) continua azul de propósito — é semântica de status "informativo", não de marca, e reescrevê-lo quebraria a leitura de Alert/StatusIndicator em qualquer tela futura que os use.

## Typography

**Body/Display Font:** 'Open Sans' (com 'Helvetica Neue', Roboto, Arial, sans-serif)

**Character:** Tipografia 100% padrão do Cloudscape — sem fonte de exibição separada, sem itálico decorativo. A hierarquia inteira é feita por peso (bold nos nomes de produto e cabeçalhos, normal no corpo) e tamanho, nunca por cor ou família.

### Hierarquia
- **Headline** (700, 24px, 30px): título "Cesta da Semana", "Bem-vindo à COMUNA" — variant h1 do Cloudscape.
- **Title** (700, 18px, 22px): cabeçalhos de card (h2), nome de produto em destaque.
- **Body** (400, 14px, 20px): corpo de texto, preços, descrições, itens de lista.
- **Label** (400, 12px, 16px): preço riscado, metadados secundários, texto de rodapé.

## Layout

Densidade "Comfortable" do Cloudscape em todo o app (nunca "Compact") — decisão explícita via `applyDensity`, não o padrão da lib. Escala de espaçamento em passos de 4px (`xxs` 4 → `xxl` 32), sempre puxada dos tokens (`spaceScaledS`, `spaceScaledM`...), nunca pixel cravado à mão.

O conteúdo do cliente ocupa ~80% da largura da tela (teto de 1800px) — mais largo que um Container Cloudscape típico, porque não há coluna reservada para carrinho (o carrinho vive num Modal). O admin usa um `<main>` mais estreito (48rem), como um formulário de console comum. A seção "Cesta da Semana" trava em 50% da altura da viewport (mínimo 420px) — é o único elemento da página com altura própria; todo o resto flui pelo conteúdo.

Em telas estreitas, o carrossel de destaques e a grade de avulsos empilham/scrollam horizontalmente; os dois cards de cesta (Grande/Pequena) empilham verticalmente via `flex-wrap`.

## Elevation & Depth

**The Flat-by-Default Rule.** `shadow-card` é `none` no tema Cloudscape usado aqui — Container, card de produto e a seção de cesta ficam totalmente planos em repouso; a separação vem de cor de fundo (branco sobre Areia Suave) e do Divisor, nunca de sombra. A única sombra viva no produto é a barra fixa do Header (`shadow-container-active`, um duplo box-shadow suave que ancora a barra sobre o conteúdo que rola por baixo) e o chrome padrão de Modal/dropdown do Cloudscape.

## Shapes

Cantos generosos e consistentes, sempre do maior pro menor conforme a hierarquia do elemento: botões em `20px` (quase pill numa altura de botão padrão), Containers/cards em `16px`, campos de input em `8px`, badges/pills de filtro em `4px`. Nenhum elemento do produto usa canto reto — nem o card de produto, nem a imagem dentro dele (herda o `border-radius` do Container que a envolve).

## Components

### Buttons
- **Shape:** cantos de `20px`.
- **Primary:** fundo Verde Copa, texto branco; hover/active escurece pra Verde Copa Profunda. Usado para toda ação de conversão — "Quero a Cesta Grande", "Adicionar Novo Produto", "Finalizar Pedido via WhatsApp".
- **Normal (secundário):** fundo branco, borda e texto em Verde Copa; hover tinge o fundo de Verde Broto. Usado pra ações não-primárias — "Área da COMUNA", "Cancelar", "← Voltar".
- **Link:** texto Verde Copa sem fundo/borda; hover escurece pra Verde Copa Profunda. Usado pra "Sair" e ações terciárias.

### Cards / Containers
- **Corner Style:** `16px`.
- **Background:** branco, sempre — mesmo sobre o fundo Areia Suave da home ou dentro de outro Container (ex.: os dois CartaoCesta dentro da seção "Cesta da Semana").
- **Shadow Strategy:** nenhuma (ver Elevation & Depth); a seção "Cesta da Semana" remove até a borda padrão do Container (`borderWidth: 0`) porque o próprio contraste com Areia Suave já resolve a separação.
- **Border:** Divisor (`#c6c6cd`) quando presente; ausente na seção hero.

### Product Card (componente de assinatura)
Um único componente (`CartaoProduto`) usado tanto no carrossel de destaques quanto na grade de avulsos, com dimensão fixa (~280×260px) não importa o conteúdo: imagem `object-fit: cover` com o mesmo raio do Container, nome do produto sempre reservando 2 linhas (`line-clamp`, mesmo cabendo em 1), preço sempre ancorado no rodapé do card via `margin-top: auto`. `semMoldura` remove o Container quando o card já flutua sobre um fundo próprio (carrossel); a grade usa o Container normal pra separar cards lado a lado.

### Inputs / Fields
- **Style:** borda cinza-média por padrão (`#8c8c94`), fundo branco, cantos de `8px`.
- **Focus:** borda muda para Verde Copa — mesmo token que rege foco de qualquer item interativo (`colorBorderInputFocused`/`colorBorderItemFocused`).

### Navigation (Header)
Barra própria (não o `TopNavigation` do Cloudscape — seu modelo de slots é pensado pro nav global do Console AWS), mas 100% tokenizada: fundo Verde Copa, texto branco, ícone de emoji (🌿) + nome + tagline em duas linhas. Fixa no topo (`sticky`) com a sombra de "container ativo". Contador do carrinho é um badge circular vermelho (`colorBackgroundNotificationRed`) sobreposto ao ícone 🛒 — o único vermelho fora de estados de erro.

### Category Filter Pills (Gerenciar Estoque)
Toggle buttons em formato pill: contorno Verde Copa quando não-selecionado, fundo Verde Copa sólido com texto branco quando selecionado ("Todos" ativo por padrão). Rolam horizontalmente quando a lista de categorias não cabe na largura disponível.

### Ícones
Não existe biblioteca de ícones no produto — todo ícone é um emoji Unicode (🌿🧺📦⚙️🛒🔒🏠🚚👩‍🌾📱💰📝🛍️⚠️📲✓). É a convenção de ícone do produto inteiro, não uma lacuna a preencher; qualquer superfície nova deve seguir o mesmo vocabulário de emoji em vez de introduzir um sistema de ícones desenhados.

## Do's and Don'ts

### Do:
- **Do** manter a cor de marca como CSS estático importado em `app/layout.tsx` (`app/tema-marca.generated.css`), nunca aplicada via `applyTheme()` num `useEffect` client-side — a versão client-side só pinta depois que o React hidrata, causando um flash visível de azul (padrão do Cloudscape) virando verde a cada carregamento. Pra ajustar a semente ou os tokens, edite `components/design-system/temaMarca.ts` e regere o CSS seguindo a receita no cabeçalho do arquivo gerado (`generateThemeStylesheet` é client-only no Cloudscape — não roda em build/SSR nem em Route Handler — por isso a geração é manual, não automatizada).
- **Do** manter emoji como sistema de ícone único do produto; é convenção confirmada, não uma lacuna.
- **Do** deixar toda separação de conteúdo a cargo de cor de fundo e Divisor — não introduzir sombra em Container/card.
- **Do** reservar Verde Sucesso exclusivamente para "isso é uma vantagem pro cliente" (desconto, disponibilidade) — nunca para navegação ou ação.

### Don't:
- **Don't** recolorir tokens `colorInfoNNN` (Alert/StatusIndicator "info", diálogos) — eles ficam azuis de propósito, é semântica de status, não identidade de marca.
- **Don't** adicionar sombra decorativa a Container, card de produto ou botão — o sistema é plano por decisão, não por lacuna.
- **Don't** introduzir uma segunda cor de marca ou um segundo verde "quase igual" ao Verde Copa — a rampa inteira (50 a 1000) já cobre todo hover/active/foco necessário.
- **Don't** trocar emoji por uma biblioteca de ícones sem uma decisão explícita — não é uma lacuna de polimento, é a linguagem de ícone confirmada do produto.
