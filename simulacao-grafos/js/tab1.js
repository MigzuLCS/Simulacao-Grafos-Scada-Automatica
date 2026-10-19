/** Aba 1 — Integrante 1: Planta e Balanço (Aulas 11–12). */
import { h, clear } from './dom.js';
import { PlantView } from './plantview.js';
import { NODES, EDGES, Q_NOMINAL } from './data.js';
import * as A from './algorithms.js';
import { toggleGroup, banner } from './widgets.js';

export function createTab1(app) {
  const view = new PlantView({ interactive: false });
  const g = app.plant.graph, B = A.incidenceMatrix(g), Qn = EDGES.map(e => Q_NOMINAL[e.id]), S = A.matVec(B, Qn), rk = A.rank(B);
  const out = h('div', { class: 'col' });
  const group = toggleGroup([
    ['graus', 'Aula 11 · Graus: quantos tubos entram e saem'],
    ['balanco', 'Aula 12 · Balanço B·Q = S'],
    ['matriz', 'Aula 12 · Matriz B (14 × 14)'],
  ], m => apply(m), { allowOff: false });
  const bn = banner();
  const el = h('div', {}, bn.el, h('div', { class: 'split' },
    h('div', { class: 'col' }, h('div', { class: 'viewport big' }, view.svg)),
    h('div', { class: 'col' }, group.el, out)));

  // graus sem o retorno e14 (a linha "de verdade"); o e14 é explicado à parte
  const din = id => g.edges.filter(e => e.v === id && e.id !== 'e14').length, dout = id => g.edges.filter(e => e.u === id && e.id !== 'e14').length;

  // Aula 12: Laplaciana L = B·Bᵀ e potências de A
  const L = A.laplacian(B), trL = L.reduce((a, r, i) => a + r[i], 0), Adj = A.adjacency(g), ix = id => g.nodes.indexOf(id);
  const mul = (X, Y) => X.map(r => Y[0].map((_, j) => r.reduce((a, x, k) => a + x * Y[k][j], 0)));
  const Apow = k => { let P = Adj; for (let i = 1; i < k; i++) P = mul(P, Adj); return P; };
  const w4 = Apow(4)[ix('FN-101')][ix('VIS-401')];

  const mini = (cor, titulo, linha, expl) => h('div', { class: 'card mini', style: { borderLeft: `10px solid ${cor}` } },
    h('div', { class: 'mini-t' }, titulo), h('div', { class: 'mini-n' }, linha), h('div', { class: 'mini-e' }, expl));

  function apply(m) {
    const nodes = new Map(), edges = new Map(); let text = null;
    clear(out);
    if (m === 'graus') {
      bn.set(h('b', {}, 'Grau de entrada = quantos tubos chegam · grau de saída = quantos tubos saem'), ' (os valores do desenho não contam o retorno e14).');
      text = Object.fromEntries(['FN-101', 'EJE-602', 'EJE-603', 'SILO-701', 'SILO-702', 'SILO-703'].map(id => [id, `entra ${din(id)} · sai ${dout(id)}`]));
      nodes.set('EJE-602', 'mark'); nodes.set('EJE-603', 'mark'); nodes.set('FN-101', 'done'); nodes.set('SILO-701', 'queue'); nodes.set('SILO-703', 'queue'); edges.set('e14', 'bad');
      out.append(
        mini('#7CFC00', 'Fonte — Funil', `${din('FN-101')} entram · ${dout('FN-101')} sai`, 'A carga de 1200 kg/h nasce aqui.'),
        mini('#ff9bf5', 'Decisão — Ejetores B e C', `${din('EJE-602')} entra · ${dout('EJE-602')} saem`, 'Cada ejetor escolhe: desvia o grão ou deixa seguir.'),
        mini('#00cccc', 'Fim de linha — Silos A e C', `${din('SILO-701')} entra · ${dout('SILO-701')} saem`, 'O grão chega e fica guardado.'),
        mini('#ff4d4d', 'Retorno — tubo e14', 'sai do Silo B → volta ao Funil', 'É o único tubo que fecha um laço (reciclo).'));
    } else if (m === 'balanco') {
      bn.set(h('b', {}, 'B·Q = S'), ' — o que entra num equipamento tem que sair: vermelho = entrada da planta, verde = onde o grão fica guardado.');
      const meio = NODES.filter((n, k) => !S[k]).length, sg = v => (v > 0 ? '+' : '') + v;
      const iF = ix('FN-101'), iA = ix('SILO-701'), iB = ix('SILO-702'), iC = ix('SILO-703');
      out.append(
        h('table', { class: 't sl-table' }, h('thead', {}, h('tr', {}, ['Onde', 'S = B·Q (kg/h)'].map(x => h('th', {}, x)))),
          h('tbody', {},
            h('tr', { class: 'hl' }, h('td', {}, 'Entrada no Funil'), h('td', { class: 'num' }, sg(S[iF]))),
            h('tr', {}, h('td', {}, `${meio} equipamentos do meio`), h('td', { class: 'num' }, '0  (tudo que entra, sai)')),
            h('tr', { class: 'hl' }, h('td', {}, 'Silo A'), h('td', { class: 'num' }, sg(S[iA]))),
            h('tr', { class: 'hl' }, h('td', {}, 'Silo B'), h('td', { class: 'num' }, sg(S[iB]))),
            h('tr', { class: 'hl' }, h('td', {}, 'Silo C'), h('td', { class: 'num' }, sg(S[iC]))),
            h('tr', {}, h('td', {}, h('b', {}, 'Soma')), h('td', { class: 'num' }, h('b', {}, String(S.reduce((a, x) => a + x, 0))))))),
        h('div', { class: 'card plain' },
          h('div', {}, h('b', {}, `rank(B) = ${rk}`), ` — dos 14 tubos, só ${rk} equações são independentes; sobra ${14 - rk} (dim ker B = 1): o ciclo e14.`),
          h('div', {}, h('b', {}, 'Laplaciana L = B·Bᵀ'), ` — mapa de conexões: a diagonal conta quantos tubos tocam cada equipamento (soma = ${trL} = 2 × 14).`),
          h('div', {}, h('b', {}, 'Passeios Aᵏ'), ` — A⁴ = ${w4}: há exatamente ${w4} caminho de 4 saltos do Funil até a Câmera.`)));
      NODES.forEach((n, k) => { if (S[k]) nodes.set(n.id, S[k] < 0 ? 'bad' : 'done'); });
    } else {
      bn.set(h('b', {}, 'Matriz B'), ' — verde = +1 (chega), vermelho = −1 (sai).');
      out.append(
        h('div', { class: 'card line', style: { fontWeight: 'normal', fontSize: '17px' } }, 'Cada coluna é uma esteira/tubo: sai de um equipamento (−1) e chega em outro (+1), por isso toda coluna soma zero.'),
        h('table', { class: 't matrix' }, h('thead', {}, h('tr', {}, h('th', {}, ''), EDGES.map(e => h('th', {}, e.id)))),
          h('tbody', {}, g.nodes.map((v, i) => h('tr', {}, h('td', {}, v), B[i].map(x => h('td', { class: x > 0 ? 'cellp' : x < 0 ? 'cellm' : '' }, x ? (x > 0 ? '+1' : '−1') : '·')))),
            h('tr', {}, h('td', {}, 'Σ coluna'), EDGES.map((e, j) => h('td', {}, B.reduce((a, r) => a + r[j], 0)))))));
    }
    view.setHighlight(nodes, edges); view.setNodeText(text || {});
  }

  group.set('graus'); apply('graus');
  return {
    el, setMode: m => { group.set(m); apply(m); }, onPlantReplaced() {}, onShow() {},
    update() { view.update(app.plant); },
  };
}
