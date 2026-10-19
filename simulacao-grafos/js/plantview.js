/**
 * plantview.js — Sinótico SVG da linha de classificação (grafo da Aula 11 desenhado como P&ID).
 * Usado na Tela 2 (animado, com pacotes) e na Tela 3 (estático, com destaques de algoritmo).
 */
import { s, polyInfo, pointAt, f0 } from './dom.js';
import { NODES, EDGES, EDGE_PATHS, SILOS, PROCESS } from './data.js';

const CLS_COLOR = { A: '#fff6c8', B: '#ff9f1c', C: '#e63946' };
const NODE_BY_ID = Object.fromEntries(NODES.map(n => [n.id, n]));
const LABEL_POS = {
  e1: [130, 128], e2: [250, 128], e3: [370, 128], e4: [490, 128], e5: [606, 128], e6: [719, 128],
  e7: [812, 225], e8: [855, 128], e9: [962, 225], e10: [1005, 128], e11: [1115, 250], e12: [706, 348], e13: [1000, 348], e14: [400, 572],
};
const VALVE_AT = { e11: 0.58, e12: 0.5, e13: 0.5 };

export class PlantView {
  /** @param {{interactive?:boolean, particles?:boolean, onNode?:Function, onEdge?:Function, onValve?:Function, labels?:boolean}} o */
  constructor(o = {}) {
    this.o = { interactive: true, particles: true, labels: true, ...o };
    this.refs = {}; this.eref = {}; this.info = {};
    this.pool = []; this.hl = { nodes: new Map(), edges: new Map() };
    this.svg = s('svg', { viewBox: '0 0 1200 600', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Sinótico da linha de classificação de grãos' });
    this.build();
  }

  build() {
    const svg = this.svg;
    svg.append(s('defs', {},
      s('pattern', { id: 'dots', width: 20, height: 20, patternUnits: 'userSpaceOnUse' }, s('circle', { cx: 1, cy: 1, r: 1, fill: '#8fb0b0' })),
      s('marker', { id: 'arr', viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, s('path', { d: 'M0 0L10 5L0 10z', fill: '#000' }))));
    svg.append(s('rect', { width: 1200, height: 600, fill: '#4d7373' }), s('rect', { width: 1200, height: 600, fill: 'url(#dots)' }));
    svg.append(s('text', { x: 14, y: 22, class: 'svgtag', style: { fontSize: '14px' } }, 'LINHA DE CLASSIFICAÇÃO ÓPTICA — GRAFO G = (V, E, W)  |V| = 14  |E| = 14'));

    this.gEdges = s('g'); this.gHalo = s('g'); this.gNodes = s('g'); this.gParts = s('g'); this.gLabels = s('g'); this.gValves = s('g');
    svg.append(this.gEdges, this.gHalo, this.gNodes, this.gParts, this.gValves, this.gLabels);

    for (const e of EDGES) this.drawEdge(e);
    for (const n of NODES) this.drawNode(n);
    this.legend();
  }

  /* ----------------------------------------------------------- arestas */
  drawEdge(e) {
    const pts = EDGE_PATHS[e.id], d = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
    this.info[e.id] = polyInfo(pts);
    const belt = e.meio === 'correia', vib = e.meio === 'calha_vib', elev = e.meio === 'elevador';
    const g = s('g', { 'data-edge': e.id });
    const hit = s('path', { d, class: 'edge-hit', style: this.o.interactive ? null : { pointerEvents: 'none', cursor: 'default' } });
    const outline = s('path', { d, fill: 'none', stroke: '#000', 'stroke-width': belt ? 16 : 13, 'stroke-linejoin': 'round', 'stroke-linecap': 'butt' });
    const body = s('path', { d, fill: 'none', stroke: belt ? '#7a7a7a' : vib ? '#b8b8b8' : '#dcdcdc', 'stroke-width': belt ? 12 : 9, 'stroke-linejoin': 'round', 'stroke-dasharray': elev ? '10 6' : null });
    const flow = s('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 2, 'stroke-dasharray': '4 8', opacity: belt ? 0.9 : 0 });
    const mid = pointAt(this.info[e.id], 0.5);
    const arrow = s('path', { d: 'M-5 -4L5 0L-5 4z', fill: '#000', transform: `translate(${mid[0]},${mid[1]}) rotate(${mid[2] * 180 / Math.PI})` });
    const stop = s('g', { class: 'hidden' },
      s('circle', { cx: mid[0], cy: mid[1], r: 9, fill: '#c00000', stroke: '#fff', 'stroke-width': 2 }),
      s('text', { x: mid[0], y: mid[1] + 4, 'text-anchor': 'middle', class: 'svgtag' }, '✕'));
    const leak = s('g', { class: 'hidden' }, s('path', { d: `M${mid[0] + 12} ${mid[1] - 14} q6 9 0 14 q-6 -5 0 -14z`, fill: '#ffaa00', stroke: '#000' }));
    g.append(hit, outline, body, flow, arrow, stop, leak);
    this.gEdges.append(g);
    this.eref[e.id] = { g, body, flow, outline, stop, leak, belt, hit };
    if (this.o.interactive) hit.addEventListener('click', () => this.o.onEdge && this.o.onEdge(e.id));

    if (this.o.labels) {
      const lp = LABEL_POS[e.id], w = e.id === 'e14' ? 118 : 74;
      const t = s('text', { x: lp[0], y: lp[1] + 11, 'text-anchor': 'middle', class: 'svgtext', fill: '#00ff00', style: { fill: '#00ff00', fontSize: '10px' } }, '');
      const r = s('rect', { x: lp[0] - w / 2, y: lp[1], width: w, height: 15, fill: '#000', stroke: '#fff', 'stroke-width': 0.5 });
      const tag = s('text', { x: lp[0], y: lp[1] - 3, 'text-anchor': 'middle', class: 'svgtag etag', style: { fontSize: '10px' } }, `${e.id} · ${e.L} m`);
      this.gLabels.append(tag, r, t);
      this.eref[e.id].label = t;
    }
    if (VALVE_AT[e.id]) {
      const p = pointAt(this.info[e.id], VALVE_AT[e.id]);
      const v = s('g', { transform: `translate(${p[0]},${p[1]})`, style: { cursor: this.o.interactive ? 'pointer' : 'default' } },
        s('path', { d: 'M-9 -8L9 8L9 -8L-9 8z', fill: '#00c000', stroke: '#000', 'stroke-width': 1.5 }),
        s('rect', { x: -4, y: -17, width: 8, height: 8, fill: '#ddd', stroke: '#000' }),
        s('text', { x: 14, y: 4, class: 'svgtag', style: { fontSize: '9px' } }, e.valv));
      this.gValves.append(v);
      this.eref[e.id].valve = v.firstChild;
      if (this.o.interactive) v.addEventListener('click', ev => { ev.stopPropagation(); this.o.onValve && this.o.onValve(e.id); });
    }
  }

  /* ----------------------------------------------------------- vértices */
  drawNode(n) {
    const g = s('g', { class: 'node', transform: `translate(${n.x},${n.y})`, 'data-node': n.id });
    const R = { g }; this.refs[n.id] = R;
    const stroke = { stroke: '#000', 'stroke-width': 2 };
    const label = (y, extra = '') => s('text', { x: 0, y, 'text-anchor': 'middle', class: 'svgtag' }, n.id + extra);
    const stateBlk = (y) => {
      const r = s('rect', { x: -14, y, width: 28, height: 12, fill: '#c00000', stroke: '#fff', 'stroke-width': 1 });
      const t = s('text', { x: 0, y: y + 10, 'text-anchor': 'middle', class: 'svgtext', style: { fontSize: '9px' } }, 'OFF');
      R.stR = r; R.stT = t; return [r, t];
    };
    switch (n.tipo) {
      case 'funil':
        g.append(s('polygon', { points: '-32,-40 32,-40 12,34 -12,34', fill: '#c8c8c8', class: 'nbody', ...stroke }),
          s('rect', { x: -10, y: 34, width: 20, height: 12, fill: '#999', ...stroke }), label(-48), ...stateBlk(52));
        R.fill = s('polygon', { points: '-26,-30 26,-30 20,-6 -20,-6', fill: '#e8d9a0', opacity: 0.9 }); g.append(R.fill);
        break;
      case 'alim':
        g.append(s('rect', { x: -30, y: -18, width: 60, height: 36, fill: '#c8c8c8', class: 'nbody', ...stroke }),
          s('path', { d: 'M-22 0l6 -8l6 16l6 -16l6 16l6 -16l6 8', fill: 'none', stroke: '#000', 'stroke-width': 1.5 }), label(-26), ...stateBlk(26));
        break;
      case 'motor':
        g.append(s('rect', { x: -30, y: -16, width: 60, height: 32, rx: 16, fill: '#8a8a8a', class: 'nbody', ...stroke }), label(-58), ...stateBlk(24));
        R.motor = s('circle', { cx: 0, cy: -34, r: 13, fill: '#c00000', ...stroke }); g.append(R.motor, s('text', { x: 0, y: -29, 'text-anchor': 'middle', class: 'svgtext', style: { fontSize: '13px' } }, 'M'));
        R.io = s('text', { x: 0, y: 49, 'text-anchor': 'middle', class: 'svgtext', style: { fill: '#00ff00', fontSize: '10px' } }, '');
        g.append(s('rect', { x: -44, y: 38, width: 88, height: 15, fill: '#000', stroke: '#fff', 'stroke-width': 0.5 }), R.io);
        break;
      case 'balanca':
        g.append(s('rect', { x: -30, y: -16, width: 60, height: 32, fill: '#c8c8c8', class: 'nbody', ...stroke }), s('path', { d: 'M-10 14L0 -8L10 14z', fill: '#444' }), label(-26),
          s('text', { x: 0, y: 8, 'text-anchor': 'middle', class: 'svgtext', style: { fill: '#000', fontSize: '10px' } }, 'W'));
        R.io = s('text', { x: 0, y: 40, 'text-anchor': 'middle', class: 'svgtext', style: { fill: '#ffff00', fontSize: '10px' } }, '');
        g.append(s('rect', { x: -36, y: 29, width: 72, height: 15, fill: '#000', stroke: '#fff', 'stroke-width': 0.5 }), R.io, ...stateBlk(48));
        break;
      case 'visao':
        g.append(s('rect', { x: -30, y: -28, width: 60, height: 36, fill: '#c8c8c8', class: 'nbody', ...stroke }), s('circle', { cx: 0, cy: -10, r: 9, fill: '#223', ...stroke }), label(-36),
          s('rect', { x: -36, y: 8, width: 72, height: 8, fill: '#bbb', ...stroke }));
        R.lamp = s('circle', { cx: 22, cy: -20, r: 4, fill: '#00e000', stroke: '#000' }); g.append(R.lamp, ...stateBlk(24));
        break;
      case 'decisao':
        g.append(s('polygon', { points: '0,-28 28,0 0,28 -28,0', fill: '#c8c8c8', class: 'nbody', ...stroke }), s('text', { x: 0, y: 4, 'text-anchor': 'middle', class: 'svgtext', style: { fill: '#000', fontSize: '10px' } }, 'CLP'), label(-36), ...stateBlk(34));
        break;
      case 'ejetor':
        g.append(s('rect', { x: -30, y: -28, width: 60, height: 56, fill: '#c8c8c8', class: 'nbody', ...stroke }),
          s('rect', { x: -6, y: 4, width: 12, height: 18, fill: '#777', ...stroke }), label(-36),
          s('text', { x: 0, y: -6, 'text-anchor': 'middle', class: 'svgtext', style: { fill: '#000', fontSize: '11px' } }, n.id === 'EJE-602' ? 'B' : 'C'));
        R.piston = s('rect', { x: -3, y: 22, width: 6, height: 6, fill: '#222' }); R.lamp = s('circle', { cx: 22, cy: -20, r: 4, fill: '#00e000', stroke: '#000' }); g.append(R.piston, R.lamp, ...stateBlk(34));
        break;
      case 'calha':
        g.append(s('polygon', { points: '-26,-28 30,-28 24,28 -32,28', fill: '#c8c8c8', class: 'nbody', ...stroke }), label(-36));
        R.gauge = s('rect', { x: -22, y: 24, width: 44, height: 0, fill: '#e8d9a0' }); g.append(s('rect', { x: -22, y: -24, width: 44, height: 48, fill: 'none', stroke: '#666' }), R.gauge);
        R.io = s('text', { x: 0, y: 46, 'text-anchor': 'middle', class: 'svgtext', style: { fill: '#00ff00', fontSize: '10px' } }, '');
        break;
      case 'silo':
        g.append(s('rect', { x: -40, y: -70, width: 80, height: 150, fill: '#c8c8c8', class: 'nbody', ...stroke }), s('ellipse', { cx: 0, cy: -70, rx: 40, ry: 8, fill: '#e0e0e0', ...stroke }),
          s('text', { x: 0, y: -48, 'text-anchor': 'middle', class: 'svgtag', style: { fill: '#000', fontSize: '11px' } }, n.id),
          s('text', { x: 0, y: -34, 'text-anchor': 'middle', class: 'svgtag', style: { fill: '#000', fontSize: '10px' } }, SILOS[n.id].nome === 'A' ? 'Cat. A' : SILOS[n.id].nome === 'B' ? 'Cat. B' : 'Cat. C'));
        R.fill = s('rect', { x: -38, y: 80, width: 76, height: 0, fill: SILOS[n.id].nome === 'A' ? '#f4e08a' : SILOS[n.id].nome === 'B' ? '#ffb347' : '#e86a73' });
        R.nc = s('line', { x1: -40, x2: 40, y1: 80 - 150 * PROCESS.nivelCritico, y2: 80 - 150 * PROCESS.nivelCritico, stroke: '#c00000', 'stroke-dasharray': '4 3' });
        R.na = s('line', { x1: -40, x2: 40, y1: 80 - 150 * PROCESS.nivelAlto, y2: 80 - 150 * PROCESS.nivelAlto, stroke: '#b36b00', 'stroke-dasharray': '4 3' });
        R.io = s('text', { x: 62, y: 44, 'text-anchor': 'middle', class: 'svgtext', style: { fill: '#00ff00', fontSize: '11px' } }, '');
        R.io2 = s('text', { x: 62, y: 63, 'text-anchor': 'middle', class: 'svgtext', style: { fill: '#ffff00', fontSize: '10px' } }, '');
        g.append(R.fill, R.nc, R.na, s('rect', { x: 26, y: 30, width: 72, height: 38, fill: '#000', stroke: '#fff', 'stroke-width': 0.5 }), R.io, R.io2);
        break;
    }
    if (R.io && n.tipo === 'calha') g.append(s('rect', { x: -30, y: 35, width: 60, height: 15, fill: '#000', stroke: '#fff', 'stroke-width': 0.5 }), R.io);
    this.gNodes.append(g);
    R.halo = s('circle', { cx: n.x, cy: n.y, r: 44, fill: 'none', stroke: '#fff', 'stroke-width': 4, class: 'hidden' });
    this.gHalo.append(R.halo);
    if (this.o.interactive) g.addEventListener('click', () => this.o.onNode && this.o.onNode(n.id));
    R.title = s('title', {}, `${n.id} — ${n.nome}`); g.append(R.title);
    R.badge = s('text', { x: n.x, y: n.y + (n.tipo === 'silo' ? -4 : n.tipo === 'calha' ? -50 : -74), 'text-anchor': 'middle', class: 'svgtext', style: { fill: '#ffff00', fontSize: '12px', paintOrder: 'stroke', stroke: '#000', strokeWidth: '3px', strokeLinejoin: 'round' } }, '');
    this.gHalo.append(R.badge);
  }

  legend() {
    const g = s('g', { transform: 'translate(210,500)' });
    const items = [['A', 'Cat. A'], ['B', 'Cat. B'], ['C', 'Cat. C']];
    items.forEach(([c, t], i) => {
      g.append(s('circle', { cx: i * 76, cy: 0, r: 5, fill: CLS_COLOR[c], stroke: '#000' }), s('text', { x: i * 76 + 10, y: 4, class: 'svgtag' }, t));
    });
    if (this.o.interactive) g.append(s('text', { x: 0, y: 24, class: 'svgtag', style: { fontSize: '10px' } }, 'Clique em equipamentos, trechos ou válvulas para o faceplate'));
    this.svg.append(g);
  }

  /* ----------------------------------------------------------- destaques (Tela 3) */
  setHighlight(nodes = new Map(), edges = new Map()) {
    this.hl = { nodes, edges };
    const colors = { visit: '#ffff00', cur: '#ff4d4d', done: '#7CFC00', queue: '#00ffff', path: '#ffffff', bad: '#ff4d4d', mark: '#ff9bf5' };
    for (const n of NODES) {
      const h = this.refs[n.id].halo, c = nodes.get(n.id);
      if (c) { h.classList.remove('hidden'); h.setAttribute('stroke', colors[c] || c); } else h.classList.add('hidden');
    }
    for (const e of EDGES) {
      const r = this.eref[e.id], c = edges.get(e.id);
      r.outline.setAttribute('stroke', c ? (colors[c] || c) : '#000');
      r.outline.setAttribute('stroke-width', (r.belt ? 16 : 13) + (c ? 5 : 0));
    }
  }
  setNodeText(map) { for (const n of NODES) this.refs[n.id].badge.textContent = map && map[n.id] != null ? map[n.id] : ''; }
  setEdgeText(map) {
    this._textOverride = !!map;
    for (const e of EDGES) if (this.eref[e.id].label) { this.eref[e.id].label.textContent = map && map[e.id] != null ? map[e.id] : ''; this.eref[e.id].label.style.fill = '#00ff00'; }
  }

  /* ----------------------------------------------------------- atualização dinâmica */
  update(p) {
    const on = (r, v, txtOn = 'ON', txtOff = 'OFF') => { if (!r.stR) return; r.stR.setAttribute('fill', v ? '#00a000' : '#c00000'); r.stT.textContent = v ? txtOn : txtOff; };
    for (const n of NODES) {
      const R = this.refs[n.id];
      if (n.id in p.on) on(R, p.on[n.id]);
      if (n.tipo === 'motor') {
        R.motor.setAttribute('fill', p.faults.ji201 ? '#ff8800' : p.beltRun() ? '#00c000' : '#c00000');
        R.io.textContent = p.faults.ji201 ? 'SOBRECARGA' : p.beltRun() ? '1.5 m/s · 6.2 A' : 'PARADO';
      }
      if (n.tipo === 'balanca') { const i = p.instruments(); R.io.textContent = `FT ${f0(i.ft301)} kg/h`; }
      if (n.id === 'VIS-401') R.lamp.setAttribute('fill', p.faults.ksa401 ? '#e00000' : '#00e000');
      if (n.tipo === 'ejetor') {
        const fail = n.id === 'EJE-602' ? p.faults.fy602 : p.faults.fy603;
        R.lamp.setAttribute('fill', fail || p.faults.pal601 ? '#e00000' : '#00e000');
        R.g.querySelector('.nbody').setAttribute('stroke', fail ? '#ff0000' : '#000');
        R.piston.setAttribute('fill', fail ? '#e00000' : '#222');
      }
      if (n.tipo === 'calha') {
        const held = p.nodeHeld(n.id), fr = Math.min(1, held / PROCESS.capCalha);
        R.gauge.setAttribute('height', 48 * fr); R.gauge.setAttribute('y', 24 - 48 * fr);
        R.gauge.setAttribute('fill', fr >= 1 ? '#e00000' : fr >= 0.8 ? '#ffaa00' : '#e8d9a0');
        R.io.textContent = `${held.toFixed(1)} kg`;
      }
      if (n.tipo === 'silo') {
        const fr = p.siloFrac(n.id), h = 150 * Math.min(1, fr);
        R.fill.setAttribute('height', h); R.fill.setAttribute('y', 80 - h);
        R.io.textContent = `${(fr * 100).toFixed(0)} %`;
        R.io2.textContent = `${f0(p.silo[n.id].kg)} kg`;
        R.io.style.fill = fr >= PROCESS.nivelCritico ? '#ff3333' : fr >= PROCESS.nivelAlto ? '#ffaa00' : '#00ff00';
      }
      if (n.id === 'FN-101') R.fill.setAttribute('opacity', p.on['FN-101'] ? 0.95 : 0.35);
    }
    for (const e of EDGES) {
      const r = this.eref[e.id], blocked = p.edgeBlocked(e.id), moving = p.edgeMoving(e);
      r.stop.classList.toggle('hidden', !blocked);
      r.leak.classList.toggle('hidden', !p.leaks[e.id]);
      if (r.belt) { r.flow.classList.toggle('belt-run', moving); r.flow.setAttribute('opacity', moving ? 0.9 : 0.15); }
      if (e.id === 'e14') r.body.setAttribute('stroke', p.opts.recicloAberto ? '#dcdcdc' : '#8a9a9a');
      if (r.valve) { const sil = Object.keys(SILOS).find(k => SILOS[k].entrada === e.id); const closed = p.valveClosed(sil); r.valve.setAttribute('fill', closed ? '#c00000' : '#00c000'); }
      if (r.label && !this._textOverride) {
        const q = p.rateExit(e.id);
        r.label.textContent = (e.id === 'e14' && !p.opts.recicloAberto) ? 'XV-104 fechada' : `${f0(q)} kg/h`;
        r.label.style.fill = blocked ? '#ff3333' : p.leaks[e.id] ? '#ffaa00' : '#00ff00';
      }
    }
    if (this.o.particles) this.drawParticles(p);
  }

  drawParticles(p) {
    let k = 0;
    for (const e of EDGES) {
      const info = this.info[e.id];
      for (const pk of p.edgePk[e.id]) {
        const [x, y] = pointAt(info, pk.pos);
        let c = this.pool[k];
        if (!c) { c = s('circle', { r: 3.2, stroke: '#000', 'stroke-width': 0.8 }); this.pool.push(c); this.gParts.append(c); }
        c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('fill', CLS_COLOR[pk.cls]);
        c.style.display = ''; k++;
      }
    }
    for (let i = k; i < this.pool.length; i++) this.pool[i].style.display = 'none';
  }
}

export { CLS_COLOR, NODE_BY_ID };
