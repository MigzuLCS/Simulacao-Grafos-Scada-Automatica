/** assertions.js — as asserções formais da Aula 18, calculadas sobre os mesmos grafos da simulação. */
import * as A from './algorithms.js';
import { gmGraph, gvGraph, geGraph } from './graphs.js';

const PROTEGIDOS = ['Estoque Tipo 1', 'Estoque Tipo 2', 'Docas', 'SILO-701', 'SILO-702'];

/** Uma sequência é fisicamente válida se nenhum passo posterior precede (alcança) um passo anterior. */
export function sequenciaValida(g, seq) {
  for (let i = 0; i < seq.length; i++)
    for (let j = i + 1; j < seq.length; j++)
      if (seq[i] !== seq[j] && A.reachable(g, seq[j]).has(seq[i])) return false;
  return true;
}

export const SEQUENCIAS = [
  ['Recebimento → classificação → empacotamento', ['Moega MG-001', 'FN-101', 'VIS-401', 'SILO-701', 'EMP-801'], true],
  ['Empacotar antes da inspeção óptica', ['FN-101', 'EMP-801', 'VIS-401'], false],
  ['Big bag a partir do silo comercial', ['SILO-702', 'BIG-802', 'Estoque Tipo 2'], true],
  ['Paletizar e depois pesar na BAL-301', ['PAL-801', 'BAL-301'], false],
];

/** @returns {{id:number,nome:string,ok:boolean,detalhe:string,tab:string}[]} */
export function aula18Assertions() {
  const gm = gmGraph(false), gmr = gmGraph(true), gv = gvGraph(), r1 = x => Math.round(x * 10) / 10;
  const out = [];

  // 1. passagem obrigatória pela inspeção óptica
  const semVis = new A.Digraph(gm.nodes, gm.edges.filter(e => e.u !== 'VIS-401' && e.v !== 'VIS-401'));
  const alvos = ['Estoque Tipo 1', 'Estoque Tipo 2', 'Subprodutos'];
  const comVis = A.reachable(gm, 'Portaria'), sem = A.reachable(semVis, 'Portaria');
  out.push({ nome: 'Passagem obrigatória por VIS-401', tab: 'gm',
    ok: alvos.every(t => comVis.has(t) && !sem.has(t)),
    detalhe: `Sem VIS-401, a Portaria deixa de alcançar ${alvos.join(', ')}.` });

  // 2. soma acumulada no Dijkstra
  const d = A.shortest(gm, 'Portaria', 'Docas'), viaSp1 = A.shortest(gm, 'Portaria', 'Docas', new Set(gm.edges.filter(e => e.u === 'Moega MG-001' && e.v === 'SP-002').map(e => e.id)));
  out.push({ nome: 'Soma acumulada no Dijkstra (escolha do silo pulmão)', tab: 'gm',
    ok: Math.abs(d.dist - 261.3) < 1e-6 && d.path.includes('SP-002') && viaSp1.dist > d.dist,
    detalhe: `Via SP-002: ${r1(d.dist)} m; escolher pelo primeiro arco (SP-001): ${r1(viaSp1.dist)} m.` });

  // 3. segregação sanitária do rejeito
  const alc = A.reachable(gm, 'SILO-703');
  out.push({ nome: 'Segregação sanitária do rejeito (Cat. C)', tab: 'gm',
    ok: PROTEGIDOS.every(v => !alc.has(v)) && alc.size === 3,
    detalhe: `BFS a partir de SILO-703 alcança apenas {${[...alc].sort().join(', ')}}.` });

  // 4. aciclicidade (Kahn)
  const k = A.kahn(gm), kr = A.kahn(gmr);
  out.push({ nome: 'Aciclicidade do fluxo normal (Kahn)', tab: 'gm',
    ok: k.isDag && k.order.length === 28 && !kr.isDag && kr.order.length === 6,
    detalhe: `Sem reciclo: ${k.order.length}/28 vértices ordenados (DAG). Com XV-104 aberta: ordena ${kr.order.length} e trava em ${kr.stuck.length}.` });

  // 5. auditoria de sequências
  const seq = SEQUENCIAS.map(([, s, esperado]) => sequenciaValida(gm, s) === esperado);
  out.push({ nome: 'Auditoria de sequências de produção', tab: 'gm',
    ok: seq.every(Boolean), detalhe: `${seq.filter(Boolean).length} de ${seq.length} sequências classificadas como esperado (válidas ou impossíveis).` });

  // 6. redundância dos silos pulmão
  const sp = ['SP-001', 'SP-002'].map(sp => {
    const ids = new Set(gm.edges.filter(e => e.u === 'Moega MG-001' && e.v === sp).map(e => e.id));
    return A.shortest(gm, 'Portaria', 'Docas', ids).dist;
  });
  out.push({ nome: 'Redundância dos silos pulmão SP-001 / SP-002', tab: 'gm',
    ok: sp.every(Number.isFinite),
    detalhe: `Com TC-001 em falha: ${r1(sp[0])} m; com TC-002 em falha: ${r1(sp[1])} m (nominal ${r1(d.dist)} m).` });

  // 7. conectividade forte do anel viário
  out.push({ nome: 'Conectividade forte do anel viário G_V', tab: 'gv',
    ok: A.stronglyConnected(gv) && gv.nodes.length === 9,
    detalhe: `BFS no grafo e no reverso alcançam os ${gv.nodes.length} vértices a partir da Portaria.` });

  // 8. unicidade das posições de estoque
  const pal = A.allocatePallets(geGraph(), 6), pos = pal.map(x => x.pos);
  out.push({ nome: 'Unicidade das posições de estoque G_E', tab: 'ge',
    ok: new Set(pos).size === pos.length && pos.length === 6,
    detalhe: `6 paletes ocupam 6 posições distintas: ${pos.join(', ')}.` });

  return out.map((o, i) => ({ id: i + 1, ...o }));
}
