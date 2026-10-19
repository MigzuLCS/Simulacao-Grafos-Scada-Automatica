/** graphview.js — desenho genérico de grafos (dirigidos ou não) para as telas de logística, Euler e TSP. */
import { s } from './dom.js';

const COL = { cur: '#ff4d4d', done: '#7CFC00', path: '#ffff00', bad: '#ff4d4d', mark: '#ff9bf5', queue: '#00ffff', blocked: '#ff4d4d', dim: '#6a8a8a', white: '#ffffff' };

export class GraphView {
  /** @param {{pos:Object<string,number[]>, directed?:boolean, width?:number, height?:number, onNode?:Function, onEdge?:Function, nodeW?:(id:string)=>number, title?:string}} o */
  constructor(o) {
    this.o = { directed: true, width: 1200, height: 520, label: id => id, ...o };
    if (!this.o.nodeW) this.o.nodeW = id => Math.max(50, this.o.label(id).length * 7.6 + 18);
    this.svg = s('svg', { viewBox: `0 0 ${this.o.width} ${this.o.height}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': this.o.title || 'grafo' });
    this.svg.append(
      s('defs', {},
        s('pattern', { id: 'dots2', width: 20, height: 20, patternUnits: 'userSpaceOnUse' }, s('circle', { cx: 1, cy: 1, r: 1, fill: '#8fb0b0' })),
        ...Object.entries(COL).map(([k, c]) => s('marker', { id: 'ah-' + k, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, s('path', { d: 'M0 0L10 5L0 10z', fill: c }))),
        s('marker', { id: 'ah-def', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, s('path', { d: 'M0 0L10 5L0 10z', fill: '#e8f0f0' }))),
      s('rect', { width: this.o.width, height: this.o.height, fill: '#4d7373' }), s('rect', { width: this.o.width, height: this.o.height, fill: 'url(#dots2)' }));
    this.gE = s('g'); this.gN = s('g'); this.svg.append(this.gE, this.gN);
    this.er = {}; this.nr = {};
  }

  setGraph(nodes, edges) {
    this.nodes = nodes; this.edges = edges;
    this.gE.replaceChildren(); this.gN.replaceChildren(); this.er = {}; this.nr = {};
    const pair = {};
    edges.forEach(e => { const k = [e.u, e.v].sort().join('|'); (pair[k] ||= []).push(e); });
    for (const e of edges) {
      const k = [e.u, e.v].sort().join('|'), grp = pair[k], i = grp.indexOf(e), n = grp.length;
      const off = n === 1 ? 0 : (i - (n - 1) / 2) * 26 * (e.u < e.v ? 1 : -1);
      const a = this.o.pos[e.u], b = this.o.pos[e.v]; if (!a || !b) continue;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const cx = mx - dy / len * off, cy = my + dx / len * off;
      // recorta a linha nas bordas dos nós
      const wa = this.o.nodeW(e.u) / 2 + 2, wb = this.o.nodeW(e.v) / 2 + 4, ha = 16, hb = 18;
      const t0 = this.clip(a, [cx, cy], wa, ha), t1 = this.clip(b, [cx, cy], wb, hb);
      const d = off === 0 ? `M${t0[0]} ${t0[1]} L${t1[0]} ${t1[1]}` : `M${t0[0]} ${t0[1]} Q${cx} ${cy} ${t1[0]} ${t1[1]}`;
      const lx = off === 0 ? (t0[0] + t1[0]) / 2 : (t0[0] + 2 * cx + t1[0]) / 4, ly = off === 0 ? (t0[1] + t1[1]) / 2 : (t0[1] + 2 * cy + t1[1]) / 4;
      const hit = s('path', { d, fill: 'none', stroke: 'transparent', 'stroke-width': 16, style: { cursor: this.o.onEdge ? 'pointer' : 'default' } });
      const line = s('path', { d, fill: 'none', stroke: '#e8f0f0', 'stroke-width': 2, 'marker-end': this.o.directed ? 'url(#ah-def)' : null });
      const lab = s('g', { transform: `translate(${lx},${ly})`, style: { pointerEvents: 'none' } },
        s('rect', { x: -2, y: -10, width: 4, height: 18, rx: 2, fill: '#000', opacity: 0.85 }), s('text', { x: 0, y: 4, 'text-anchor': 'middle', class: 'svgtext', style: { fontSize: '12px' } }, ''));
      this.gE.append(hit, line, lab);
      if (this.o.onEdge) hit.addEventListener('click', () => this.o.onEdge(e.id));
      this.er[e.id] = { line, lab, hit, text: lab.lastChild, bg: lab.firstChild, e };
      this.setEdgeLabel(e.id, e.w != null ? String(e.w) : '');
    }
    for (const id of nodes) {
      const p = this.o.pos[id]; if (!p) continue;
      const w = this.o.nodeW(id);
      const g = s('g', { transform: `translate(${p[0]},${p[1]})`, style: { cursor: this.o.onNode ? 'pointer' : 'default' } },
        s('rect', { x: -w / 2, y: -15, width: w, height: 30, rx: 3, fill: '#c8c8c8', stroke: '#000', 'stroke-width': 2 }),
        s('text', { x: 0, y: 5, 'text-anchor': 'middle', style: { fontSize: '13px', fontFamily: 'var(--font)', fontWeight: 'bold', fill: '#000', pointerEvents: 'none' } }, this.o.label(id)));
      const badge = s('text', { x: 0, y: -21, 'text-anchor': 'middle', class: 'svgtext', style: { fill: '#ffff00', fontSize: '13px' } }, '');
      g.append(badge);
      this.gN.append(g); this.nr[id] = { g, rect: g.firstChild, badge };
      if (this.o.onNode) g.addEventListener('click', () => this.o.onNode(id));
    }
  }
  clip(c, toward, hw, hh) {
    const dx = toward[0] - c[0], dy = toward[1] - c[1]; if (!dx && !dy) return c;
    const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    return [Math.round((c[0] + dx * t) * 10) / 10, Math.round((c[1] + dy * t) * 10) / 10];
  }
  setEdgeLabel(id, text) {
    const r = this.er[id]; if (!r) return; r.text.textContent = text;
    const w = Math.max(6, String(text).length * 7.4 + 8); r.bg.setAttribute('width', w); r.bg.setAttribute('x', -w / 2); r.lab.style.display = text === '' ? 'none' : '';
  }
  /** nodes/edges: Map id → cor ('cur','done','path','bad','mark','queue','blocked','dim') */
  highlight(nodes = new Map(), edges = new Map(), nodeText = {}) {
    for (const id in this.nr) {
      const c = nodes.get(id), r = this.nr[id];
      r.rect.setAttribute('fill', c ? (COL[c] || c) : '#c8c8c8'); r.rect.setAttribute('stroke', c === 'cur' ? '#fff' : '#000');
      r.badge.textContent = nodeText[id] ?? '';
    }
    for (const id in this.er) {
      const c = edges.get(id), r = this.er[id], col = c ? (COL[c] || c) : '#e8f0f0';
      r.line.setAttribute('stroke', c === 'dim' ? '#7a9a9a' : col); r.line.setAttribute('stroke-width', c && c !== 'dim' ? 4 : 2);
      r.line.setAttribute('stroke-dasharray', c === 'blocked' ? '6 5' : null);
      if (this.o.directed) r.line.setAttribute('marker-end', `url(#ah-${c && COL[c] && c !== 'dim' ? c : 'def'})`);
    }
  }
}
