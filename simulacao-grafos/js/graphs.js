/** graphs.js — monta os grafos das aulas a partir de data.js */
import { Digraph } from './algorithms.js';
import { NODES, EDGES, GM_RECEBIMENTO, GM_EXPEDICAO, GV_EDGES, GE_EDGES } from './data.js';

export function plantGraph() {
  return new Digraph(NODES.map(n => n.id), EDGES.map(e => ({ id: e.id, u: e.u, v: e.v, w: e.L })));
}

/** G_M: recebimento + linha (e1..e13) + expedição. O reciclo e14 só entra se pedido. */
export function gmGraph(withRecycle = false) {
  const lin = EDGES.filter(e => withRecycle || !e.reciclo).map(e => [e.u, e.v, e.L, e.id]);
  const triples = [...GM_RECEBIMENTO.map(t => [...t, null]), ...lin, ...GM_EXPEDICAO.map(t => [...t, null])];
  const set = new Set();
  const edges = triples.map(([u, v, w, id], i) => { set.add(u); set.add(v); return { id: id || `m${i + 1}`, u, v, w }; });
  return new Digraph([...set], edges);
}

export const gvGraph = () => Digraph.fromTriples(GV_EDGES, 'v');
export const geGraph = () => Digraph.fromTriples(GE_EDGES, 'g');
