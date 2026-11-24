// Verifica que a simulação reproduz os números do notebook da Aula 23 e o acoplamento rede → CLP da planta.
// Uso (a partir da raiz do repositório): node simulacao-arvores/tests/check.mjs
import assert from 'node:assert/strict';
import { SWITCHES, ENLACES, montarRede, executarRSTP, numeroCiclomatico, gargaloMbps, kruskal, peso, distanciasNaArvore } from '../js/rstp.js';
import { Rede, TIMEOUT_CLP } from '../js/rede.js';
import { Plant } from '../../simulacao-grafos/js/plant.js';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const todos = () => new Set(SWITCHES.map(s => s.nome));
const cabos = (...fora) => new Set(ENLACES.map(e => e.id).filter(id => !fora.includes(id)));

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
