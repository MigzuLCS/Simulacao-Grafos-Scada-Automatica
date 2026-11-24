/** Aba 4 — Integrante 4: Árvore de Atingibilidade e Cobertura em Redes de Petri (Aula 24): ciclo do ejetor C e Silo C. */
import { h, s, clear } from '../../simulacao-grafos/js/dom.js';
import { bigNum, toggleGroup, actionBtn, banner } from '../../simulacao-grafos/js/widgets.js';
import { rede, habilitada, disparar, propriedades, texto, invarianteEjetor, invarianteSilo, OMEGA } from './petri.js';
import { sorteador } from './binarias.js';

const B = t => h('b', {}, t);
const W = 1200, H = 520;

/* posições do desenho da rede (lugares = círculos, transições = barras) */
const PL = { p1: [150, 130], p2: [450, 130], p3: [750, 130], p4: [1050, 250], p5: [430, 400], p6: [690, 400] };
const TR = { t1: [300, 130], t2: [600, 130], t3: [450, 250], t4: [900, 190], t5: [1050, 400], t6: [560, 470] };
/** Arcos como polilinhas (para o t5 voltar ao p1 por baixo, sem cruzar o desenho). */
const ARCOS = {
  't1|p1>': [PL.p1, TR.t1], 't1|>p2': [TR.t1, PL.p2], 't2|p2>': [PL.p2, TR.t2], 't2|>p3': [TR.t2, PL.p3], 't2|p6>': [PL.p6, TR.t2],
  't3|p3>': [PL.p3, TR.t3], 't3|>p1': [TR.t3, PL.p1], 't3|>p5': [TR.t3, PL.p5],
  't4|p3>': [PL.p3, TR.t4], 't4|>p4': [TR.t4, PL.p4], 't4|>p6': [TR.t4, PL.p6],
  't5|p4>': [PL.p4, TR.t5], 't5|>p1': [TR.t5, [1050, 500], [70, 500], [70, 130], PL.p1],
  't6|p5>': [PL.p5, TR.t6], 't6|>p6': [TR.t6, PL.p6],
};

export function createTab4() {
  let timer = null, auto = null;
  const parar = () => { if (timer) { clearInterval(timer); timer = null; } if (auto) { clearInterval(auto); auto = null; } };

  const bn = banner();
  const nums = h('div', { class: 'bignums' }), extra = h('div', { class: 'col' }), passo = h('div', { class: 'card line' });
  const fala = h('div', { class: 'card plain' });
  const dizer = (...frases) => fala.replaceChildren(h('div', { class: 'cardtitle' }, 'Em bom português'), ...frases.map(t => h('div', {}, t)));
  const vp = h('div', { class: 'viewport big' });
  const grupo = toggleGroup([
    ['fichas', '1 · O ciclo do ejetor C com fichas'],
    ['ating', '2 · Árvore de atingibilidade: todos os estados'],
    ['cober', '3 · Silo C sem descarga: aparece o ω'],
    ['cap', '4 · Silo com capacidade 3: corrigido'],
  ], m => aplicar(m || 'fichas'), { allowOff: false });
  const el = h('div', {}, bn.el, h('div', { class: 'split' }, h('div', { class: 'col' }, vp), h('div', { class: 'col' }, grupo.el, extra, nums, passo, fala)));

  /* ============================================================ desenho da rede de Petri */
  const svgRede = s('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Rede de Petri do ejetor C' });
  svgRede.append(s('rect', { width: W, height: H, fill: '#4d7373' }),
    s('defs', {}, s('marker', { id: 'pt-seta', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, s('path', { d: 'M0 0L10 5L0 10z', fill: '#e8f0f0' }))));
  const vArco = {}, vLugar = {}, vTrans = {};
  const borda = (de, para, r) => { const dx = para[0] - de[0], dy = para[1] - de[1], L = Math.hypot(dx, dy); return [para[0] - dx / L * r, para[1] - dy / L * r]; };
  for (const [k, pts] of Object.entries(ARCOS)) {
    const fimEmLugar = k.includes('|>'), p = [...pts];
    p[p.length - 1] = borda(p[p.length - 2], p[p.length - 1], fimEmLugar ? 36 : 12);
    p[0] = borda(p[1], p[0], fimEmLugar ? 12 : 36);
    const l = s('polyline', { points: p.map(q => q.join(',')).join(' '), fill: 'none', stroke: '#e8f0f0', 'stroke-width': 2.5, 'marker-end': 'url(#pt-seta)' });
    svgRede.append(l); vArco[k] = l;
  }
  let net = rede('A'), M = [...net.M0], onClickT = null;
  for (const [id, [x, y]] of Object.entries(PL)) {
    const c = s('circle', { cx: x, cy: y, r: 34, fill: '#dfe6ee', stroke: '#000', 'stroke-width': 2.5 });
    const fichas = s('g'), lugar = LUGARES_NOME[id];
    const nome = s('text', { x, y: y - 44, 'text-anchor': 'middle', style: { font: 'bold 16px var(--font)', fill: '#fff' } }, `${id} · ${lugar[0]}`);
    const tag = s('text', { x, y: y + 54, 'text-anchor': 'middle', style: { font: 'bold 13px var(--mono)', fill: '#ffff88' } }, lugar[1]);
    const g = s('g', {}, c, fichas, nome, tag); svgRede.append(g);
    vLugar[id] = { g, c, fichas, x, y };
  }
  for (const [id, [x, y]] of Object.entries(TR)) {
    const r = s('rect', { x: x - 9, y: y - 30, width: 18, height: 60, fill: '#c8c8c8', stroke: '#000', 'stroke-width': 2 });
    const [lx, ly, ancora] = ROTULO_T[id];
    const nome = s('text', { x: x + lx, y: y + ly, 'text-anchor': ancora, style: { font: 'bold 14px var(--font)', fill: '#fff' } }, `${id} ${NOMES_T[id]}`);
    const hit = s('rect', { x: x - 30, y: y - 36, width: 60, height: 72, fill: 'transparent', style: { cursor: 'pointer' } });
    const g = s('g', {}, r, nome, hit); svgRede.append(g);
    hit.addEventListener('click', () => onClickT && onClickT(id));
    vTrans[id] = { g, r };
  }
  function desenharFichas(id, n) {
    const { fichas, x, y } = vLugar[id]; fichas.replaceChildren();
    if (n === OMEGA) { fichas.append(s('text', { x, y: y + 10, 'text-anchor': 'middle', style: { font: 'bold 30px var(--font)', fill: '#000' } }, 'ω')); return; }
    if (n > 4) { fichas.append(s('text', { x, y: y + 9, 'text-anchor': 'middle', style: { font: 'bold 26px var(--mono)', fill: '#000' } }, String(n))); return; }
    const off = [[[0, 0]], [[-10, 0], [10, 0]], [[-11, 8], [11, 8], [0, -10]], [[-10, -10], [10, -10], [-10, 10], [10, 10]]][n - 1] || [];
    for (const [dx, dy] of off) fichas.append(s('circle', { cx: x + dx, cy: y + dy, r: 8, fill: '#000' }));
  }
  function desenharRede(destaque) {
    const existe = id => net.lugares.some(l => l.id === id) || net.transicoes.some(t => t.id === id);
    for (const id in vLugar) { vLugar[id].g.style.display = existe(id) ? '' : 'none'; if (existe(id)) desenharFichas(id, M[+id.slice(1) - 1]); }
    for (const id in vTrans) {
      const t = net.transicoes.find(x => x.id === id);
      vTrans[id].g.style.display = t ? '' : 'none';
      if (t) vTrans[id].r.setAttribute('fill', id === destaque ? '#ffff00' : habilitada(t, M) ? '#7CFC00' : '#c8c8c8');
    }
    for (const [k, l] of Object.entries(vArco)) {
      const [tid, resto] = k.split('|'), pid = resto.replace('>', ''), t = net.transicoes.find(x => x.id === tid);
      const idx = +pid.slice(1) - 1, usado = t && (resto.startsWith('>') ? t.pos[idx] : t.pre[idx]);
      l.style.display = usado ? '' : 'none';
    }
  }

  /* ============================================================ desenho da árvore (atingibilidade / cobertura) */
  const svgArv = s('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Árvore de atingibilidade' });
  function desenharArvore(nos, legenda) {
    svgArv.replaceChildren(s('rect', { width: W, height: H, fill: '#4d7373' }),
      s('text', { x: 20, y: H - 14, style: { font: 'bold 15px var(--mono)', fill: '#ffff88' } }, legenda));
    let k = 0; const prof = {}, pos = {};
    const folhas = nos.filter(n => !n.filhos.length).length, dx = (W - 80) / Math.max(1, folhas);
    (function visitar(n, d) {
      prof[n.id] = d;
      if (!n.filhos.length) { pos[n.id] = [40 + dx * (k++ + 0.5), 0]; }
      else { n.filhos.forEach(f => visitar(nos[f], d + 1)); pos[n.id] = [(pos[n.filhos[0]][0] + pos[n.filhos.at(-1)][0]) / 2, 0]; }
    })(nos[0], 0);
    const maxD = Math.max(...Object.values(prof)), dy = Math.min(80, (H - 115) / Math.max(1, maxD));
    for (const n of nos) pos[n.id][1] = 36 + prof[n.id] * dy;
    for (const n of nos) for (const f of n.filhos) {
      const [x1, y1] = pos[n.id], [x2, y2] = pos[f];
      svgArv.append(s('line', { x1, y1: y1 + 15, x2, y2: y2 - 15, stroke: '#e8f0f0', 'stroke-width': 2.5 }),
        s('text', { x: (x1 + x2) / 2 + 8, y: (y1 + y2) / 2 + 5, style: { font: 'bold 14px var(--mono)', fill: '#ffff00' } }, nos[f].t));
    }
    for (const n of nos) {
      const [x, y] = pos[n.id], tx = texto(n.M), w = tx.length * 9 + 16, temW = n.M.includes(OMEGA);
      svgArv.append(s('rect', { x: x - w / 2, y: y - 15, width: w, height: 30, rx: 4, fill: n.dup ? '#9fb4b4' : temW ? '#ffaa00' : n.id === 0 ? '#7CFC00' : '#dfe6ee', stroke: '#000', 'stroke-width': 2, 'stroke-dasharray': n.dup ? '5 4' : null }),
        s('text', { x, y: y + 5, 'text-anchor': 'middle', style: { font: 'bold 15px var(--mono)', fill: '#000' } }, tx));
      if (n.dup) svgArv.append(s('text', { x, y: y + 30, 'text-anchor': 'middle', style: { font: 'bold 12px var(--font)', fill: '#fff' } }, 'repetido'));
    }
  }

  /* ============================================================ cenários */
  const rnd = sorteador(5);
  function disparo(id) {
    const t = net.transicoes.find(x => x.id === id);
    if (!t || !habilitada(t, M)) { passo.textContent = `${id} não está habilitada agora (falta ficha na entrada)`; return; }
    M = disparar(t, M); desenharRede(id); contagem[id] = (contagem[id] || 0) + 1;
    if (net.parte === 'C' && M[1] === 1 && M[5] === 0) esperas++;      // grão C na posição com o silo cheio
    atualizarVivo();
    passo.textContent = `Disparou ${id} (${NOMES_T[id]}) → marcação ${texto(M)}`;
  }
  function escolherAuto() {
    const hab = net.transicoes.filter(t => habilitada(t, M)).map(t => t.id);
    if (hab.includes('t3') && hab.includes('t4')) return rnd() < 0.15 ? 't4' : 't3';      // falha do pistão é rara
    if (hab.includes('t6') && hab.length > 1 && rnd() < 0.75) return hab.find(x => x !== 't6');   // descarga do silo é mais lenta
    return hab[Math.floor(rnd() * hab.length)];
  }
  let contagem = {}, esperas = 0;
  function atualizarVivo() {
    const ej = M[0] ? 'PRONTO' : M[1] ? 'GRÃO NA POSIÇÃO' : M[2] ? 'DISPARANDO' : 'EM FALHA';
    const cor = M[3] ? 'r' : M[2] ? 'y' : '';
    const lista = [bigNum('Ejetor C', ej, cor), bigNum('Grãos ejetados', String(contagem.t3 || 0), 'c'), bigNum('Falhas', String(contagem.t4 || 0), contagem.t4 ? 'r' : '')];
    if (net.parte === 'C') {
      lista.push(bigNum('Silo C', `${M[4]} de ${net.K}`, M[5] === 0 ? 'r' : ''), bigNum('Grão esperando espaço', `${esperas} vez(es)`, esperas ? 'r' : ''),
        bigNum('Invariantes', invarianteEjetor(M) === 1 && invarianteSilo(M) === net.K ? 'OK' : 'VIOLADO', ''));
      alerta.style.display = esperas ? '' : 'none';
    }
    clear(nums).append(...lista);
  }
  const alerta = h('div', { class: 'card', style: { display: 'none', background: '#ffd6d6', borderLeft: '8px solid #c62828', fontSize: '15px' } },
    B('⚠ Aconteceu: grão C na posição com o silo cheio. '), 'Na rede a ficha espera, mas na esteira o grão não espera: iria para o Silo A. Por isso o intertravamento p_NC703 corta a ALIMENTAÇÃO (c_ALIM) antes, aos 95 %.');

  function modoRede(parte) {
    net = rede(parte); M = [...net.M0]; contagem = {}; esperas = 0; onClickT = disparo; vp.replaceChildren(svgRede); desenharRede(); atualizarVivo();
    const bAuto = actionBtn('▶ Rodar sozinho', () => { if (auto) { clearInterval(auto); auto = null; bAuto.setOn(false); } else { bAuto.setOn(true); auto = setInterval(() => disparo(escolherAuto()), 700); } }, 'green');
    const bZero = actionBtn('⟲ Voltar ao início', () => { M = [...net.M0]; contagem = {}; esperas = 0; desenharRede(); atualizarVivo(); passo.textContent = ''; }, 'blue');
    extra.append(h('div', { class: 'btns row2' }, bAuto, bZero));
  }

  function aplicar(m) {
    parar(); grupo.set(m); clear(extra); passo.textContent = ''; onClickT = null; alerta.style.display = 'none';
    if (m === 'fichas') {
      bn.set(B('Rede de Petri: os círculos são estados, as barras são eventos e as bolinhas pretas (fichas) mostram onde o ejetor está.'), ' Uma barra verde pode disparar: clique nela.');
      dizer('O ejetor começa pronto. Chega um grão C (t1), o CLP dispara a válvula (t2) e o sensor confirma (t3), ou o tempo esgota e vira falha (t4), que precisa de reset (t5).',
        'Repare que existe sempre exatamente 1 ficha nesses 4 círculos: o ejetor está sempre em um único estado.');
      modoRede('A');
    } else if (m === 'ating') {
      net = rede('A'); const pr = propriedades(net); vp.replaceChildren(svgArv);
      desenharArvore(pr.arvore, 'Vetor = [p1 pronto, p2 grão na posição, p3 pistão avançando, p4 falha]');
      bn.set(B('Árvore de atingibilidade: começa no estado inicial e abre um galho para cada evento possível.'), ' Quando um estado se repete, o galho para (cinza tracejado).');
      dizer('São só 4 estados diferentes, e de todos eles sempre há um próximo evento: a rede nunca trava (sem deadlock).',
        'Nunca aparecem duas fichas no mesmo lugar (rede segura) e nunca "pistão avançando" junto com "falha".');
      clear(nums).append(bigNum('Estados diferentes', String(pr.marcacoes.length), ''), bigNum('Travamentos', String(pr.deadlocks.length), ''), bigNum('Máx. fichas por lugar', String(pr.limite), 'c'));
    } else if (m === 'cober') {
      net = rede('B'); const pr = propriedades(net); vp.replaceChildren(svgArv);
      desenharArvore(pr.arvore, 'Vetor = [p1 pronto, p2 grão, p3 pistão, p4 falha, p5 lotes no Silo C]');
      bn.set(B('Agora cada grão ejetado põe uma ficha no Silo C, e nada tira de lá.'), ' A árvore seria infinita; o algoritmo de Karp-Miller troca o número que só cresce por ω ("tão grande quanto quiser").');
      dizer('Os nós laranja têm ω no Silo C. Isso é o alerta formal de projeto: sem descarga, o silo transborda.',
        'É por isso que a planta tem o intertravamento p_NC703 (Silo C cheio) e a caçamba de descarga CAC-803 da Aula 18.');
      clear(nums).append(bigNum('Estados na árvore', String(pr.marcacoes.length), ''), bigNum('Aparece ω?', pr.temOmega ? 'SIM' : 'NÃO', pr.temOmega ? 'r' : ''), bigNum('Silo C', 'TRANSBORDA', 'r'));
    } else if (m === 'cap') {
      bn.set(B('Correção: um círculo novo p6 = "espaço livre no silo", começando com 3 fichas.'), ' Disparar o ejetor (t2) gasta 1 espaço; descarregar o silo (t6) devolve 1. Se falhar (t4), o espaço volta, porque o grão não foi ejetado.');
      dizer('Silo C + espaço livre + grão no pistão = 3 sempre (um invariante). Com isso a árvore fica finita: 14 estados, sem ω e sem travar.',
        'Rode sozinho e espere o silo encher: a ficha do grão fica parada esperando espaço. É o achado de projeto mostrado no alerta.');
      modoRede('C');
      const pr = propriedades(rede('C'));
      extra.append(h('div', { class: 'card', style: { fontSize: '15px' } }, B('Árvore completa: '), `${pr.marcacoes.length} estados · ω: ${pr.temOmega ? 'sim' : 'não'} · travamentos: ${pr.deadlocks.length}`), alerta);
    }
  }

  aplicar('fichas');
  return { el, setMode: m => aplicar(m), onShow() {}, onHide: parar, update() {} };
}

const LUGARES_NOME = {
  p1: ['Ejetor pronto', 'ZSH-601 = 0'], p2: ['Grão C na posição', 'p_POS603'], p3: ['Pistão avançando', 'c_FY603'],
  p4: ['Falha', 'p_FALHA_EJETOR'], p5: ['Silo C', 'LIT-703'], p6: ['Espaço livre', 'capacidade'],
};
/** Onde fica o nome de cada transição (dx, dy, alinhamento), longe das setas. */
const ROTULO_T = { t1: [0, -40, 'middle'], t2: [0, -40, 'middle'], t3: [-18, 6, 'end'], t4: [0, -40, 'middle'], t5: [18, 6, 'start'], t6: [0, 50, 'middle'] };
const NOMES_T = { t1: 'grão chega', t2: 'dispara', t3: 'confirma', t4: 'sem confirmação', t5: 'reset', t6: 'descarrega' };
