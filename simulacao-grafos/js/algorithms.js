/**
 * algorithms.js — Algoritmos da Etapa 02, funções puras (sem DOM).
 * Cada algoritmo de busca devolve também `steps`, a lista de passos que a tela 3 reproduz.
 */

export class Digraph {
  /** @param {string[]} nodes @param {{id:string,u:string,v:string,w:number}[]} edges */
  constructor(nodes, edges) {
    this.nodes = [...nodes];
    this.edges = edges.map(e => ({ ...e }));
  }
  static fromTriples(triples, prefix = 'a') {
    const set = new Set();
    const edges = triples.map(([u, v, w], i) => { set.add(u); set.add(v); return { id: `${prefix}${i + 1}`, u, v, w }; });
    return new Digraph([...set], edges);
  }
  out(u, blocked = null) { return this.edges.filter(e => e.u === u && !(blocked && blocked.has(e.id))); }
  inn(v, blocked = null) { return this.edges.filter(e => e.v === v && !(blocked && blocked.has(e.id))); }
  withoutEdge(id) { return new Digraph(this.nodes, this.edges.filter(e => e.id !== id)); }
  withEdges(extra) { return new Digraph(this.nodes, [...this.edges, ...extra]); }
  reverse() { return new Digraph(this.nodes, this.edges.map(e => ({ ...e, u: e.v, v: e.u }))); }
  degIn(v) { return this.edges.filter(e => e.v === v).length; }
  degOut(u) { return this.edges.filter(e => e.u === u).length; }
}

/* ------------------------------------------------------------------ BFS */
export function bfs(g, s, blocked = null) {
  const dist = { [s]: 0 }, parent = { [s]: null }, order = [s], steps = [];
  const q = [s];
  steps.push({ type: 'init', node: s, queue: [...q], visited: [s], note: `Fila inicial = [${s}]` });
  while (q.length) {
    const u = q.shift();
    steps.push({ type: 'pop', node: u, queue: [...q], visited: Object.keys(dist), note: `Desenfileira ${u} (saltos = ${dist[u]})` });
    for (const e of g.out(u, blocked)) {
      if (!(e.v in dist)) {
        dist[e.v] = dist[u] + 1; parent[e.v] = u; order.push(e.v); q.push(e.v);
        steps.push({ type: 'discover', node: e.v, edge: e.id, from: u, queue: [...q], visited: Object.keys(dist),
          note: `${e.v} descoberto a ${dist[e.v]} salto(s) via ${e.id}` });
      }
    }
  }
  const layers = {};
  for (const [v, d] of Object.entries(dist)) (layers[d] ||= []).push(v);
  return { dist, parent, order, layers, steps };
}

/* ------------------------------------------------------------------ DFS */
export function dfs(g, s, blocked = null) {
  const cor = {}, d = {}, f = {}, parent = {}, edgeClass = {}, steps = [], order = [], stack = [];
  let t = 0;
  g.nodes.forEach(n => cor[n] = 0);
  function visit(u) {
    cor[u] = 1; d[u] = ++t; order.push(u); stack.push(u);
    steps.push({ type: 'enter', node: u, d: d[u], stack: [...stack], note: `Entra em ${u} (d=${d[u]})` });
    for (const e of g.out(u, blocked)) {
      if (cor[e.v] === 0) {
        edgeClass[e.id] = 'árvore'; parent[e.v] = u;
        steps.push({ type: 'tree', edge: e.id, node: e.v, stack: [...stack], note: `${e.id}: aresta de árvore ${u} → ${e.v}` });
        visit(e.v);
      } else if (cor[e.v] === 1) {
        edgeClass[e.id] = 'retorno';
        steps.push({ type: 'back', edge: e.id, node: e.v, stack: [...stack], note: `${e.id}: ARESTA DE RETORNO ${u} → ${e.v} (fecha ciclo)` });
      } else {
        edgeClass[e.id] = d[e.v] > d[u] ? 'avanço' : 'cruzamento';
        steps.push({ type: 'cross', edge: e.id, node: e.v, stack: [...stack], note: `${e.id}: aresta de ${edgeClass[e.id]}` });
      }
    }
    cor[u] = 2; f[u] = ++t; stack.pop();
    steps.push({ type: 'exit', node: u, f: f[u], stack: [...stack], note: `Sai de ${u} (f=${f[u]})` });
  }
  visit(s);
  return { d, f, parent, edgeClass, order, steps, hasBackEdge: Object.values(edgeClass).includes('retorno') };
}

/* ------------------------------------------------------------------ Dijkstra */
export function dijkstra(g, s, blocked = null) {
  const dist = {}, parent = {}, done = new Set(), steps = [];
  g.nodes.forEach(n => dist[n] = Infinity);
  dist[s] = 0; parent[s] = null;
  const heap = [[0, s]];
  steps.push({ type: 'init', node: s, dist: { ...dist }, note: `dist[${s}] = 0, demais = ∞` });
  while (heap.length) {
    heap.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1));
    const [du, u] = heap.shift();
    if (done.has(u) || du > dist[u]) continue;
    done.add(u);
    steps.push({ type: 'extract', node: u, dist: { ...dist }, done: [...done], note: `Extrai ${u} (dist = ${fmt(du)} m) — definitivo` });
    for (const e of g.out(u, blocked)) {
      const cand = du + e.w;
      if (cand < dist[e.v] - 1e-12) {
        dist[e.v] = cand; parent[e.v] = u; heap.push([cand, e.v]);
        steps.push({ type: 'relax', node: e.v, edge: e.id, dist: { ...dist }, done: [...done],
          note: `Relaxa ${e.id}: dist[${e.v}] = ${fmt(du)} + ${fmt(e.w)} = ${fmt(cand)}` });
      }
    }
  }
  return { dist, parent, steps };
}
export function pathTo(parent, t) {
  if (!(t in parent)) return null;
  const p = [t]; while (parent[p[p.length - 1]] != null) p.push(parent[p[p.length - 1]]);
  return p.reverse();
}
export function shortest(g, s, t, blocked = null) {
  const r = dijkstra(g, s, blocked);
  if (!isFinite(r.dist[t])) return { dist: Infinity, path: null, steps: r.steps };
  return { dist: r.dist[t], path: pathTo(r.parent, t), steps: r.steps };
}
export function routeWithStops(g, stops, blocked = null) {
  let total = 0, path = [stops[0]];
  for (let i = 0; i < stops.length - 1; i++) {
    const r = shortest(g, stops[i], stops[i + 1], blocked);
    if (!r.path) return { dist: Infinity, path: null };
    total += r.dist; path = path.concat(r.path.slice(1));
  }
  return { dist: total, path };
}

/* ------------------------------------------------------------------ Kahn / ciclo */
export function kahn(g, blocked = null) {
  const indeg = {}; g.nodes.forEach(n => indeg[n] = 0);
  g.edges.filter(e => !(blocked && blocked.has(e.id))).forEach(e => indeg[e.v]++);
  const q = g.nodes.filter(n => indeg[n] === 0), order = [], steps = [];
  steps.push({ type: 'init', queue: [...q], indeg: { ...indeg }, note: `Vértices com grau de entrada 0: ${q.join(', ') || '—'}` });
  while (q.length) {
    const u = q.shift(); order.push(u);
    for (const e of g.out(u, blocked)) { if (--indeg[e.v] === 0) q.push(e.v); }
    steps.push({ type: 'pop', node: u, queue: [...q], indeg: { ...indeg }, order: [...order], note: `Remove ${u}; fila = [${q.join(', ')}]` });
  }
  const stuck = g.nodes.filter(n => !order.includes(n));
  if (stuck.length) steps.push({ type: 'stuck', stuck, indeg: { ...indeg }, order: [...order],
    note: `TRAVOU: ${stuck.length} vértice(s) com grau de entrada > 0 → o grafo tem ciclo` });
  return { order, stuck, isDag: stuck.length === 0, steps };
}
export function findCycle(g, blocked = null) {
  const cor = {}, stack = []; g.nodes.forEach(n => cor[n] = 0);
  function go(u) {
    cor[u] = 1; stack.push(u);
    for (const e of g.out(u, blocked)) {
      if (cor[e.v] === 1) return [...stack.slice(stack.indexOf(e.v)), e.v];
      if (cor[e.v] === 0) { const c = go(e.v); if (c) return c; }
    }
    stack.pop(); cor[u] = 2; return null;
  }
  for (const n of g.nodes) if (cor[n] === 0) { const c = go(n); if (c) return c; }
  return null;
}
export function reachable(g, s, blocked = null) { return new Set(Object.keys(bfs(g, s, blocked).dist)); }
export function stronglyConnected(g) {
  const s = g.nodes[0];
  return reachable(g, s).size === g.nodes.length && reachable(g.reverse(), s).size === g.nodes.length;
}

/** Arcos cuja remoção isolada desconecta `t` de `s` (Aula 15 / Aula 18 §4.5). */
export function criticalEdges(g, s, t) {
  return g.edges.filter(e => !reachable(g.withoutEdge(e.id), s).has(t));
}
/** Para cada arco, quais vértices-alvo deixam de ser alcançáveis a partir de s. */
export function isolationByEdge(g, s, targets) {
  const res = {};
  for (const e of g.edges) {
    const r = reachable(g.withoutEdge(e.id), s);
    res[e.id] = targets.filter(t => !r.has(t));
  }
  return res;
}

/* ------------------------------------------------------------------ Matrizes (Aula 12) */
export function incidenceMatrix(g) {
  const idx = Object.fromEntries(g.nodes.map((n, i) => [n, i]));
  const B = g.nodes.map(() => g.edges.map(() => 0));
  g.edges.forEach((e, j) => { B[idx[e.u]][j] = -1; B[idx[e.v]][j] = +1; });
  return B;
}
export function adjacency(g, weighted = false) {
  const idx = Object.fromEntries(g.nodes.map((n, i) => [n, i]));
  const n = g.nodes.length;
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => weighted ? (i === j ? 0 : Infinity) : 0));
  g.edges.forEach(e => { A[idx[e.u]][idx[e.v]] = weighted ? e.w : 1; });
  return A;
}
export function matVec(M, x) { return M.map(row => row.reduce((s, a, j) => s + a * x[j], 0)); }
export function rank(M) {
  const A = M.map(r => [...r]); let rk = 0; const rows = A.length, cols = A[0].length;
  for (let c = 0; c < cols && rk < rows; c++) {
    let p = rk; for (let r = rk + 1; r < rows; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-9) continue;
    [A[rk], A[p]] = [A[p], A[rk]];
    for (let r = rk + 1; r < rows; r++) { const f = A[r][c] / A[rk][c]; for (let k = c; k < cols; k++) A[r][k] -= f * A[rk][k]; }
    rk++;
  }
  return rk;
}
export function laplacian(B) {
  const n = B.length;
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => B[i].reduce((s, b, k) => s + b * B[j][k], 0)));
}

/* ------------------------------------------------------------------ Euler / Hierholzer (Aula 16) */
export function eulerParity(nodes, edges) {
  const deg = Object.fromEntries(nodes.map(n => [n, 0]));
  edges.forEach(e => { deg[e.a]++; deg[e.b]++; });
  return { deg, odd: nodes.filter(n => deg[n] % 2) };
}
export function hierholzer(nodes, edges, start) {
  const adj = Object.fromEntries(nodes.map(n => [n, []]));
  edges.forEach(e => { adj[e.a].push({ e, to: e.b }); adj[e.b].push({ e, to: e.a }); });
  const used = new Set(), stack = [{ node: start, via: null }], popped = [], steps = [];
  while (stack.length) {
    const top = stack[stack.length - 1];
    const nxt = adj[top.node].find(x => !used.has(x.e.id));
    if (nxt) {
      used.add(nxt.e.id); stack.push({ node: nxt.to, via: nxt.e });
      steps.push({ type: 'advance', edge: nxt.e.id, node: nxt.to, stack: stack.map(s => s.node), note: `Avança por ${nxt.e.id}: ${top.node} → ${nxt.to}` });
    } else {
      const p = stack.pop(); if (p.via) popped.push(p.via);
      steps.push({ type: 'retreat', node: p.node, edge: p.via && p.via.id, stack: stack.map(s => s.node), note: `${p.node} sem arestas livres: desempilha${p.via ? ' (' + p.via.id + ' entra no circuito)' : ''}` });
    }
  }
  const ordered = popped.reverse();
  const circuit = []; let cur = start;
  for (const e of ordered) { const to = e.a === cur ? e.b : e.a; circuit.push({ from: cur, to, edge: e }); cur = to; }
  return { circuit, closed: cur === start, used: used.size, length: ordered.reduce((s, e) => s + e.L, 0), steps };
}

/* ------------------------------------------------------------------ TSP (Aula 17) */
export function tourCost(D, t) { let c = 0; for (let i = 0; i < t.length; i++) c += D[t[i]][t[(i + 1) % t.length]]; return c; }
export function tspBrute(D, start = 0) {
  const n = D.length, rest = [...Array(n).keys()].filter(i => i !== start);
  let best = null, count = 0; const all = [];
  (function perm(a, k) {
    if (k === a.length) {
      // evita o espelhamento (reverso) para contar (n-1)!/2
      if (a[0] > a[a.length - 1]) return;
      count++; const t = [start, ...a]; const c = tourCost(D, t); all.push({ t, c });
      if (!best || c < best.c) best = { t, c };
      return;
    }
    for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; perm(a, k + 1); [a[k], a[i]] = [a[i], a[k]]; }
  })(rest, 0);
  all.sort((x, y) => x.c - y.c);
  return { best, count, all };
}
export function nearestNeighbor(D, start = 0) {
  const n = D.length, t = [start], seen = new Set(t), steps = [];
  while (t.length < n) {
    const u = t[t.length - 1]; let b = -1;
    for (let v = 0; v < n; v++) if (!seen.has(v) && (b < 0 || D[u][v] < D[u][b])) b = v;
    t.push(b); seen.add(b); steps.push({ from: u, to: b, d: D[u][b], tour: [...t] });
  }
  return { tour: t, cost: tourCost(D, t), steps };
}
export function twoOpt(D, tour) {
  let t = [...tour], imp = true, moves = 0;
  while (imp) {
    imp = false;
    for (let i = 1; i < t.length - 1; i++) for (let j = i + 1; j < t.length; j++) {
      const nt = [...t.slice(0, i), ...t.slice(i, j + 1).reverse(), ...t.slice(j + 1)];
      if (tourCost(D, nt) < tourCost(D, t) - 1e-9) { t = nt; imp = true; moves++; }
    }
  }
  return { tour: t, cost: tourCost(D, t), moves };
}
export function mstWeight(D) {
  const n = D.length, ed = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) ed.push([D[i][j], i, j]);
  ed.sort((a, b) => a[0] - b[0]);
  const p = [...Array(n).keys()], f = x => { while (p[x] !== x) x = p[x]; return x; };
  let w = 0; const used = [];
  for (const [c, i, j] of ed) if (f(i) !== f(j)) { p[f(i)] = f(j); w += c; used.push([i, j, c]); }
  return { weight: w, edges: used };
}
export function floydWarshall(D) {
  const n = D.length, M = D.map(r => [...r]);
  for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (M[i][k] + M[k][j] < M[i][j]) M[i][j] = M[i][k] + M[k][j];
  return M;
}
export function triangleViolations(D) {
  const n = D.length, v = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = 0; k < n; k++)
    if (k !== i && k !== j && D[i][j] > D[i][k] + D[k][j]) v.push({ i, j, k, direct: D[i][j], via: D[i][k] + D[k][j] });
  return v;
}

/* ------------------------------------------------------------------ Alocação (G_E) */
export function allocatePallets(ge, qty, from = 'PAL-801', to = 'Docas') {
  const blocked = new Set(), out = [];
  const positions = ge.nodes.filter(n => /^[AB]\d$/.test(n));
  for (let p = 1; p <= qty; p++) {
    let best = null;
    for (const pos of positions) {
      const a = shortest(ge, from, pos, blocked), b = shortest(ge, pos, to, blocked);
      if (a.path && b.path) { const c = a.dist + b.dist; if (!best || c < best.c) best = { pos, g: a.dist, s: b.dist, c }; }
    }
    if (!best) break;
    out.push({ palete: p, pos: best.pos, guarda: best.g, separacao: best.s, custo: best.c });
    ge.edges.filter(e => e.v === best.pos).forEach(e => blocked.add(e.id));
  }
  return out;
}

/* ------------------------------------------------------------------ Sequências de partida/parada (Aula 13 corrigida) */
export function startStopSequences(g, blocked = new Set(['e14'])) {
  const { order } = kahn(g, blocked);
  return { stop: order, start: [...order].reverse() };
}

export function fmt(x) { return Number.isInteger(x) ? String(x) : (Math.round(x * 100) / 100).toString(); }
