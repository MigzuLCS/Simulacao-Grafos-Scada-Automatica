/** redeview.js — desenho SVG da rede de switches (Aula 23): árvore ativa, papéis de porta RP/DP/AP, cabos rompidos e tempestade. */
import { s } from '../../simulacao-grafos/js/dom.js';
import { SWITCHES, ENLACES } from './rstp.js';

const W = 1200, H = 560, MW = 95, MH = 38;   // tela e meia-caixa de cada switch
export const POS = {
  'SW-CORE': [600, 60], 'SW-REC': [190, 190], 'SW-SIL': [1010, 190],
  'SW-TRANS': [230, 400], 'SW-EJE': [970, 400], 'SW-VIS': [600, 500],
};
const COR = { fwd: '#1fbf1f', alt: '#ff4d4d', morto: '#9aa', trans: '#ffaa00', temp: '#ff1744', raiz: '#f2c200', ok: '#dfe6ee', isolado: '#f6c9c9', falho: '#9e9e9e', sel: '#ffff00' };
const PAPEL = { RP: ['#1565c0', 'Root Port'], DP: ['#1b7a1b', 'Designated Port'], AP: ['#c62828', 'Alternate Port'] };

/** Ponto sobre o cabo logo fora da caixa do switch `de` (para o badge do papel da porta). */
function foraDaCaixa(de, para, folga) {
  const dx = para[0] - de[0], dy = para[1] - de[1];
  const t = Math.min(dx ? (MW + folga) / Math.abs(dx) : Infinity, dy ? (MH + folga) / Math.abs(dy) : Infinity);
  return [de[0] + dx * t, de[1] + dy * t];
}

export class RedeView {
  /** @param {{onEnlace?:(id:string)=>void, onSwitch?:(nome:string)=>void}} o */
  constructor(o = {}) {
    this.svg = s('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Rede Ethernet dos switches da planta' });
    this.svg.append(
      s('defs', {}, s('pattern', { id: 'dots-rede', width: 20, height: 20, patternUnits: 'userSpaceOnUse' }, s('circle', { cx: 1, cy: 1, r: 1, fill: '#8fb0b0' }))),
      s('rect', { width: W, height: H, fill: '#4d7373' }), s('rect', { width: W, height: H, fill: 'url(#dots-rede)' }));
    const gE = s('g'), gN = s('g');
    this.svg.append(gE, gN);

    this.er = {};
    for (const e of ENLACES) {
      const a = POS[e.a], b = POS[e.b], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const g = s('g', { style: { cursor: o.onEnlace ? 'pointer' : 'default' } });
      const line = s('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], 'stroke-linecap': 'round' });
      const hit = s('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: 'transparent', 'stroke-width': 30 });
      const bg = s('rect', { x: mx - 42, y: my - 15, width: 84, height: 30, rx: 3, fill: '#000', stroke: '#808080' });
      const txt = s('text', { x: mx, y: my + 6, 'text-anchor': 'middle', style: { font: 'bold 16px var(--mono)', fill: '#00ff00' } });
      const portas = [[a, b, e.a], [b, a, e.b]].map(([de, para, sw]) => {
        const [x, y] = foraDaCaixa(de, para, 22);
        const c = s('circle', { cx: x, cy: y, r: 17, stroke: '#000', 'stroke-width': 1.5 });
        const t = s('text', { x, y: y + 5, 'text-anchor': 'middle', style: { font: 'bold 13px var(--mono)', fill: '#fff' } });
        const tt = s('title');
        const gp = s('g', { style: { pointerEvents: 'none' } }, c, t); gp.append(tt);
        return { sw, gp, c, t, tt };
      });
      const tip = s('title');
      g.append(line, hit, bg, txt, ...portas.map(p => p.gp), tip);
      if (o.onEnlace) g.addEventListener('click', () => o.onEnlace(e.id));
      gE.append(g);
      this.er[e.id] = { e, line, bg, txt, portas, tip };
    }

    this.nr = {};
    for (const sw of SWITCHES) {
      const [x, y] = POS[sw.nome];
      const g = s('g', { transform: `translate(${x},${y})`, style: { cursor: o.onSwitch ? 'pointer' : 'default' } });
      const rect = s('rect', { x: -MW, y: -MH, width: 2 * MW, height: 2 * MH, rx: 4, stroke: '#000', 'stroke-width': 2.5 });
      const nome = s('text', { x: 0, y: -14, 'text-anchor': 'middle', style: { font: 'bold 20px var(--font)', fill: '#000' } }, sw.nome);
      const eq = s('text', { x: 0, y: 6, 'text-anchor': 'middle', style: { font: '13px var(--font)', fill: '#222' } }, sw.equipamentos);
      const info = s('text', { x: 0, y: 28, 'text-anchor': 'middle', style: { font: 'bold 15px var(--mono)', fill: '#000' } });
      const tip = s('title');
      g.append(rect, nome, eq, info, tip);
      if (o.onSwitch) g.addEventListener('click', () => o.onSwitch(sw.nome));
      gN.append(g);
      this.nr[sw.nome] = { sw, rect, eq, info, tip };
    }
    this.aviso = s('text', { x: 20, y: H - 14, style: { font: 'bold 24px var(--font)', fill: '#ffeb3b' } });
    this.svg.append(this.aviso);
  }

  /**
   * @param {import('./rede.js').Rede} rede
   * @param {{destaque?:Set<string>, arvore?:object, mostrarPapeis?:boolean, detalhes?:boolean}} [opt]
   *   destaque = enlaces pintados de amarelo (comparação com a MST); detalhes = mostra portas RP/DP/AP, custos d(v) e velocidades
   */
  render(rede, opt = {}) {
    const tempestade = rede.tempestade(), alc = rede.alcancaveis(), piscar = Math.floor(performance.now() / 250) % 2 === 0;
    const arv = opt.arvore || rede.arvore, det = !!opt.detalhes, papeis = det && opt.mostrarPapeis !== false && rede.protocolo !== 'NENHUM';
    for (const id in this.er) {
      const { e, line, bg, txt, portas, tip } = this.er[id];
      const vivo = rede.enlacesOk.has(id) && rede.switchesOk.has(e.a) && rede.switchesOk.has(e.b);
      const fwd = vivo && (opt.arvore ? opt.arvore.ativos.includes(id) : rede.encaminhando.has(id));
      const giga = e.velocidade === '1 Gbps';
      let cor = COR.alt, traco = '14 9';
      if (!vivo) { cor = COR.morto; traco = '3 9'; }
      else if (opt.destaque) { cor = opt.destaque.has(id) ? COR.sel : '#7a9a9a'; traco = opt.destaque.has(id) ? 'none' : '8 8'; }
      else if (tempestade) { cor = piscar ? COR.temp : '#7a0000'; traco = 'none'; }
      else if (fwd) { cor = COR.fwd; traco = 'none'; }
      else if (rede.transicao && rede.transicao.nova.estado[id] === 'Forwarding') { cor = COR.trans; traco = '10 6'; }
      line.setAttribute('stroke', cor); line.setAttribute('stroke-width', giga ? 11 : 6); line.setAttribute('stroke-dasharray', traco);
      const ligando = rede.transicao && rede.transicao.nova.estado[id] === 'Forwarding' && !fwd;
      const rotulo = det ? (vivo ? `${id} ${giga ? '1G' : '100M'}` : `${id} ✂`)
        : !vivo ? '✂ rompido' : (opt.destaque || tempestade || fwd) ? '' : ligando ? 'ligando…' : 'reserva';
      txt.textContent = rotulo;
      const larg = rotulo.length * 9.5 + 18;
      bg.setAttribute('width', larg); bg.setAttribute('x', (+txt.getAttribute('x')) - larg / 2); bg.style.display = txt.style.display = rotulo ? '' : 'none';
      txt.style.fill = !vivo ? '#bbb' : opt.destaque ? (opt.destaque.has(id) ? '#ffff00' : '#ccc') : fwd ? '#00ff00' : ligando ? '#ffaa00' : '#ff6b6b';
      tip.textContent = `${id}: ${e.a} — ${e.b} (${e.velocidade}). Clique para ${rede.enlacesOk.has(id) ? 'romper' : 'reparar'}.`;
      for (const p of portas) {
        const papel = vivo && papeis && !opt.destaque ? arv.papeis[`${id}|${p.sw}`] : null;
        p.gp.style.display = papel ? '' : 'none';
        if (papel) { p.c.setAttribute('fill', PAPEL[papel][0]); p.t.textContent = papel; p.tt.textContent = `${p.sw}: ${PAPEL[papel][1]}`; }
      }
    }
    for (const nome in this.nr) {
      const { sw, rect, eq, info, tip } = this.nr[nome];
      const ok = rede.switchesOk.has(nome), raiz = ok && rede.protocolo !== 'NENHUM' && arv.raizDe[nome] === nome;
      rect.setAttribute('fill', !ok ? COR.falho : raiz ? COR.raiz : (!alc.has(nome) && !opt.destaque) ? COR.isolado : COR.ok);
      rect.setAttribute('stroke-dasharray', ok ? 'none' : '7 5');
      const d = arv.custo[nome];
      eq.textContent = det ? sw.equipamentos : sw.zona;
      info.textContent = !ok ? 'FORA DE OPERAÇÃO'
        : det ? (raiz ? `ROOT · prio ${sw.prioridade}` : `d = ${d.toLocaleString('pt-BR')}`)
        : raiz ? 'RAIZ DA ÁRVORE' : (!alc.has(nome) && !opt.destaque) ? 'SEM CONEXÃO' : '';
      tip.textContent = `${nome} — ${sw.zona}. Bridge ID ${sw.prioridade}/${sw.mac}. Clique para ${ok ? 'simular falha' : 'restaurar'}.`;
    }
    this.aviso.textContent = opt.destaque ? '' : tempestade ? '⚠ Tempestade: a rede travou'
      : rede.transicao ? `Rede se refazendo… ${rede.transicao.restante.toFixed(rede.transicao.total < 1 ? 2 : 1)} s` : '';
  }
}
