/**
 * plant.js — Motor de simulação da linha de classificação (grafo da Aula 11).
 *
 * Modelo: lotes de massa ("pacotes", 0,5 kg) percorrem as arestas com atraso de transporte
 * L / v. Nos vértices, cada pacote é roteado (ejetores B e C) ou retido (aresta bloqueada).
 * As vazões que a tela mostra são medidas a partir da massa que realmente atravessa as arestas,
 * não digitadas — por isso o balanço B·Q = S da Aula 12 só fecha se o modelo for coerente.
 *
 * Itens marcados `premissa` não constam nas aulas.
 */
import { NODES, EDGES, SILOS, PROCESS, Q_NOMINAL } from './data.js';
import { startStopSequences } from './algorithms.js';
import { plantGraph } from './graphs.js';

const PKT = 0.25;                // kg por pacote
const SPACING = 0.2;             // s mínimos entre pacotes na mesma aresta
const HIST_W = 180;              // s — janela das vazões medidas
const SEQ_STEP = 6;              // s entre passos da sequência de partida/parada (premissa)
const T_DETECT_EJETOR = 3;       // s para o ZSH acusar falha de ejetor (premissa)
const RUNOUT = 15;               // s de esteira rodando após o TRIP do alimentador (premissa)
const Q_RECICLO = 200;           // kg/h do elevador de reciclo (premissa)

const EDGE = Object.fromEntries(EDGES.map(e => [e.id, e]));
const Q_REF = { ...Q_NOMINAL, e14: 200 };
const OUT = {
  'FN-101': 'e1', 'ALIM-101': 'e2', 'EST-201': 'e3', 'BAL-301': 'e4', 'VIS-401': 'e5', 'DIV-501': 'e6',
  'CALHA-602': 'e12', 'CALHA-603': 'e13', 'CALHA-701': 'e11',
};

export class Plant {
  constructor(seed = 7) {
    this.seed = seed;
    this.graph = plantGraph();
    this.reset();
  }

  reset() {
    this._rng = mulberry(this.seed);
    this.t = 0;
    this.state = 'PARADO';              // PARADO | PARTINDO | OPERANDO | PARANDO | TRIP | EMERGÊNCIA
    this.tripReason = '';
    this.on = { 'FN-101': false, 'ALIM-101': false, 'EST-201': false, 'BAL-301': false, 'VIS-401': false, 'DIV-501': false, 'EJE-602': false, 'EJE-603': false };
    this.seqMode = 'reversa';           // 'reversa' (correta) | 'direta' (Aula 13 como escrita)
    this.seq = null; this.seqT = 0;
    this.runout = 0;
    this.faults = { emerg: false, ji201: false, pal601: false, ksa401: false, fy602: false, fy603: false };
    this.opts = { intertravaEjetor: true, reclassB: 0.10, recicloAberto: false };
    this.blocked = new Set();           // entupimentos físicos (aresta travada)
    this.valveManual = { 'SILO-701': false, 'SILO-702': false, 'SILO-703': false }; // true = fechada pelo operador
    this.valveAuto = { 'SILO-701': false, 'SILO-702': false, 'SILO-703': false };   // true = fechada por NC
    this.leaks = {};                    // {edgeId: kg/h}
    this.leakedKg = 0; this.spillKg = 0;
    this.edgePk = Object.fromEntries(EDGES.map(e => [e.id, []]));
    this.lastIn = {};
    this.held = Object.fromEntries(NODES.map(n => [n.id, []]));
    this.recQueue = [];
    this.silo = Object.fromEntries(Object.keys(SILOS).map(k => [k, { kg: SILOS[k].cap * 0.2, tally: { A: 0, B: 0, C: 0 }, withdrawn: 0, overflow: 0 }]));
    this.credit = { A: 0, B: 0, C: 0 }; this.reclassCredit = 0;
    this.tokens = 0; this.tokens14 = 0;
    this.cum = Object.fromEntries(EDGES.map(e => [e.id, 0]));      // massa que SAIU de cada aresta
    this.cumIn = Object.fromEntries(EDGES.map(e => [e.id, 0]));    // massa que ENTROU em cada aresta
    this.feedKg = 0; this.recKg = 0;
    this.hist = [];
    this.alarms = []; this.alarmLog = [];
    this.ejFail = { 'EJE-602': 0, 'EJE-603': 0 };
    this.ejFailConfirmed = { 'EJE-602': false, 'EJE-603': false };
    this.lastEvent = '';
    this.log = [];
    this.nextId = 1;
    this.leakTimer = { r1: 0, r2: 0 };
    this._lastHistT = -1;
  }

  /* ------------------------------------------------------------ comandos do operador */
  note(msg) { this.log.unshift({ t: this.t, msg }); if (this.log.length > 60) this.log.pop(); }

  start() {
    if (this.state === 'OPERANDO' || this.state === 'PARTINDO') return;
    if (this.state === 'TRIP') this.reset_trip();
    if (this.state === 'EMERGÊNCIA' || !this.cPerm()) { this.note('Partida negada: permissivos não satisfeitos (c_PERM = 0)'); return; }
    const { start } = startStopSequences(this.graph);
    const order = this.seqMode === 'reversa' ? start : [...start].reverse();
    this.seq = order.filter(n => n in this.on);
    this.seqT = 0; this.state = 'PARTINDO'; this.tripReason = '';
    this.note(`Partida em ordem ${this.seqMode === 'reversa' ? 'REVERSA (jusante → montante)' : 'DIRETA (montante → jusante)'}: ${this.seq.join(' → ')}`);
  }
  stop() {
    if (this.state === 'PARADO' || this.state === 'EMERGÊNCIA') return;
    const { stop } = startStopSequences(this.graph);
    this.seq = stop.filter(n => n in this.on); this.seqT = 0; this.state = 'PARANDO';
    this.note('Parada em ordem topológica direta (montante → jusante), esvaziando a linha');
  }
  quickStart() { for (const k in this.on) this.on[k] = true; this.state = 'OPERANDO'; this.seq = null; }
  setFault(k, v) {
    this.faults[k] = v;
    if (k === 'emerg') {
      if (v) { for (const n in this.on) this.on[n] = false; this.state = 'EMERGÊNCIA'; this.seq = null; this.note('PARADA DE EMERGÊNCIA (XA-901): tudo desenergizado'); }
      else { this.state = 'PARADO'; this.note('Emergência rearmada — estado PARADO'); }
    }
    if (k === 'fy602' || k === 'fy603') { this.ejFail['EJE-' + (k === 'fy602' ? '602' : '603')] = 0; this.ejFailConfirmed['EJE-' + (k === 'fy602' ? '602' : '603')] = false; }
  }
  toggleBlock(id) { this.blocked.has(id) ? this.blocked.delete(id) : this.blocked.add(id); this.note(`Aresta ${id} ${this.blocked.has(id) ? 'ENTUPIDA (Q = 0, w = ∞)' : 'desobstruída'}`); }
  setLeak(id, kgph) { if (kgph > 0) this.leaks[id] = kgph; else delete this.leaks[id]; }
  toggleValve(s) { this.valveManual[s] = !this.valveManual[s]; this.note(`${SILOS[s].valv} ${this.valveManual[s] ? 'FECHADA' : 'ABERTA'} pelo operador`); }
  setRecycle(v) { this.opts.recicloAberto = v; this.note(`XV-104 ${v ? 'ABERTA: reciclo e14 ativo' : 'FECHADA: e14 desativado'}`); }
  dispatchSilo(s, frac = 1) {
    const st = this.silo[s], kg = st.kg * frac; st.kg -= kg; st.withdrawn += kg;
    for (const c of 'ABC') st.tally[c] *= (1 - frac);
    this.note(`Expedição de ${Math.round(kg)} kg do ${s}`);
  }
  setSiloLevel(s, frac) { const st = this.silo[s]; const d = SILOS[s].cap * frac - st.kg; st.kg += d; st.withdrawn -= d; }
  reset_trip() {
    if (this.state === 'TRIP') { this.state = 'PARADO'; this.tripReason = ''; this.note('TRIP rearmado pelo operador'); }
  }

  /* ------------------------------------------------------------ permissivos e intertravamentos */
  siloFrac(s) { return this.silo[s].kg / SILOS[s].cap; }
  /** c_PERM ↔ ¬EMERG ∧ ¬JI201 ∧ ¬PAL601 ∧ KSA401 ∧ ¬NC703   (README do simulador, Etapa 01) */
  cPerm() { const f = this.faults; return !f.emerg && !f.ji201 && !f.pal601 && !f.ksa401 && this.siloFrac('SILO-703') < PROCESS.nivelCritico; }
  beltRun() { return this.on['EST-201'] && !this.faults.emerg && !this.faults.ji201; }
  vibRun() { return (this.on['ALIM-101'] || this.runout > 0) && !this.faults.emerg; }
  airOk() { return !this.faults.pal601 && !this.faults.emerg; }
  valveClosed(s) { return this.valveManual[s] || this.valveAuto[s]; }
  edgeBlocked(id) {
    if (this.blocked.has(id)) return true;
    for (const s in SILOS) if (SILOS[s].entrada === id && this.valveClosed(s)) return true;
    return false;
  }
  edgeMoving(e) {
    if (this.edgeBlocked(e.id)) return false;
    if (e.meio === 'correia') return this.beltRun();
    if (e.meio === 'calha_vib') return this.vibRun();
    if (e.meio === 'elevador') return this.opts.recicloAberto;
    return true;
  }
  nodeHeld(n) { return this.held[n].reduce((s, p) => s + p.kg, 0); }
  nodeCap(n) { return n === 'FN-101' ? PROCESS.capFunil : PROCESS.capCalha; }

  trip(reason) {
    if (this.state === 'TRIP' || this.state === 'EMERGÊNCIA') return;
    this.on['ALIM-101'] = false; this.on['FN-101'] = false;
    this.state = 'TRIP'; this.tripReason = reason; this.runout = RUNOUT; this.seq = null;
    this.note(`TRIP: c_ALIM = 0 (${reason}). Esteira esvazia por ${RUNOUT} s`);
    this.raise('TRIP', 'ALTA', `Alimentador desligado por intertravamento: ${reason}`);
  }

  /* ------------------------------------------------------------ passo de simulação */
  step(dt) {
    this.t += dt;
    this.updateSequence(dt);
    if (this.runout > 0) { this.runout -= dt; if (this.runout <= 0 && this.state === 'TRIP') this.on['EST-201'] = false; }
    if (!this.cPerm() && (this.state === 'OPERANDO' || this.state === 'PARTINDO')) {
      const f = this.faults;
      this.trip(f.ji201 ? 'sobrecarga JI-201' : f.pal601 ? 'baixa pressão PAL-601' : f.ksa401 ? 'câmera KSA-401 fora' : this.siloFrac('SILO-703') >= PROCESS.nivelCritico ? 'NC-703 (Silo C cheio)' : 'permissivo');
    }
    this.feed(dt);
    this.advance(dt);
    this.releaseHeld();
    this.recycle(dt);
    this.siloLogic();
    this.checkChutes();
    this.updateAlarms(dt);
    if (Math.floor(this.t) !== this._lastHistT) { this._lastHistT = Math.floor(this.t); this.sample(); }
  }

  updateSequence(dt) {
    if (!this.seq) return;
    this.seqT += dt;
    const k = Math.floor(this.seqT / SEQ_STEP);
    if (this.state === 'PARTINDO') {
      this.seq.forEach((n, i) => { if (i <= k) this.on[n] = true; });
      if (k >= this.seq.length) { this.state = 'OPERANDO'; this.seq = null; this.note('Sequência concluída: planta OPERANDO'); }
    } else if (this.state === 'PARANDO') {
      this.seq.forEach((n, i) => { if (i <= k) this.on[n] = false; });
      if (k >= this.seq.length) { this.state = 'PARADO'; this.seq = null; this.note('Planta PARADA'); }
    }
  }

  nextFreshClass() {
    const s = PROCESS.split; let best = 'A';
    for (const c of 'ABC') this.credit[c] += s[c];
    for (const c of 'ABC') if (this.credit[c] > this.credit[best]) best = c;
    this.credit[best] -= 1; return best;
  }

  feed(dt) {
    const running = this.on['ALIM-101'] && this.on['FN-101'] && this.cPerm() && (this.state === 'OPERANDO' || this.state === 'PARTINDO') && !this.edgeBlocked('e1');
    if (!running) { this.tokens = 0; return; }
    this.tokens += PROCESS.Qin / 3600 * dt;
    while (this.tokens >= PKT) {
      this.tokens -= PKT;
      let pk;
      if (this.recQueue.length) { pk = this.recQueue.shift(); this.recKg += pk.kg; }
      else { pk = { cls: this.nextFreshClass(), kg: PKT, origin: 'fresh' }; this.feedKg += PKT; }
      this.enter('e1', pk, true);
    }
  }

  enter(id, pk, force = false) {
    const last = this.lastIn[id] ?? -9;
    if (!force && this.t - last < SPACING) return false;
    pk.pos = 0; this.edgePk[id].push(pk); this.lastIn[id] = this.t; this.cumIn[id] += pk.kg; return true;
  }

  /** decide o próximo arco de um pacote que chegou ao nó `n` */
  route(n, pk) {
    if (n === 'EJE-602') {
      const can = pk.cls === 'B' && this.on['EJE-602'] && !this.faults.fy602 && this.airOk()
        && !this.edgeBlocked('e7') && this.nodeHeld('CALHA-602') < PROCESS.capCalha;
      if (pk.cls === 'B' && !can) this.missedEjection('EJE-602');
      return can ? 'e7' : 'e8';
    }
    if (n === 'EJE-603') {
      const can = pk.cls === 'C' && this.on['EJE-603'] && !this.faults.fy603 && this.airOk()
        && !this.edgeBlocked('e9') && this.nodeHeld('CALHA-603') < PROCESS.capCalha;
      if (pk.cls === 'C' && !can) this.missedEjection('EJE-603');
      return can ? 'e9' : 'e10';
    }
    return OUT[n];
  }
  missedEjection(n) {
    const f = n === 'EJE-602' ? this.faults.fy602 : this.faults.fy603;
    if (f && this.ejFail[n] === 0) this.ejFail[n] = 0.001;
  }

  advance(dt) {
    for (const e of EDGES) {
      const list = this.edgePk[e.id];
      if (!list.length) continue;
      if (this.edgeMoving(e)) {
        const d = e.vel * dt / e.L, lk = this.leaks[e.id], f = lk ? Math.min(1, lk / Math.max(Q_REF[e.id] || 0, 1)) : 0;
        for (const p of list) {
          const np = Math.min(1, p.pos + d);
          if (f > 0) { const antes = p.kg; p.kg *= Math.pow(1 - f, np - p.pos); this.leakedKg += antes - p.kg; }   // perda proporcional ao trecho percorrido: fração total f
          p.pos = np;
        }
      }
      while (list.length && list[0].pos >= 1 && this.edgeMoving(e)) {
        const pk = list.shift(); this.cum[e.id] += pk.kg; this.arrive(e, pk);
      }
    }
  }

  arrive(e, pk) {
    const n = e.v;
    if (n in SILOS) { this.absorb(n, pk); return; }
    if (n === 'FN-101') { this.recQueue.push(pk); return; }      // chegada pelo reciclo e14
    pk.next = this.route(n, pk);
    if (!this.tryPlace(pk)) this.held[n].push(pk);
  }
  tryPlace(pk) {
    const e = EDGE[pk.next];
    if (this.edgeBlocked(e.id)) return false;
    if (e.meio === 'correia' && !this.beltRun()) return false;
    if (e.meio === 'calha_vib' && !this.vibRun()) return false;
    return this.enter(e.id, pk);
  }
  releaseHeld() {
    for (const n in this.held) {
      const h = this.held[n]; if (!h.length) continue;
      while (h.length && this.tryPlace(h[0])) h.shift();
    }
  }

  absorb(s, pk) {
    const st = this.silo[s], cap = SILOS[s].cap;
    const room = cap - st.kg;
    if (room < pk.kg) { st.overflow += pk.kg; this.spillKg += pk.kg; return; }
    st.kg += pk.kg; st.tally[pk.cls] += pk.kg;
  }

  recycle(dt) {
    const s = this.silo['SILO-702'];
    if (!this.opts.recicloAberto || !this.on['FN-101'] || this.edgeBlocked('e14')) { this.tokens14 = 0; return; }
    this.tokens14 += Q_RECICLO / 3600 * dt;
    while (this.tokens14 >= PKT && s.kg >= PKT) {
      this.tokens14 -= PKT; s.kg -= PKT; s.tally.B = Math.max(0, s.tally.B - PKT);
      this.reclassCredit += this.opts.reclassB;
      let cls = 'B'; if (this.reclassCredit >= 1) { this.reclassCredit -= 1; cls = 'A'; }
      this.enter('e14', { cls, kg: PKT, origin: 'reciclo' }, true);
    }
  }

  siloLogic() {
    for (const s in SILOS) {
      const f = this.siloFrac(s);
      if (f >= PROCESS.nivelCritico) this.valveAuto[s] = true;       // NC fecha XV-70x (Aula 14, atividade 1)
      else if (f <= 0.90) this.valveAuto[s] = false;
    }
  }

  checkChutes() {
    for (const n of ['CALHA-602', 'CALHA-603', 'CALHA-701', 'EST-201', 'BAL-301', 'EJE-602', 'EJE-603', 'VIS-401', 'DIV-501']) {
      if (this.nodeHeld(n) >= PROCESS.capCalha && (this.state === 'OPERANDO' || this.state === 'PARTINDO'))
        this.trip(`transbordo em ${n} (retenção ≥ ${PROCESS.capCalha} kg)`);
    }
  }

  /* ------------------------------------------------------------ medições */
  sample() {
    this.hist.push({
      t: this.t, cum: { ...this.cum }, cumIn: { ...this.cumIn },
      silo: Object.fromEntries(Object.keys(SILOS).map(k => [k, this.silo[k].kg + this.silo[k].withdrawn])),
      rec: this.recKg, fresh: this.feedKg,
    });
    if (this.hist.length > HIST_W + 5) this.hist.shift();
  }
  _win(W = HIST_W) {
    const h = this.hist; if (h.length < 2) return null;
    const last = h[h.length - 1]; let first = h[0];
    for (let i = h.length - 1; i >= 0; i--) { if (last.t - h[i].t >= W) { first = h[i]; break; } }
    const span = last.t - first.t; return span < 5 ? null : { first, last, span };
  }
  /** vazão que SAI da aresta, em kg/h */
  rateExit(id, W) { const w = this._win(W); return w ? (w.last.cum[id] - w.first.cum[id]) / w.span * 3600 : 0; }
  rateEntry(id, W) { const w = this._win(W); return w ? (w.last.cumIn[id] - w.first.cumIn[id]) / w.span * 3600 : 0; }
  /** taxa líquida de enchimento do silo (LIT + expedição medida), kg/h */
  siloRate(s, W) { const w = this._win(W); return w ? (w.last.silo[s] - w.first.silo[s]) / w.span * 3600 : 0; }
  recycleRate(W) { const w = this._win(W); return w ? (w.last.rec - w.first.rec) / w.span * 3600 : 0; }
  freshRate(W) { const w = this._win(W); return w ? (w.last.fresh - w.first.fresh) / w.span * 3600 : 0; }

  /** Vetor Q (vazão de saída por aresta) na ordem de EDGES. */
  qVector(W) { return EDGES.map(e => this.rateExit(e.id, W)); }

  /** Instrumentos reais da planta (o que o SCADA de fato enxerga). Ruído de ±0,5 % no FT-301. */
  instruments() {
    const noise = 1 + (this._noise ?? 0);
    const ft301 = this.rateExit('e3') * noise;
    const sA = this.siloRate('SILO-701'), sB = this.siloRate('SILO-702'), sC = this.siloRate('SILO-703');
    const q14 = this.recycleRate();
    const running = this.on['ALIM-101'] && this.on['FN-101'] && this.state !== 'TRIP';
    const qSet = running ? PROCESS.Qin : 0;
    const r1 = qSet - ft301;                     // perda a montante da balança (e1–e3)
    const r2 = ft301 - (sA + sB + sC) - q14;     // perda/retenção a jusante da balança (e4–e13)
    return { ft301, sA, sB, sC, q14, qSet, r1, r2, tol: PROCESS.tolResiduo * PROCESS.Qin };
  }
  tickNoise() { this._noise = (this._rng() - 0.5) * 0.01; }

  /** massa que chegou ao Silo A e não é grão tipo A */
  contamination() {
    const t = this.silo['SILO-701'].tally; const tot = t.A + t.B + t.C;
    return { kg: t.B + t.C, B: t.B, C: t.C, pct: tot > 0 ? (t.B + t.C) / tot * 100 : 0, total: tot };
  }

  /** tempo até transbordar uma calha se a saída estiver travada (Aula 15, atividade 2) */
  timeToOverflow(node) {
    const inflow = { 'CALHA-602': 180, 'CALHA-603': 120, 'CALHA-701': 900 }[node]; if (!inflow) return null;
    return (PROCESS.capCalha - this.nodeHeld(node)) / inflow * 3600;
  }

  /* ------------------------------------------------------------ alarmes (ISA-18.2 simplificado) */
  raise(tag, prio, desc) {
    const a = this.alarms.find(x => x.tag === tag && x.active);
    if (a) return;
    const item = { id: this.nextId++, tag, prio, desc, t: this.t, ack: false, active: true };
    this.alarms.unshift(item); this.alarmLog.unshift({ ...item });
    if (this.alarms.length > 40) this.alarms.pop();
  }
  clear(tag) { const a = this.alarms.find(x => x.tag === tag && x.active); if (a) { a.active = false; a.tRtn = this.t; } }
  ack(id) { const a = id == null ? this.alarms : this.alarms.filter(x => x.id === id); a.forEach(x => x.ack = true); }
  setAlarm(cond, tag, prio, desc) { cond ? this.raise(tag, prio, desc) : this.clear(tag); }

  updateAlarms(dt) {
    const f = this.faults;
    this.setAlarm(f.emerg, 'XA-901', 'CRIT', 'Parada de emergência acionada');
    this.setAlarm(f.ji201, 'JI-201', 'CRIT', 'Sobrecarga do motor M-201 (esteira parada)');
    this.setAlarm(f.pal601, 'PAL-601', 'CRIT', 'Pressão de ar abaixo do mínimo — ejetores inoperantes');
    this.setAlarm(f.ksa401, 'KSA-401', 'ALTA', 'Falha de comunicação com a câmera de visão');
    for (const s in SILOS) {
      const fr = this.siloFrac(s), n = s.slice(-3);
      this.setAlarm(fr >= PROCESS.nivelAlto && fr < PROCESS.nivelCritico, 'LAH-' + n, 'MED', `Nível alto no ${s} (${(fr * 100).toFixed(0)} %)`);
      this.setAlarm(fr >= PROCESS.nivelCritico, 'LAHH-' + n, 'ALTA', `Nível crítico NC-${n}: ${SILOS[s].valv} fechada automaticamente`);
    }
    for (const n of ['CALHA-602', 'CALHA-603', 'CALHA-701', 'EST-201']) {
      const fr = this.nodeHeld(n) / PROCESS.capCalha;
      this.setAlarm(fr >= 0.8, 'LAH-' + n, fr >= 1 ? 'ALTA' : 'MED', `Retenção em ${n}: ${(fr * 100).toFixed(0)} % da capacidade`);
    }
    for (const n of ['EJE-602', 'EJE-603']) {
      if (this.ejFail[n] > 0) {
        this.ejFail[n] += dt;
        if (this.ejFail[n] > T_DETECT_EJETOR && !this.ejFailConfirmed[n]) {
          this.ejFailConfirmed[n] = true;
          this.raise('FALHA-' + n, 'ALTA', `p_FALHA_EJETOR em ${n}: ZSH não confirmou o avanço do pistão`);
          if (this.opts.intertravaEjetor) this.trip(`falha de ejetor em ${n}`);
        }
      }
      if (!(n === 'EJE-602' ? f.fy602 : f.fy603)) this.clear('FALHA-' + n);
    }
    const c = this.contamination();
    this.setAlarm(c.kg > 2, 'CONTAM-A', 'ALTA', `Contaminação do Silo A: ${c.kg.toFixed(1)} kg de grão B/C (${c.pct.toFixed(2)} %)`);
    const w = this._win();
    if (w && (this.state === 'OPERANDO')) {
      const ins = this.instruments();
      this.leakTimer.r1 = Math.abs(ins.r1) > ins.tol ? this.leakTimer.r1 + dt : 0;
      this.leakTimer.r2 = Math.abs(ins.r2) > ins.tol ? this.leakTimer.r2 + dt : 0;
    } else this.leakTimer = { r1: 0, r2: 0 };
    this.setAlarm(this.leakTimer.r1 > 30, 'RES-1', 'ALTA', 'Resíduo r1 (setpoint − FT-301) fora da banda: perda a montante da balança');
    this.setAlarm(this.leakTimer.r2 > 30, 'RES-2', 'ALTA', 'Resíduo r2 (FT-301 − Σ silos) fora da banda: perda/retenção a jusante da balança');
  }

  topAlarm() { return this.alarms.find(a => a.active && !a.ack) || this.alarms.find(a => a.active) || null; }
  activeAlarms() { return this.alarms.filter(a => a.active); }
}

function mulberry(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
