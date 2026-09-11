# Testes do backend

Suite `pytest` (109 testes) cobrindo `app/` — auth, crud, cache e os 4
routers. Roda contra Postgres de verdade (não SQLite — `models.py` usa
`ARRAY`/upsert `ON CONFLICT` específicos do dialect), num banco
separado (`<banco>_test`), com isolamento por savepoint por teste (ver
`conftest.py`). Em cima dela roda o mutation testing (`mutmut`) — ver
`../testar-mutacao.sh`.

## Rodar os testes

```sh
backend/.venv/bin/pytest backend/tests/
```

Pré-requisito: Postgres de pé (`npm run db:up`, na raiz) — não precisa
rodar `db:seed`, o `conftest.py` cria/recria o schema sozinho num
banco separado, nunca toca no banco de desenvolvimento.

## Rodar mutation testing

```sh
npm run test:mutation:backend   # ou: backend/testar-mutacao.sh
```

Um script só: confere Postgres → roda pytest → roda `mutmut run` →
monta `backend/relatorio-mutacao.html` (HTML estático, sem servidor) →
abre sozinho no navegador se sobrou mutante vivo. Ver comentários no
próprio `testar-mutacao.sh` e em `../gerar_relatorio_mutacao.py`.

**Mutantes sobreviventes não são todos bug de cobertura.** Boa parte
do que sobra costuma ser *mutante equivalente* — uma mudança que o
mutmut gera mas que não muda comportamento nenhum, então nenhum teste
(nem um perfeito) jamais mataria. Os dois padrões que já apareceram
aqui:

- **Nomes de encoding/algoritmo com case trocado** (`"utf-8"` →
  `"UTF-8"`, `"sha256"` → `"SHA256"`, `"ascii"` → `"ASCII"`) — Python
  resolve esses nomes sem diferenciar maiúscula/minúscula, então o
  código mutado se comporta exatamente igual ao original.
- **Default de coluna do SQLAlchemy aplicado mesmo com `None`
  explícito** (ex: `Produto(quantidade=None)` vira `quantidade=0` no
  banco do mesmo jeito que `Produto(quantidade=0)`, e
  `Pedido(status=None)` vira `"Pendente"` do mesmo jeito que
  `status="Pendente"` — confirmado empiricamente, não é suposição)
  — qualquer mutante que troque um valor default explícito por `None`
  nesses campos é equivalente.

No estado atual (377 mutantes, 355 mortos), os 22 sobreviventes são
**todos** dessas duas categorias — já conferidos um por um. Se um dia
esse número subir, vale a mesma checagem antes de sair escrevendo
teste novo.

Antes de escrever um teste novo pra matar um sobrevivente, vale abrir
o diff dele (`mutmut show <nome>`) e confirmar que é uma mudança de
comportamento de verdade — senão é tempo gasto perseguindo um
mutante que não tem como morrer.
