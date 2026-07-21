# Filtro "Mais feedback" na tela de alunos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar uma opção "Mais feedback" ao dropdown de ordenação já existente na tela `/admin/alunos`, ordenando os alunos pela quantidade de feedback (maior → menor).

**Architecture:** Alteração pontual em um único arquivo client-side (`app/admin/alunos/page.tsx`). Nenhuma mudança de API, banco de dados ou novos componentes — reaproveita o `_count.comments` por canal já retornado por `GET /api/admin/students`.

**Tech Stack:** Next.js (App Router, client component), React `useState`, TypeScript.

## Global Constraints

- Não alterar `app/api/admin/students/route.ts` nem o schema do Prisma (spec: fora de escopo).
- Não adicionar filtro por faixa mínima nem persistência da ordenação (spec: fora de escopo).
- Seguir o padrão visual/estrutural já usado pelas outras opções do `<select>` de ordenação.

---

### Task 1: Adicionar opção "Mais feedback" ao dropdown de ordenação

**Files:**
- Modify: `app/admin/alunos/page.tsx:21` (tipo `SortOption`)
- Modify: `app/admin/alunos/page.tsx:101-114` (função de ordenação `sorted`)
- Modify: `app/admin/alunos/page.tsx:140-150` (elemento `<select>`)

**Interfaces:**
- Consumes: `Student.channels[].{_count.comments}` (já existente no tipo `Student` usado pelo arquivo — cada canal tem `_count: { comments: number }`).
- Produces: nenhuma interface nova consumida por outros arquivos — mudança isolada a este componente.

Este componente já calcula, por card de aluno (linha 161), o total de feedback:
```ts
const feedbackCount = student.channels.reduce((sum, c) => sum + c._count.comments, 0);
```
Essa lógica precisa ser reaproveitada também dentro do comparador de ordenação (linha 101-114), que hoje não tem acesso a essa variável (ela só existe dentro do `.map()` de renderização, mais abaixo no arquivo). Por isso, a função será extraída para o nível do componente antes do `sorted`, e usada nos dois lugares.

- [ ] **Step 1: Atualizar o tipo `SortOption` (linha 21)**

Trocar:
```ts
type SortOption = "recent" | "lastChannel" | "lastAccess" | "mostChannels" | "firstClassDate";
```
Por:
```ts
type SortOption = "recent" | "lastChannel" | "lastAccess" | "mostChannels" | "firstClassDate" | "mostFeedback";
```

- [ ] **Step 2: Extrair `feedbackCount` como função reutilizável e usar no comparador**

Logo abaixo da função `lastChannelDate` (linha 97-99), adicionar:
```ts
function feedbackCount(s: Student) {
  return s.channels.reduce((sum, c) => sum + c._count.comments, 0);
}
```

No `switch` do `sorted` (linha 101-114), adicionar um novo `case` antes do `default`:
```ts
      case "mostFeedback":
        return feedbackCount(b) - feedbackCount(a);
```

- [ ] **Step 3: Reaproveitar a função no card de renderização (linha 161)**

Trocar:
```ts
                const feedbackCount = student.channels.reduce((sum, c) => sum + c._count.comments, 0);
```
Por:
```ts
                const studentFeedbackCount = feedbackCount(student);
```

E atualizar os dois usos nas linhas 199-200 (`feedbackCount` → `studentFeedbackCount`):
```ts
                        <p className="text-lg font-semibold text-gray-200">{studentFeedbackCount}</p>
                        <p className="text-xs text-gray-500">{studentFeedbackCount !== 1 ? "feedbacks" : "feedback"}</p>
```

*(Renomear a variável local evita colisão de nome com a função `feedbackCount` declarada no Step 2 — TypeScript acusaria erro de shadowing/redeclaração no mesmo escopo do componente.)*

- [ ] **Step 4: Adicionar a opção no `<select>` (linha 140-150)**

Dentro do bloco `<select>`, adicionar uma nova `<option>` após `mostChannels`:
```tsx
              <option value="mostChannels">Mais canais</option>
              <option value="mostFeedback">Mais feedback</option>
              <option value="firstClassDate">Data da 1ª aula</option>
```

- [ ] **Step 5: Rodar o typecheck**

Run: `npx tsc --noEmit`
Expected: sem erros novos relacionados a `app/admin/alunos/page.tsx`.

- [ ] **Step 6: Testar manualmente no navegador**

Run: `npm run dev` (se o servidor não estiver rodando)

1. Acessar `/admin/alunos` logado como `MENTOR` ou `ADMIN`.
2. Selecionar "Mais feedback" no dropdown de ordenação.
3. Confirmar visualmente que a lista reordena com o aluno de maior contagem de feedback (número exibido no card) no topo, em ordem decrescente.

Expected: lista reordenada corretamente, sem erros no console do navegador.

- [ ] **Step 7: Commit**

```bash
git add app/admin/alunos/page.tsx
git commit -m "$(cat <<'EOF'
Adicionar ordenação por "mais feedback" na tela de alunos

Reaproveita a contagem de feedback já calculada por aluno para
permitir ordenar a lista do maior para o menor no dropdown existente.
EOF
)"
```

---

## Self-Review

- **Spec coverage:** único requisito da spec (nova opção de ordenação por feedback, maior→menor, sem mudar API/banco, sem faixa mínima) coberto integralmente pela Task 1.
- **Placeholder scan:** nenhum "TBD"/"implementar depois" — todo código está completo e exato.
- **Type consistency:** `feedbackCount(s: Student)` usa o mesmo shape de `Student` já importado/definido no arquivo; `studentFeedbackCount` é o único nome novo introduzido e é usado de forma consistente nos dois pontos que o referenciam (linhas 199-200).
