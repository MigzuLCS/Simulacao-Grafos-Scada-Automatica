/** app.js — casca do suporte de apresentação: 4 abas (uma por integrante), laço de simulação, barra de estado e velocidade. */
import { h, $, clear, hms } from './dom.js';
import { Plant } from './plant.js';
import { createTab1 } from './tab1.js';
import { createTab2 } from './tab2.js';
import { createTab3 } from './tab3.js';
import { createTab4 } from './tab4.js';
import { createSlides } from './slides.js';

const app = {
  plant: new Plant(), scale: 5, paused: false, tabs: [], active: 0,
  fastForward(secs) { const n = Math.round(secs / 0.1); for (let i = 0; i < n; i++) { this.plant.step(0.1); if (i % 10 === 0) this.plant.tickNoise(); } },
  /** Planta nova em regime nominal (1200 kg/h, 75/15/10 %), já estabilizada. */
  reset() { this.plant = new Plant(); this.plant.quickStart(); this.fastForward(300); this.tabs.forEach(t => t.onPlantReplaced && t.onPlantReplaced()); },
  goto(i) {
    this.active = i; renderTabs();
    this.tabs.forEach((t, k) => t.root.classList.toggle('active', k === i));
    this.tabs[i].onShow && this.tabs[i].onShow();
  },
};
window.__app = app;

const TITLES = [
  'Integrante 1 · Modelagem e Balanço (Aulas 11–12)',
  'Integrante 2 · Busca, Dijkstra e Falhas (Aulas 13–15)',
  'Integrante 3 · Euler e AGV / TSP (Aulas 16–17)',
  'Integrante 4 · Logística e Validação (Aula 18)',
  '▶ Apresentação (10 Slides)',
];
const SPEEDS = [['⏸ Pausa', 0], ['1×', 1], ['5×', 5], ['20×', 20]];
const T = {};

function buildToolbar() {
  const tb = $('#toolbar'); clear(tb);
  T.state = h('span', { class: 'io' }, '');
  T.btns = SPEEDS.map(([label, v]) => h('button', { class: 'btn', onClick: () => { if (v === 0) app.paused = !app.paused; else { app.scale = v; app.paused = false; } } }, label));
  tb.append(h('span', { style: { fontWeight: 'bold', fontSize: '16px' } }, 'Linha de classificação óptica de grãos'), h('span', { style: { flex: 1 } }),
    h('span', { style: { fontWeight: 'bold' } }, 'Estado:'), T.state, h('span', { style: { width: '16px' } }), h('span', { style: { fontWeight: 'bold' } }, 'Velocidade:'), ...T.btns);
}
function renderTabs() {
  const t = $('#tabs'); clear(t);
  TITLES.forEach((x, i) => t.append(h('button', { class: 'tab' + (i === 4 ? ' hl' : '') + (i === app.active ? ' active' : ''), role: 'tab', 'aria-selected': i === app.active, onClick: () => app.goto(i) }, x)));
}
function updateBars() {
  const p = app.plant, st = p.state;
  T.state.textContent = st; T.state.className = 'io ' + (st === 'OPERANDO' ? '' : st === 'TRIP' || st === 'EMERGÊNCIA' ? 'r' : 'y');
  T.btns.forEach((b, i) => b.classList.toggle('on', i === 0 ? app.paused : (!app.paused && app.scale === SPEEDS[i][1])));
  const rb = $('#ribbon'), a = p.topAlarm(); clear(rb);
  if (!a) { rb.className = ''; rb.append(h('span', {}, '● SEM ALARMES ATIVOS'), h('span', {}, p.log[0] ? `[${hms(p.log[0].t)}] ${p.log[0].msg}` : '')); }
  else {
    rb.className = a.active ? a.prio : ''; const n = p.activeAlarms().length;
    rb.append(h('span', {}, `${a.ack ? '✓' : '⚠'} [${hms(a.t)}] ${a.tag}  ${a.desc}${n > 1 ? `   (+${n - 1})` : ''}`), h('button', { class: 'btn green', onClick: () => p.ack() }, '✓ ACK'));
  }
}

/* ---------------------------------------------------------------- laço */
let last = performance.now(), steps = 0;
function frame(now) {
  const real = Math.min(0.1, (now - last) / 1000); last = now;
  if (!app.paused) {
    let sim = real * app.scale, n = 0;
    while (sim > 1e-6 && n < 600) { const dt = Math.min(0.1, sim); app.plant.step(dt); sim -= dt; n++; if (++steps % 10 === 0) app.plant.tickNoise(); }
  }
  updateBars(); app.tabs[app.active].update && app.tabs[app.active].update();
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------- inicialização */
app.plant.quickStart(); app.fastForward(300);
app.tabs = [createTab1(app), createTab2(app), createTab3(app), createTab4(app), createSlides(app)];
const host = $('#screens');
app.tabs.forEach(t => { t.root = h('div', { class: 'screen' }, t.el); host.append(t.root); });
buildToolbar(); renderTabs();
const qs = new URLSearchParams(location.hash.slice(1));          // links diretos: #tab=1&mode=bfs&scale=20  (tab = 0..3; tab 4 / #slides = apresentação)
if (qs.get('scale')) app.scale = +qs.get('scale');
if (qs.has('slides')) { qs.set('tab', '4'); if (qs.get('slides')) qs.set('mode', qs.get('slides')); }   // #slides  ou  #slides=3
app.goto(qs.has('tab') ? +qs.get('tab') : 0);
if (qs.get('mode')) app.tabs[app.active].setMode(qs.get('mode'));
if (qs.get('act')) document.querySelectorAll('#screens .screen.active .btn.mid')[+qs.get('act') - 1]?.click();   // clica no n-ésimo botão de ação (para testes)
if (qs.get('ff')) app.fastForward(+qs.get('ff'));
requestAnimationFrame(frame);
