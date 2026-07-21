# Filtro "Mais feedback" na tela de alunos (mentor/admin)

## Contexto

A tela `/admin/alunos` (`app/admin/alunos/page.tsx`), visível para `MENTOR` e `ADMIN`, já
possui um dropdown de ordenação (`sortBy`, tipo `SortOption`) com opções como `recent`,
`lastChannel`, `lastAccess`, `mostChannels`, `firstClassDate`.

O total de feedback por aluno já é calculado no client (linha ~161):

```ts
student.channels.reduce((sum, c) => sum + c._count.comments, 0)
```

onde `_count.comments` vem da API `app/api/admin/students/route.ts`, contando registros
`Comment` com `type` diferente de `RESPOSTA` (respostas em thread não contam como feedback).

## Objetivo

Permitir que o mentor/admin ordene a lista de alunos pela quantidade de feedback recebido,
do maior para o menor.

## Solução

Adicionar uma nova opção ao dropdown de ordenação existente, sem criar filtro separado,
sem mudar a API e sem novas queries no banco.

- Novo valor no tipo `SortOption`: `mostFeedback`.
- Novo label no `<select>`: "Mais feedback".
- Novo caso no `.sort()` local: ordena por
  `student.channels.reduce((sum, c) => sum + c._count.comments, 0)` decrescente
  (maior quantidade de feedback primeiro).
- Empate: manter estável (ordem original de retorno da API), sem critério de desempate
  adicional — mesmo comportamento das demais opções de ordenação já existentes.

## Fora de escopo

- Filtro por faixa mínima de feedback (ex: "3+ feedbacks").
- Mudanças na API `/api/admin/students`.
- Persistência da ordenação escolhida (ex: em query param ou localStorage).

## Teste

- Verificação manual na UI: selecionar "Mais feedback" no dropdown e confirmar que a lista
  reordena com o aluno de maior contagem de feedback no topo.
