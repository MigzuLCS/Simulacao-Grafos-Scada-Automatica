/** Aba 1 — Integrante 1: Modelagem e Balanço (Aulas 11–12). */
import { h, clear, f0 } from './dom.js';
import { PlantView } from './plantview.js';
import { NODES, EDGES, Q_NOMINAL } from './data.js';
import * as A from './algorithms.js';
import { bigNum, toggleGroup, banner } from './widgets.js';

export function createTab1(app) {
  const view = new PlantView({ interactive: false });
  const g = app.plant.graph, B = A.incidenceMatrix(g), Qn = EDGES.map(e => Q_NOMINAL[e.id]), S = A.matVec(B, Qn), rk = A.rank(B);
  const strip = h('div', { class: 'panel stripline' });
  const out = h('div', { class: 'col' });
  const group = toggleGroup([
    ['graus', '[Aula 11] Graus e Topologia (|V| = 14, |E| = 14)'],
    ['balanco', '[Aula 12] Balanço de Massa (B·Q = S)'],
    ['matriz', '[Aula 12] Matriz de Incidência B (14 × 14)'],
  ], m => apply(m), { allowOff: false });
  const bn = banner();
  const el = h('div', {}, bn.el, h('div', { class: 'split' },
    h('div', { class: 'col' }, h('div', { class: 'viewport big' }, view.svg), strip),
    h('div', { class: 'col' }, group.el, out)));

  // Aula 12: Laplaciana L = B·Bᵀ e potências da adjacência Aᵏ (passeios de comprimento k)
  const L = A.laplacian(B), trL = L.reduce((a, r, i) => a + r[i], 0), Adj = A.adjacency(g), ix = id => g.nodes.indexOf(id);
  const mul = (X, Y) => X.map(r => Y[0].map((_, j) => r.reduce((a, x, k) => a + x * Y[k][j], 0)));
  const Apow = k => { let P = Adj; for (let i = 1; i < k; i++) P = mul(P, Adj); return P; };
  const w4 = Apow(4)[ix('FN-101')][ix('VIS-401')], w6 = Apow(6)[ix('FN-101')][ix('EJE-602')];
  const algebra = () => h('div', { class: 'card', style: { fontSize: '15px', lineHeight: '1.5' } },
    h('div', {}, h('b', {}, 'L = B·Bᵀ'), ` (Laplaciana, ${L.length}×${L.length}): diagonal = d⁻+d⁺ de cada nó · tr(L) = ${trL} = 2|E|`),
    h('div', {}, h('b', {}, 'Aᵏ'), ` = nº de passeios de comprimento k: A⁴[FN-101, VIS-401] = ${w4} (câmera, 4 saltos) · A⁶[FN-101, EJE-602] = ${w6} (6 saltos)`));

  function apply(m) {
    const nodes = new Map(), edges = new Map(); let text = null;
    clear(out);
    if (m === 'graus') {
      bn.set(h('b', {}, 'Σ d⁺ = Σ d⁻ = |E| = 14'), ' — rosa: nós bifurcadores (ejetores, d⁺ = 2); vermelho: a única aresta de ciclo (e14).');
      text = Object.fromEntries(NODES.map(n => [n.id, `d⁻${g.degIn(n.id)} · d⁺${g.degOut(n.id)}`]));
      nodes.set('EJE-602', 'mark'); nodes.set('EJE-603', 'mark'); edges.set('e14', 'bad');
      out.append(
        h('div', { class: 'card line' }, 'Σ d⁺ = Σ d⁻ = |E| = ', h('span', { class: 'io big' }, '14')),
        h('div', { class: 'bignums' }, bigNum('Bifurcadores (d⁺ = 2)', 'EJE-602 · EJE-603', 'y'), bigNum('Sumidouros (d⁺ = 0)', 'SILO-701 · 703', 'c')),
        h('div', { class: 'card', style: { fontSize: '15px' } }, h('b', {}, 'e14 (XV-104): '), 'única aresta que fecha ciclo — SILO-702 → FN-101.'));
    } else if (m === 'balanco') {
      bn.set(h('b', {}, 'B·Q = S'), ' — verde: nó que recebe massa (S > 0); ciano: nó que injeta (S < 0); sem cor: conserva (S = 0).');
      out.append(
        h('div', { class: 'bignums' }, bigNum('rank(B)', String(rk), ''), bigNum('dim ker B (ciclo e14)', String(14 - rk), 'y'), bigNum('Σ S', '0', 'c')),
        h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Nó', 'Entra', 'Sai', 'S = B·Q'].map(x => h('th', {}, x)))),
          h('tbody', {}, NODES.map((n, k) => {
            const qin = EDGES.reduce((a, e, j) => a + (e.v === n.id ? Qn[j] : 0), 0), qout = EDGES.reduce((a, e, j) => a + (e.u === n.id ? Qn[j] : 0), 0);
            return h('tr', { class: S[k] ? 'hl' : '' }, h('td', {}, n.id), h('td', { class: 'num' }, qin), h('td', { class: 'num' }, qout), h('td', { class: 'num' }, (S[k] > 0 ? '+' : '') + S[k]));
          }))), algebra());
      NODES.forEach((n, k) => { if (S[k]) nodes.set(n.id, S[k] < 0 ? 'queue' : 'done'); });
    } else {
      bn.set(h('b', {}, 'Matriz B (nós × arestas)'), ' — verde: +1 aresta chega ao nó; vermelho: −1 aresta parte do nó; cada coluna soma 0.');
      out.append(
        h('table', { class: 't matrix' }, h('thead', {}, h('tr', {}, h('th', {}, ''), EDGES.map(e => h('th', {}, e.id)))),
          h('tbody', {}, g.nodes.map((v, i) => h('tr', {}, h('td', {}, v), B[i].map(x => h('td', { class: x > 0 ? 'cellp' : x < 0 ? 'cellm' : '' }, x ? (x > 0 ? '+1' : '−1') : '·')))),
            h('tr', {}, h('td', {}, 'Σ coluna'), EDGES.map((e, j) => h('td', {}, B.reduce((a, r) => a + r[j], 0)))))),
        h('div', { class: 'card line' }, h('span', { style: { background: '#bfe3bf', padding: '2px 8px' } }, '+1 chega'), '  ', h('span', { style: { background: '#f3b9b9', padding: '2px 8px' } }, '−1 parte'), '   cada coluna soma 0'));
    }
    view.setHighlight(nodes, edges); view.setNodeText(text || {});
  }

  let tStrip = 0;
  group.set('graus'); apply('graus');
  return {
    el, setMode: m => { group.set(m); apply(m); }, onPlantReplaced() {}, onShow() {},
    update() {
      const p = app.plant; view.update(p);
      if (performance.now() - tStrip < 250) return; tStrip = performance.now();
      clear(strip).append(h('span', {}, 'Alimentação ', h('b', {}, f0(p.instruments().qSet)), ' kg/h  →'),
        h('span', {}, 'A ', h('span', { class: 'io' }, f0(p.rateExit('e11'))), ' kg/h'), h('span', {}, 'B ', h('span', { class: 'io' }, f0(p.rateExit('e12'))), ' kg/h'), h('span', {}, 'C ', h('span', { class: 'io' }, f0(p.rateExit('e13'))), ' kg/h'),
        h('span', { class: 'muted' }, '(ao vivo · 75 / 15 / 10 %)'));
    },
  };
}
