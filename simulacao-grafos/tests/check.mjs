// Verifica que os algoritmos reproduzem os números impressos nas Aulas 11-18.
// Uso (a partir da raiz do repositório): node simulacao-grafos/tests/check.mjs
import assert from 'node:assert/strict';
import * as A from '../js/algorithms.js';
import { plantGraph, gmGraph, gvGraph, geGraph } from '../js/graphs.js';
import { Q_NOMINAL, EULER_NODES, EULER_EDGES, AGV_D, GV_VIAGENS } from '../js/data.js';
import { aula18Assertions } from '../js/assertions.js';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
const g = plantGraph();

console.log('Aula 11 — graus');
ok('|V|=14 |E|=14', () => { assert.equal(g.nodes.length, 14); assert.equal(g.edges.length, 14); });
ok('soma dos graus de saída = soma dos de entrada = 14', () => {
  assert.equal(g.nodes.reduce((s, v) => s + g.degOut(v), 0), 14);
  assert.equal(g.nodes.reduce((s, v) => s + g.degIn(v), 0), 14);
});
ok('grau de saída 2 em EJE-602 e EJE-603; 0 em SILO-701/703', () => {
  assert.equal(g.degOut('EJE-602'), 2); assert.equal(g.degOut('EJE-603'), 2);
  assert.equal(g.degOut('SILO-701'), 0); assert.equal(g.degOut('SILO-703'), 0); assert.equal(g.degOut('SILO-702'), 1);
});

console.log('Aula 12 — incidência e balanço');
const B = A.incidenceMatrix(g);
const Q = g.edges.map(e => Q_NOMINAL[e.id]);
ok('soma por coluna = 0', () => { for (let j = 0; j < 14; j++) assert.equal(B.reduce((s, r) => s + r[j], 0), 0); });
ok('S = B·Q = (-1200, 0..0, +900, +180, +120)', () => {
  const S = A.matVec(B, Q);
  assert.deepEqual(S, [-1200, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 900, 180, 120]);
  assert.equal(S.reduce((a, b) => a + b, 0), 0);
});
ok('rank(B)=13; dim ker B = 1 com e14 e 0 sem e14', () => {
  assert.equal(A.rank(B), 13); assert.equal(14 - A.rank(B), 1);
  const B13 = A.incidenceMatrix(g.withoutEdge('e14'));
  assert.equal(A.rank(B13), 13); assert.equal(13 - A.rank(B13), 0);
});
ok('Laplaciana: linhas somam 0', () => { A.laplacian(B).forEach(r => assert.equal(r.reduce((a, b) => a + b, 0), 0)); });

console.log('Aula 13 — BFS / DFS');
ok('BFS de FN-101: silo B a 8 saltos, A e C a 9', () => {
  const r = A.bfs(g, 'FN-101');
  assert.equal(r.dist['SILO-702'], 8); assert.equal(r.dist['SILO-701'], 9); assert.equal(r.dist['SILO-703'], 9);
});
ok('BFS de DIV-501: silo B a 3 saltos, A e C a 4', () => {
  const r = A.bfs(g, 'DIV-501', new Set(['e14']));
  assert.equal(r.dist['SILO-702'], 3); assert.equal(r.dist['SILO-701'], 4); assert.equal(r.dist['SILO-703'], 4);
});
ok('DFS acha aresta de retorno e14 (e só ela)', () => {
  const r = A.dfs(g, 'FN-101');
  assert.equal(r.edgeClass.e14, 'retorno');
  assert.equal(Object.values(r.edgeClass).filter(c => c === 'retorno').length, 1);
  assert.equal(A.dfs(g.withoutEdge('e14'), 'FN-101').hasBackEdge, false);
});
ok('rotas A/B/C: 9/8/9 saltos', () => {
  const p = A.dijkstra(g, 'FN-101');
  const hops = t => A.pathTo(p.parent, t).length - 1;
  assert.equal(hops('SILO-701'), 9); assert.equal(hops('SILO-702'), 8); assert.equal(hops('SILO-703'), 9);
});

console.log('Aula 14 — Dijkstra');
ok('distâncias 18.7 / 16.3 / 17.0 m', () => {
  const r = A.dijkstra(g, 'FN-101');
  near(r.dist['SILO-701'], 18.7); near(r.dist['SILO-702'], 16.3); near(r.dist['SILO-703'], 17.0);
});
ok('e1..e13 são pontes: cada uma isola >= 1 silo (distância ∞ no Dijkstra); e14 não isola nenhum', () => {
  const iso = A.isolationByEdge(g, 'FN-101', ['SILO-701', 'SILO-702', 'SILO-703']);
  for (let i = 1; i <= 13; i++) assert.ok(iso['e' + i].length >= 1, 'e' + i);
  for (let i = 1; i <= 6; i++) assert.equal(iso['e' + i].length, 3);
  assert.equal(iso.e14.length, 0);
});

console.log('Aula 15 — vazamento');
ok('resíduo +150 em EST-201 e 0 em BAL-301 com Q(e3)=1050', () => {
  const qq = { e1: 1200, e2: 1200, e3: 1050, e4: 1050 };
  const S = A.matVec(B, g.edges.map(e => qq[e.id] ?? 0));
  assert.equal(S[g.nodes.indexOf('EST-201')], 150); assert.equal(S[g.nodes.indexOf('BAL-301')], 0);
});

console.log('Aula 16 — Euler');
const eN = EULER_NODES.map(x => x.id);
ok('todos os graus pares; soma dos graus = 18', () => {
  const p = A.eulerParity(eN, EULER_EDGES);
  assert.deepEqual(p.odd, []); assert.equal(Object.values(p.deg).reduce((a, b) => a + b, 0), 18);
});
ok('Hierholzer: circuito fechado com 9 dutos, 89.5 m', () => {
  const h = A.hierholzer(eN, EULER_EDGES, 'BASE-INSP');
  assert.equal(h.circuit.length, 9); assert.ok(h.closed); near(h.length, 89.5);
  assert.equal(new Set(h.circuit.map(c => c.edge.id)).size, 9);
  for (let i = 0; i < 8; i++) assert.equal(h.circuit[i].to, h.circuit[i + 1].from);
});
ok('com d10 (SILO-702 a VIS-401, 14 m): 2 vértices ímpares, carteiro chinês = 117.5 m', () => {
  const ed = [...EULER_EDGES, { id: 'd10', a: 'SILO-702', b: 'VIS-401', L: 14 }];
  assert.deepEqual(A.eulerParity(eN, ed).odd.sort(), ['SILO-702', 'VIS-401']);
  near(ed.reduce((s, e) => s + e.L, 0) + 14, 117.5);
});

console.log('Aula 17 — TSP');
ok('força bruta: 60 rotas, ótimo 218 m', () => {
  const r = A.tspBrute(AGV_D); assert.equal(r.count, 60); assert.equal(r.best.c, 218);
});
ok('NN = 218 m e o 2-opt não melhora (0 movimentos)', () => {
  const nn = A.nearestNeighbor(AGV_D); assert.equal(nn.cost, 218);
  const t = A.twoOpt(AGV_D, nn.tour); assert.equal(t.cost, 218); assert.equal(t.moves, 0);
});
ok('2-opt a partir da rota com cruzamento 0-1-2-3-5-4-0 (268 m) chega a 218 m: economia de 50 m (≈ 18,7 %)', () => {
  assert.equal(A.tourCost(AGV_D, [0, 1, 2, 3, 5, 4]), 268);
  const t = A.twoOpt(AGV_D, [0, 1, 2, 3, 5, 4]);
  assert.equal(t.cost, 218); assert.equal(t.moves, 1); assert.deepEqual(t.tour, [0, 1, 2, 3, 4, 5]);
  near((268 - t.cost) / 268 * 100, 18.657, 0.01);
});
ok('MST = 143 < ótimo', () => { assert.equal(A.mstWeight(AGV_D).weight, 143); });

console.log('Aula 18 — logística');
const gm = gmGraph(false), gmr = gmGraph(true);
ok('|V|=28 |E|=29', () => { assert.equal(gm.nodes.length, 28); assert.equal(gm.edges.length, 29); });
ok('rotas de referência 255.7 / 239.3 / 261.3 / 249.0 m', () => {
  const d = t => A.shortest(gm, 'Portaria', t);
  near(d('Estoque Tipo 1').dist, 255.7); near(d('Estoque Tipo 2').dist, 239.3);
  near(d('Docas').dist, 261.3); near(d('Subprodutos').dist, 249.0);
  assert.equal(d('Estoque Tipo 1').path.length - 1, 17); assert.equal(d('Estoque Tipo 2').path.length - 1, 15);
  assert.ok(d('Docas').path.includes('SP-002'));
});
ok('desvio com TC-002 falho: 264.3 m (+3.0)', () => {
  const blk = new Set(gm.edges.filter(e => e.u === 'Moega MG-001' && e.v === 'SP-002').map(e => e.id));
  near(A.shortest(gm, 'Portaria', 'Docas', blk).dist, 264.3);
});
ok('Kahn: DAG sem reciclo (28/28); com reciclo ordena 6 e trava em 22', () => {
  const k = A.kahn(gm); assert.ok(k.isDag); assert.equal(k.order.length, 28);
  const kr = A.kahn(gmr); assert.equal(kr.order.length, 6); assert.equal(kr.stuck.length, 22);
  assert.ok(A.findCycle(gmr).includes('SILO-702'));
});
ok('segregação: BFS de SILO-703 alcança só {SILO-703, CAC-803, Subprodutos}', () => {
  assert.deepEqual([...A.reachable(gm, 'SILO-703')].sort(), ['CAC-803', 'SILO-703', 'Subprodutos']);
});
ok('9 arcos críticos de 29 para as Docas', () => { assert.equal(A.criticalEdges(gm, 'Portaria', 'Docas').length, 9); });
const gv = gvGraph();
ok('G_V fortemente conexo com 9 vértices; viagens 260/275/250/265/270 m', () => {
  assert.equal(gv.nodes.length, 9); assert.ok(A.stronglyConnected(gv));
  const exp = [260, 275, 250, 265, 270];
  Object.values(GV_VIAGENS).forEach((st, i) => assert.equal(A.routeWithStops(gv, st).dist, exp[i]));
});
ok('G_V: calador a moega bloqueado = 75 m (+15)', () => {
  const e = gv.edges.find(x => x.u === 'Pátio do calador' && x.v === 'Moega de descarga');
  assert.equal(A.shortest(gv, 'Pátio do calador', 'Moega de descarga', new Set([e.id])).dist, 75);
});
ok('G_E: paletes em A3/A2/B3/B2 com custos 45/46/46/47', () => {
  const r = A.allocatePallets(geGraph(), 4);
  assert.deepEqual(r.map(x => x.pos), ['A3', 'A2', 'B3', 'B2']); assert.deepEqual(r.map(x => x.custo), [45, 46, 46, 47]);
});

console.log('Asserções formais da Aula 18');
ok('as 8 asserções (VIS-401, soma acumulada, segregação, Kahn, sequências, silos pulmão, G_V, G_E) passam', () => {
  const r = aula18Assertions(); assert.equal(r.length, 8);
  r.forEach(x => assert.ok(x.ok, x.nome + ': ' + x.detalhe));
});

console.log('Sequências de partida e parada (Aula 13)');
ok('parada = ordem topológica direta; partida a frio = ordem inversa', () => {
  const s = A.startStopSequences(g);
  assert.equal(s.stop[0], 'FN-101'); assert.ok(s.start[0].startsWith('SILO')); assert.equal(s.start.at(-1), 'FN-101');
});

console.log(`\n${n} verificações passaram.`);
