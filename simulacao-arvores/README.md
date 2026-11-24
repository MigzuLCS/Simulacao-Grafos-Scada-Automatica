# Simulação SCADA — Etapa 03 (Árvores) · suporte de apresentação

Quatro abas, uma por integrante, sobre a mesma planta de classificação de grãos da Etapa 02. Estático, sem dependências: HTML + ES modules. Reaproveita o visual, os componentes (`dom.js`, `widgets.js`) e o motor da planta (`plant.js`) de `../simulacao-grafos/`, então as duas pastas precisam ser publicadas lado a lado.

| Aba | Conteúdo | Situação |
| :-- | :-- | :-- |
| 1 · Kruskal/Prim e Huffman (Aulas 19–20) | Aula 19: todos os trechos (100,4 m), Kruskal e Prim animados (37,8 m) e o rompimento de um cabo da árvore (38,2 m). Aula 20: frequência das mensagens, montagem da árvore de Huffman passo a passo e os códigos (3 → 1,53 bits, −48,9 %) | pronta |
| 2 · Árvores Binárias e RRT (Aulas 21–22) | Aula 21: árvore de segurança (botões de falha acendem o caminho), árvore do túnel de visão (grãos sorteados, ≈ 75/15/10 %) e historiador com árvore comum × AVL (altura 15 × 4; com 2.500 amostras, 2.500 × 12). Aula 22: RRT crescendo no galpão, RRT* religando e atalhos (semente 7: 66,6 → 53,8 → 51,1 m), com botão de novo sorteio | pronta |
| 3 · Rede STP/RSTP (Aula 23) | Cinco cenários em linguagem simples: rede normal (2 cabos de reserva), cabo da câmera rompe com RSTP (linha segue) e com STP (linha para), sem protocolo (tempestade) e RSTP × MST da Aula 19. Caixa "detalhes técnicos" mostra portas RP/DP/AP e custos | pronta |
| 4 · Redes de Petri (Aula 24) | — | em preparação |

## Executar
Os módulos ES não carregam por `file://`. Na raiz do repositório:

```bash
python -m http.server 8000      # depois abra http://localhost:8000/simulacao-arvores/
```

Links diretos: `#tab=1..4&mode=...&scale=5`. Modos — aba 1: `mst|huff|todos|kruskal|prim|falha|freq|montar|codigos`; aba 2: `bin|rrt|sis|grao|avl|estrela|atalho`; aba 3: `normal|rstp|stp|semstp|mst`. O tempo simulado corre `scale` vezes mais rápido que o real (padrão 5: os 30 s do STP passam em 6 s).

## Testes
```bash
node simulacao-arvores/tests/check.mjs   # 26 verificações: números das Aulas 19 a 23, reconvergência e desarme da planta
```

## Arquivos
| Arquivo | Papel |
| :-- | :-- |
| `js/mst.js`, `js/huffman.js` | Dados e algoritmos das Aulas 19 (Kruskal, Prim, rompimento) e 20 (Huffman, métricas, decodificação) |
| `js/tab1.js` | Aba das Aulas 19–20 |
| `js/binarias.js`, `js/rrt.js` | Aula 21 (árvores de decisão, sorteio de grãos, árvore comum × AVL) e Aula 22 (RRT, RRT*, atalhos) |
| `js/tab2.js` | Aba das Aulas 21–22 |
| `js/rstp.js` | Topologia da Aula 23, convergência distribuída por BPDUs, papéis de porta, Kruskal |
| `js/rede.js` | Rede viva: falhas, reconvergência STP/RSTP no tempo simulado, tempestade, alcance CLP ↔ câmera |
| `js/redeview.js` | Desenho SVG da rede |
| `js/tab3.js` | Aba da Aula 23 e acoplamento com o CLP (`plant.setFault('ksa401')`) |
| `js/preparacao.js`, `js/app.js` | Abas reservadas e a casca (abas, laço de simulação, links diretos) |
