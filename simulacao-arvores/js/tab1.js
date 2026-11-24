/** Aba 1 — Integrante 1: Árvore Geradora Mínima do cabeamento (Aula 19) e Codificação de Huffman (Aula 20). */
import { h, s, clear } from '../../simulacao-grafos/js/dom.js';
import { GraphView } from '../../simulacao-grafos/js/graphview.js';
import { bigNum, toggleGroup, banner } from '../../simulacao-grafos/js/widgets.js';
import { NOS, TRECHOS, kruskalPassos, primPassos, rompimento, total } from './mst.js';
import { EVENTOS, TOTAL, construir, metricas } from './huffman.js';

const B = t => h('b', {}, t);
const br = x => String(x).replace('.', ',');
const pct = x => br((x * 100).toFixed(1)) + ' %';
const curto = id => NOS.find(n => n.id === id).curto;

export function createTab1() {
  let aula = 'mst', timer = null;
  const parar = () => { if (timer) { clearInterval(timer); timer = null; } };
  const animar = (n, ms, fn) => { parar(); let i = 0; fn(0); timer = setInterval(() => { i++; if (i > n) { parar(); return; } fn(i); }, ms); };

  const bn = banner();
  const nums = h('div', { class: 'bignums' }), fala = h('div', { class: 'card plain' }), passo = h('div', { class: 'card line' });
  const dizer = (...frases) => fala.replaceChildren(h('div', { class: 'cardtitle' }, 'Em bom português'), ...frases.map(t => h('div', {}, t)));
  const vp = h('div', { class: 'viewport big' }), botoes = h('div', { class: 'col' });
  const top = toggleGroup([['mst', 'Aula 19 · O cabeamento mais curto (Kruskal e Prim)'], ['huff', 'Aula 20 · Mensagens mais curtas (Huffman)']],
    k => mostrar(k || aula), { cls: 'mid', wrapClass: 'topbtns', allowOff: false });
  const el = h('div', {}, bn.el, top.el, h('div', { class: 'split' }, h('div', { class: 'col' }, vp), h('div', { class: 'col' }, botoes, nums, passo, fala)));

  const M = cabeamento(), H = arvoreHuffman();
  function mostrar(k) { parar(); aula = k; top.set(k); const x = k === 'mst' ? M : H; vp.replaceChildren(x.svg); clear(botoes).append(x.grupo.el); x.aplicar(x.grupo.get() || x.inicial); }
  mostrar('mst');

  return { el, setMode: m => { if (m === 'mst' || m === 'huff') mostrar(m); else for (const x of [M, H]) if (x.modos.includes(m)) { mostrar(x === M ? 'mst' : 'huff'); x.aplicar(m); } }, onShow() {}, onHide: parar, update() {} };

  /* ============================================================ Aula 19: Kruskal e Prim */
  function cabeamento() {
    const ids = NOS.map(n => n.id), pos = Object.fromEntries(NOS.map(n => [n.id, [n.x, n.y]]));
    const gv = new GraphView({ pos, directed: false, height: 520, nodeW: () => 96, label: curto, title: 'Trechos de eletrocalha da planta' });
    gv.setGraph(ids, TRECHOS.map(t => ({ id: t.id, u: t.a, v: t.b, w: `${br(t.m)} m` })));
    const K = kruskalPassos(), P = primPassos(), mst = K.filter(p => p.aceito).map(p => p.trecho.id);
    const tudo = total(TRECHOS.map(t => t.id)), tMst = total(mst);
    const romp = rompimento(mst, TRECHOS.find(t => t.a === 'EJE-603_EstacaoC' && t.b === 'COMP-601_Pneumatica').id);
    const numeros = (m, n, terceiro) => clear(nums).append(bigNum('Cabo usado', `${br(m)} m`, 'y'), bigNum('Trechos', `${n} de ${TRECHOS.length}`, ''),
      terceiro || bigNum('Economia', n === NOS.length - 1 || n === TRECHOS.length ? pct(1 - m / tudo) : '—', 'c'));

    const grupo = toggleGroup([
      ['todos', '1 · Todos os trechos possíveis'],
      ['kruskal', '2 · Kruskal: sempre o trecho mais curto'],
      ['prim', '3 · Prim: cresce a partir do painel'],
      ['falha', '4 · E se um cabo da árvore romper?'],
    ], m => aplicar(m || 'todos'), { allowOff: false });

    function aplicar(m) {
      parar(); grupo.set(m); passo.textContent = '';
      if (m === 'todos') {
        bn.set(B('11 equipamentos precisam ser ligados ao painel do CLP.'), ' Há 19 trechos possíveis de eletrocalha; instalar todos daria 100,4 m de cabo.');
        dizer('Cada caixa é um equipamento e cada linha é um caminho possível para o cabo, com o comprimento em metros.',
          'Queremos ligar todo mundo gastando o mínimo de cabo e sem fazer voltas: isso é uma Árvore Geradora Mínima (MST).');
        gv.highlight(new Map([['CLP-01_Painel', 'done']]), new Map()); numeros(tudo, TRECHOS.length);
      } else if (m === 'kruskal') {
        bn.set(B('Kruskal: olha os trechos do mais curto ao mais longo.'), ' Aceita o trecho se ele liga partes separadas; recusa se ele fecharia uma volta.');
        dizer('Verde = trecho aceito. Vermelho = recusado porque fecharia uma volta (os dois lados já estavam ligados).',
          'Com 11 equipamentos bastam 10 trechos. O resultado: 37,8 m de cabo em vez de 100,4 m.');
        animar(K.length, 900, i => {
          const es = new Map(TRECHOS.map(t => [t.id, 'dim']));
          K.slice(0, i).forEach(p => es.set(p.trecho.id, p.aceito ? 'done' : 'bad'));
          const atual = K[i - 1];
          if (atual) es.set(atual.trecho.id, atual.aceito ? 'path' : 'bad');
          gv.highlight(new Map(), es);
          const aceitos = K.slice(0, i).filter(p => p.aceito).length;
          numeros(atual ? atual.acumulado : 0, aceitos);
          passo.textContent = atual ? `${atual.aceito ? '✔ aceito' : '✘ recusado (fecharia volta)'}: ${curto(atual.trecho.a)} — ${curto(atual.trecho.b)} (${br(atual.trecho.m)} m)` : 'Ordenando os trechos do mais curto ao mais longo…';
        });
      } else if (m === 'prim') {
        bn.set(B('Prim: começa no painel do CLP e vai crescendo.'), ' A cada passo puxa o trecho mais curto que alcança um equipamento ainda desligado.');
        dizer('Amarelo = trecho que acabou de entrar. Verde = equipamentos já ligados ao painel.',
          'Caminho diferente, mesmo resultado do Kruskal: os mesmos 10 trechos e 37,8 m.');
        animar(P.length, 900, i => {
          const es = new Map(TRECHOS.map(t => [t.id, 'dim'])), ns = new Map([['CLP-01_Painel', 'done']]);
          P.slice(0, i).forEach(p => { es.set(p.trecho.id, 'done'); ns.set(p.novo, 'done'); });
          const atual = P[i - 1];
          if (atual) { es.set(atual.trecho.id, 'path'); ns.set(atual.novo, 'path'); }
          gv.highlight(ns, es); numeros(atual ? atual.acumulado : 0, i);
          passo.textContent = atual ? `Liga ${curto(atual.novo)} pelo trecho de ${br(atual.trecho.m)} m` : 'Começa pelo painel CLP-01';
        });
      } else if (m === 'falha') {
        bn.set(B('Numa árvore, todo cabo é essencial:'), ' se um romper, alguma parte da planta fica sem comunicação.');
        dizer('Rompendo o cabo EJE-603 — COMP-601, a central de ar comprimido fica isolada (vermelho).',
          'O trecho mais curto que religa é EJE-602 — COMP-601 (4,7 m): a segunda melhor árvore tem 38,2 m. Por isso a rede da Aula 23 tem cabos de reserva.');
        const rompido = TRECHOS.find(t => !romp.nova.includes(t.id) && mst.includes(t.id)).id;
        animar(1, 2200, i => {
          const es = new Map(TRECHOS.map(t => [t.id, mst.includes(t.id) ? 'done' : 'dim']));
          es.set(rompido, 'blocked');
          const ns = new Map(romp.isolados.map(n => [n, 'bad']));
          if (i === 1) { es.set(romp.religa.id, 'path'); romp.isolados.forEach(n => ns.set(n, 'done')); }
          gv.highlight(ns, es);
          numeros(i === 1 ? romp.comprimento : Math.round((tMst - TRECHOS.find(t => t.id === rompido).m) * 10) / 10, i === 1 ? 10 : 9,
            bigNum('Sem comunicação', i === 1 ? '0 equip.' : `${romp.isolados.length} equip.`, i === 1 ? '' : 'r'));
          passo.textContent = i === 1 ? `Religado por ${curto(romp.religa.a)} — ${curto(romp.religa.b)} (${br(romp.religa.m)} m): total ${br(romp.comprimento)} m` : 'Cabo rompido: COMP-601 sem comunicação';
        });
      }
    }
    return { svg: gv.svg, grupo, aplicar, inicial: 'todos', modos: ['todos', 'kruskal', 'prim', 'falha'] };
  }

  /* ============================================================ Aula 20: Huffman */
  function arvoreHuffman() {
    const { raiz, fusoes, codigos } = construir(), met = metricas(codigos);
    const W = 1200, HH = 520, svg = s('svg', { viewBox: `0 0 ${W} ${HH}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Árvore de Huffman' });
    svg.append(s('rect', { width: W, height: HH, fill: '#4d7373' }));
    // layout: folhas em ordem (esquerda → direita), nós internos no meio dos filhos, altura = profundidade
    let k = 0; const folhas = [];
    (function pos(n, d) {
      if (n.folha) { n.x = 85 + k++ * 147; n.y = 50 + d * 60; folhas.push(n); return; }
      pos(n.zero, d + 1); pos(n.um, d + 1); n.x = (n.zero.x + n.um.x) / 2; n.y = 50 + d * 60;
    })(raiz, 0);
    const gA = s('g'), gN = s('g'); svg.append(gA, gN);
    const vis = [];   // [{no, partes:[elementos]}] por fusão
    for (const no of fusoes) {
      const partes = [];
      for (const [filho, bit] of [[no.zero, '0'], [no.um, '1']]) {
        const linha = s('line', { x1: no.x, y1: no.y, x2: filho.x, y2: filho.y - (filho.folha ? 26 : 16), stroke: '#e8f0f0', 'stroke-width': 3 });
        const mx = (no.x + filho.x) / 2, my = (no.y + filho.y) / 2;
        const rot = s('text', { x: mx + (bit === '0' ? -12 : 12), y: my, 'text-anchor': 'middle', style: { font: 'bold 18px var(--mono)', fill: bit === '0' ? '#ffff00' : '#00ffff' } }, bit);
        gA.append(linha, rot); partes.push(linha, rot);
      }
      const c = s('circle', { cx: no.x, cy: no.y, r: 18, fill: '#c8c8c8', stroke: '#000', 'stroke-width': 2 });
      const t = s('text', { x: no.x, y: no.y + 5, 'text-anchor': 'middle', style: { font: 'bold 13px var(--mono)', fill: '#000' } }, String(no.f));
      gN.append(c, t); partes.push(c, t);
      vis.push({ no, partes, c });
    }
    const vf = {};
    for (const f of folhas) {
      const r = s('rect', { x: f.x - 66, y: f.y - 26, width: 132, height: 52, rx: 3, fill: '#dfe6ee', stroke: '#000', 'stroke-width': 2 });
      const t1 = s('text', { x: f.x, y: f.y - 7, 'text-anchor': 'middle', style: { font: 'bold 14px var(--font)', fill: '#000' } }, f.nome);
      const t2 = s('text', { x: f.x, y: f.y + 15, 'text-anchor': 'middle', style: { font: 'bold 14px var(--mono)', fill: '#000080' } });
      gN.append(r, t1, t2); vf[f.tag] = { r, t2, f };
    }
    const desenhar = (ate, destaque, comCodigo) => {
      const juntados = destaque >= 0 ? [fusoes[destaque].zero, fusoes[destaque].um] : [];
      vis.forEach((v, i) => {
        v.partes.forEach(p => { p.style.display = i < ate ? '' : 'none'; });
        v.c.setAttribute('fill', i === destaque ? '#ffaa00' : juntados.includes(v.no) ? '#ffff00' : '#c8c8c8');
      });
      for (const tag in vf) {
        const { r, t2, f } = vf[tag], filhoDaFusao = destaque >= 0 && (fusoes[destaque].zero === f || fusoes[destaque].um === f);
        r.setAttribute('fill', filhoDaFusao ? '#ffff00' : '#dfe6ee');
        t2.textContent = comCodigo ? `código ${codigos[tag]}` : `${f.f} de ${TOTAL}`;
      }
    };
    const numeros = () => clear(nums).append(bigNum('Código fixo', `${met.fixo} bits`, ''), bigNum('Huffman (média)', `${br(met.medio.toFixed(2))} bits`, 'y'), bigNum('Economia', pct(met.economia), 'c'));
    const descr = n => n.folha ? n.nome : 'grupo';

    const grupo = toggleGroup([
      ['freq', '1 · Algumas mensagens são muito mais comuns'],
      ['montar', '2 · Montar a árvore: juntar as duas mais raras'],
      ['codigos', '3 · Ler o código: caminho da raiz até a mensagem'],
    ], m => aplicar(m || 'freq'), { allowOff: false });

    function aplicar(m) {
      parar(); grupo.set(m); passo.textContent = '';
      if (m === 'freq') {
        bn.set(B('O CLP manda 8 tipos de mensagem para o historiador.'), ' Em cada 1000, 720 são "grão A aprovado" e só 2 são "emergência".');
        dizer('Com código de tamanho fixo, toda mensagem gasta 3 bits, seja ela comum ou rara.',
          'A ideia de Huffman: dar código curto para o que é comum e código longo para o que é raro.');
        desenhar(0, -1, false);
        clear(nums).append(bigNum('Tipos de mensagem', String(EVENTOS.length), ''), bigNum('Código fixo', `${met.fixo} bits cada`, ''), bigNum('Grão A', `${pct(EVENTOS[0].f / TOTAL)} das msgs`, 'y'));
      } else if (m === 'montar') {
        bn.set(B('Algoritmo de Huffman: junta sempre as duas mensagens (ou grupos) mais raras.'), ' A soma vira um novo nó; repete até sobrar só a raiz.');
        dizer('Amarelo = as duas que estão sendo juntadas agora; laranja = o grupo novo. O número no círculo é a soma das frequências.',
          'As mensagens raras são juntadas primeiro, por isso ficam lá embaixo, longe da raiz: código mais longo.');
        animar(fusoes.length, 1200, i => {
          desenhar(i, i - 1, false);
          const f = fusoes[i - 1];
          passo.textContent = f ? `Passo ${i}: ${descr(f.zero)} (${f.zero.f}) + ${descr(f.um)} (${f.um.f}) = ${f.f}` : 'Começa com as 8 mensagens soltas';
          clear(nums).append(bigNum('Junções', `${i} de ${fusoes.length}`, ''));
        });
      } else if (m === 'codigos') {
        bn.set(B('O código de cada mensagem é o caminho da raiz até ela:'), ' esquerda = 0, direita = 1. "Grão A" ganha 1 bit; "emergência", 7 bits.');
        dizer(`Em média cada mensagem passa a gastar ${br(met.medio.toFixed(2))} bits em vez de 3: ${met.bitsFixo} bits viram ${met.bitsHuffman} bits a cada 1000 mensagens.`,
          'Nenhum código é o começo de outro, então o SCADA lê os bits em sequência sem precisar de separador e recupera tudo sem perda.');
        desenhar(fusoes.length, -1, true); numeros();
        passo.textContent = `Limite teórico (entropia): ${br(met.H.toFixed(2))} bits · eficiência ${pct(met.eficiencia)}`;
      }
    }
    return { svg, grupo, aplicar, inicial: 'freq', modos: ['freq', 'montar', 'codigos'] };
  }
}
