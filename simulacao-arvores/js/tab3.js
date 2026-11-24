/** Aba 3 — Integrante 3: Protocolo de Árvore Geradora STP / RSTP na rede Ethernet da planta (Aula 23). */
import { h, clear } from '../../simulacao-grafos/js/dom.js';
import { bigNum, toggleGroup, actionBtn, banner } from '../../simulacao-grafos/js/widgets.js';
import { Rede, TIMEOUT_CLP } from './rede.js';
import { RedeView } from './redeview.js';
import { ENLACES, montarRede, executarRSTP, kruskal, peso, distanciasNaArvore, caminhoAteRaiz, gargaloMbps } from './rstp.js';

const B = t => h('b', {}, t);
const fmt = x => x.toLocaleString('pt-BR');
const Q_KGH = 1200;   // alimentação nominal (Etapa 02)
const TIMEOUT = String(TIMEOUT_CLP).replace('.', ',');

export function createTab3(app) {
  const rede = new Rede();
  let modo = 'normal', redeDerrubou = false, paradaS = 0, arvoreComparada = 'rstp';
  const view = new RedeView({
    onEnlace: id => { if (modo !== 'mst') rede.alternarEnlace(id); },
    onSwitch: n => { if (modo !== 'mst') rede.alternarSwitch(n); },
  });

  // Comparação RSTP × MST (cenário 5): rede fixa sem o e1, já convergida
  const comp = new Rede(); comp.alternarEnlace('e1'); comp.passo(1);
  const compRSTP = comp.arvore, mstIds = kruskal(comp.grafo);
  const compMST = { ativos: mstIds, custo: distanciasNaArvore(comp.grafo, mstIds, 'SW-CORE'), raizDe: { 'SW-CORE': 'SW-CORE' }, papeis: {} };

  const bn = banner();
  const group = toggleGroup([
    ['normal', '1 · Operação normal: a árvore ativa'],
    ['rstp', '2 · Romper a fibra da câmera (e1) com RSTP'],
    ['stp', '3 · O mesmo rompimento com STP clássico'],
    ['semstp', '4 · Sem STP: tempestade de broadcast'],
    ['mst', '5 · Árvore do RSTP × MST de Kruskal'],
    ['n1', '6 · Teste N−1: romper cada cabo'],
  ], m => aplicar(m || modo), { allowOff: false });
  const nums = h('div', { class: 'bignums' }), extra = h('div', { class: 'col' }), info = h('div', { class: 'card line' });
  const eventos = h('div', { class: 'card', style: { fontSize: '14px', lineHeight: '1.45' } });
  const rearmar = actionBtn('↻ Rearmar e partir a linha (operador)', () => { app.plant.start(); }, 'green');

  const el = h('div', {}, bn.el, h('div', { class: 'split' },
    h('div', { class: 'col' }, h('div', { class: 'viewport big' }, view.svg),
      h('div', { class: 'card', style: { fontSize: '14px' } },
        B('Cabos: '), 'verde = encaminha · vermelho tracejado = bloqueado (Alternate Port) · laranja = aguardando reconvergência · cinza = rompido. ',
        B('Portas: '), 'RP = Root Port · DP = Designated · AP = Alternate. Traço grosso = 1 Gbps (custo 20.000), fino = 100 Mbps (custo 200.000). ',
        B('Clique num cabo para romper/reparar e num switch para derrubar/restaurar.'))),
    h('div', { class: 'col' }, group.el, nums, extra, info, eventos)));

  /* ------------------------------------------------------------ cenários */
  function preparar(protocolo) {
    rede.definirProtocolo(protocolo); rede.restaurar(false); rede.eventos = [];
    if (app.plant.faults.ksa401) app.plant.setFault('ksa401', false);
    if (app.plant.state !== 'OPERANDO') app.plant.quickStart();
    redeDerrubou = false; paradaS = 0;
  }

  function aplicar(m) {
    modo = m; group.set(m); clear(extra);
    if (m === 'normal') {
      preparar('RSTP');
      bn.set(B('Ethernet não tem TTL: um ciclo faz o broadcast girar para sempre.'), ' O RSTP elege a raiz (menor Bridge ID = SW-CORE), calcula d(v) como um Dijkstra distribuído e bloqueia os 2 cabos que fecham ciclos (|E| − |V| + 1 = 7 − 6 + 1 = 2).');
      info.textContent = `Ativos: ${rede.arvore.ativos.join(', ')} · bloqueados: ${rede.arvore.bloqueados.join(', ')} · |E_T| = |V| − 1 = 5`;
    } else if (m === 'rstp' || m === 'stp') {
      preparar(m === 'rstp' ? 'RSTP' : 'STP');
      rede.alternarEnlace('e1');
      bn.set(...(m === 'rstp'
        ? [B('RSTP: a Alternate Port do SW-SIL já conhece outro caminho até a raiz.'), ` Ela vira Root Port em ~0,2 s, abaixo do timeout de ${TIMEOUT} s do CLP: a câmera nunca some e a linha segue rodando, agora com gargalo de 100 Mbps.`]
        : [B('STP clássico: as portas esperam os temporizadores (2 × 15 s).'), ` Em 30 s sem rota, o CLP estoura o timeout de ${TIMEOUT} s, perde p_KSA401 e o permissivo c_PERM desarma a linha.`]));
      info.textContent = m === 'rstp' ? 'Reconvergência: 0,2 s → linha continua (alarme de perda de redundância)' : 'Reconvergência: 30 s → TRIP por câmera fora (c_PERM = 0)';
      if (m === 'stp') extra.append(rearmar);
    } else if (m === 'semstp') {
      preparar('NENHUM');
      bn.set(B('Sem protocolo de árvore, os 7 cabos encaminham e há 2 ciclos independentes.'), ' Cada switch repete o broadcast em todas as portas: as cópias crescem sem limite, a rede satura e a câmera some do CLP.');
      info.textContent = 'Inundação sem TTL: as cópias crescem exponencialmente';
      extra.append(rearmar);
    } else if (m === 'mst') {
      preparar('RSTP');
      bn.set(B('MST (Kruskal) minimiza a SOMA dos cabos; o RSTP minimiza a distância de CADA switch até a raiz.'), ' Sem o e1, as duas árvores pesam o mesmo (460.000), mas são diferentes: na do RSTP a câmera fica quase na metade da distância do painel.');
      const sub = toggleGroup([['rstp', 'Árvore do RSTP (usa e7)'], ['mst', 'MST de Kruskal (usa e6)']], k => { arvoreComparada = k || arvoreComparada; desenharComparacao(); }, { cls: 'mid', wrapClass: 'topbtns', allowOff: false });
      sub.set(arvoreComparada); extra.append(sub.el);
    } else if (m === 'n1') {
      preparar('RSTP');
      bn.set(B('Na Aula 19 a MST tinha todos os cabos como pontes: qualquer rompimento isolava uma zona.'), ' Com o anel redundante, nenhum rompimento simples isola um switch. Clique numa linha da tabela para romper aquele cabo.');
      extra.append(tabelaN1());
      info.textContent = 'Grafo 2-aresta-conexo: toda aresta pertence a um ciclo';
    }
    desenhar();
  }

  /* ------------------------------------------------------------ comparação RSTP × MST */
  function desenharComparacao() {
    const a = arvoreComparada === 'rstp' ? compRSTP : compMST;
    clear(nums).append(
      bigNum('Peso total da árvore', fmt(peso(comp.grafo, a.ativos)), 'y'),
      bigNum('d(SW-VIS): câmera → painel', fmt(a.custo['SW-VIS']), arvoreComparada === 'rstp' ? '' : 'r'));
    info.textContent = `${arvoreComparada === 'rstp' ? 'RSTP' : 'Kruskal'}: ${a.ativos.join(', ')}`;
  }

  function tabelaN1() {
    const linhas = ENLACES.map(e => {
      const vivos = new Set(ENLACES.map(x => x.id)); vivos.delete(e.id);
      const r = montarRede(new Set(rede.switchesOk), vivos), t = executarRSTP(r);
      return { id: e.id, desc: `${e.a} — ${e.b}`, bloq: t.bloqueados.join(', ') || '—', d: t.custo['SW-VIS'], g: gargaloMbps(r, t, 'SW-VIS') };
    });
    return h('table', { class: 't' },
      h('thead', {}, h('tr', {}, ...['Cabo rompido', 'Bloqueados', 'd(SW-VIS)', 'Gargalo câmera'].map(x => h('th', {}, x)))),
      h('tbody', {}, ...linhas.map(l => h('tr', { style: { cursor: 'pointer' }, onClick: () => { rede.restaurar(false); rede.alternarEnlace(l.id); } },
        h('td', {}, B(l.id), ' ', l.desc), h('td', {}, l.bloq), h('td', { style: { textAlign: 'right' } }, fmt(l.d)), h('td', { style: { textAlign: 'right' } }, `${l.g} Mbps`)))));
  }

  /* ------------------------------------------------------------ desenho ao vivo */
  function desenhar() {
    if (modo === 'mst') {
      const a = arvoreComparada === 'rstp' ? compRSTP : compMST;
      desenharComparacao();
      view.render(comp, { destaque: new Set(a.ativos), arvore: a, mostrarPapeis: false });
      eventos.replaceChildren(B('Contraexemplo mínimo: '), 'raiz R, cabos R–A = 2, A–B = 2, R–B = 3. MST = {R–A, A–B} (peso 4, d(B) = 4); RSTP = {R–A, R–B} (peso 5, d(B) = 3).');
      return;
    }
    view.render(rede);
    const p = app.plant, alc = rede.alcancaveis(), cam = alc.has('SW-VIS');
    const raiz = rede.protocolo === 'NENHUM' ? '— sem STP' : (rede.switchesOk.has('SW-CORE') ? 'SW-CORE' : (rede.arvore.raizDe['SW-VIS'] || '—'));
    const estado = rede.tempestade() ? `TEMPESTADE ~${rede.copias.toExponential(0)}` : rede.transicao ? `RECONVERGINDO ${rede.transicao.restante.toFixed(rede.transicao.total < 1 ? 2 : 1)} s` : 'CONVERGIDA';
    let caminho = 'SEM ROTA', gargalo = '—';
    if (cam && !rede.transicao && rede.protocolo !== 'NENHUM' && rede.arvore.raizDe['SW-VIS'] === 'SW-CORE') {
      caminho = caminhoAteRaiz(rede.grafo, rede.arvore, 'SW-VIS').map(e => e.id).join(' → ');
      gargalo = `${gargaloMbps(rede.grafo, rede.arvore, 'SW-VIS')} Mbps`;
    } else if (cam) caminho = 'rota antiga';
    const linhaOk = p.state === 'OPERANDO';
    clear(nums).append(
      bigNum('Root Bridge', raiz, ''),
      bigNum('Estado da rede', estado, rede.tempestade() ? 'r' : rede.transicao ? 'y' : ''),
      bigNum('Câmera → CLP', caminho, cam ? '' : 'r'),
      bigNum('Gargalo da câmera', gargalo, gargalo.startsWith('100 ') ? 'y' : ''),
      bigNum('Sem câmera', `${rede.tempoSemCamera.toFixed(2)} s`, rede.tempoSemCamera > TIMEOUT_CLP ? 'r' : rede.tempoSemCamera > 0 ? 'y' : ''),
      bigNum('Linha (c_PERM)', linhaOk ? 'OPERANDO' : p.state, linhaOk ? '' : 'r'),
      bigNum('Grãos não classificados', `${fmt(Math.round(paradaS * Q_KGH / 3600))} kg`, paradaS > 0 ? 'r' : ''));
    rearmar.disabled = !(p.state === 'TRIP' || p.state === 'PARADO') || redeDerrubou;
    eventos.replaceChildren(B('Eventos da rede'), ...rede.eventos.flatMap(t => [h('br'), '• ' + t]));
  }

  /* ------------------------------------------------------------ acoplamento com o CLP da planta */
  function passo(dt) {
    if (modo === 'mst') return;
    const perdeu = rede.passo(dt);
    if (perdeu !== redeDerrubou) {
      redeDerrubou = perdeu;
      app.plant.setFault('ksa401', perdeu);
      app.plant.note(perdeu ? `Rede: câmera sem rota até o CLP por mais de ${TIMEOUT_CLP} s → p_KSA401 = 0` : 'Rede: comunicação com a câmera restabelecida');
    }
    if (app.plant.state !== 'OPERANDO') paradaS += dt;
  }

  aplicar('normal');
  return {
    el,
    setMode: m => aplicar(m),
    onShow() { desenhar(); },
    onHide() { if (redeDerrubou) { redeDerrubou = false; app.plant.setFault('ksa401', false); } },
    passo,
    update() { desenhar(); },
  };
}
