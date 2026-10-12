# Aula 14: Menor Caminho (Dijkstra) — Roteamento Dinâmico e Reencaminhamento de Fluidos e Grãos

**Projeto:** SCADA-Core Automática — GRUPO 4  
**Unidade Fabril:** Linha Automatizada de Seleção, Pesagem Dinâmica e Classificação Óptica de Grãos com Separação Pneumática Tripla  
**Referência Normativa:** ISA-5.1 & Teoria dos Grafos Aplicada à Engenharia de Automação e Redes de Processo  

---

## 1. Fundamentos Matemáticos: O Algoritmo de Dijkstra

Na automação de processos industriais contínuos e semicontínuos, o transporte de matérias-primas e produtos intermediários é regido por custos físicos acumulados, tais como:
* Distância geométrica real de tubulações e esteiras ($L\text{ [m]}$);
* Tempo dinâmico de trânsito e atraso cinemático ($\tau = L / v\text{ [s]}$);
* Perda de carga fluídica, atrito pneumático e consumo energético de bombeamento/tração.

O algoritmo de **Dijkstra** resolve o problema do **menor caminho de fonte única (*Single-Source Shortest Path* — SSSP)** em um dígrafo direcionado e ponderado $G = (V, E, W)$, sob a restrição estrita de **pesos estritamente não-negativos**:

$$w(u, v) \geq 0 \quad (\forall (u, v) \in E)$$

### 1.1. Formulação do Algoritmo e Condição de Bellman

Para cada nó $v \in V$, mantém-se uma estimativa de limite superior da distância mínima a partir da origem $s$, denotada por $\text{dist}[v]$, e um ponteiro de antecessor $\text{pai}[v]$.

* **Inicialização:**
  $$\text{dist}[s] = 0 \quad \text{e} \quad \text{dist}[v] = +\infty \quad (\forall v \in V \setminus \{s\})$$
  $$\text{pai}[v] = \text{null} \quad (\forall v \in V)$$

* **Operação de Relaxamento (*Relaxation*):**
  Para cada aresta dirigida $(u, v) \in E$ com custo $w(u, v)$, a estimativa é atualizada segundo o princípio da otimalidade de Bellman:
  $$\text{se } \text{dist}[u] + w(u, v) < \text{dist}[v] \implies \begin{cases} \text{dist}[v] = \text{dist}[u] + w(u, v) \\ \text{pai}[v] = u \end{cases}$$

* **Estratégia Gulosa (*Greedy Choice*):**
  A cada passo, o algoritmo extrai o nó $u^*$ não visitado com menor valor de $\text{dist}[u^*]$ utilizando uma **Fila de Prioridade (*Min-Heap*)**. Uma vez extraído, $\text{dist}[u^*]$ é imutável e representa a distância estritamente mínima $\delta(s, u^*)$.

* **Complexidade Computacional:**
  Com uso de *Min-Heap* binário (`heapq` em Python):
  $$O((|V| + |E|) \log |V|)$$
  Para a planta estudada com $|V| = 14$ e $|E| = 14$, o tempo de execução é desprezível ($< 0.1\text{ ms}$ no CLP ou computador de supervisão), viabilizando recálculo em tempo real de milissegundos.

---

## 2. Roteamento Dinâmico sob Bloqueio e Reconfiguração de Válvulas

Em uma planta industrial crítica, falhas mecânicas, entupimentos e intertravamentos de segurança alteram dinamicamente a topologia da malha:

1. **Bloqueio Físico de Aresta:**
   Quando uma válvula automatizada é fechada (ex.: emergência, transbordo do silo ou falha de pistão), o custo da aresta associada é instantaneamente redefinido para:
   $$w(u, v) = +\infty$$
2. **Desvio Automático (*Dynamic Rerouting*):**
   O SCADA executa imediatamente o algoritmo de Dijkstra na topologia modificada. Caso exista uma rota de contingência ou recirculação, o sistema reconfigura as válvulas de desvio sem necessidade de parada total da fábrica (*shutdown*).
3. **Detecção de Ilhamento e Parada Segura:**
   Se $\text{dist}[\text{destino}] = +\infty$, comprova-se formalmente que o equipamento de destino ficou desconexo (ilhado). O CLP dispara imediatamente o intertravamento de segurança de montante para estancar a alimentação.

---

## 3. Topologia e Pesos Físicos da Planta de Grãos (Grupo 4)

A malha da planta apresenta as seguintes distâncias métricas reais entre nós:

| Aresta | Trecho | Descrição Física | Comprimento $L$ [m] |
| :--- | :--- | :--- | :---: |
| $e_1$ | `FN-101` $\rightarrow$ `ALIM-101` | Duto vertical de carga com válvula `XV-101` | 1.2 m |
| $e_2$ | `ALIM-101` $\rightarrow$ `EST-201` | Calha vibratória dosadora | 1.8 m |
| $e_3$ | `EST-201` $\rightarrow$ `BAL-301` | Correia transportadora até balança dinâmica | 2.5 m |
| $e_4$ | `BAL-301` $\rightarrow$ `VIS-401` | Correia transportadora até túnel de inspeção | 3.0 m |
| $e_5$ | `VIS-401` $\rightarrow$ `DIV-501` | Zona de disparo óptico / trigger | 1.0 m |
| $e_6$ | `DIV-501` $\rightarrow$ `EJE-602` | Correia sincronizada até Estação B | 2.0 m |
| $e_7$ | `EJE-602` $\rightarrow$ `CALHA-602` | Sopro pneumático Categoria B (`FY-602`) | 0.8 m |
| $e_8$ | `EJE-602` $\rightarrow$ `EJE-603` | Correia contínua até Estação C | 1.5 m |
| $e_9$ | `EJE-603` $\rightarrow$ `CALHA-603` | Sopro pneumático Categoria C (`FY-603`) | 0.8 m |
| $e_{10}$ | `EJE-603` $\rightarrow$ `CALHA-701` | Descarga por inércia na cabeceira da esteira | 2.2 m |
| $e_{11}$ | `CALHA-701` $\rightarrow$ `SILO-701` | Duto gravitacional com válvula `XV-701` | 3.5 m |
| $e_{12}$ | `CALHA-602` $\rightarrow$ `SILO-702` | Calha inclinada com válvula `XV-702` | 4.0 m |
| $e_{13}$ | `CALHA-603` $\rightarrow$ `SILO-703` | Calha inclinada de rejeito com `XV-703` | 3.2 m |
| $e_{14}$ | `SILO-702` $\rightarrow$ `FN-101` | Elevador de canecas para reciclo/reteste | 12.0 m |

---

## 4. Diagrama de Roteamento e Bloqueio (Mermaid)

```mermaid
graph LR
    FN101["FN-101
Recepção"] -->|1.2m| ALIM101["ALIM-101"]
    ALIM101 -->|1.8m| EST201["EST-201"]
    EST201 -->|2.5m| BAL301["BAL-301"]
    BAL301 -->|3.0m| VIS401["VIS-401"]
    VIS401 -->|1.0m| DIV501["DIV-501"]
    DIV501 -->|2.0m| EJE602["EJE-602"]
    
    EJE602 -->|0.8m| CALHA602["CALHA-602"]
    EJE602 -->|1.5m| EJE603["EJE-603"]
    
    CALHA602 -->|4.0m| SILO702["SILO-702
(Secundário)"]
    SILO702 -.->|12.0m (XV-104)| FN101
    
    EJE603 -->|0.8m| CALHA603["CALHA-603"]
    EJE603 -->|2.2m| CALHA701["CALHA-701"]
    
    CALHA603 -->|3.2m| SILO703["SILO-703
(Rejeito)"]
    CALHA701 -->|3.5m| SILO701["SILO-701
(Nobre A)"]

    classDef blocked stroke:#f00,stroke-width:3px,stroke-dasharray: 5 5;
```

---

## 5. Exemplo Resolvido Passo a Passo

### Execução Analítica de Dijkstra a partir do Nó `FN-101_Recepcao`

**Enunciado:**  
Calcule manualmente as distâncias mínimas absolutas de transporte desde o nó de entrada `FN-101_Recepcao` até os três silos da planta, indicando os respectivos caminhos ótimos e tempos de trânsito considerando velocidade nominal de esteira $v = 1.0\text{ m/s}$ e dutos a $2.5\text{ m/s}$.

**Resolução:**

1. **Segmento Comum Montante ($v_1 \rightarrow v_6$):**
   * $\text{dist}[v_1] = 0.0\text{ m}$
   * $\text{dist}[v_2] = 0.0 + 1.2 = 1.2\text{ m}$
   * $\text{dist}[v_3] = 1.2 + 1.8 = 3.0\text{ m}$
   * $\text{dist}[v_4] = 3.0 + 2.5 = 5.5\text{ m}$
   * $\text{dist}[v_5] = 5.5 + 3.0 = 8.5\text{ m}$
   * $\text{dist}[v_6] = 8.5 + 1.0 = 9.5\text{ m}$
   * $\text{dist}[v_7] = 9.5 + 2.0 = 11.5\text{ m}$ (`EJE-602_EstacaoB`)

2. **Ramificação para Silo B (`SILO-702_Secundario`):**
   * Relaxa aresta $e_7$: $\text{dist}[v_9] = 11.5 + 0.8 = 12.3\text{ m}$ (`CALHA-602`)
   * Relaxa aresta $e_{12}$: $\text{dist}[v_{13}] = 12.3 + 4.0 = \mathbf{16.3\text{ m}}$
   * **Caminho:** $\text{FN-101} \rightarrow \text{ALIM-101} \rightarrow \dots \rightarrow \text{EJE-602} \rightarrow \text{CALHA-602} \rightarrow \text{SILO-702}$

3. **Ramificação para Silo C (`SILO-703_Rejeito`):**
   * Relaxa aresta $e_8$: $\text{dist}[v_8] = 11.5 + 1.5 = 13.0\text{ m}$ (`EJE-603_EstacaoC`)
   * Relaxa aresta $e_9$: $\text{dist}[v_{10}] = 13.0 + 0.8 = 13.8\text{ m}$ (`CALHA-603`)
   * Relaxa aresta $e_{13}$: $\text{dist}[v_{14}] = 13.8 + 3.2 = \mathbf{17.0\text{ m}}$
   * **Caminho:** $\text{FN-101} \rightarrow \dots \rightarrow \text{EJE-602} \rightarrow \text{EJE-603} \rightarrow \text{CALHA-603} \rightarrow \text{SILO-703}$

4. **Ramificação para Silo A (`SILO-701_Aprovados`):**
   * A partir de $v_8$, relaxa aresta $e_{10}$: $\text{dist}[v_{11}] = 13.0 + 2.2 = 15.2\text{ m}$ (`CALHA-701`)
   * Relaxa aresta $e_{11}$: $\text{dist}[v_{12}] = 15.2 + 3.5 = \mathbf{18.7\text{ m}}$
   * **Caminho:** $\text{FN-101} \rightarrow \dots \rightarrow \text{EJE-603} \rightarrow \text{CALHA-701} \rightarrow \text{SILO-701}$

**Conclusão Operacional:**
* Rota mais curta em metros: Silo B ($16.3\text{ m}$);
* Rota intermediária: Silo C ($17.0\text{ m}$);
* Rota mais longa: Silo A ($18.7\text{ m}$).

---

## 6. Atividades de Investigação e Desafios de Engenharia

1. **Simulação de Bloqueio por Nível Crítico no Silo A (`p_NC701 = 1`):**  
   Quando o Silo A atinge nível de transbordo (95%), a válvula `XV-701` é travada ($w(e_{11}) = +\infty$).  
   * Demonstre o recálculo de Dijkstra indicando o status de acessibilidade de `SILO-701`.  
   * Como o motor SCADA deve redirecionar o material para evitar acúmulo na esteira?
2. **Cálculo de Custo Energético e Perda de Carga Dinâmica:**  
   Substitua o peso métrico das arestas pelo custo em watts consumidos: $W = P_{\text{motor}} \cdot \tau$. Mostre se o caminho ótimo permanece inalterado.
3. **Detecção de Ilhamento Geral em Falha na Correia ($e_3$ Bloqueada):**  
   Se o motor da esteira desarmar por sobrecarga `p_JI201`, a aresta $e_3$ recebe peso infinito. Prove via Dijkstra que nenhum dos três silos é atingível a partir de `FN-101`.

---

## 7. Entregável da Aula 14

* **Motor de Roteamento Dinâmico em Python:** Desenvolvido no Jupyter Notebook correspondente (`14 - Menor Caminho (Dijkstra).ipynb`), contendo:
  1. A classe `RoteadorDijkstra` com suporte a Min-Heap (`heapq`);
  2. Função de bloqueio dinâmico de arestas e reconfiguração de topologia;
  3. Relatórios comparativos de rotas nominais versus rotas sob contingência;
  4. Teste de estresse com detecção de ilhamento e tempo de execução.
