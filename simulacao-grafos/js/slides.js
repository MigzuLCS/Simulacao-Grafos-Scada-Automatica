/** slides.js — deck de 10 slides (apoio da apresentação oral): fórmula-chave + 2 cards ou 1 tabela por slide, cola de fala oculta por padrão. */
import { h, clear } from './dom.js';
import * as A from './algorithms.js';
import { gmGraph } from './graphs.js';
import { AGV_D, EULER_NODES, EULER_EDGES } from './data.js';

const card = (title, ...kids) => h('div', { class: 'card sl-card' }, h('div', { class: 'cardtitle' }, title), ...kids);
const ul = items => h('ul', { class: 'sl-ul' }, ...items.map(x => h('li', {}, ...(Array.isArray(x) ? x : [x]))));
const b = t => h('b', {}, t);
const table = (head, rows, cls = '') => h('table', { class: 't sl-table ' + cls }, h('thead', {}, h('tr', {}, ...head.map(x => h('th', {}, x)))),
  h('tbody', {}, ...rows.map(r => h('tr', {}, ...r.map((c, i) => h('td', { class: i === 0 ? 'k' : '' }, ...(Array.isArray(c) ? c : [c])))))));
const two = (l, r) => h('div', { class: 'sl-two' }, l, r);
const br = x => String(x).replace('.', ',');

export function createSlides(app) {
  const g = app.plant.graph;
  const ix = id => g.nodes.indexOf(id);

  /* ---- números calculados (não digitados) ---- */
  const B = A.incidenceMatrix(g), L = A.laplacian(B), trL = L.reduce((a, r, i) => a + r[i], 0), rk = A.rank(B);
  const Adj = A.adjacency(g), mul = (X, Y) => X.map(r => Y[0].map((_, j) => r.reduce((a, x, k) => a + x * Y[k][j], 0)));
  const Apow = k => { let P = Adj; for (let i = 1; i < k; i++) P = mul(P, Adj); return P; };
  const a4 = Apow(4)[ix('FN-101')][ix('VIS-401')], a6 = Apow(6)[ix('FN-101')][ix('EJE-602')];
  const dj = A.dijkstra(g, 'FN-101'), pathStr = s => A.pathTo(dj.parent, s).map(x => x.replace('-', '')).join('→');
  const agvIds = ['LAB-CQ', 'FN-101', 'BAL-301', 'VIS-401', 'SILO-701', 'SILO-702'];
  const cross = [0, 1, 2, 3, 5, 4], c0 = A.tourCost(AGV_D, cross), opt = A.twoOpt(AGV_D, cross), nn = A.nearestNeighbor(AGV_D, 0), mst = A.mstWeight(AGV_D).weight, bf = A.tspBrute(AGV_D);
  const eco = c0 - opt.cost, ecoPct = br((eco / c0 * 100).toFixed(1));
  const eul = A.hierholzer(EULER_NODES.map(n => n.id), EULER_EDGES, 'BASE-INSP');
  const eulDeg = A.eulerParity(EULER_NODES.map(n => n.id), EULER_EDGES).deg;
  const gm0 = gmGraph(false), gm1 = gmGraph(true), k0 = A.kahn(gm0), k1 = A.kahn(gm1);
  const tcDist = A.shortest(gm0, 'Portaria', 'Docas').dist;
  const nodeRow = (tipo, ids, func) => [tipo, ids.join(' · '), ids.map(i => g.degIn(i)).join(' / '), ids.map(i => g.degOut(i)).join(' / '), func];

  /* ---- definição dos 10 slides ---- */
  const SLIDES = [
    { who: 1, time: '00:00 – 01:15', aula: 'Abertura', title: 'SCADA-Core Automática · Etapa 02: Teoria dos Grafos', sub: 'Linha de classificação óptica de grãos — Grupo 4', tab: 0, mode: 'graus',
      formula: 'G = (V, E, W)     ·     Q = 1200 kg/h     ·     75 % A  |  15 % B  |  10 % C',
      plain: 'Em bom português: uma fábrica de classificar arroz, desenhada como pontos (equipamentos) ligados por setas (tubos e esteiras).',
      body: () => two(
        card('A planta', ul(['Funil → calha vibratória → esteira → balança → visão', 'Ejetores pneumáticos EJE-602 / 603 → Silos A, B e C', ['Alimentação nominal ', b('1200 kg/h'), ' → A 900 · B 180 · C 120 kg/h']])),
        card('Normas de referência', ul([[b('ISA-5.1'), ' — tags e identificação de instrumentos'], [b('IEC 61131-3'), ' — lógica do CLP'], [b('IEC 61511'), ' — segurança funcional: decidir antes do atuador']]))),
      fala: ['Somos o Grupo 4. Na Etapa 1 provamos a lógica de segurança da planta; agora, na Etapa 2, usamos grafos para a fábrica “pensar” sozinha.', 'A planta classifica arroz: o grão entra no funil a 1200 kg/h, passa pela câmera e dois ejetores separam em três silos: A (bom), B (médio) e C (rejeito).', 'Desenhamos tudo como pontos e setas, G = (V, E, W), seguindo ISA-5.1 (nomes das tags), IEC 61131-3 (CLP) e IEC 61511 (segurança).'] },
    { who: 1, time: '01:15 – 02:30', aula: 'Aula 11', title: 'A planta como dígrafo ponderado', sub: 'Vértices = equipamentos · arcos = trechos físicos · pesos = comprimento (m)', tab: 0, mode: 'graus',
      formula: `Σ d⁺(v) = Σ d⁻(v) = |E| = ${g.edges.length}        |V| = ${g.nodes.length}`,
      plain: 'Em bom português: contamos quantos tubos entram e saem de cada equipamento; somando tudo, entradas e saídas dão o mesmo total: 14.',
      body: () => table(['Tipo de nó', 'Nós', 'd⁻', 'd⁺', 'Função'], [
        nodeRow('Fonte + convergência', ['FN-101'], 'recebe a carga e o reciclo e14'),
        nodeRow('Bifurcadores', ['EJE-602', 'EJE-603'], 'decisão: desviar ou seguir'),
        nodeRow('Sumidouros', ['SILO-701', 'SILO-703'], 'fim de linha (Silos A e C)'),
        nodeRow('Trânsito', ['ALIM-101', 'BAL-301', 'VIS-401'], 'um arco entra, um sai'),
      ]),
      fala: ['Cada equipamento é um ponto (são 14) e cada tubo ou esteira é uma seta (também 14); o peso da seta é o comprimento em metros.', 'Contamos quantos tubos entram e quantos saem de cada ponto. Somando tudo, entradas e saídas dão 14: é a conferência do projeto.', 'Os ejetores têm 1 entrada e 2 saídas porque decidem; os silos A e C só recebem; o Funil também recebe de volta o reciclo e14.'] },
    { who: 1, time: '02:30 – 03:45', aula: 'Aula 12', title: 'Matriz de incidência e balanço de massa', sub: 'Primeira lei de Kirchhoff para escoamento granular', tab: 0, mode: 'balanco',
      formula: 'B · Q = S        S = (−1200, 0, …, 0, +900, +180, +120)ᵀ',
      plain: 'Em bom português: tudo que entra em um equipamento tem que sair; só os silos guardam grão (+900, +180 e +120 kg/h).',
      body: () => two(
        card('Estrutura de B (14 × 14)', ul([['rank(B) = ', b(rk), ' · dim ker B = ', b(14 - rk), ' (único ciclo: e14)'], ['Cada coluna soma 0 (−1 origem, +1 destino)'], ['Laplaciana ', b('L = B·Bᵀ'), ` · tr(L) = ${trL} = 2|E|`]])),
        card('Passeios Aᵏ', ul([['Aᵏ[i,j] = nº de passeios de comprimento k'], ['A⁴[FN-101, VIS-401] = ', b(a4), ' (câmera, 4 saltos)'], ['A⁶[FN-101, EJE-602] = ', b(a6), ' (6 saltos)']]))),
      fala: ['Cada coluna da matriz B é um tubo: −1 no equipamento de onde sai e +1 onde chega; por isso cada coluna soma zero.', 'B·Q = S diz que o que entra em cada equipamento sai, exceto nos extremos: −1200 no funil e +900, +180 e +120 nos silos.', 'O rank 13 e dim ker B = 1 mostram que existe um único laço independente, o reciclo e14. A Laplaciana e as potências de A contam conexões e caminhos de k saltos.'] },
    { who: 2, time: '03:45 – 05:00', aula: 'Aula 13', title: 'Busca: BFS × DFS', sub: 'Duas formas de percorrer o mesmo grafo', tab: 1, mode: 'bfs',
      formula: 'BFS: fila FIFO · O(|V|+|E|)        DFS: pilha LIFO · d[v] / f[v]',
      plain: 'Em bom português: a Fila (BFS) conta quantos equipamentos o grão atravessa; a Pilha (DFS) vai até o fim e descobre o laço e14.',
      body: () => two(
        card('BFS — Fila FIFO (camadas)', ul([['Menor nº de saltos a partir de ', b('DIV-501'), ': Silo B 3, Silos A e C 4'], ['Partida/parada: o ', b('shutdown'), ' se propaga camada a camada'], ['O(|V|+|E|)']])),
        card('DFS — Pilha LIFO (profundidade)', ul([['Classifica arestas: árvore, avanço, cruzamento e ', b('retorno')], [b('e14'), ' é a aresta de retorno: prova o ciclo de reciclo'], ['XV-104 fechada → DAG → ordem topológica de parada e partida']]))),
      fala: ['A BFS usa uma fila e anda em ondas: a partir da Decisão, o Silo B está a 3 saltos e os Silos A e C a 4. Serve para desligar a linha na ordem certa.', 'A DFS usa uma pilha e vai até o fim antes de voltar; assim ela descobre que o tubo e14 volta ao início, ou seja, existe um laço.', 'Fechando a XV-104 o laço some, a linha vira um DAG e conseguimos a sequência exata de parada e de partida.'] },
    { who: 2, time: '05:00 – 06:15', aula: 'Aula 14', title: 'Menor caminho — Dijkstra', sub: 'Rota a partir de FN-101 e latência de decisão', tab: 1, mode: 'dijkstra',
      formula: 'd[v] ← min( d[v], d[u] + w(u,v) )        O((|V|+|E|) · log|V|)',
      plain: 'Em bom português: o caminho mais curto do Funil até cada silo, em metros, calculado muito antes de a válvula conseguir abrir ou fechar.',
      body: () => table(['Destino', 'Distância', 'Rota (predecessores)'], [
        ['Silo B (702)', `${br(dj.dist['SILO-702'].toFixed(1))} m`, pathStr('SILO-702')],
        ['Silo C (703)', `${br(dj.dist['SILO-703'].toFixed(1))} m`, pathStr('SILO-703')],
        ['Silo A (701)', `${br(dj.dist['SILO-701'].toFixed(1))} m`, pathStr('SILO-701')],
        [[b('Latência')], [b('t_dec < 0,1 ms')], ['≪ t_atuador 1–3 s (IEC 61511): o cálculo nunca é o gargalo']],
      ]),
      fala: ['O Dijkstra calcula o caminho mais curto do Funil até cada silo: Silo B 16,3 m, Silo C 17,0 m e Silo A 18,7 m.', 'Se o Silo A enche, a válvula fecha e o tubo passa a ter distância infinita: o programa percebe que o Silo A ficou isolado.', 'Tudo isso leva menos de 0,1 ms; a válvula leva de 1 a 3 s. O cálculo nunca atrasa a decisão.'] },
    { who: 2, time: '06:15 – 07:30', aula: 'Aula 15', title: 'Falhas: vazamento, pontes e reciclo', sub: 'Resíduo do balanço localiza o defeito', tab: 1, mode: 'vazamento',
      formula: 'r = B·Q_med − S_esp ≠ 0   →   r[EST-201] = +150 kg/h',
      plain: 'Em bom português: se a conta B·Q não fecha, houve perda; o ponto onde sobram +150 kg/h é onde está o vazamento.',
      body: () => two(
        card('Diagnóstico de vazamento', ul([['Esteira ', b('e3'), ' perde 150 kg/h: entra 1200, sai 1050'], ['Só o nó ', b('EST-201'), ' tem resíduo (+150); os demais ficam em 0'], ['Calha B entupida (e12) → retenção e TRIP por transbordo']])),
        card('Pontes × reciclo', ul([[b('e1…e13'), ' são pontes: perder uma isola a jusante'], ['XV-701 fechada → ', b('W(e11) → ∞'), ' → TRIP de emergência'], [b('e14'), ' (XV-104) é a única rota alternativa: devolve o Silo B cheio ao funil']]))),
      fala: ['A conta B·Q − S deveria dar zero. Se a esteira e3 perde 150 kg/h, entram 1200 e saem 1050, e o resíduo +150 aparece só na Esteira.', 'Na linha principal, e1 a e13 são pontes: não existe caminho alternativo. Fechar a válvula do Silo A significa parar a fábrica (TRIP).', 'A única saída é o reciclo e14, que devolve o excesso do Silo B ao Funil.'] },
    { who: 3, time: '07:30 – 09:15', aula: 'Aula 16', title: 'Circuito euleriano — inspeção de dutos', sub: 'Cada duto uma única vez (risco de poeira explosiva)', tab: 2, mode: 'euler',
      formula: `∀v: grau par  ⇒  circuito euleriano        Σ graus = ${Object.values(eulDeg).reduce((a, x) => a + x, 0)} = 2|E|`,
      plain: 'Em bom português: passar por todos os dutos uma única vez só é possível se todo ponto tem um número par de dutos.',
      body: () => table(['Cenário', 'Graus', 'Algoritmo', 'Percurso'], [
        ['Malha atual', Object.values(eulDeg).join(' · ') + ' (todos pares)', 'Hierholzer · O(|E|)', [b(`${br(eul.length.toFixed(1))} m`)]],
        ['Com duto d10 (+14 m)', '2 nós ímpares', 'Carteiro Chinês (duplica o caminho entre os ímpares)', [b('117,5 m')]],
      ]),
      fala: ['O robô inspeciona os dutos e precisa passar por todos uma só vez. Isso é um circuito de Euler.', 'Euler diz que dá certo se todo ponto tem número par de dutos; aqui os graus são 2, 4, 4, 4, 2, 2 (soma 18, o dobro dos 9 dutos).', 'O algoritmo de Hierholzer monta o percurso de 89,5 m. Com o duto novo d10 há dois pontos ímpares e o Carteiro Chinês repete um trecho: 117,5 m.'] },
    { who: 3, time: '09:15 – 11:15', aula: 'Aula 17', title: 'Ciclo hamiltoniano e TSP do AGV', sub: 'K₆ com 6 postos: LAB-CQ, FN-101, BAL-301, VIS-401, SILO-701, SILO-702', tab: 2, mode: '2opt',
      formula: 'Euler: arestas · O(|E|) · classe P        Hamilton/TSP: vértices · O(n!) · NP-difícil',
      plain: 'Em bom português: passar por todos os postos é bem mais difícil; usamos um atalho (NN) e uma melhoria (2-Opt) que tira o cruzamento da rota.',
      body: () => table(['Rota / limite', 'Custo', 'Observação'], [
        ['Rota com cruzamento', `${c0} m`, 'VIS-401 → SILO-702 cruza SILO-701 → LAB-CQ'],
        ['Refinamento 2-Opt', `${opt.cost} m`, [b(`−${eco} m (−${ecoPct} %)`), ' · remove o cruzamento']],
        ['Vizinho Mais Próximo (NN)', `${nn.cost} m`, `igual ao ótimo da força bruta (${bf.count} rotas)`],
        ['MST (cota inferior)', `${mst} m`, `${mst} < ${bf.best.c}: nenhum ciclo pode ser menor que a árvore`],
      ]),
      fala: ['Agora o AGV precisa visitar os 6 postos e voltar. Euler passa por todos os dutos, Hamilton por todos os postos; e Hamilton é muito mais difícil (fatorial).', 'A rota com cruzamento mede 268 m. O 2-Opt tira o cruzamento e chega a 218 m, uma economia de 50 m (18,7 %).', 'O vizinho mais próximo também dá 218 m e a força bruta (60 rotas) confirma que é o melhor. A MST, 143 m, é o piso: nenhuma rota pode ser menor.'] },
    { who: 4, time: '11:15 – 12:45', aula: 'Aula 18', title: 'Logística multicamada', sub: 'Materiais, veículos e estoque em grafos separados', tab: 3, mode: 'gm',
      formula: `Kahn: G_M sem e14 → ${k0.order.length}/${gm0.nodes.length} ordenados        com e14 → ${k1.order.length}/${gm1.nodes.length} (ciclo)`,
      plain: 'Em bom português: a ordenação só funciona se a fábrica não tem laços; abrindo a XV-104 o reciclo cria um laço e a ordenação trava.',
      body: () => two(
        card('Três camadas', ul([[b('G_M'), ` materiais: ${gm0.nodes.length} nós, ${gm0.edges.length} arcos (DAG)`], [b('G_V'), ' veículos: 9 nós (fortemente conexo)'], [b('G_E'), ' estoque: 10 nós (alocação de paletes)']])),
        card('Resultados formais', ul([[b('Segregação (BFS de SILO-703):'), ' só chega a CAC-803 e Subprodutos'], [b('Failover TC-002:'), ` SP-001 +3,0 m (${br((tcDist + 3).toFixed(1))} m)`], [b('Kahn:'), ' XV-104 aberta trava a ordenação']]))),
      fala: ['Separamos a fábrica em três grafos: materiais (G_M, 28 nós), caminhões (G_V, 9 nós) e estoque (G_E, 10 nós).', 'Em G_M a ordenação de Kahn ordena os 28 nós; abrindo a XV-104 o reciclo cria um laço e ela só consegue ordenar 6.', 'Pela BFS o rejeito só chega ao silo de subprodutos. Se a TC-002 falha, o silo pulmão SP-001 assume com apenas +3 m.'] },
    { who: 4, time: '12:45 – 15:00', aula: 'Síntese', title: 'Síntese integrada — Aulas 11 a 18', sub: 'Do modelo à validação: 13/13 conferências e 8/8 asserções', tab: 3, mode: 'gm',
      formula: 'Modelo G=(V,E,W)  →  álgebra B·Q=S  →  busca e rota  →  falhas  →  Euler/TSP  →  multicamada',
      plain: 'Em bom português: um quadro com tudo o que fizemos, o método usado e o quanto custa calcular.',
      body: () => table(['Escopo', 'Conceito', 'Algoritmo', 'Aplicação Grupo 4', 'Complexidade'], [
        ['Aula 11', 'Dígrafo ponderado, aperto de mãos', 'Contagem de graus', '14 nós, 14 arcos', 'O(|V|+|E|)'],
        ['Aula 12', 'Incidência B, Kirchhoff, Laplaciana', 'B·Q = S, posto, Aᵏ', 'Balanço 1200/900/180/120', 'O(n·m) · posto O(n³)'],
        ['Aula 13', 'Busca e ciclos', 'BFS / DFS / Kahn', 'Shutdown em onda; e14', 'O(|V|+|E|)'],
        ['Aula 14', 'Menor caminho', 'Dijkstra (min-heap)', '16,3 / 17,0 / 18,7 m; w = ∞', 'O((|V|+|E|)log|V|)'],
        ['Aula 15', 'Pontes e resíduo', 'r = B·Q_med − S_esp', 'Vazamento e3: +150 kg/h', 'O(|E|·(|V|+|E|))'],
        ['Aula 16', 'Circuito euleriano', 'Hierholzer / Carteiro Chinês', 'Inspeção 89,5 m (117,5 m)', 'O(|E|)'],
        ['Aula 17', 'Ciclo hamiltoniano (TSP)', 'NN, 2-Opt, MST', `AGV ${c0} → ${opt.cost} m`, 'O(n!) exato · NN O(n²)'],
        ['Aula 18', 'Rede multicamada', 'Kahn, BFS, Dijkstra', 'G_M 28 · G_V 9 · G_E 10', 'O(|V|+|E|)'],
      ], 'compact'),
      fala: ['Este quadro resume as Aulas 11 a 18: o conceito, o algoritmo, o que ele resolveu na planta e o custo de calcular.', 'Todos os números saem dos algoritmos e passam nos testes: 13 conferências e 8 asserções da Aula 18.', 'Limitação: os pesos são fixos. Próximo passo, Etapa 3: árvores para organizar as tags e evitar enxurrada de alarmes.'] },
  ];
  const TAGS = ['Integrante 1', 'Integrante 2', 'Integrante 3', 'Integrante 4'];

  /* ---- interface ---- */
  let cur = 0, fala = true;   // fala visível por padrão (pode ocultar)
  const stage = h('div', { class: 'sl-stage' }), dots = h('div', { class: 'sl-dots' });
  const btnPrev = h('button', { class: 'btn big', onClick: () => go(cur - 1) }, '◀ Anterior'), btnNext = h('button', { class: 'btn big', onClick: () => go(cur + 1) }, 'Próximo ▶');
  const btnSim = h('button', { class: 'btn big green', onClick: () => openSim() }, 'Abrir Aba do Simulador deste Slide'), btnFala = h('button', { class: 'btn mid sl-fala-btn', onClick: () => { fala = !fala; render(); } }, '');
  const bar = h('div', { class: 'sl-bar' }, btnPrev, dots, btnNext, btnFala, btnSim);
  const el = h('div', { class: 'sl-root' }, stage, bar);

  function openSim() {
    const s = SLIDES[cur], ti = s.tab + 1; app.goto(ti);
    const t = app.tabs[ti]; if (s.mode && t.setMode) t.setMode(s.mode);
  }
  function go(i) { cur = Math.max(0, Math.min(SLIDES.length - 1, i)); render(); }
  function render() {
    const s = SLIDES[cur];
    clear(stage).append(
      h('div', { class: 'sl-head' },
        h('span', { class: `sl-tag i${s.who}` }, `${TAGS[s.who - 1]} · ${s.time}`), h('span', { class: 'sl-aula' }, s.aula), h('span', { class: 'sl-num' }, `Slide ${cur + 1} / ${SLIDES.length}`)),
      h('h2', { class: 'sl-title' }, s.title), h('div', { class: 'sl-sub' }, s.sub),
      h('div', { class: 'sl-formula' }, s.formula),
      h('div', { class: 'sl-plain' }, s.plain),
      h('div', { class: 'sl-body' }, s.body()),
      ...(fala ? [h('div', { class: 'sl-fala' }, h('div', { class: 'cardtitle' }, `O que falar — ${TAGS[s.who - 1]}`), ...s.fala.map(t => h('p', { class: 'sl-fp' }, t)))] : []));
    clear(dots).append(...SLIDES.map((x, i) => h('button', { class: 'sl-dot' + (i === cur ? ' on' : ''), title: `Slide ${i + 1}`, onClick: () => go(i) }, String(i + 1))));
    btnPrev.disabled = cur === 0; btnNext.disabled = cur === SLIDES.length - 1;
    btnFala.textContent = fala ? 'Ocultar Fala (Roteiro)' : 'Mostrar Fala (Roteiro)';
  }
  render();

  window.addEventListener('keydown', ev => {
    if (app.active !== 0 || ev.ctrlKey || ev.altKey || ev.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    const k = ev.key;
    if (k === 'ArrowRight' || k === 'PageDown') go(cur + 1);
    else if (k === 'ArrowLeft' || k === 'PageUp') go(cur - 1);
    else if (k === 'Home') go(0); else if (k === 'End') go(SLIDES.length - 1);
    else return;
    ev.preventDefault();
  });

  return { el, setMode: m => go(+m - 1 || 0), onPlantReplaced() {}, onShow() { render(); }, update() {} };
}
