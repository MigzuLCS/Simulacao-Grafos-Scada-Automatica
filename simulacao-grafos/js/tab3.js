/** Aba 3 — Integrante 3: Euler (inspeção de dutos) e AGV-01 / TSP (Aulas 16–17). */
import { h, clear, f1, s } from './dom.js';
import { GraphView } from './graphview.js';
import * as A from './algorithms.js';
import { EULER_NODES, EULER_EDGES, AGV_NODES, AGV_D } from './data.js';
import { bigNum, toggleGroup, actionBtn } from './widgets.js';

export function createTab3(app) {
  let view = 'euler';
  const top = toggleGroup([['euler', '[Aula 16] Inspeção de Dutos — Circuito Euleriano'], ['tsp', '[Aula 17] Roteamento do AGV-01 — Ciclo Hamiltoniano (TSP)']], v => show(v || view), { cls: 'mid', wrapClass: 'topbtns', allowOff: false });
  const body = h('div');
  const el = h('div', {}, top.el, body);
  const E = euler(), T = tsp();
  function show(v) { view = v; top.set(v); clear(body).append(v === 'euler' ? E.el : T.el); (v === 'euler' ? E : T).onShow(); }
  show('euler');
  return { el, setMode: m => { if (m === 'euler' || m === 'tsp') show(m); else { show('tsp'); T.set(m); } }, onPlantReplaced() {}, onShow() { (view === 'euler' ? E : T).onShow(); }, update() {} };

  /* ============================================================ Euler */
  function euler() {
    const ids = EULER_NODES.map(n => n.id), pos = Object.fromEntries(EULER_NODES.map(n => [n.id, [n.x, n.y]]));
    const gv = new GraphView({ pos, directed: false, height: 520, nodeW: () => 92, title: 'Malha de inspeção (Euler)' });
    const robot = s('circle', { r: 11, fill: '#ff4d4d', stroke: '#fff', 'stroke-width': 3, style: { transition: 'transform .42s linear', transform: 'translate(-50px,-50px)' } });
    let timer = null, d10 = false, circuit = [], total = 0;
    const nums = h('div', { class: 'bignums' }), info = h('div', { class: 'card line' });
    const play = actionBtn('▶ Animar Robô (Hierholzer — 89,5 m)', () => animate(), 'green'); play.classList.add('big'); play.classList.remove('mid');
    const chk = h('input', { type: 'checkbox', onChange: ev => { d10 = ev.target.checked; build(); } });

    function edgesNow() {
      const ed = d10 ? [...EULER_EDGES, { id: 'd10', a: 'SILO-702', b: 'VIS-401', L: 14 }] : [...EULER_EDGES];
      const par = A.eulerParity(ids, ed);
      if (par.odd.length === 2) {                                                 // carteiro chinês: duplica o menor caminho entre os dois ímpares
        const dg = new A.Digraph(ids, ed.flatMap(e => [{ id: e.id + '>', u: e.a, v: e.b, w: e.L }, { id: e.id + '<', u: e.b, v: e.a, w: e.L }]));
        const r = A.shortest(dg, par.odd[0], par.odd[1]);
        for (let i = 0; i < r.path.length - 1; i++) {
          const e = ed.find(x => ((x.a === r.path[i] && x.b === r.path[i + 1]) || (x.b === r.path[i] && x.a === r.path[i + 1])) && !x.id.endsWith('*'));
          ed.push({ ...e, id: e.id + '*' });
        }
      }
      return { ed, par };
    }
    function build() {
      if (timer) { clearInterval(timer); timer = null; }
      const { ed, par } = edgesNow(), base = d10 ? EULER_EDGES.length + 1 : EULER_EDGES.length, deg = par.deg;
      const orig = d10 ? [...EULER_EDGES, { id: 'd10', a: 'SILO-702', b: 'VIS-401', L: 14 }] : EULER_EDGES;
      const gDeg = A.eulerParity(ids, orig);
      gv.setGraph(ids, ed.map(e => ({ id: e.id, u: e.a, v: e.b, w: `${e.id} · ${e.L} m` })));
      gv.svg.append(robot); robot.style.transition = 'none'; robot.style.transform = `translate(${pos['BASE-INSP'][0]}px,${pos['BASE-INSP'][1] - 26}px)`;
      requestAnimationFrame(() => { robot.style.transition = 'transform .42s linear'; });
      const ns = new Map(gDeg.odd.map(n => [n, 'bad'])), text = Object.fromEntries(ids.map(n => [n, `grau ${gDeg.deg[n]}`]));
      gv.highlight(ns, new Map(), text);
      circuit = A.hierholzer(ids, ed, 'BASE-INSP').circuit; total = ed.reduce((a, e) => a + e.L, 0);
      const sumDeg = Object.values(gDeg.deg).reduce((a, b) => a + b, 0);
      clear(nums).append(bigNum('Σ graus', `${sumDeg} = 2·|E|`, ''), bigNum('Graus ímpares', String(gDeg.odd.length), gDeg.odd.length ? 'r' : ''), bigNum('Percurso', `${f1(total)} m`, 'y'));
      info.textContent = gDeg.odd.length ? `${gDeg.odd.join(' e ')} com grau ímpar → Carteiro Chinês: duplicar d10 (14 m)` : 'Todos os graus pares → existe circuito euleriano';
      play.textContent = d10 ? '▶ Animar Robô (Carteiro Chinês — 117,5 m)' : '▶ Animar Robô (Hierholzer — 89,5 m)';
      play.setOn(false);
    }
    function animate() {
      build(); play.setOn(true);
      let i = 0; const es = new Map();
      timer = setInterval(() => {
        if (i >= circuit.length) { clearInterval(timer); timer = null; play.setOn(false); gv.highlight(new Map([['BASE-INSP', 'done']]), es, {}); return; }
        const c = circuit[i++]; es.set(c.edge.id, 'path'); const cur = new Map(es); cur.set(c.edge.id, 'cur');
        const p = pos[c.to]; robot.style.transform = `translate(${p[0]}px,${p[1] - 26}px)`;
        gv.highlight(new Map([[c.to, 'cur']]), cur, {});
      }, Math.round(4000 / Math.max(1, circuit.length)));
    }
    return {
      el: h('div', { class: 'split' }, h('div', { class: 'viewport big' }, gv.svg), h('div', { class: 'col' }, nums, play, h('label', { class: 'chk card', style: { fontSize: '16px', fontWeight: 'bold' } }, chk, h('span', {}, 'Simular expansão com grau ímpar (+ duto d10 → Carteiro Chinês 117,5 m)')), info)),
      onShow: build,
    };
  }

  /* ============================================================ TSP */
  function tsp() {
    const ids = AGV_NODES.map(n => n.id), pos = Object.fromEntries(AGV_NODES.map(n => [n.id, [n.x, n.y]]));
    const gv = new GraphView({ pos, directed: false, height: 470, nodeW: () => 96, title: 'Rota do AGV-01' });
    const CROSS = [0, 1, 2, 3, 5, 4], nums = h('div', { class: 'bignums' }), info = h('div', { class: 'card line' });
    const tourEdges = (t, p = 't') => t.map((v, i) => ({ id: p + i, u: ids[v], v: ids[t[(i + 1) % t.length]], w: AGV_D[v][t[(i + 1) % t.length]] }));
    const key = e => [e.u, e.v].sort().join('|');
    const group = toggleGroup([['cross', '1. Rota com Cruzamento (268 m)'], ['2opt', '2. Aplicar 2-Opt — Descruzar Rota (218 m | −50 m)'], ['mst', '3. Cota Inferior MST (143 m)']], m => apply(m || 'cross'), { allowOff: false });
    const matrix = h('div');
    clear(matrix).append(h('table', { class: 't matrix' }, h('thead', {}, h('tr', {}, h('th', {}, 'D [m]'), ids.map(i => h('th', {}, i)))), h('tbody', {}, AGV_D.map((r, i) => h('tr', {}, h('td', {}, ids[i]), r.map(x => h('td', {}, x)))))));

    function apply(m) {
      const c0 = A.tourCost(AGV_D, CROSS), opt = A.twoOpt(AGV_D, CROSS), bf = A.tspBrute(AGV_D), mst = A.mstWeight(AGV_D), eco = c0 - opt.cost;
      let edges, es = new Map();
      if (m === 'cross') {
        edges = tourEdges(CROSS); edges.forEach(e => es.set(e.id, 'path'));
        clear(nums).append(bigNum('Rota 0→1→2→3→5→4→0', `${c0} m`, 'y'));
        info.textContent = 'VIS-401 → SILO-702 e SILO-701 → LAB-CQ se cruzam';
      } else if (m === '2opt') {
        const novo = tourEdges(opt.tour, 'n'), keep = new Set(novo.map(key)), rem = tourEdges(CROSS, 'x').filter(e => !keep.has(key(e)));
        edges = [...novo, ...rem]; novo.forEach(e => es.set(e.id, 'path')); rem.forEach(e => es.set(e.id, 'blocked'));
        clear(nums).append(bigNum('Antes', `${c0} m`, 'y'), bigNum('Depois (2-Opt)', `${opt.cost} m`, ''), bigNum('Economia', `−${eco} m`, 'c'), bigNum('Redução', `−${(eco / c0 * 100).toFixed(1).replace('.', ',')} %`, 'c'));
        info.textContent = `= Vizinho Mais Próximo = Ótimo Global (força bruta: ${bf.count} rotas, ${bf.best.c} m)`;
      } else {
        edges = mst.edges.map(([i, j, c], k) => ({ id: 'm' + k, u: ids[i], v: ids[j], w: c })); edges.forEach(e => es.set(e.id, 'path'));
        clear(nums).append(bigNum('Árvore geradora mínima', `${mst.weight} m`, 'y'), bigNum('Ótimo do ciclo', `${bf.best.c} m`, ''));
        info.textContent = 'MST (143 m) < ótimo (218 m): cota inferior';
      }
      gv.setGraph(ids, edges); gv.highlight(new Map([['LAB-CQ', 'done']]), es);
    }
    return {
      el: h('div', { class: 'split' }, h('div', { class: 'col' }, h('div', { class: 'viewport big' }, gv.svg), h('div', { class: 'panel' }, matrix)), h('div', { class: 'col' }, group.el, nums, info)),
      onShow() { if (!group.get()) { group.set('cross'); apply('cross'); } },
      set(m) { group.set(m); apply(m); },
    };
  }
}
