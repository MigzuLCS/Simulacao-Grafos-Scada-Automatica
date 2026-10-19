/** validation.js — conferência numérica das Aulas 11–18 (calculada no navegador, mesmos algoritmos das telas). */
import * as A from './algorithms.js';
import { plantGraph, gmGraph, gvGraph, geGraph } from './graphs.js';
import { Q_NOMINAL, EULER_NODES, EULER_EDGES, AGV_D, GV_VIAGENS } from './data.js';

/** @returns {{a:string,n:string,e:string,c:string,ok:boolean}[]} */
export function conformidade() {
  const g = plantGraph(), B = A.incidenceMatrix(g), Q = g.edges.map(e => Q_NOMINAL[e.id]), S = A.matVec(B, Q), d = A.dijkstra(g, 'FN-101').dist;
  const gm = gmGraph(false), gmr = gmGraph(true), gv = gvGraph(), nn = A.nearestNeighbor(AGV_D), bf = A.tspBrute(AGV_D);
  const eh = A.hierholzer(EULER_NODES.map(n => n.id), EULER_EDGES, 'BASE-INSP');
  const pal = A.allocatePallets(geGraph(), 4), r = x => x.toFixed(1);
  const rows = [
    ['Aula 11', 'Σ deg⁺ = Σ deg⁻ = |E|', '14 = 14 = 14', `${g.nodes.reduce((a, v) => a + g.degOut(v), 0)} = ${g.nodes.reduce((a, v) => a + g.degIn(v), 0)} = ${g.edges.length}`],
    ['Aula 12', 'S = B·Q (S1, S12, S13, S14)', '−1200, +900, +180, +120', `${S[0]}, +${S[11]}, +${S[12]}, +${S[13]}`],
    ['Aula 12', 'rank(B) · dim ker B', '13 · 1', `${A.rank(B)} · ${14 - A.rank(B)}`],
    ['Aula 13', 'BFS a partir de DIV-501 (silos B, A, C)', '3 · 4 · 4', (b => `${b['SILO-702']} · ${b['SILO-701']} · ${b['SILO-703']}`)(A.bfs(g, 'DIV-501', new Set(['e14'])).dist)],
    ['Aula 14', 'Dijkstra FN-101 → silos A, B, C [m]', '18,7 · 16,3 · 17,0', `${r(d['SILO-701'])} · ${r(d['SILO-702'])} · ${r(d['SILO-703'])}`],
    ['Aula 16', 'Hierholzer: dutos · comprimento', '9 · 89,5 m', `${eh.circuit.length} · ${r(eh.length)} m`],
    ['Aula 17', 'TSP: NN · ótimo (60 rotas) · MST', '218 · 218 (60 rotas) · 143 m', `${nn.cost} · ${bf.best.c} (${bf.count} rotas) · ${A.mstWeight(AGV_D).weight} m`],
    ['Aula 17', '2-opt a partir da rota de 268 m', '268 → 218 m (−50 m)', (t => `${A.tourCost(AGV_D, [0, 1, 2, 3, 5, 4])} → ${t.cost} m (−${A.tourCost(AGV_D, [0, 1, 2, 3, 5, 4]) - t.cost} m)`)(A.twoOpt(AGV_D, [0, 1, 2, 3, 5, 4]))],
    ['Aula 18', 'Rotas Tipo 1 · Tipo 2 · Docas · Subprodutos [m]', '255,7 · 239,3 · 261,3 · 249,0', ['Estoque Tipo 1', 'Estoque Tipo 2', 'Docas', 'Subprodutos'].map(t => r(A.shortest(gm, 'Portaria', t).dist)).join(' · ')],
    ['Aula 18', 'Kahn sem reciclo · com reciclo', '28/28 · 6 (trava em 22)', `${A.kahn(gm).order.length}/28 · ${A.kahn(gmr).order.length} (trava em ${A.kahn(gmr).stuck.length})`],
    ['Aula 18', 'Arcos críticos para as Docas', '9 de 29', `${A.criticalEdges(gm, 'Portaria', 'Docas').length} de ${gm.edges.length}`],
    ['Aula 18', 'Viagens G_V [m]', '260 · 275 · 250 · 265 · 270', Object.values(GV_VIAGENS).map(s => A.routeWithStops(gv, s).dist).join(' · ')],
    ['Aula 18', 'Paletes (posição: custo)', 'A3 45 · A2 46 · B3 46 · B2 47', pal.map(x => `${x.pos} ${x.custo}`).join(' · ')],
  ];
  const nums = x => (String(x).replace(/,/g, '.').replace(/−/g, '-').match(/-?\d+(\.\d+)?/g) || []).map(Number);
  const same = (e, c) => { const p = nums(e), q = nums(c); return p.length === q.length && p.every((v, i) => Math.abs(v - q[i]) < 0.05); };
  return rows.map(([a, n, e, c]) => ({ a, n, e, c, ok: same(e, c) }));
}
