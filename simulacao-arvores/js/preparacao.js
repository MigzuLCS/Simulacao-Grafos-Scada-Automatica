/** preparacao.js — aba reservada para a aula de outro integrante, enquanto a simulação dela não existe. */
import { h } from '../../simulacao-grafos/js/dom.js';
import { banner } from '../../simulacao-grafos/js/widgets.js';

export function abaEmPreparacao(titulo, aulas, ideias) {
  const bn = banner();
  bn.set(h('b', {}, `${aulas}: simulação em preparação.`), ' Esta aba será preenchida quando o integrante responsável terminar a aula no repositório do grupo.');
  const el = h('div', {}, bn.el, h('div', { class: 'card plain', style: { maxWidth: '900px' } },
    h('div', { class: 'cardtitle' }, titulo),
    h('div', {}, 'Ideias para a tela, usando a mesma planta (FN-101 → VIS-401 → EJE-602/603 → Silos A, B e C):'),
    h('ul', {}, ...ideias.map(i => h('li', {}, i)))));
  return { el, setMode() {}, onShow() {}, update() {} };
}
