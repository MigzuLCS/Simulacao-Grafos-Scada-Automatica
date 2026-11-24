// Verifica que a simulação reproduz os números das Aulas 19 a 23 e o acoplamento rede → CLP da planta.
// Uso (a partir da raiz do repositório): node simulacao-arvores/tests/check.mjs
import assert from 'node:assert/strict';
import { SWITCHES, ENLACES, montarRede, executarRSTP, numeroCiclomatico, gargaloMbps, kruskal, peso, distanciasNaArvore } from '../js/rstp.js';
import { Rede, TIMEOUT_CLP } from '../js/rede.js';
import { Plant } from '../../simulacao-grafos/js/plant.js';
import { NOS, TRECHOS, kruskalPassos, primPassos, rompimento, total } from '../js/mst.js';
import { construir, metricas, decodificar, EVENTOS } from '../js/huffman.js';
import { SIS, GRAO, decidir, sorteador, sortearGrao, inserirComum, inserirAVL, altura, balanceada, passosBusca } from '../js/binarias.js';
import { planejar, atalhos, comprimento, colideSegmento, PARTIDA, DESTINO } from '../js/rrt.js';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const todos = () => new Set(SWITCHES.map(s => s.nome));
const cabos = (...fora) => new Set(ENLACES.map(e => e.id).filter(id => !fora.includes(id)));

console.log('Aula 19 — Kruskal e Prim no cabeamento');
const K = kruskalPassos(), mstIds = K.filter(p => p.aceito).map(p => p.trecho.id);
ok('11 nós, 19 trechos, 100,4 m no total', () => { assert.equal(NOS.length, 11); assert.equal(TRECHOS.length, 19); assert.equal(total(TRECHOS.map(t => t.id)), 100.4); });
ok('Kruskal: 10 trechos, 37,8 m; único recusado antes de completar = EJE-602 — COMP-601 (4,7 m)', () => {
  assert.equal(mstIds.length, 10); assert.equal(total(mstIds), 37.8);
  const rec = K.filter(p => !p.aceito); assert.equal(rec.length, 1); assert.equal(rec[0].trecho.m, 4.7);
});
ok('Prim a partir do CLP: mesma árvore e mesma ordem da Seção 5.2', () => {
  const P = primPassos();
  assert.deepEqual(P.map(p => p.trecho.id).sort(), [...mstIds].sort());
  assert.deepEqual(P.map(p => p.novo.split('_')[0]), ['SEG-901', 'FN-101', 'ALIM-101', 'EST-201', 'BAL-301', 'VIS-401', 'EJE-602', 'EJE-603', 'COMP-601', 'SILOS-700']);
});
ok('N−1: romper EJE-603 — COMP-601 isola a central de ar; religa por 4,7 m → 38,2 m', () => {
  const id = TRECHOS.find(t => t.a === 'EJE-603_EstacaoC' && t.b === 'COMP-601_Pneumatica').id, r = rompimento(mstIds, id);
  assert.deepEqual(r.isolados, ['COMP-601_Pneumatica']); assert.equal(r.religa.m, 4.7); assert.equal(r.comprimento, 38.2);
});

console.log('Aula 20 — Huffman dos eventos do historiador');
const HF = construir(), MT = metricas(HF.codigos);
ok('códigos iguais aos da tabela da Seção 3.1', () => {
  assert.deepEqual(HF.codigos, { 'KXA-501': '1', 'KXA-502': '01', 'KXA-503': '000', 'XS-401': '0011', ALR_NA: '00100', ALR_PAL: '001011', ALR_JI: '0010101', 'XA-901': '0010100' });
});
ok('3 bits fixos → 1,532 bits; entropia 1,3838; economia 48,93 %; eficiência 90,33 %', () => {
  assert.equal(MT.fixo, 3); assert.ok(Math.abs(MT.medio - 1.532) < 1e-9); assert.equal(MT.bitsHuffman, 1532);
  assert.equal(MT.H.toFixed(4), '1.3838'); assert.equal((MT.economia * 100).toFixed(2), '48.93'); assert.equal((MT.eficiencia * 100).toFixed(2), '90.33');
});
ok('código de prefixo: decodificar a concatenação devolve a sequência original', () => {
  const seq = ['KXA-501', 'KXA-501', 'XA-901', 'KXA-502', 'ALR_PAL', 'KXA-503', ...EVENTOS.map(e => e.tag)];
  assert.deepEqual(decodificar(HF.raiz, seq.map(t => HF.codigos[t]).join('')), seq);
});

console.log('Aula 21 — árvores binárias');
ok('SIS: sem falha → operação normal após 5 perguntas; falhas juntas → vale a mais grave', () => {
  const n = decidir(SIS, {}); assert.equal(n.folha.estado, 'OPERAÇÃO NORMAL'); assert.equal(n.perguntas, 5); assert.deepEqual(n.folha.cmd, [1, 1, 1, 0]);
  const r = decidir(SIS, { p_PAL601: 1, p_FALHA_CAM: 1 }); assert.equal(r.folha.estado, 'TRIP: AR BAIXO'); assert.equal(r.perguntas, 2);
  assert.deepEqual(decidir(SIS, { p_FALHA_CAM: 1 }).folha.cmd, [1, 0, 0, 1]);   // câmera: esteira purga, alimentação para
});
ok('grão: regras do notebook (praga → C; 7,8 mm → C; 5,5 mm → B; 6,8 × 2,0 mm limpo → A)', () => {
  const base = { praga: false, impureza: false, dano: false, comprimento: 6.8, largura: 2.0, corSecundaria: false };
  assert.equal(decidir(GRAO, { ...base, praga: true }).folha.estado, 'C'); assert.equal(decidir(GRAO, { ...base, comprimento: 7.8 }).folha.estado, 'C');
  assert.equal(decidir(GRAO, { ...base, comprimento: 5.5 }).folha.estado, 'B'); assert.equal(decidir(GRAO, { ...base, largura: 1.7 }).folha.estado, 'B');
  const a = decidir(GRAO, base); assert.equal(a.folha.estado, 'A'); assert.equal(a.perguntas, 4);
});
ok('sorteio de grãos próximo da planta (≈ 75 % A, 15 % B, 10 % C)', () => {
  const r = sorteador(7), c = { A: 0, B: 0, C: 0 }; for (let i = 0; i < 10000; i++) c[decidir(GRAO, sortearGrao(r)).folha.estado]++;
  assert.ok(c.A > 7000 && c.A < 8200 && c.B > 1000 && c.B < 1800 && c.C > 700 && c.C < 1300, JSON.stringify(c));
});
ok('historiador: 2.500 amostras em ordem → árvore comum altura 2.500, AVL altura 12 e balanceada', () => {
  let c = null, a = null; const t0 = 1774300000000;
  for (let i = 0; i < 2500; i++) { c = inserirComum(c, t0 + i * 10); a = inserirAVL(a, t0 + i * 10); }
  assert.equal(altura(c), 2500); assert.equal(altura(a), 12); assert.ok(balanceada(a));
  assert.equal(passosBusca(c, t0 + 24990), 2500); assert.ok(passosBusca(a, t0 + 24990) <= 12);
});

console.log('Aula 22 — RRT e RRT* no galpão');
ok('em 20 sorteios: rota sempre encontrada, sem colisão, RRT* ≤ RRT e atalhos ≤ RRT*; nunca abaixo da linha reta (47,2 m)', () => {
  const reta = Math.hypot(DESTINO[0] - PARTIDA[0], DESTINO[1] - PARTIDA[1]);
  for (let sem = 1; sem <= 20; sem++) {
    const r = planejar({ semente: sem }), e = planejar({ semente: sem, estrela: true }), a = atalhos(e.caminho);
    assert.ok(r.caminho && e.caminho, 'sem rota na semente ' + sem);
    for (const c of [r.caminho, e.caminho, a]) for (let i = 1; i < c.length; i++) assert.ok(!colideSegmento(c[i - 1], c[i]), 'colisão semente ' + sem);
    assert.ok(e.comprimento <= r.comprimento + 1e-9 && comprimento(a) <= e.comprimento + 1e-9 && comprimento(a) >= reta - 1e-9, 'semente ' + sem);
  }
});
ok('semente 7 (a da apresentação): 66,6 m → 53,8 m → 51,1 m', () => {
  const r = planejar({ semente: 7 }), e = planejar({ semente: 7, estrela: true });
  assert.equal(r.comprimento.toFixed(1), '66.6'); assert.equal(e.comprimento.toFixed(1), '53.8'); assert.equal(comprimento(atalhos(e.caminho)).toFixed(1), '51.1');
});

console.log('Aula 23 — operação normal');
const r0 = montarRede(todos(), cabos()), t0 = executarRSTP(r0);
ok('raiz SW-CORE; bloqueados e6 e e7; número ciclomático 2', () => {
  assert.equal(t0.raizDe['SW-VIS'], 'SW-CORE'); assert.deepEqual(t0.bloqueados, ['e6', 'e7']); assert.equal(numeroCiclomatico(r0), 2);
});
ok('d(v) = Dijkstra: CORE 0, VIS 20k, TRANS 40k, EJE 40k, SIL 60k, REC 200k (4 rodadas de BPDU)', () => {
  assert.deepEqual(t0.custo, { 'SW-CORE': 0, 'SW-REC': 200000, 'SW-TRANS': 40000, 'SW-VIS': 20000, 'SW-EJE': 40000, 'SW-SIL': 60000 });
  assert.equal(t0.rodadas, 4);
});
ok('Alternate Ports em SW-REC (e6) e SW-SIL (e7); cada switch não raiz tem 1 Root Port', () => {
  assert.equal(t0.papeis['e6|SW-REC'], 'AP'); assert.equal(t0.papeis['e7|SW-SIL'], 'AP');
  for (const s of SWITCHES) assert.equal(Object.entries(t0.papeis).filter(([k, p]) => k.endsWith('|' + s.nome) && p === 'RP').length, s.nome === 'SW-CORE' ? 0 : 1);
});

console.log('Aula 23 — rompimento da fibra da câmera (e1)');
const r1 = montarRede(todos(), cabos('e1')), t1 = executarRSTP(r1);
ok('só e6 bloqueado, AP passa para SW-TRANS; AP de SW-SIL vira RP; câmera via e3', () => {
  assert.deepEqual(t1.bloqueados, ['e6']); assert.equal(t1.papeis['e6|SW-TRANS'], 'AP');
  assert.equal(t1.papeis['e7|SW-SIL'], 'RP'); assert.equal(t1.portaRaiz['SW-VIS'], 'e3');
});
ok('d(SW-VIS) = 240.000 e gargalo da câmera = 100 Mbps (era 1000)', () => {
  assert.equal(t1.custo['SW-VIS'], 240000); assert.equal(gargaloMbps(r1, t1, 'SW-VIS'), 100); assert.equal(gargaloMbps(r0, t0, 'SW-VIS'), 1000);
});
ok('RSTP × MST: mesmo peso 460.000, árvores diferentes, d(SW-VIS) 240k × 420k', () => {
  const m = kruskal(r1);
  assert.equal(peso(r1, m), 460000); assert.equal(peso(r1, t1.ativos), 460000); assert.notDeepEqual(m, t1.ativos);
  assert.equal(distanciasNaArvore(r1, m, 'SW-CORE')['SW-VIS'], 420000);
});

console.log('Aula 23 — N−1 e queda do Root Bridge');
ok('nenhum rompimento simples isola um switch', () => {
  for (const e of ENLACES) { const t = executarRSTP(montarRede(todos(), cabos(e.id))); for (const s of SWITCHES) assert.equal(t.raizDe[s.nome], 'SW-CORE', e.id + ' ' + s.nome); }
});
ok('sem SW-CORE: SW-VIS (prio 8192) vira raiz e nada fica bloqueado', () => {
  const s = todos(); s.delete('SW-CORE'); const t = executarRSTP(montarRede(s, cabos()));
  assert.equal(t.raizDe['SW-REC'], 'SW-VIS'); assert.deepEqual(t.bloqueados, []);
});

console.log('Rede viva — reconvergência no tempo simulado');
const sim = (rede, secs, dt = 0.05) => { let perdeu = false; for (let i = 0; i < secs / dt; i++) perdeu = rede.passo(dt) || perdeu; return perdeu; };
ok(`RSTP: 0,2 s sem câmera, abaixo do timeout de ${TIMEOUT_CLP} s → CLP não perde p_KSA401`, () => {
  const r = new Rede(); r.alternarEnlace('e1');
  assert.equal(r.cameraAlcancavel(), false); assert.equal(sim(r, 1), false); assert.equal(r.cameraAlcancavel(), true);
  assert.deepEqual(r.arvore.bloqueados, ['e6']);
});
ok('STP: 30 s sem rota → CLP perde a câmera; volta após a convergência', () => {
  const r = new Rede(); r.definirProtocolo('STP'); r.alternarEnlace('e1');
  assert.equal(sim(r, 5), true); assert.ok(r.transicao);
  sim(r, 26); assert.equal(r.transicao, null); assert.equal(r.cameraAlcancavel(), true); assert.equal(r.passo(0.05), false);
});
ok('romper um cabo BLOQUEADO (e7) não interrompe nada, nem no STP', () => {
  const r = new Rede(); r.definirProtocolo('STP'); r.alternarEnlace('e7');
  assert.equal(r.transicao, null); assert.equal(sim(r, 2), false);
});
ok('sem STP com ciclos: tempestade, câmera inalcançável; sem ciclos (romper e1 e e6): sem tempestade', () => {
  const r = new Rede(); r.definirProtocolo('NENHUM');
  assert.equal(r.tempestade(), true); assert.equal(sim(r, 1), true);
  r.alternarEnlace('e1'); assert.equal(r.tempestade(), true); r.alternarEnlace('e6'); assert.equal(r.tempestade(), false);
  assert.equal(r.cameraAlcancavel(), true);
});

console.log('Acoplamento com o CLP da planta (Etapa 02)');
ok('p_KSA401 = 0 por perda de rede desarma a linha (TRIP câmera KSA-401 fora) e o operador rearma depois', () => {
  const p = new Plant(); p.quickStart(); for (let i = 0; i < 100; i++) p.step(0.1);
  assert.equal(p.state, 'OPERANDO');
  p.setFault('ksa401', true); p.step(0.1);
  assert.equal(p.state, 'TRIP'); assert.match(p.tripReason, /KSA-401/);
  p.setFault('ksa401', false); p.start();
  assert.equal(p.state, 'PARTINDO');
  for (let i = 0; i < 600; i++) p.step(0.1);                       // partida em sequência: 6 s por equipamento
  assert.equal(p.state, 'OPERANDO');
});

console.log(`\n${n} verificações passaram.`);
