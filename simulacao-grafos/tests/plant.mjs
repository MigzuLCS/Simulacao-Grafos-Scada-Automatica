// Testa o motor da planta: regime nominal (Aula 12) e consequências das falhas.
// Uso (da raiz do repositório): node simulacao-grafos/tests/plant.mjs
import assert from 'node:assert/strict';
import { Plant } from '../js/plant.js';
import { EDGES, Q_NOMINAL } from '../js/data.js';
import * as A from '../js/algorithms.js';

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const within = (a, b, pct, label = '') => assert.ok(Math.abs(a - b) <= Math.abs(b) * pct / 100 + 1e-9, `${label} ${a.toFixed(1)} vs ${b} (±${pct}%)`);
const run = (p, secs, dt = 0.1) => { for (let i = 0; i < secs / dt; i++) { p.step(dt); if (i % 10 === 0) p.tickNoise(); } };
const fresh = () => { const p = new Plant(); p.quickStart(); return p; };

console.log('Regime nominal (default reproduz a Aula 12)');
{
  const p = fresh(); run(p, 1500);
  ok('estado OPERANDO, sem alarmes ativos, contaminação 0', () => {
    assert.equal(p.state, 'OPERANDO'); assert.equal(p.activeAlarms().length, 0, JSON.stringify(p.activeAlarms()));
    assert.equal(p.contamination().kg, 0);
  });
  ok('vazões medidas em cada aresta ≈ Q_NOMINAL (±3 % nas grandes, ±12 % nas pequenas)', () => {
    for (const e of EDGES) {
      const q = p.rateExit(e.id), ref = Q_NOMINAL[e.id];
      if (ref === 0) assert.ok(q < 1, e.id); else within(q, ref, ref >= 900 ? 3 : 12, e.id);
    }
  });
  ok('S = B·Q medido ≈ (−1200, 0…0, +900, +180, +120) com tolerância de instrumento', () => {
    const B = A.incidenceMatrix(p.graph), S = A.matVec(B, p.qVector());
    const tol = 0.03 * 1200;
    assert.ok(Math.abs(S[0] + 1200) < tol); for (let i = 1; i <= 10; i++) assert.ok(Math.abs(S[i]) < tol, 'nó ' + i + ' = ' + S[i].toFixed(1));
    within(S[11], 900, 5); within(S[12], 180, 12); within(S[13], 120, 12);
  });
  ok('níveis dos silos sobem à taxa de S12/S13/S14', () => {
    within(p.siloRate('SILO-701'), 900, 4); within(p.siloRate('SILO-702'), 180, 12); within(p.siloRate('SILO-703'), 120, 12);
  });
  ok('resíduos r1 e r2 dentro da banda morta', () => { const i = p.instruments(); assert.ok(Math.abs(i.r1) < i.tol && Math.abs(i.r2) < i.tol, JSON.stringify(i)); });
  ok('tempo de trânsito do grão A de VIS-401 ao Silo A ≈ 6,2 s (Aula 11, exemplo 2)', () => {
    const q = new Plant(); q.quickStart(); let found = null;
    // marca um pacote A ao sair de e4 (entra em e5) e mede até absorver no silo A
    const orig = q.absorb.bind(q);
    q.absorb = (s, pk) => { if (s === 'SILO-701' && pk.mark != null && found == null) found = q.t - pk.mark; orig(s, pk); };
    const origEnter = q.enter.bind(q);
    q.enter = (id, pk, f) => { if (id === 'e5' && pk.cls === 'A' && pk.mark == null && q.t > 20) pk.mark = q.t; return origEnter(id, pk, f); };
    run(q, 120, 0.02);
    // e5(1,0)+e6(2,0)+e8(1,5)+e10(2,2) a 1,5 m/s + e11 (3,5 m a 2,0 m/s) = 4,467 + 1,75
    assert.ok(Math.abs(found - 6.217) < 0.3, String(found));
  });
}

console.log('Falha de ejetor B (Aula 15, cenário 3)');
{
  const p = fresh(); run(p, 600); p.setFault('fy602', true); run(p, 120);
  ok('com intertravamento: ZSH acusa, alarme p_FALHA_EJETOR e TRIP do alimentador', () => {
    assert.equal(p.state, 'TRIP'); assert.ok(p.alarms.some(a => a.tag === 'FALHA-EJE-602'));
  });
  ok('mesmo com TRIP, grão B contamina o Silo A (efeito da janela de detecção + esteira em curso)', () => {
    const c = p.contamination(); assert.ok(c.B > 0 && c.C === 0 && c.kg < 30, JSON.stringify(c));
  });
  const q = fresh(); q.opts.intertravaEjetor = false; run(q, 600); q.setFault('fy602', true); run(q, 600);
  ok('sem intertravamento: ~180 kg/h de B vão para o Silo A e o Silo B para de encher', () => {
    const c = q.contamination(); assert.ok(c.B > 600 * 180 / 3600 * 0.85, JSON.stringify(c));
    assert.ok(q.siloRate('SILO-702') < 5);
    within(q.rateExit('e10'), 1080, 5);
  });
}

console.log('Falha de ejetor C e baixa pressão');
{
  const p = fresh(); p.opts.intertravaEjetor = false; run(p, 300); p.setFault('fy603', true); run(p, 300);
  ok('rejeito C chega ao Silo A (violação sanitária)', () => assert.ok(p.contamination().C > 5));
  const q = fresh(); run(q, 300); q.setFault('pal601', true); run(q, 5);
  ok('PAL-601 derruba c_PERM e dá TRIP imediato', () => { assert.equal(q.state, 'TRIP'); assert.ok(q.tripReason.includes('PAL-601')); });
}

console.log('Entupimento, silos cheios e transbordo (Aula 14/15)');
{
  const p = fresh(); run(p, 300); p.toggleBlock('e12'); const t0 = p.t; run(p, 600);
  ok('e12 entupida: CALHA-602 enche e o TRIP ocorre perto de 15 kg / 180 kg/h = 300 s', () => {
    assert.equal(p.state, 'TRIP'); assert.ok(p.tripReason.includes('CALHA-602'), p.tripReason);
    const m = p.log.find(l => l.msg.startsWith('TRIP')); const dt = m.t - t0;
    assert.ok(dt > 200 && dt < 360, 'trip após ' + dt + ' s');
  });
  const q = fresh(); q.setSiloLevel('SILO-701', 0.94); run(q, 400);
  ok('Silo A a 95 %: XV-701 fecha sozinha, e11 vira ponte bloqueada e a planta faz TRIP', () => {
    assert.ok(q.valveAuto['SILO-701']); assert.equal(q.state, 'TRIP'); assert.ok(q.tripReason.includes('CALHA-701'));
  });
  const r = fresh(); r.setSiloLevel('SILO-703', 0.96); run(r, 3);
  ok('NC-703 derruba c_PERM', () => assert.equal(r.state, 'TRIP'));
  const s = fresh(); run(s, 100); s.setFault('ji201', true); run(s, 5);
  ok('JI-201: esteira para (e3 com Q = 0) e há TRIP', () => { assert.equal(s.state, 'TRIP'); run(s, 200); assert.ok(s.rateExit('e3') < 50); });
}

console.log('Vazamento e balanço de massa (Aula 15)');
{
  const p = fresh(); run(p, 300); p.setLeak('e3', 150); run(p, 600);
  ok('vazamento de 150 kg/h em e3: B·Q acusa +150 em EST-201 e 0 em BAL-301 (instrumentação total)', () => {
    const S = A.matVec(A.incidenceMatrix(p.graph), p.qVector());
    within(S[p.graph.nodes.indexOf('EST-201')], 150, 15); assert.ok(Math.abs(S[p.graph.nodes.indexOf('BAL-301')]) < 40);
  });
  ok('com os instrumentos reais: r1 ≈ 150 (a montante da balança), r2 ≈ 0, alarme RES-1', () => {
    const i = p.instruments(); within(i.r1, 150, 20); assert.ok(Math.abs(i.r2) < i.tol, JSON.stringify(i));
    assert.ok(p.alarms.some(a => a.tag === 'RES-1' && a.active));
  });
  const q = fresh(); run(q, 300); q.setLeak('e10', 100); run(q, 600);
  ok('vazamento a jusante (e10): r2 ≈ 100 e r1 ≈ 0 — localiza só o trecho BAL-301 → silos', () => {
    const i = q.instruments(); within(i.r2, 100, 25); assert.ok(Math.abs(i.r1) < i.tol, JSON.stringify(i));
  });
}

console.log('Reciclo e14 (laço)');
{
  const p = fresh(); p.setRecycle(true); run(p, 1200);
  ok('com XV-104 aberta o elevador move ~200 kg/h e a alimentação nova cai para ~1000 kg/h', () => {
    within(p.recycleRate(), 200, 15); within(p.freshRate(), 1000, 6);
    within(p.rateExit('e1'), 1200, 3);
  });
  ok('B reciclado volta a virar B (apenas 10 % reclassificam em A): o silo B drena mais devagar', () => {
    assert.ok(p.rateExit('e12') > 180);
  });
}

console.log('Partida e parada');
{
  const a = new Plant(); a.seqMode = 'reversa'; a.start(); run(a, 120);
  ok('partida a frio em ordem inversa (jusante → montante): sem contaminação e planta OPERANDO', () => {
    assert.equal(a.state, 'OPERANDO'); assert.equal(a.contamination().kg, 0);
  });
  const b = new Plant(); b.seqMode = 'direta'; b.start(); run(b, 120);
  ok('partida em ordem direta (comparação): ejetores ainda desligados deixam B/C passarem ao Silo A', () => {
    assert.ok(b.contamination().kg > 0, 'kg=' + b.contamination().kg);
  });
  ok('parada em ordem direta termina em PARADO', () => { a.stop(); run(a, 120); assert.equal(a.state, 'PARADO'); });
}

console.log(`\n${n} verificações do motor passaram.`);
