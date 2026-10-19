# Guia Prático da Apresentação (15 min) — Simulador Etapa 02 (Grafos)

Este documento explica como cada um dos **4 integrantes** deve usar o simulador durante os seus **3 minutos e 45 segundos** de fala. O simulador foi simplificado para funcionar como um **slide interativo**: letras grandes, sem menus escondidos e apenas os botões exatos da apresentação.

## Como Iniciar Antes da Apresentação
Na raiz do repositório, abra um terminal e rode:
```bash
python -m http.server 8000
```
Depois, abra no navegador em tela cheia (`F11`) com zoom em `110%` ou `125%`:
👉 **`http://localhost:8000/simulacao-grafos/`**

---

## Aba 1: Integrante 1 · Modelagem e Balanço (Aulas 11–12)
**Tempo:** `00:00 – 03:45` | **Arquivo:** `js/tab1.js`

À esquerda fica o **Sinótico Animado** da linha de arroz ($1200\text{ kg/h}$ entrando e se dividindo em $900\text{ kg/h}$ Cat. A, $180\text{ kg/h}$ Cat. B e $120\text{ kg/h}$ Cat. C). À direita há **3 botões grandes**:

1. **Clique 1 — `[Aula 11] Graus e Topologia (|V| = 14, |E| = 14)`** *(já abre selecionado)*:
   * **O que aparece na tela:** Cada equipamento mostra seu grau de entrada ($d^-$) e de saída ($d^+$). Os dois ejetores (`EJE-602` e `EJE-603`) ficam destacados como **bifurcadores ($d^+ = 2$)** e a linha tracejada $e_{14}$ aparece em vermelho como o único caminho de reciclo.
   * **O que explicar (sem decorar texto):** A planta deixou de ser uma lista estática e virou um dígrafo ponderado onde os pesos são os comprimentos reais em metros (usados pelo CLP para sincronizar o tiro dos ejetores com a velocidade da esteira). Pelo Lema do Aperto de Mãos Dirigido, a soma dos graus de entrada é igual à de saída ($14$).
2. **Clique 2 — `[Aula 12] Balanço de Massa (B·Q = S)`**:
   * **O que aparece na tela:** Os cartões grandes mostram $\text{rank}(B) = 13$, $\dim(\ker B) = 1$ (comprovando matematicamente que existe 1 único ciclo na planta: o reciclo $e_{14}$) e a tabela de conservação por nó.
   * **O que explicar:** Aplicando a 1ª Lei de Kirchhoff ($B \cdot Q = S$), provamos que em todos os nós intermediários tudo o que entra é igual ao que sai ($S = 0$), acumulando massa apenas nos 3 silos finais ($+900, +180, +120\text{ kg/h}$).
3. **Clique 3 — `[Aula 12] Matriz de Incidência B (14 × 14)`**:
   * **O que aparece na tela:** A matriz $14 \times 14$ colorida ($-1$ em vermelho onde a aresta sai, $+1$ em verde onde chega) com a última linha mostrando que **todas as colunas somam zero** (nenhum grão some no meio de um trecho).

---

## Aba 2: Integrante 2 · Busca, Dijkstra e Falhas (Aulas 13–15)
**Tempo:** `03:45 – 07:30` | **Arquivo:** `js/tab2.js`

À esquerda continua o grafo da planta. À direita há **4 botões grandes** (um para cada conceito, sem precisar avançar passo a passo manualmente):

1. **Clique 1 — `[Aula 13] BFS — Menor Salto e Shutdown`**:
   * **O que aparece na tela:** Uma animação automática pinta o grafo camada por camada a partir da decisão óptica `DIV-501`, mostrando que o Silo B está a **3 saltos** e os Silos A e C a **4 saltos**.
   * **O que explicar:** A Busca em Largura (BFS) encontra o menor número de saltos operacionais e é usada pelo supervisório para propagar o desligamento (*shutdown*) em cascata para frente caso ocorra uma parada de emergência.
2. **Clique 2 — `[Aula 13] DFS — Detecção de Ciclo (e14) e Ordem Topológica`**:
   * **O que aparece na tela:** Mostra os carimbos de tempo $d/f$ em cada nó e destaca a aresta $e_{14}$ em vermelho como **Aresta de Retorno (*Back Edge*)**, provando a presença do ciclo.
   * **Ação extra na tela:** Desmarque a caixa **`XV-104 aberta (e14 presente)`**. O aviso muda para verde (**Grafo Acíclico — DAG**) e exibe as duas sequências automáticas:
     * **Parada programada (ordem topológica direta, montante $\to$ jusante):** desliga o alimentador primeiro para esvaziar a correia.
     * **Partida a frio (ordem topológica inversa, jusante $\to$ montante):** liga ejetores e esteira primeiro, e o alimentador por último (respeitando o intertravamento da Etapa 1).
3. **Clique 3 — `[Aula 14] Dijkstra — Menor Caminho e Bloqueio (w = ∞)`**:
   * **O que aparece na tela:** Mostra a distância acumulada em metros desde o funil `FN-101` até cada silo: **Silo B = $16{,}3\text{ m}$**, **Silo C = $17{,}0\text{ m}$** e **Silo A = $18{,}7\text{ m}$**.
   * **Ação extra na tela:** Clique no botão vermelho **`Fechar XV-701 (Silo A cheio 95 %)`**. O peso da aresta $e_{11}$ vai para $\infty$, a distância do Silo A vira $\infty$ (ilhamento formal) e o CLP dá `TRIP` no alimentador para não transbordar a calha.
4. **Clique 4 — `[Aula 15] Simular Vazamento na Esteira e3 (−150 kg/h)`**:
   * **O que aparece na tela:** O trecho $e_3$ e o nó `EST-201` acendem em vermelho e o painel mostra **`Resíduo no nó EST-201: +150 kg/h`** (entram $1200\text{ kg/h}$ por $e_2$, mas só saem $1050\text{ kg/h}$ na balança em $e_3$).
   * **O que explicar:** Multiplicando a matriz $B$ pelas vazões medidas ($r = B \cdot Q - S$), o SCADA localiza exatamente em qual equipamento ocorreu o rasgo ou entupimento. *(Se sobrar tempo, clique em `Entupir Calha B (e12)` para mostrar a retenção na calha).*

---

## Aba 3: Integrante 3 · Euler e AGV / TSP (Aulas 16–17)
**Tempo:** `07:30 – 11:15` | **Arquivo:** `js/tab3.js`

No topo há **2 botões grandes** para alternar entre Aula 16 (Euler) e Aula 17 (TSP):

1. **Parte 1 — `[Aula 16] Inspeção de Dutos — Circuito Euleriano`**:
   * **O que aparece na tela:** O grafo não-dirigido da malha de tubulações (6 vértices e 9 dutos). Todos os nós mostram **grau par** ($2, 4, 4, 4, 2, 2$, soma $= 18 = 2|E|$), garantindo pelo Teorema de Euler que existe um circuito fechado sem repetir arestas.
   * **Clique 1:** Aperte **`▶ Animar Robô (Hierholzer — 89,5 m)`**. O ponto vermelho percorre todos os 9 dutos em 4 segundos sem repetir nenhum trecho, totalizando **$89{,}5\text{ m}$** para limpeza contra poeira explosiva (ATEX/NR-12).
   * **Clique 2:** Marque a caixa **`Simular expansão com grau ímpar (+ duto d10 → Carteiro Chinês 117,5 m)`**. Dois nós ficam vermelhos (grau ímpar) e o algoritmo duplica o menor caminho entre eles para o robô conseguir voltar à base ($117{,}5\text{ m}$).
2. **Parte 2 — `[Aula 17] Roteamento do AGV-01 — Ciclo Hamiltoniano (TSP)`**:
   * **O que explicar antes de clicar:** Diferente de Euler (que visita arestas e é polinomial), o AGV precisa visitar os **6 postos de coleta de amostras** exatamente uma vez (Ciclo Hamiltoniano / Caixeiro-Viajante, NP-Difícil).
   * **Clique 1 — `1. Rota com Cruzamento (268 m)`:** Mostra a trajetória subótima onde as rotas entre os silos e o laboratório se cruzam no chão de fábrica ($268\text{ m}$).
   * **Clique 2 — `2. Aplicar 2-Opt — Descruzar Rota (218 m | −50 m)`:** Mostra em vermelho tracejado as duas arestas cruzadas que foram removidas e em amarelo a rota descruzada de **$218\text{ m}$** (economia de **$50\text{ m}$ / $18{,}7\%$** por ciclo, igualando o ótimo global de 60 rotas e o Vizinho Mais Próximo).
   * **Clique 3 — `3. Cota Inferior MST (143 m)`:** Mostra a Árvore Geradora Mínima de $143\text{ m}$, comprovando o limite inferior matemático.

---

## Aba 4: Integrante 4 · Logística e Validação (Aula 18)
**Tempo:** `11:15 – 15:00` | **Arquivo:** `js/tab4.js`

No topo há **4 botões grandes** que guiam o fechamento da apresentação:

1. **Botão 1 — `[Camada G_M] Fluxo de Materiais e Kahn (28 nós)`**:
   * Mostra o grafo completo da fábrica (da Portaria às Docas, $261{,}3\text{ m}$) modelado como um **DAG** (28/28 nós ordenados pelo Algoritmo de Kahn).
   * **Clique nos 3 botões laterais em sequência:**
     1. **`Destacar Segregação do Rejeito (BFS de SILO-703)`:** Pinta em vermelho os únicos 3 nós alcançáveis pelo rejeito (`SILO-703 → CAC-803 → Subprodutos`), provando que **0 áreas de produto acabado** têm contato com o descarte.
     2. **`Simular Falha TC-002 (Desvio SP-001 +3 m)`:** Bloqueia o silo pulmão 2 e mostra o Dijkstra desviando automaticamente a carga pelo silo pulmão 1 (rota vai para $264{,}3\text{ m}$, apenas $+3\text{ m}$).
     3. **`Abrir Reciclo XV-104 (Kahn detecta ciclo)`:** Mostra que ao abrir o reciclo, Kahn ordena apenas 6 nós e **trava nos 22 restantes**, bloqueando a auditoria linear até que o laboratório autorize o retrabalho.
2. **Botão 2 — `[Camada G_V] Circulação de Caminhões (9 nós)`**:
   * Mostra o anel viário externo (fortemente conexo) separado do grafo de grãos (Rede Multicamada).
   * Clique em **`Rota Expedição (265 m)`** (mostra que o caminhão de produto acabado vai direto às docas pela via leste sem passar pela moega suja) e em **`Interditar Calador → Moega (Desvio +15 m)`** (mostra o desvio pelo pátio de quarentena).
3. **Botão 3 — `[Camada G_E] Alocação de Estoque (Galpão B)`**:
   * Mostra o grafo da empilhadeira escolhendo as 4 posições de menor custo combinado (guarda + separação até as docas): **`A3 (45 m)`**, **`A2 (46 m)`**, **`B3 (46 m)`** e **`B2 (47 m)`**.
4. **Botão 4 — `[Resumo Final] Validação 100% Aprovada (Aulas 11–18)`**:
   * **Para encerrar a apresentação:** Exibe os dois selos verdes grandes (**`13/13 Conferências Numéricas OK`** e **`8/8 Asserções Formais OK`**) junto com a tabela final que comprova que todos os cálculos do grupo fecham 100%.
