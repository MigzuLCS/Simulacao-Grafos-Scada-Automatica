# Simulação SCADA — Etapa 03 (Árvores) · suporte de apresentação

Quatro abas, uma por integrante, sobre a mesma planta de classificação de grãos da Etapa 02. Estático, sem dependências: HTML + ES modules. Reaproveita o visual, os componentes (`dom.js`, `widgets.js`) e o motor da planta (`plant.js`) de `../simulacao-grafos/`, então as duas pastas precisam ser publicadas lado a lado.

| Aba | Conteúdo | Situação |
| :-- | :-- | :-- |
| 1 · Kruskal/Prim e Huffman (Aulas 19–20) | — | em preparação |
| 2 · Árvores Binárias e RRT (Aulas 21–22) | — | em preparação |
| 3 · Rede STP/RSTP (Aula 23) | Árvore geradora ativa da rede de 6 switches, papéis de porta RP/DP/AP, rompimento da fibra da câmera com RSTP (0,2 s, linha segue) e STP (30 s, TRIP por `p_KSA401`), tempestade sem STP, RSTP × MST de Kruskal e teste N−1 | pronta |
| 4 · Redes de Petri (Aula 24) | — | em preparação |

## Executar
Os módulos ES não carregam por `file://`. Na raiz do repositório:

```bash
python -m http.server 8000      # depois abra http://localhost:8000/simulacao-arvores/
```

Links diretos: `#tab=1..4&mode=...&scale=5`. Modos da aba 3: `normal|rstp|stp|semstp|mst|n1`. O tempo simulado corre `scale` vezes mais rápido que o real (padrão 5: os 30 s do STP passam em 6 s).

## Testes
```bash
node simulacao-arvores/tests/check.mjs   # 13 verificações: números do notebook da Aula 23, reconvergência e desarme da planta
```

## Arquivos
| Arquivo | Papel |
| :-- | :-- |
| `js/rstp.js` | Topologia da Aula 23, convergência distribuída por BPDUs, papéis de porta, Kruskal |
| `js/rede.js` | Rede viva: falhas, reconvergência STP/RSTP no tempo simulado, tempestade, alcance CLP ↔ câmera |
| `js/redeview.js` | Desenho SVG da rede |
| `js/tab3.js` | Aba da Aula 23 e acoplamento com o CLP (`plant.setFault('ksa401')`) |
| `js/preparacao.js`, `js/app.js` | Abas reservadas e a casca (abas, laço de simulação, links diretos) |
