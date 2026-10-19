/** dom.js — utilitários mínimos para montar HTML/SVG sem framework. */
const SVG_NS = 'http://www.w3.org/2000/svg';

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  setAttrs(el, attrs);
  appendKids(el, kids);
  return el;
}
export function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVG_NS, tag);
  setAttrs(el, attrs);
  appendKids(el, kids);
  return el;
}
function setAttrs(el, attrs) {
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
}
function appendKids(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

export const f0 = x => Number.isFinite(x) ? Math.round(x).toString() : '—';
export const f1 = x => Number.isFinite(x) ? x.toFixed(1) : '∞';
export const fsign = x => (x > 0 ? '+' : '') + f0(x);
export function mmss(t) { t = Math.max(0, Math.round(t)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; }
export function hms(t) { t = Math.round(t); return `${String(Math.floor(t / 3600)).padStart(2, '0')}:${mmss(t % 3600)}`; }

/** pontos de uma polilinha a uma fração `u` do comprimento */
export function polyInfo(pts) {
  const seg = []; let L = 0;
  for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(d); L += d; }
  return { pts, seg, L };
}
export function pointAt(info, u) {
  let d = Math.max(0, Math.min(1, u)) * info.L;
  for (let i = 0; i < info.seg.length; i++) {
    if (d <= info.seg[i] || i === info.seg.length - 1) {
      const t = info.seg[i] ? d / info.seg[i] : 0, a = info.pts[i], b = info.pts[i + 1];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])];
    }
    d -= info.seg[i];
  }
  const l = info.pts[info.pts.length - 1]; return [l[0], l[1], 0];
}
