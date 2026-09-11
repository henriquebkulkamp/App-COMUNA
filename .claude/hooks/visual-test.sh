#!/bin/bash
input=$(cat)
file_path=$(jq -r '.tool_input.file_path // empty' <<<"$input")

# só roda pra arquivos de front dentro de frontend/ (Vite — a stack
# ativa; a raiz é o Next.js legado, sendo descontinuado, e não tem
# nada a ver com os baselines em frontend/e2e/visual/)
if [[ ! "$file_path" =~ /frontend/.*\.(tsx|jsx|css|vue|svelte)$ ]]; then
  exit 0
fi

# roda o teste de pixel diff — um script só (frontend/e2e/visual/
# gerar-relatorio.mjs) que chama o Playwright, junta expected/
# actual/diff de cada tela que mudou e escreve um relatório HTML
# estático (imagens embutidas, abre com duplo clique, sem precisar de
# servidor) em frontend/e2e/visual/relatorio.html. Pressupõe Postgres
# já de pé e seedado — ver frontend/e2e/visual/README.md.
output=$(node frontend/e2e/visual/gerar-relatorio.mjs 2>&1)
status=$?

if [ $status -ne 0 ]; then
  # manda o resultado pro Claude ver e já te explicar na resposta —
  # o relatório completo (com as imagens) fica salvo em
  # frontend/e2e/visual/relatorio.html
  echo "$output" >&2
  exit 2   # exit 2 = falha "bloqueante": Claude vê o stderr e reage
fi

exit 0  # passou: nada acontece, silencioso