# Simulação SCADA — Etapa 02 (Grafos) · suporte de apresentação

Quatro abas, uma por integrante (3m45s cada), sobre o grafo da planta de classificação de grãos. Estático, sem dependências: HTML + ES modules.

| Aba | Conteúdo |
| :-- | :-- |
| 1 · Modelagem e Balanço (Aulas 11–12) | Sinótico animado; graus e topologia; balanço B·Q = S; matriz de incidência |
| 2 · Busca, Dijkstra e Falhas (Aulas 13–15) | BFS, DFS/ciclo e ordem topológica, Dijkstra com bloqueio de e11, vazamento em e3 |
| 3 · Euler e AGV / TSP (Aulas 16–17) | Hierholzer animado (+ Carteiro Chinês), rota de 268 m → 2-Opt → 218 m, MST |
| 4 · Logística e Validação (Aula 18) | G_M (Kahn, segregação, TC-002, reciclo), G_V, G_E e o resumo de validação |

## Executar
Os módulos ES não carregam por `file://`. Na raiz do repositório:

```bash
python -m http.server 8000      # depois abra http://localhost:8000/simulacao-grafos/
```

Links diretos: `#tab=0..3&mode=...&scale=20`. Modos — aba 0: `graus|balanco|matriz`; aba 1: `bfs|dfs|dijkstra|vazamento`; aba 2: `euler|cross|2opt|mst`; aba 3: `gm|gv|ge|fim`.

## Testes
```bash
node simulacao-grafos/tests/check.mjs   # 32 verificações: números das Aulas 11–18 e asserções da Aula 18
node simulacao-grafos/tests/plant.mjs   # 23 verificações do motor (regime nominal e falhas)
```

## Arquivos
| Arquivo | Papel |
| :-- | :-- |
| `js/data.js`, `js/graphs.js` | Dados das aulas e montagem dos grafos |
| `js/algorithms.js`, `js/assertions.js`, `js/validation.js` | BFS, DFS, Dijkstra, Kahn, Hierholzer, TSP; asserções da Aula 18; conferência numérica |
| `js/plant.js` | Motor: lotes de massa por aresta, intertravamentos, alarmes, instrumentos |
| `js/plantview.js`, `js/graphview.js`, `js/widgets.js` | Desenho SVG e componentes |
| `js/tab1.js` … `js/tab4.js`, `js/app.js` | As quatro abas e a casca (estado, velocidade, alarmes) |
