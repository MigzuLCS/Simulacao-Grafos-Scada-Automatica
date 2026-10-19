/** widgets.js — componentes visuais do modo apresentação (botões grandes, números grandes, grupos exclusivos). */
import { h } from './dom.js';

export const bigNum = (label, value, cls = '') => h('div', { class: 'bignum' }, h('span', { class: 'lbl' }, label), h('span', { class: 'io big ' + cls }, value));

/** Grupo de botões exclusivos: clicar no ativo desativa (volta a null). */
export function toggleGroup(items, onChange, { cls = 'big', wrapClass = 'btns', allowOff = true } = {}) {
  let cur = null;
  const btns = items.map(([key, label, color]) => h('button', { class: `btn ${cls} ${color || 'blue'}`, 'data-k': key, onClick: () => set(cur === key && allowOff ? null : key, true) }, label));
  const el = h('div', { class: wrapClass }, btns);
  function set(key, fire = false) { cur = key; btns.forEach(b => b.classList.toggle('on', b.dataset.k === key)); if (fire) onChange(key); }
  return { el, set, get: () => cur };
}

/** Botão de ação simples que pode ficar "ligado". */
export function actionBtn(label, onClick, color = 'blue') {
  const b = h('button', { class: `btn mid ${color}`, onClick: () => onClick(b) }, label);
  b.setOn = v => b.classList.toggle('on', v);
  return b;
}
