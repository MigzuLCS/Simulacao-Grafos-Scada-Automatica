/** Aba 2 — Integrante 2: Árvores Binárias (Aula 21) e Rapidly-exploring Random Trees (Aula 22). */
import { h, s, clear } from '../../simulacao-grafos/js/dom.js';
import { bigNum, toggleGroup, actionBtn, banner } from '../../simulacao-grafos/js/widgets.js';
import { SIS, GRAO, decidir, sorteador, sortearGrao, inserirComum, inserirAVL, altura } from './binarias.js';
import { LARGURA, ALTURA, MARGEM, OBSTACULOS, PARTIDA, DESTINO, planejar, atalhos, comprimento } from './rrt.js';

const B = t => h('b', {}, t);
const br = x => String(x).replace('.', ',');
const m1 = x => br(x.toFixed(1)) + ' m';
const W = 1200, H = 520;
const fundo = (w, hh) => [s('rect', { width: w, height: hh, fill: '#4d7373' })];
const caixa = (x, y, w, hh, texto, sub) => {
  const g = s('g'), r = s('rect', { x: x - w / 2, y: y - hh / 2, width: w, height: hh, rx: 4, fill: '#dfe6ee', stroke: '#000', 'stroke-width': 2 });
  const t = s('text', { x, y: sub ? y - 4 : y + 6, 'text-anchor': 'middle', style: { font: 'bold 17px var(--font)', fill: '#000' } }, texto);
  const t2 = s('text', { x, y: y + 17, 'text-anchor': 'middle', style: { font: 'bold 14px var(--mono)', fill: '#000080' } }, sub || '');
  g.append(r, t, t2); return { g, r, t, t2 };
};

export function createTab2() {
  let timer = null;
  const parar = () => { if (timer) { clearInterval(timer); timer = null; } };
  const animar = (n, ms, fn) => { parar(); let i = 0; fn(0); timer = setInterval(() => { i++; if (i > n) { parar(); return; } fn(i); }, ms); };

  const bn = banner();
  const nums = h('div', { class: 'bignums' }), extra = h('div', { class: 'col' }), fala = h('div', { class: 'card plain' }), passo = h('div', { class: 'card line' });
  const dizer = (...frases) => fala.replaceChildren(h('div', { class: 'cardtitle' }, 'Em bom português'), ...frases.map(t => h('div', {}, t)));
  const vp = h('div', { class: 'viewport big' }), botoes = h('div', { class: 'col' });
  const top = toggleGroup([['bin', 'Aula 21 · Árvores binárias (decidir e buscar rápido)'], ['rrt', 'Aula 22 · Rota do AGV (RRT)']],
    k => mostrar(k || 'bin'), { cls: 'mid', wrapClass: 'topbtns', allowOff: false });
  const el = h('div', {}, bn.el, top.el, h('div', { class: 'split' }, h('div', { class: 'col' }, vp), h('div', { class: 'col' }, botoes, extra, nums, passo, fala)));

  const BIN = binarias(), RRT = rotaAGV();
  function mostrar(k) { parar(); BIN.parar(); top.set(k); const x = k === 'bin' ? BIN : RRT; clear(botoes).append(x.grupo.el); x.aplicar(x.grupo.get() || x.inicial); }
  mostrar('bin');

  return {
    el,
    setMode: m => { if (m === 'bin' || m === 'rrt') mostrar(m); else for (const x of [BIN, RRT]) if (x.modos.includes(m)) { mostrar(x === BIN ? 'bin' : 'rrt'); x.aplicar(m); } },
    onShow() {}, onHide() { parar(); BIN.parar(); }, update() {},
  };

  /* ============================================================ Aula 21 */
  function binarias() {
    /* ---------- desenho de árvore de decisão "em espinha": não ↓, sim → ---------- */
    function arvoreDecisao(arv, corFolha, rotuloFolha) {
      const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Árvore binária de decisão' });
      svg.append(...fundo(W, H));
      const n = arv.perguntas.length, dy = (H - 70) / n, xq = 370, xf = 950, y0 = 42;
      const ligacoes = [], perguntas = [], folhas = [];
      const seta = (x1, y1, x2, y2, rot, lx, ly) => {
        const l = s('line', { x1, y1, x2, y2, stroke: '#e8f0f0', 'stroke-width': 3 });
        const t = s('text', { x: lx, y: ly, 'text-anchor': 'middle', style: { font: 'bold 15px var(--font)', fill: '#fff' } }, rot);
        svg.append(l, t); return l;
      };
      arv.perguntas.forEach((p, i) => {
        const y = y0 + i * dy;
        ligacoes.push({ sim: seta(xq + 250, y, xf - 150, y, 'sim', (xq + 250 + xf - 150) / 2, y - 8), nao: seta(xq, y + 22, xq, y + dy - 22, 'não', xq - 22, y + dy / 2 + 5) });
      });
      arv.perguntas.forEach((p, i) => { const c = caixa(xq, y0 + i * dy, 500, 44, p.texto); svg.append(c.g); perguntas.push(c); });
      arv.perguntas.forEach((p, i) => { const c = caixa(xf, y0 + i * dy, 300, 44, rotuloFolha(p.sim)); svg.append(c.g); folhas.push(c); });
      const cf = caixa(xq, y0 + n * dy, 500, 44, rotuloFolha(arv.fim)); svg.append(cf.g); folhas.push(cf);
      return {
        svg,
        marcar(res) {
          perguntas.forEach((c, i) => c.r.setAttribute('fill', i <= res.nivel && i < n ? '#ffff00' : '#dfe6ee'));
          folhas.forEach((c, i) => c.r.setAttribute('fill', i === res.nivel ? corFolha(i === n ? arv.fim : arv.perguntas[i].sim) : '#9fb4b4'));
          ligacoes.forEach((l, i) => {
            const naoUsada = i < res.nivel, simUsada = i === res.nivel;
            l.nao.setAttribute('stroke', naoUsada ? '#ffff00' : '#7a9a9a'); l.nao.setAttribute('stroke-width', naoUsada ? 6 : 3);
            l.sim.setAttribute('stroke', simUsada ? '#ffff00' : '#7a9a9a'); l.sim.setAttribute('stroke-width', simUsada ? 6 : 3);
          });
        },
      };
    }

    const corSIS = f => f.cmd[0] && f.cmd[1] ? '#7CFC00' : f.cmd[0] ? '#ffaa00' : '#ff6b6b';
    const tSIS = arvoreDecisao(SIS, corSIS, f => f.estado);
    const corGrao = f => ({ A: '#7CFC00', B: '#ffaa00', C: '#ff6b6b' }[f.estado]);
    const tGrao = arvoreDecisao(GRAO, corGrao, f => `Categoria ${f.estado}`);

    /* ---------- árvore comum × AVL ---------- */
    const svgAVL = s('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Árvore comum e árvore AVL' });
    const gAVL = s('g');
    svgAVL.append(...fundo(W, H), s('line', { x1: W / 2, y1: 10, x2: W / 2, y2: H - 10, stroke: '#e8f0f0', 'stroke-dasharray': '6 6' }),
      s('text', { x: W / 4, y: 30, 'text-anchor': 'middle', style: { font: 'bold 20px var(--font)', fill: '#fff' } }, 'Árvore de busca comum'),
      s('text', { x: 3 * W / 4, y: 30, 'text-anchor': 'middle', style: { font: 'bold 20px var(--font)', fill: '#fff' } }, 'Árvore AVL (se reequilibra)'), gAVL);
    function desenharArvore(raiz, x0, largura, novo) {
      const pos = new Map(); let k = 0; const hh = altura(raiz);
      const dy = Math.min(70, (H - 90) / Math.max(1, hh - 1));
      (function visitar(n, d) { if (!n) return; visitar(n.esq, d + 1); pos.set(n, [0, 60 + d * dy, k++]); visitar(n.dir, d + 1); })(raiz, 0);
      const passoX = largura / (k + 1);
      for (const [n, p] of pos) p[0] = x0 + (p[2] + 1) * passoX;
      for (const [n, [x, y]] of pos) for (const f of [n.esq, n.dir]) if (f) { const [fx, fy] = pos.get(f); gAVL.append(s('line', { x1: x, y1: y, x2: fx, y2: fy, stroke: '#e8f0f0', 'stroke-width': 2.5 })); }
      for (const [n, [x, y]] of pos) {
        gAVL.append(s('circle', { cx: x, cy: y, r: 16, fill: n.chave === novo ? '#ffff00' : '#dfe6ee', stroke: '#000', 'stroke-width': 2 }),
          s('text', { x, y: y + 5, 'text-anchor': 'middle', style: { font: 'bold 13px var(--mono)', fill: '#000' } }, 't' + n.chave));
      }
    }

    let rnd = sorteador(3), contagem = { A: 0, B: 0, C: 0 }, grao = null, auto = null;
    const pararAuto = () => { if (auto) { clearInterval(auto); auto = null; } };
    const fichaGrao = h('div', { class: 'card', style: { fontSize: '15px' } });
    function classificar() {
      grao = sortearGrao(rnd); const res = decidir(GRAO, grao); contagem[res.folha.estado]++;
      tGrao.marcar(res);
      const tot = contagem.A + contagem.B + contagem.C;
      fichaGrao.replaceChildren(B('Grão sorteado: '), `${br(grao.comprimento)} mm × ${br(grao.largura)} mm`,
        grao.praga ? ' · praga' : '', grao.impureza ? ' · impureza' : '', grao.dano ? ' · dano' : '', grao.corSecundaria ? ' · cor secundária' : '');
      clear(nums).append(bigNum('Categoria', res.folha.estado, { A: '', B: 'y', C: 'r' }[res.folha.estado]), bigNum('Perguntas feitas', `${res.perguntas} de ${GRAO.perguntas.length}`, 'c'),
        bigNum(`Grãos (${tot})`, `A ${Math.round(contagem.A / tot * 100)}% · B ${Math.round(contagem.B / tot * 100)}% · C ${Math.round(contagem.C / tot * 100)}%`, ''));
      passo.textContent = `${res.folha.motivo} → ${res.folha.estado === 'A' ? 'segue para o Silo A' : res.folha.estado === 'B' ? 'ejetor FY-602 → Silo B' : 'ejetor FY-603 → Silo C'}`;
    }

    const falhas = {};
    function avaliarSIS() {
      const res = decidir(SIS, falhas); tSIS.marcar(res);
      const [est, alim] = res.folha.cmd;
      clear(nums).append(bigNum('Decisão', res.folha.estado, est && alim ? '' : est ? 'y' : 'r'), bigNum('Perguntas feitas', `${res.perguntas} de ${SIS.perguntas.length}`, 'c'),
        bigNum('Esteira', est ? 'LIGADA' : 'PARADA', est ? '' : 'r'), bigNum('Alimentador', alim ? 'LIGADO' : 'PARADO', alim ? '' : 'r'));
    }

    const grupo = toggleGroup([
      ['sis', '1 · Árvore de segurança: qual falha manda parar?'],
      ['grao', '2 · Túnel de visão: o grão é A, B ou C?'],
      ['avl', '3 · Historiador: árvore comum × AVL'],
    ], m => aplicar(m || 'sis'), { allowOff: false });

    function aplicar(m) {
      parar(); pararAuto(); grupo.set(m); clear(extra); passo.textContent = '';
      if (m === 'sis') {
        vp.replaceChildren(tSIS.svg);
        bn.set(B('Uma árvore de perguntas sim/não, da falha mais grave para a mais leve.'), ' O CLP para na primeira resposta "sim" e já sabe o que fazer.');
        dizer('Ligue as falhas nos botões e veja o caminho amarelo. Se duas falhas acontecem juntas, vale a mais grave, que está mais em cima.',
          'São no máximo 5 perguntas, sempre: o tempo de resposta é fixo e pequeno, o que a norma de segurança exige.');
        const linha = h('div', { class: 'btns row2' });
        for (const p of SIS.perguntas) {
          const b = actionBtn(p.texto.replace(/\?.*/, ''), () => { falhas[p.chave] = !falhas[p.chave]; b.setOn(falhas[p.chave]); avaliarSIS(); }, 'red');
          b.setOn(!!falhas[p.chave]); linha.append(b);
        }
        extra.append(linha); avaliarSIS();
      } else if (m === 'grao') {
        vp.replaceChildren(tGrao.svg);
        bn.set(B('A câmera responde no máximo 4 perguntas por grão.'), ' Defeito grave → C; padrão secundário → B; senão → A.');
        dizer('Cada grão desce pela árvore até a primeira resposta "sim". A maioria passa pelas 4 perguntas e sai como A.',
          'Por ser uma árvore, a decisão leva sempre o mesmo tempo curto, antes de o grão chegar ao ejetor.');
        const b1 = actionBtn('🎲 Sortear um grão', () => { pararAuto(); classificar(); }, 'blue');
        const b2 = actionBtn('▶ Esteira rodando (vários grãos)', () => { if (auto) { pararAuto(); b2.setOn(false); } else { b2.setOn(true); auto = setInterval(classificar, 700); } }, 'green');
        extra.append(h('div', { class: 'btns row2' }, b1, b2), fichaGrao);
        contagem = { A: 0, B: 0, C: 0 }; rnd = sorteador(3); classificar();
      } else if (m === 'avl') {
        vp.replaceChildren(svgAVL);
        bn.set(B('O historiador guarda as amostras numa árvore de busca pelo horário.'), ' Como elas chegam em ordem, a árvore comum vira uma fila; a AVL gira os nós e continua baixa.');
        dizer('Cada bolinha é uma amostra (t1, t2, …), chegando uma por vez. A amarela é a que acabou de entrar.',
          'Com as 2.500 amostras do notebook, a árvore comum fica com 2.500 níveis e a AVL com só 12: achar um horário leva 12 passos em vez de 2.500.');
        let comum = null, avl = null; const rot = { n: 0 };
        animar(15, 650, i => {
          if (i > 0) { comum = inserirComum(comum, i); avl = inserirAVL(avl, i, rot); }
          gAVL.replaceChildren(); if (comum) { desenharArvore(comum, 0, W / 2, i); desenharArvore(avl, W / 2, W / 2, i); }
          clear(nums).append(bigNum('Amostras', String(i), ''), bigNum('Altura comum', String(altura(comum)), 'r'), bigNum('Altura AVL', String(altura(avl)), ''), bigNum('Giros (rotações)', String(rot.n), 'c'));
          passo.textContent = i ? `Entrou t${i}` : 'As amostras vão chegar em ordem de tempo';
        });
      }
    }
    return { grupo, aplicar: m => { pararAuto(); aplicar(m); }, inicial: 'sis', modos: ['sis', 'grao', 'avl'], parar: pararAuto };
  }

  /* ============================================================ Aula 22 */
  function rotaAGV() {
    const E = 20, WW = LARGURA * E, HH = ALTURA * E;                 // 20 px por metro; y para cima
    const X = x => x * E, Y = y => HH - y * E;
    const svg = s('svg', { viewBox: `0 0 ${WW} ${HH}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Galpão com a árvore RRT do AGV' });
    svg.append(...fundo(WW, HH));
    for (const [ox, oy, w, hh, nome] of OBSTACULOS) {
      svg.append(
        s('rect', { x: X(ox - MARGEM), y: Y(oy + hh + MARGEM), width: (w + 2 * MARGEM) * E, height: (hh + 2 * MARGEM) * E, fill: '#f5c6c6', opacity: 0.35, stroke: '#ff8a8a', 'stroke-dasharray': '6 4' }),
        s('rect', { x: X(ox), y: Y(oy + hh), width: w * E, height: hh * E, fill: '#7f8c8d', stroke: '#2c3e50', 'stroke-width': 2 }),
        s('text', { x: X(ox + w / 2), y: Y(oy + hh / 2) + 6, 'text-anchor': 'middle', style: { font: 'bold 17px var(--font)', fill: '#fff' } }, nome));
    }
    const gArv = s('g'), gRota = s('g');
    const ponto = (p, cor, rot) => [s('circle', { cx: X(p[0]), cy: Y(p[1]), r: 14, fill: cor, stroke: '#000', 'stroke-width': 2 }),
      s('text', { x: X(p[0]), y: Y(p[1]) - 20, 'text-anchor': 'middle', style: { font: 'bold 18px var(--font)', fill: '#fff' } }, rot)];
    svg.append(gArv, gRota, ...ponto(PARTIDA, '#2ecc71', 'Partida'), ...ponto(DESTINO, '#ff4d4d', 'Doca'));
    const linha = (pts, cor, larg, traco) => s('polyline', { points: pts.map(p => `${X(p[0])},${Y(p[1])}`).join(' '), fill: 'none', stroke: cor, 'stroke-width': larg, 'stroke-dasharray': traco || null, 'stroke-linejoin': 'round' });

    let semente = 7, R = null, S = null, A = null;
    const calcular = () => { R = planejar({ semente }); S = planejar({ semente, estrela: true }); A = atalhos(S.caminho); };
    calcular();

    function crescer(plano, cor, extraFim) {
      const novos = plano.historico.filter(e => e.novo !== undefined).map(e => plano.nos[e.novo]);
      const passos = 30, porPasso = Math.ceil(novos.length / passos);
      gRota.replaceChildren();
      animar(passos, 90, i => {
        gArv.replaceChildren();
        for (const n of novos.slice(0, i * porPasso)) if (n.pai) gArv.append(s('line', { x1: X(n.pai.x), y1: Y(n.pai.y), x2: X(n.x), y2: Y(n.y), stroke: '#d0dcdc', 'stroke-width': 1.6 }));
        const feitos = Math.min(novos.length, i * porPasso);
        clear(nums).append(bigNum('Galhos na árvore', String(feitos), ''), bigNum('Sorteios', String(Math.round(plano.sorteios * feitos / novos.length)), 'c'),
          bigNum('Rota', i === passos ? m1(plano.comprimento) : '…', 'y'));
        if (i === passos) { gRota.append(linha(plano.caminho, cor, 6)); extraFim && extraFim(); }
      });
    }

    const grupo = toggleGroup([
      ['rrt', '1 · RRT: a árvore cresce sorteando pontos'],
      ['estrela', '2 · RRT*: mesmos pontos, ligações mais curtas'],
      ['atalho', '3 · Atalhos: cortar caminho onde há visão livre'],
    ], m => aplicar(m || 'rrt'), { allowOff: false });
    const novoSorteio = actionBtn('🎲 Sortear de novo (outra árvore)', () => { semente = semente * 31 + 17; calcular(); aplicar(grupo.get() || 'rrt'); }, 'blue');

    function aplicar(m) {
      parar(); grupo.set(m); clear(extra).append(novoSorteio); passo.textContent = ''; vp.replaceChildren(svg);
      if (m === 'rrt') {
        bn.set(B('RRT: o AGV não conhece o caminho, então a árvore "tateia" o galpão.'), ' Sorteia um ponto, cresce um galho de 2,2 m na direção dele e descarta o galho se bater num equipamento.');
        dizer('Os galhos cinza são a árvore crescendo a partir dos silos. Ela se espalha rápido pelos espaços vazios até alcançar a doca.',
          'A rota laranja funciona, mas é cheia de zigue-zague: o RRT acha um caminho, não o melhor caminho.');
        crescer(R, '#ffaa00', () => { passo.textContent = `Rota encontrada: ${m1(R.comprimento)} (linha reta seria 47,2 m, mas há equipamentos no meio)`; });
      } else if (m === 'estrela') {
        bn.set(B('RRT*: a cada galho novo, verifica se algum vizinho chegaria mais barato passando por ele.'), ' Se sim, troca a ligação (religa). A árvore vai se endireitando.');
        dizer('São os mesmos pontos sorteados do RRT; só as ligações mudam.',
          `A rota azul fica mais curta: ${m1(S.comprimento)} contra ${m1(R.comprimento)} do RRT comum.`);
        crescer(S, '#4da6ff', () => { gRota.prepend(linha(R.caminho, '#ffaa00', 3, '8 6')); passo.textContent = `RRT ${m1(R.comprimento)} → RRT* ${m1(S.comprimento)} (−${Math.round((1 - S.comprimento / R.comprimento) * 100)} %)`; });
      } else if (m === 'atalho') {
        bn.set(B('Atalhos: de cada ponto da rota, pula direto para o ponto mais distante que dá para ver em linha reta.'), ' Menos curvas para o AGV carregado.');
        dizer('Laranja = RRT, azul = RRT*, verde = RRT* com atalhos. Cada etapa encurta a anterior.',
          'No notebook ainda vem uma curva suave (spline) por cima, para o AGV não dar trancos com as sacas de arroz.');
        gArv.replaceChildren();
        for (const n of S.nos) if (n.pai) gArv.append(s('line', { x1: X(n.pai.x), y1: Y(n.pai.y), x2: X(n.x), y2: Y(n.y), stroke: '#d0dcdc', 'stroke-width': 1, opacity: 0.5 }));
        gRota.replaceChildren(linha(R.caminho, '#ffaa00', 3, '8 6'), linha(S.caminho, '#4da6ff', 4, '4 4'), linha(A, '#7CFC00', 7));
        const cA = comprimento(A);
        clear(nums).append(bigNum('RRT', m1(R.comprimento), 'y'), bigNum('RRT*', m1(S.comprimento), 'c'), bigNum('Com atalhos', m1(cA), ''));
        passo.textContent = `Economia total em relação ao RRT: ${Math.round((1 - cA / R.comprimento) * 100)} % · pontos de virada: ${A.length - 2}`;
      }
    }
    return { grupo, aplicar, inicial: 'rrt', modos: ['rrt', 'estrela', 'atalho'] };
  }
}
