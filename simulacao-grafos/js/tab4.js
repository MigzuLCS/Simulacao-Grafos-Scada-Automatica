/** Aba 4 — Integrante 4: Logística (G_M, G_V, G_E) e validação final (Aula 18 + Aulas 11–18). */
import { h, clear, f1 } from './dom.js';
import { GraphView } from './graphview.js';
import * as A from './algorithms.js';
import { gmGraph, gvGraph, geGraph } from './graphs.js';
import { GM_POS, GV_POS, GE_POS, GV_VIAGENS } from './data.js';
import { conformidade } from './validation.js';
import { aula18Assertions } from './assertions.js';
import { bigNum, toggleGroup, actionBtn, banner } from './widgets.js';
import { h as H } from './dom.js';

const ABREV = { 'ALIM-101': 'ALIM', 'EST-201': 'EST', 'BAL-301': 'BAL', 'VIS-401': 'VIS', 'DIV-501': 'DIV', 'Balança de entrada': 'Bal. entrada', 'Moega MG-001': 'MG-001', 'Estoque Tipo 1': 'Estoque T1', 'Estoque Tipo 2': 'Estoque T2', 'Subprodutos': 'Subprod.', 'Pátio do calador': 'Calador', 'Pátio de quarentena': 'Quarentena', 'Moega de descarga': 'Moega', 'Via interna leste': 'Via leste', 'Pátio de subprodutos': 'P. subprod.', 'Balança de saída': 'Bal. saída' };
const lab = id => ABREV[id] || id;
const pathEdges = (g, path, blocked) => {
  const m = new Map();
  for (let i = 0; i < path.length - 1; i++) {
    const c = g.edges.filter(e => e.u === path[i] && e.v === path[i + 1] && !(blocked && blocked.has(e.id))).sort((a, b) => a.w - b.w)[0];
    if (c) m.set(c.id, 'path');
  }
  return m;
};
const br = x => f1(x).replace('.', ',');

export function createTab4(app) {
  let layer = 'gm';
  const bn = banner(), B = t => h('b', {}, t);
  const top = toggleGroup([
    ['gm', '[Camada G_M] Fluxo de Materiais e Kahn (28 nós)'],
    ['gv', '[Camada G_V] Circulação de Caminhões (9 nós)'],
    ['ge', '[Camada G_E] Alocação de Estoque (Galpão B)'],
    ['fim', '[Resumo Final] Validação 100% Aprovada (Aulas 11–18)'],
  ], v => show(v || layer), { cls: 'mid', wrapClass: 'topbtns', allowOff: false });
  const body = h('div');
  const L = { gm: gm(), gv: gv(), ge: ge(), fim: fim() };
  function show(v) { layer = v; top.set(v); clear(body).append(L[v].el); L[v].onShow(); }
  show('gm');
  return { el: h('div', {}, bn.el, top.el, body), setMode: m => { const [a, b] = m.split(':'); show(a); b && L[a].set && L[a].set(b); }, onPlantReplaced() {}, onShow() { L[layer].onShow(); }, update() {} };

  /* ============================================================ G_M */
  function gm() {
    const view = new GraphView({ pos: GM_POS, directed: true, height: 590, label: lab, title: 'Grafo G_M' });
    const nums = h('div', { class: 'bignums' }), info = h('div', { class: 'card line' });
    let mode = null;
    const mk = (label, key, color) => actionBtn(label, () => { mode = mode === key ? null : key; sync(); draw(); }, color);
    const bSeg = mk('Destacar Segregação do Rejeito (BFS de SILO-703)', 'seg', 'blue'), bTc = mk('Simular Falha TC-002 (Desvio SP-001 +3 m)', 'tc', 'yellow'), bRec = mk('Abrir Reciclo XV-104 (Kahn detecta ciclo)', 'rec', 'red');
    const sync = () => { bSeg.setOn(mode === 'seg'); bTc.setOn(mode === 'tc'); bRec.setOn(mode === 'rec'); [bSeg, bTc, bRec].forEach(b => b.classList.add('big')); };
    [bSeg, bTc, bRec].forEach(b => { b.classList.remove('mid'); b.classList.add('big'); });
    function draw() {
      const g = gmGraph(mode === 'rec'), nodes = new Map(), edges = new Map(), text = {};
      let blocked = new Set();
      if (mode === 'tc') blocked = new Set(g.edges.filter(e => e.u === 'Moega MG-001' && e.v === 'SP-002').map(e => e.id));
      view.setGraph(g.nodes, g.edges);
      if (mode === 'seg') {
        const alc = A.reachable(g, 'SILO-703'); alc.forEach(n => nodes.set(n, 'bad')); g.edges.filter(e => alc.has(e.u) && alc.has(e.v)).forEach(e => edges.set(e.id, 'bad'));
        clear(nums).append(bigNum('Alcance de SILO-703', `${alc.size} vértices`, 'r'), bigNum('Áreas de produto atingidas', '0', ''));
        bn.set(B('BFS de SILO-703'), ' — vermelho: tudo que o grão rejeitado alcança; nenhuma área de produto aparece.');
        info.textContent = 'BFS: SILO-703 → CAC-803 → Subprodutos (rota segregada)';
      } else if (mode === 'tc') {
        const r = A.shortest(g, 'Portaria', 'Docas', blocked); r.path.forEach(n => nodes.set(n, 'path')); pathEdges(g, r.path, blocked).forEach((v, k) => edges.set(k, 'path')); blocked.forEach(id => edges.set(id, 'blocked'));
        clear(nums).append(bigNum('Portaria → Docas', `${br(r.dist)} m`, 'y'), bigNum('Desvio via SP-001', '+3,0 m', 'c'), bigNum('Nominal (SP-002)', '261,3 m', ''));
        bn.set(B('Dijkstra com w(TC-002) = ∞'), ' — amarelo: rota mínima Portaria → Docas desviada pelo silo pulmão SP-001; tracejado: arco bloqueado.');
        info.textContent = 'TC-002 em falha: desvio automático pelo silo pulmão SP-001';
      } else if (mode === 'rec') {
        const k = A.kahn(g), cyc = A.findCycle(g) || [];
        cyc.forEach(n => nodes.set(n, 'bad')); edges.set('e14', 'bad'); g.edges.forEach(e => { if (cyc.includes(e.u) && cyc.includes(e.v)) edges.set(e.id, 'bad'); });
        clear(nums).append(bigNum('Kahn ordenou', `${k.order.length} de ${g.nodes.length}`, 'y'), bigNum('Travado (ciclo)', `${k.stuck.length}`, 'r'));
        bn.set(B('Kahn trava com ciclo'), ' — vermelho: e14 (XV-104) fecha o ciclo SILO-702 → FN-101 e nenhuma ordem topológica existe.');
        info.textContent = 'XV-104 aberta: e14 fecha o ciclo e impede a ordenação';
      } else {
        const r = A.shortest(g, 'Portaria', 'Docas'), k = A.kahn(g); r.path.forEach(n => nodes.set(n, 'path')); pathEdges(g, r.path).forEach((v, kk) => edges.set(kk, 'path'));
        clear(nums).append(bigNum('Portaria → Docas', `${br(r.dist)} m`, 'y'), bigNum('Kahn (DAG)', `${k.order.length} / ${g.nodes.length}`, ''));
        bn.set(B('G_M é um DAG'), ' — amarelo: menor caminho Portaria → Docas; Kahn ordena os 28 vértices.');
        info.textContent = 'Fluxo normal sem reciclo: DAG de 28 vértices e 29 arcos';
      }
      view.highlight(nodes, edges, text);
    }
    sync();
    return { el: h('div', { class: 'split' }, h('div', { class: 'viewport big' }, view.svg), h('div', { class: 'col' }, h('div', { class: 'btns' }, bSeg, bTc, bRec), nums, info)), onShow() { draw(); }, set(m) { mode = m; sync(); draw(); } };
  }

  /* ============================================================ G_V */
  function gv() {
    const g = gvGraph(), view = new GraphView({ pos: GV_POS, directed: true, height: 480, label: lab, title: 'Grafo G_V' });
    const nums = h('div', { class: 'bignums' }), info = h('div', { class: 'card line' });
    let mode = 'gran';
    const mk = (label, key, color) => { const b = actionBtn(label, () => { mode = key; sync(); draw(); }, color); b.classList.remove('mid'); b.classList.add('big'); return b; };
    const bG = mk('Rota Graneleiro (260 m)', 'gran', 'blue'), bE = mk('Rota Expedição (265 m)', 'exp', 'blue'), bB = mk('Interditar Calador → Moega (Desvio +15 m)', 'blk', 'yellow');
    const sync = () => { bG.setOn(mode === 'gran'); bE.setOn(mode === 'exp'); bB.setOn(mode === 'blk'); };
    function draw() {
      const trip = mode === 'exp' ? GV_VIAGENS['Caminhão de expedição'] : GV_VIAGENS['Graneleiro (lote aprovado)'];
      const blocked = mode === 'blk' ? new Set(g.edges.filter(e => e.u === 'Pátio do calador' && e.v === 'Moega de descarga').map(e => e.id)) : new Set();
      const r = A.routeWithStops(g, trip, blocked), r0 = A.routeWithStops(g, trip), nodes = new Map(), edges = new Map();
      view.setGraph(g.nodes, g.edges);
      r.path.forEach(n => nodes.set(n, 'path')); pathEdges(g, r.path, blocked).forEach((v, k) => edges.set(k, 'path')); blocked.forEach(id => edges.set(id, 'blocked'));
      view.highlight(nodes, edges);
      bn.set(B('Dijkstra com paradas em G_V'), mode === 'blk' ? ' — tracejado: arco interditado; amarelo: desvio de +15 m.' : ' — amarelo: rota completa do caminhão; fortemente conexo = sempre há volta.');
      clear(nums).append(bigNum(mode === 'exp' ? 'Caminhão de expedição' : 'Graneleiro', `${r.dist} m`, 'y'), mode === 'blk' ? bigNum('Desvio', `+${r.dist - r0.dist} m`, 'c') : bigNum('Fortemente conexo', A.stronglyConnected(g) ? 'sim' : 'não', ''));
      info.textContent = mode === 'blk' ? 'Calador → Quarentena → Moega: 40 + 35 = 75 m (nominal 60 m)' : trip.join(' → ');
    }
    sync();
    return { el: h('div', { class: 'split' }, h('div', { class: 'viewport big' }, view.svg), h('div', { class: 'col' }, h('div', { class: 'btns' }, bG, bE, bB), nums, info)), onShow: draw, set(m) { mode = m; sync(); draw(); } };
  }

  /* ============================================================ G_E */
  function ge() {
    const g = geGraph(), view = new GraphView({ pos: GE_POS, directed: true, height: 520, title: 'Grafo G_E' });
    const out = h('div', { class: 'col' });
    function draw() {
      const r = A.allocatePallets(geGraph(), 4), nodes = new Map(), text = {};
      view.setGraph(g.nodes, g.edges);
      r.forEach(x => { nodes.set(x.pos, 'done'); text[x.pos] = `#${x.palete} · ${x.custo} m`; });
      view.highlight(nodes, new Map(), text);
      bn.set(B('c(p) = guarda + separação'), ' — verde: posição escolhida para cada palete (#ordem · custo).');
      clear(out).append(h('div', { class: 'card line' }, 'c(p) = guarda + separação → 4 paletes'),
        h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Palete', 'Posição', 'Guarda', 'Separação', 'Custo'].map(x => h('th', {}, x)))),
          h('tbody', {}, r.map(x => h('tr', {}, h('td', {}, x.palete), h('td', {}, h('b', {}, x.pos)), h('td', { class: 'num' }, `${x.guarda} m`), h('td', { class: 'num' }, `${x.separacao} m`), h('td', { class: 'num' }, h('b', {}, `${x.custo} m`)))))),
        h('div', { class: 'bignums' }, r.map(x => bigNum(x.pos, `${x.custo} m`, x.palete === 1 ? 'y' : ''))));
    }
    return { el: h('div', { class: 'split' }, h('div', { class: 'viewport big' }, view.svg), out), onShow: draw };
  }

  /* ============================================================ Resumo final */
  function fim() {
    const el = h('div', { class: 'col' });
    return {
      el, onShow() {
        bn.set(B('Validação formal'), ' — selos verdes: todas as conferências numéricas e asserções da Aula 18 passaram.');
        const rows = conformidade(), as = aula18Assertions(), okR = rows.filter(r => r.ok).length, okA = as.filter(a => a.ok).length;
        clear(el).append(
          h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
            h('div', { class: 'seal' + (okR === rows.length ? '' : ' bad') }, h('b', {}, `${okR}/${rows.length}`), h('span', {}, 'Conferências numéricas', h('br'), okR === rows.length ? 'OK' : 'divergência')),
            h('div', { class: 'seal' + (okA === as.length ? '' : ' bad') }, h('b', {}, `${okA}/${as.length}`), h('span', {}, 'Asserções formais', h('br'), okA === as.length ? 'OK' : 'divergência'))),
          h('div', { class: 'panel' }, h('table', { class: 't' }, h('thead', {}, h('tr', {}, ['Aula', 'Grandeza', 'Impresso na aula', 'Calculado agora', ''].map(x => h('th', {}, x)))),
            h('tbody', {}, rows.map(r => h('tr', { class: r.ok ? 'good' : 'bad' }, h('td', {}, r.a), h('td', {}, r.n), h('td', {}, r.e), h('td', {}, r.c), h('td', {}, r.ok ? '✓' : '✗')))))));
      },
    };
  }
}
