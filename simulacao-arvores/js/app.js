/** app.js — casca da simulação da Etapa 03 (Árvores): 4 abas (uma por integrante) sobre a mesma planta da Etapa 02. */
import { h, $, clear } from '../../simulacao-grafos/js/dom.js';
import { Plant } from '../../simulacao-grafos/js/plant.js';
import { createTab1 } from './tab1.js';
import { createTab2 } from './tab2.js';
import { createTab3 } from './tab3.js';
import { createTab4 } from './tab4.js';

const app = {
  plant: new Plant(), scale: 5, tabs: [], active: 0,
  fastForward(secs) { const n = Math.round(secs / 0.1); for (let i = 0; i < n; i++) { this.plant.step(0.1); if (i % 10 === 0) this.plant.tickNoise(); } },
  goto(i) {
    if (i !== this.active) this.tabs[this.active]?.onHide?.();
    this.active = i; renderTabs();
    this.tabs.forEach((t, k) => t.root.classList.toggle('active', k === i));
    this.tabs[i].onShow && this.tabs[i].onShow();
  },
};
window.__app = app;

const TITLES = [
  '1. Kruskal/Prim e Huffman (Aulas 19–20)',
  '2. Árvores Binárias e RRT (Aulas 21–22)',
  '3. Rede STP/RSTP (Aula 23)',
  '4. Redes de Petri (Aula 24)',
];

function renderTabs() {
  const t = $('#tabs'); clear(t);
  TITLES.forEach((x, i) => t.append(h('button', { class: 'tab' + (i === app.active ? ' active' : ''), role: 'tab', 'aria-selected': i === app.active, onClick: () => app.goto(i) }, x)));
}

/* ---------------------------------------------------------------- laço (tempo simulado = real × scale) */
let last = performance.now(), steps = 0;
function frame(now) {
  const real = Math.min(0.1, (now - last) / 1000); last = now;
  let sim = real * app.scale, n = 0;
  while (sim > 1e-6 && n < 600) {
    const dt = Math.min(0.1, sim);
    app.plant.step(dt);
    if (app.active === 2) app.tabs[2].passo(dt);      // a rede da Aula 23 só atua enquanto a aba dela está aberta
    sim -= dt; n++;
    if (++steps % 10 === 0) app.plant.tickNoise();
  }
  app.tabs[app.active].update && app.tabs[app.active].update();
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------- inicialização */
app.plant.quickStart(); app.fastForward(300);
app.tabs = [
  createTab1(app),
  createTab2(app),
  createTab3(app),
  createTab4(app),
];
const host = $('#screens');
app.tabs.forEach(t => { t.root = h('div', { class: 'screen' }, t.el); host.append(t.root); });
renderTabs();
const qs = new URLSearchParams(location.hash.slice(1));          // links diretos: #tab=3&mode=stp&scale=5  (abas 1..4)
if (qs.get('scale')) app.scale = +qs.get('scale');
app.goto(qs.has('tab') ? Math.max(0, Math.min(3, +qs.get('tab') - 1)) : 2);
if (qs.get('mode')) app.tabs[app.active].setMode(qs.get('mode'));
requestAnimationFrame(frame);
