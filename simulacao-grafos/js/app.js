/** app.js — casca do suporte de apresentação: aba de slides + 4 abas do simulador (uma por integrante) e laço de simulação. */
import { h, $, clear } from './dom.js';
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
  '▶ Slides (1 a 10)',
  '1. Planta e Balanço (Aulas 11–12)',
  '2. Busca, Rota e Falhas (Aulas 13–15)',
  '3. Dutos e AGV (Aulas 16–17)',
  '4. Logística (Aula 18)',
];

function renderTabs() {
  const t = $('#tabs'); clear(t);
  TITLES.forEach((x, i) => t.append(h('button', { class: 'tab' + (i === 0 ? ' hl' : '') + (i === app.active ? ' active' : ''), role: 'tab', 'aria-selected': i === app.active, onClick: () => app.goto(i) }, x)));
}

/* ---------------------------------------------------------------- laço */
let last = performance.now(), steps = 0;
function frame(now) {
  const real = Math.min(0.1, (now - last) / 1000); last = now;
  if (!app.paused) {
    let sim = real * app.scale, n = 0;
    while (sim > 1e-6 && n < 600) { const dt = Math.min(0.1, sim); app.plant.step(dt); sim -= dt; n++; if (++steps % 10 === 0) app.plant.tickNoise(); }
  }
  app.tabs[app.active].update && app.tabs[app.active].update();
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------- inicialização */
app.plant.quickStart(); app.fastForward(300);
app.tabs = [createSlides(app), createTab1(app), createTab2(app), createTab3(app), createTab4(app)];
const host = $('#screens');
app.tabs.forEach(t => { t.root = h('div', { class: 'screen' }, t.el); host.append(t.root); });
renderTabs();
const qs = new URLSearchParams(location.hash.slice(1));          // links diretos: #tab=1&mode=bfs&scale=20  (tab 0 = slides, 1..4 = simulador)
if (qs.get('scale')) app.scale = +qs.get('scale');
if (qs.has('slides')) { qs.set('tab', '0'); if (qs.get('slides')) qs.set('mode', qs.get('slides')); }   // #slides  ou  #slides=3
app.goto(qs.has('tab') ? +qs.get('tab') : 0);
if (qs.get('mode')) app.tabs[app.active].setMode(qs.get('mode'));
if (qs.get('act')) document.querySelectorAll('#screens .screen.active .btn.mid')[+qs.get('act') - 1]?.click();   // clica no n-ésimo botão de ação (para testes)
if (qs.get('ff')) app.fastForward(+qs.get('ff'));
requestAnimationFrame(frame);
