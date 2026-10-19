/** Aba 2 — Integrante 2: Busca, Dijkstra e Falhas (Aulas 13–15). */
import { h, clear, f0, f1, fsign } from './dom.js';
import { PlantView } from './plantview.js';
import { NODES, EDGES } from './data.js';
import * as A from './algorithms.js';
import { bigNum, toggleGroup, actionBtn } from './widgets.js';

const LAYER_COLORS = ['#ff4d4d', '#ffff00', '#7CFC00', '#00ffff', '#ff9bf5'];
const short = id => id.replace('-', '');

export function createTab2(app) {
  const view = new PlantView({ interactive: false });
  const g = app.plant.graph, Binc = A.incidenceMatrix(g);
  let tLive = 0;
  let mode = null, timer = null, e14open = true, extra = null, tStrip = 0;
  const out = h('div', { class: 'col' });
  const strip = h('div', { class: 'panel stripline' });
  const group = toggleGroup([
    ['bfs', '[Aula 13] BFS — Menor Salto e Shutdown'],
    ['dfs', '[Aula 13] DFS — Detecção de Ciclo (e14) e Ordem Topológica'],
    ['dijkstra', '[Aula 14] Dijkstra — Menor Caminho e Bloqueio (w = ∞)'],
    ['vazamento', '[Aula 15] Simular Vazamento na Esteira e3 (−150 kg/h)'],
  ], m => apply(m));
  const el = h('div', { class: 'split' }, h('div', { class: 'col' }, h('div', { class: 'viewport big' }, view.svg), strip), h('div', { class: 'col' }, group.el, out));
  let live = () => {};

  function clean() {
    if (timer) { clearInterval(timer); timer = null; }
    view.setHighlight(); view.setNodeText({}); view.setEdgeText(null); live = () => {}; extra = null;
  }
  function resetPlant() { app.reset(); }

  function apply(m) {
    clean(); mode = m; clear(out);
    if (!m) { resetPlant(); return; }
    if (m === 'bfs') bfsMode(); else if (m === 'dfs') dfsMode(); else if (m === 'dijkstra') dijkstraMode(); else leakMode();
  }

  /* ---------------------------------------------------- BFS a partir de DIV-501 */
  function bfsMode() {
    resetPlant();
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
      h('div', { class: 'bignums' }, bigNum('Silo B (SILO-702)', `${r.dist['SILO-702']} saltos`, 'y'), bigNum('Silo A (SILO-701)', `${r.dist['SILO-701']} saltos`, ''), bigNum('Silo C (SILO-703)', `${r.dist['SILO-703']} saltos`, '')),
      h('div', { class: 'card line' }, 'A partir de DIV-501 · onda camada a camada · O(|V| + |E|)'),
      h('div', { class: 'card', style: { fontSize: '15px' } }, h('b', {}, 'Shutdown: '), 'o trip de um nó propaga-se pelos sucessores na mesma ordem das camadas.'));
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
      const k = A.kahn(g, bl), seq = A.startStopSequences(g);
      headline.replaceChildren(r.hasBackEdge ? h('span', { style: { color: '#b71c1c' } }, 'Back edge e14 (SILO-702 → FN-101): ciclo de reciclo') : h('span', { style: { color: '#0a6a0a' } }, 'Sem back edge: grafo acíclico (DAG)'));
      orders.replaceChildren(
        h('div', {}, h('b', {}, 'd/f: '), 'tempos de descoberta / finalização em cada nó'),
        ...(k.isDag ? [h('div', { style: { marginTop: '6px' } }, h('b', {}, 'Parada (ordem topológica) ▶ '), seq.stop.map(short).join(' → ')),
          h('div', { style: { marginTop: '6px' } }, h('b', {}, 'Partida a frio (inversa) ▶ '), seq.start.map(short).join(' → '))]
          : [h('div', { style: { marginTop: '6px', color: '#b71c1c' } }, h('b', {}, `Kahn trava: ordena ${k.order.length} de 14 — com e14 não há ordem. Feche XV-104 para ver as sequências.`))]));
    }
    draw();
    out.append(headline, h('label', { class: 'chk card', style: { fontSize: '16px', fontWeight: 'bold' } }, chk, h('span', {}, 'XV-104 aberta (e14 presente)')), h('div', { class: 'card' }, orders));
  }

  /* ---------------------------------------------------- Dijkstra e bloqueio de e11 */
  function dijkstraMode() {
    resetPlant();
    let blocked = false;
    const nums = h('div', { class: 'bignums' }), status = h('div', { class: 'card line' });
    const btn = actionBtn('Fechar XV-701 (Silo A cheio 95 %)', () => {
      blocked = !blocked;
      if (blocked) app.plant.setSiloLevel('SILO-701', 0.96);
      else { app.reset(); }
      btn.setOn(blocked); btn.textContent = blocked ? 'Reabrir XV-701 e restabelecer a planta' : 'Fechar XV-701 (Silo A cheio 95 %)'; draw();
    }, 'red');
    function draw() {
      const bl = blocked ? new Set(['e11']) : new Set(), r = A.dijkstra(g, 'FN-101', bl), text = {}, nodes = new Map(), edges = new Map();
      for (const n of NODES) text[n.id] = isFinite(r.dist[n.id]) ? `${f1(r.dist[n.id])} m` : '∞';
      ['SILO-701', 'SILO-702', 'SILO-703'].forEach(s => nodes.set(s, isFinite(r.dist[s]) ? 'done' : 'bad'));
      if (blocked) edges.set('e11', 'bad');
      view.setHighlight(nodes, edges); view.setNodeText(text);
      clear(nums).append(bigNum('Silo B', `${f1(r.dist['SILO-702'])} m`, 'y'), bigNum('Silo C', `${f1(r.dist['SILO-703'])} m`, ''), bigNum('Silo A', isFinite(r.dist['SILO-701']) ? `${f1(r.dist['SILO-701'])} m` : '∞', isFinite(r.dist['SILO-701']) ? '' : 'r'));
      status.textContent = blocked ? 'w(e11) = ∞  →  SILO-701 isolado: dist = ∞' : 'Distâncias a partir de FN-101';
    }
    draw();
    live = () => {
      const p = app.plant;
      if (blocked) status.textContent = p.state === 'TRIP' ? `w(e11) = ∞ → dist(SILO-701) = ∞ → TRIP: c_ALIM = 0` : 'w(e11) = ∞ → SILO-701 isolado: CALHA-701 enchendo…';
    };
    out.append(nums, status, btn);
  }

  /* ---------------------------------------------------- vazamento em e3 e entupimento de e12 */
  function leakMode() {
    resetPlant();
    const p0 = app.plant; p0.setLeak('e3', 150); app.fastForward(200);
    let entupida = false;
    const big = h('span', { class: 'io xl r' }, ''), sub = h('div', { class: 'bignums' }), info = h('div', { class: 'card line' });
    const btn = actionBtn('Entupir Calha B (e12)', () => {
      entupida = !entupida;
      app.plant.toggleBlock('e12'); if (entupida) app.fastForward(200);
      btn.setOn(entupida); btn.textContent = entupida ? 'Desobstruir Calha B (e12)' : 'Entupir Calha B (e12)';
    }, 'yellow');
    extra = true;
    const nodes = new Map([['EST-201', 'bad']]), edges = new Map([['e3', 'bad']]);
    view.setHighlight(nodes, edges);
    live = () => {
      if (performance.now() - tLive < 200) return; tLive = performance.now();
      const p = app.plant, S = A.matVec(Binc, p.qVector()), iE = p.graph.nodes.indexOf('EST-201'), iC = p.graph.nodes.indexOf('CALHA-602');
      big.textContent = `${fsign(S[iE])} kg/h`;
      view.setNodeText({ 'EST-201': `r = ${fsign(S[iE])}` });
      clear(sub).append(bigNum('Q(e2) → entra', f0(p.rateExit('e2')), ''), bigNum('Q(e3) → sai', f0(p.rateExit('e3')), 'y'),
        entupida ? bigNum('Retido na CALHA-602', `${p.nodeHeld('CALHA-602').toFixed(1)} kg`, 'r') : bigNum('Perdido em e3', `${p.leakedKg.toFixed(0)} kg`, 'y'));
      info.textContent = entupida ? `S(CALHA-602) = ${fsign(S[iC])} kg/h · TRIP em ≈ ${f0(Math.max(0, p.timeToOverflow('CALHA-602') ?? 0))} s` : 'r = B·Q − S aponta o nó EST-201 (perda em e3)';
    };
    out.append(h('div', { class: 'card', style: { textAlign: 'center' } }, h('div', { style: { fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' } }, 'Resíduo no nó EST-201'), big), sub, info, btn);
  }

  return {
    el, onPlantReplaced() {}, onShow() {}, setMode: m => { group.set(m); apply(m); },
    update() {
      const p = app.plant; view.update(p); live();
      if (performance.now() - tStrip < 250) return; tStrip = performance.now();
      clear(strip).append(h('span', {}, 'Planta: ', h('span', { class: 'io ' + (p.state === 'OPERANDO' ? '' : 'r') }, p.state)),
        h('span', {}, 'Silo A ', h('span', { class: 'io' }, (p.siloFrac('SILO-701') * 100).toFixed(0) + ' %')),
        ...(p.state === 'TRIP' ? [h('span', { style: { color: '#b71c1c', fontWeight: 'bold' } }, p.tripReason)] : []));
    },
  };
}
