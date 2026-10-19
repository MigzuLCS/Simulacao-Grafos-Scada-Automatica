/** Aba 2 — Integrante 2: Busca, Rota e Falhas (Aulas 13–15). */
import { h, clear, f0, f1, fsign } from './dom.js';
import { PlantView } from './plantview.js';
import { NODES } from './data.js';
import * as A from './algorithms.js';
import { bigNum, toggleGroup, actionBtn, banner } from './widgets.js';

const LAYER_COLORS = ['#ff4d4d', '#ffff00', '#7CFC00', '#00ffff', '#ff9bf5'];
const short = id => id.replace('-', '');
const fm = x => f1(x).replace('.', ',');

export function createTab2(app) {
  const view = new PlantView({ interactive: false });
  const g = app.plant.graph, Binc = A.incidenceMatrix(g);
  let tLive = 0;
  let timer = null, e14open = true;
  const out = h('div', { class: 'col' });
  const group = toggleGroup([
    ['bfs', 'Aula 13 · BFS: camadas em onda'],
    ['dfs', 'Aula 13 · DFS: achar o laço (e14)'],
    ['dijkstra', 'Aula 14 · Dijkstra: menor rota'],
    ['vazamento', 'Aula 15 · Vazamento na esteira e3'],
  ], m => apply(m));
  const bn = banner();
  const el = h('div', {}, bn.el, h('div', { class: 'split' }, h('div', { class: 'col' }, h('div', { class: 'viewport big' }, view.svg)), h('div', { class: 'col' }, group.el, out)));
  const INTRO = 'Escolha um algoritmo: as cores do desenho mostram por onde ele já passou.';
  bn.set(INTRO);
  let live = () => {};

  const note = (...kids) => h('div', { class: 'card plain' }, ...kids);
  const tDec = () => { const n = 300, t0 = performance.now(); for (let i = 0; i < n; i++) A.dijkstra(g, 'FN-101'); return (performance.now() - t0) / n; };
  const fmtMs = x => x < 0.01 ? '< 0,01' : x.toFixed(2).replace('.', ',');

  function clean() {
    if (timer) { clearInterval(timer); timer = null; }
    view.setHighlight(); view.setNodeText({}); view.setEdgeText(null); live = () => {};
  }
  function resetPlant() { app.reset(); }

  function apply(m) {
    clean(); clear(out);
    if (!m) { resetPlant(); bn.set(INTRO); return; }
    if (m === 'bfs') bfsMode(); else if (m === 'dfs') dfsMode(); else if (m === 'dijkstra') dijkstraMode(); else leakMode();
  }

  /* ---------------------------------------------------- BFS a partir de DIV-501 */
  function bfsMode() {
    resetPlant();
    bn.set(h('b', {}, 'BFS'), ' — a partir da Decisão (DIV-501), cada cor é uma camada: o 1º, o 2º, o 3º equipamento adiante.');
    const r = A.bfs(g, 'DIV-501', new Set(['e14'])), maxL = Math.max(...Object.values(r.dist));
    let shown = -1;
    const draw = () => {
      const nodes = new Map(), text = {}, edges = new Map();
      for (const [v, d] of Object.entries(r.dist)) if (d <= shown) { nodes.set(v, LAYER_COLORS[d % LAYER_COLORS.length]); text[v] = d === 0 ? 'origem' : `${d} salto${d > 1 ? 's' : ''}`; }
      r.steps.forEach(s => { if (s.type === 'discover' && r.dist[s.node] <= shown) edges.set(s.edge, LAYER_COLORS[r.dist[s.node] % LAYER_COLORS.length]); });
      view.setHighlight(nodes, edges); view.setNodeText(text);
    };
    timer = setInterval(() => { if (shown < maxL) { shown++; draw(); } else { clearInterval(timer); timer = null; } }, 750);
    out.append(
      h('div', { class: 'bignums' }, bigNum('Silo B', `${r.dist['SILO-702']} saltos`, 'y'), bigNum('Silo A', `${r.dist['SILO-701']} saltos`, ''), bigNum('Silo C', `${r.dist['SILO-703']} saltos`, '')),
      note(h('b', {}, 'Em bom português: '), 'camadas em onda, usando uma Fila: conta quantos equipamentos o grão atravessa. Serve para desligar a linha na ordem certa.'));
  }

  /* ---------------------------------------------------- DFS: ciclo e ordem topológica */
  function dfsMode() {
    resetPlant();
    const orders = h('div', { class: 'chips' }), headline = h('div', { class: 'card line' });
    const chk = h('input', { type: 'checkbox', checked: true, onChange: ev => { e14open = ev.target.checked; app.plant.setRecycle(e14open); draw(); } });
    e14open = true; app.plant.setRecycle(true);
    function draw() {
      const bl = e14open ? new Set() : new Set(['e14']), r = A.dfs(g, 'FN-101', bl), text = {}, edges = new Map(), nodes = new Map();
      for (const n of NODES) if (r.d[n.id] != null) text[n.id] = `${r.d[n.id]}/${r.f[n.id]}`;
      for (const [id, c] of Object.entries(r.edgeClass)) edges.set(id, c === 'retorno' ? 'bad' : 'done');
      view.setHighlight(nodes, edges); view.setNodeText(text);
      bn.set(h('b', {}, 'DFS'), r.hasBackEdge ? ' — vermelho: o tubo e14 volta ao início, então existe um laço.' : ' — sem tubo de retorno: a linha não tem laços (DAG) e a ordem existe.');
      const k = A.kahn(g, bl), seq = A.startStopSequences(g);
      headline.replaceChildren(r.hasBackEdge ? h('span', { style: { color: '#b71c1c' } }, 'Tubo e14 (Silo B → Funil) fecha um laço') : h('span', { style: { color: '#0a6a0a' } }, 'Sem laços: a linha é um DAG'));
      orders.replaceChildren(
        ...(k.isDag ? [h('div', {}, h('b', {}, 'Parada ▶ '), seq.stop.map(short).join(' → ')),
          h('div', { style: { marginTop: '6px' } }, h('b', {}, 'Partida ▶ '), seq.start.map(short).join(' → '))]
          : [h('div', { style: { color: '#b71c1c' } }, h('b', {}, 'Com o laço e14 não dá para ordenar. Feche a XV-104 (desmarque a caixa).'))]));
    }
    draw();
    out.append(headline,
      note(h('b', {}, 'Em bom português: '), 'segue até o fim usando uma Pilha para achar laços: descobre que a tubulação e14 volta pro início. Fechando e14, o grafo fica sem laços (DAG) e dá a sequência exata de partida e parada. Os números nos nós (d/f) são o “quando entrou / quando saiu”.'),
      h('label', { class: 'chk card', style: { fontSize: '18px', fontWeight: 'bold' } }, chk, h('span', {}, 'XV-104 aberta (tubo e14 ligado)')), h('div', { class: 'card' }, orders));
  }

  /* ---------------------------------------------------- Dijkstra: 3 cards */
  function dijkstraMode() {
    resetPlant();
    let blocked = false, reciclo = true;
    app.plant.setRecycle(true);
    const rotas = h('div', { class: 'card' }), tempo = h('div', { class: 'card' }), pontes = h('div', { class: 'card' }), trip = h('div', { class: 'trip-line' });
    const btn = actionBtn('Fechar válvula do Silo A (cheio 95 %)', () => {
      blocked = !blocked;
      if (blocked) app.plant.setSiloLevel('SILO-701', 0.96);
      else { app.reset(); app.plant.setRecycle(reciclo); }
      btn.setOn(blocked); btn.textContent = blocked ? 'Reabrir válvula do Silo A' : 'Fechar válvula do Silo A (cheio 95 %)'; draw();
    }, 'red');
    const btnRec = actionBtn('Reciclo e14', () => { reciclo = !reciclo; app.plant.setRecycle(reciclo); draw(); }, 'green');
    function draw() {
      const bl = blocked ? new Set(['e11']) : new Set(), r = A.dijkstra(g, 'FN-101', bl), text = {}, nodes = new Map(), edges = new Map(), SIL = [['SILO-702', 'Silo B'], ['SILO-703', 'Silo C'], ['SILO-701', 'Silo A']];
      for (const n of NODES) text[n.id] = isFinite(r.dist[n.id]) ? `${fm(r.dist[n.id])} m` : '∞';
      SIL.forEach(([x]) => {
        nodes.set(x, isFinite(r.dist[x]) ? 'done' : 'bad');
        const p = isFinite(r.dist[x]) ? A.pathTo(r.parent, x) : null;
        if (p) for (let i = 0; i < p.length - 1; i++) edges.set(g.edges.find(e => e.u === p[i] && e.v === p[i + 1]).id, 'visit');
      });
      if (blocked) edges.set('e11', 'bad');
      if (reciclo) edges.set('e14', 'mark');
      view.setHighlight(nodes, edges); view.setNodeText(text);
      bn.set(h('b', {}, 'Dijkstra'), blocked ? ' — vermelho: tubo do Silo A fechado, distância infinita (∞).' : ' — amarelo: o caminho mais curto do Funil até cada silo; o número é a distância em metros.');
      const rota = x => { const p = isFinite(r.dist[x]) ? A.pathTo(r.parent, x) : null; return p ? p.map(short).join(' → ') : '— (sem caminho)'; };
      clear(rotas).append(h('div', { class: 'cardtitle' }, 'Rotas a partir do Funil'),
        h('table', { class: 't sl-table compact' }, h('tbody', {}, ...SIL.map(([x, nome]) => h('tr', {}, h('td', { class: 'k' }, nome), h('td', { class: 'num' }, isFinite(r.dist[x]) ? `${fm(r.dist[x])} m` : '∞'), h('td', {}, rota(x)))))));
      const t = tDec();
      clear(tempo).append(h('div', { class: 'cardtitle' }, 'Tempo de resposta'),
        h('div', { style: { fontSize: '19px', fontWeight: 'bold' } }, '< 0,1 ms no computador  vs  1 a 3 s da válvula mecânica'),
        h('div', { class: 'muted', style: { fontSize: '14px', marginTop: '4px' } }, `medido agora neste navegador: ≈ ${fmtMs(t)} ms — o cálculo nunca é o gargalo`));
      clear(pontes).append(h('div', { class: 'cardtitle' }, 'Pontes vs Reciclo (Aula 15)'),
        h('div', { style: { fontSize: '17px', lineHeight: 1.4 } }, 'Na linha principal e1..e13 não há desvio (são pontes): se fechar a válvula do Silo A, a fábrica para (TRIP). Já o Silo B tem a tubulação de reciclo e14 para desviar o excesso.'),
        trip);
      btnRec.textContent = reciclo ? 'Reciclo e14: LIGADO — desligar' : 'Reciclo e14: DESLIGADO — ligar';
      btnRec.setOn(reciclo);
    }
    draw();
    live = () => {
      const p = app.plant;
      trip.textContent = blocked ? (p.state === 'TRIP' ? 'TRIP: a fábrica parou.' : 'Calha do Silo A enchendo…') : '';
      trip.style.color = '#b71c1c'; trip.style.fontWeight = 'bold'; trip.style.marginTop = trip.textContent ? '6px' : '0';
    };
    out.append(h('div', { class: 'btns' }, btn, btnRec), rotas, tempo, pontes);
  }

  /* ---------------------------------------------------- vazamento em e3 e entupimento de e12 */
  function leakMode() {
    resetPlant();
    bn.set(h('b', {}, 'r = B·Q − S'), ' — vermelho: o equipamento (Esteira) e o trecho e3 onde a conta não fecha.');
    app.plant.setLeak('e3', 150); app.fastForward(200);
    let entupida = false;
    const sub = h('div', { class: 'bignums' }), info = h('div', { class: 'card line' });
    const btn = actionBtn('Entupir Calha B (e12)', () => {
      entupida = !entupida;
      app.plant.toggleBlock('e12'); if (entupida) app.fastForward(200);
      btn.setOn(entupida); btn.textContent = entupida ? 'Desobstruir Calha B (e12)' : 'Entupir Calha B (e12)';
    }, 'yellow');
    view.setHighlight(new Map([['EST-201', 'bad']]), new Map([['e3', 'bad']]));
    live = () => {
      if (performance.now() - tLive < 200) return; tLive = performance.now();
      const p = app.plant, S = A.matVec(Binc, p.qVector()), iE = p.graph.nodes.indexOf('EST-201');
      view.setNodeText({ 'EST-201': `r = ${fsign(S[iE])}` });
      view.setEdgeText({ e2: `entram ${f0(p.rateExit('e2'))}`, e3: `saem ${f0(p.rateExit('e3'))}` });
      clear(sub).append(bigNum('Entram', `${f0(p.rateExit('e2'))} kg/h`, ''), bigNum('Saem', `${f0(p.rateExit('e3'))} kg/h`, 'y'), bigNum('Perdido (r)', `${fsign(S[iE])} kg/h`, 'r'));
      info.textContent = entupida ? `Calha B retém ${p.nodeHeld('CALHA-602').toFixed(1)} kg · TRIP em ≈ ${f0(Math.max(0, p.timeToOverflow('CALHA-602') ?? 0))} s` : '';
      info.style.display = entupida ? '' : 'none';
    };
    out.append(note(h('div', { style: { fontSize: '19px', lineHeight: 1.4 } }, 'Entram 1200 kg/h na esteira e3, saem 1050 kg/h → a conta B·Q acusa na hora os ', h('b', {}, '+150 kg/h'), ' perdidos na esteira e3.')), sub, info, btn);
  }

  return {
    el, onPlantReplaced() {}, onShow() {}, setMode: m => { group.set(m); apply(m); },
    update() { view.update(app.plant); live(); },
  };
}
