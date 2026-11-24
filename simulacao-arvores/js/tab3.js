/** Aba 3 — Integrante 3: Protocolo de Árvore Geradora STP / RSTP na rede Ethernet da planta (Aula 23). */
import { h, clear } from '../../simulacao-grafos/js/dom.js';
import { bigNum, toggleGroup, actionBtn, banner } from '../../simulacao-grafos/js/widgets.js';
import { Rede, TIMEOUT_CLP } from './rede.js';
import { RedeView } from './redeview.js';
import { kruskal, peso, distanciasNaArvore } from './rstp.js';

const B = t => h('b', {}, t);
const fmt = x => x.toLocaleString('pt-BR');

/** Texto de cada cenário: faixa (a ideia em uma frase) + "em bom português" (o que falar). */
const CENARIOS = {
  normal: {
    botao: '1 · A rede normal: 2 cabos ficam de reserva',
    faixa: [B('Cabos em anel dão segurança, mas criam voltas;'), ' numa volta a mensagem fica girando para sempre. O protocolo escolhe uma árvore (sem voltas) e deixa os outros cabos de reserva.'],
    fala: ['A rede tem 6 switches e 7 cabos. Uma árvore com 6 pontos precisa de só 5 cabos, então sobram 2.',
      'O switch do painel (SW-CORE) vira a raiz. Os 2 cabos que fechariam voltas ficam de reserva (vermelho tracejado).'],
  },
  rstp: {
    botao: '2 · O cabo da câmera rompe (RSTP)',
    faixa: [B('RSTP: o cabo reserva assume em 0,2 segundo.'), ' A câmera continua falando com o CLP e a linha não para.'],
    fala: ['O cabo de reserva entre o painel e os silos passa a ser usado: a câmera agora chega ao painel pelo lado dos silos.',
      `0,2 s é menor que o tempo de tolerância do CLP (${String(TIMEOUT_CLP).replace('.', ',')} s), então a produção segue. Só fica um alarme para trocar o cabo.`],
  },
  stp: {
    botao: '3 · O mesmo rompimento com o STP antigo',
    faixa: [B('STP antigo: a rede leva 30 segundos para se refazer.'), ' Nesse tempo o CLP perde a câmera e desliga a linha por segurança.'],
    fala: ['É a mesma falha do cenário 2; só muda o protocolo.',
      'Sem a câmera não dá para classificar o arroz, então o permissivo c_PERM desarma a linha. Depois que a rede volta, o operador precisa religar.'],
  },
  semstp: {
    botao: '4 · Sem protocolo nenhum',
    faixa: [B('Sem árvore, todos os cabos ficam ligados e há voltas.'), ' Cada mensagem é copiada sem parar (tempestade de broadcast) e a rede trava.'],
    fala: ['Ethernet não tem contador de saltos: uma mensagem numa volta nunca morre.',
      'Em poucos segundos são milhões de cópias, a rede satura e a linha para. É por isso que a árvore é obrigatória.'],
  },
  mst: {
    botao: '5 · Por que não usar a árvore da Aula 19 (MST)?',
    faixa: [B('A MST economiza cabo; a árvore do RSTP encurta o caminho até o painel.'), ' Sem o cabo da câmera, as duas pesam o mesmo, mas são árvores diferentes.'],
    fala: ['A MST (Kruskal) minimiza a SOMA dos cabos. O RSTP minimiza a distância de CADA switch até a raiz, como o Dijkstra.',
      'Com o mesmo peso total, na árvore do RSTP a câmera fica quase na metade da distância do painel.'],
  },
};

export function createTab3(app) {
  const rede = new Rede();
  let modo = 'normal', redeDerrubou = false, detalhes = false, arvoreComparada = 'rstp';
  const view = new RedeView({
    onEnlace: id => { if (modo !== 'mst') rede.alternarEnlace(id); },
    onSwitch: n => { if (modo !== 'mst') rede.alternarSwitch(n); },
  });

  // Cenário 5: rede fixa sem o cabo da câmera, já convergida, e a MST de Kruskal dela
  const comp = new Rede(); comp.alternarEnlace('e1'); comp.passo(1);
  const mstIds = kruskal(comp.grafo);
  const compMST = { ativos: mstIds, custo: distanciasNaArvore(comp.grafo, mstIds, 'SW-CORE'), raizDe: { 'SW-CORE': 'SW-CORE' }, papeis: {} };

  const bn = banner();
  const group = toggleGroup(Object.entries(CENARIOS).map(([k, c]) => [k, c.botao]), m => aplicar(m || modo), { allowOff: false });
  const nums = h('div', { class: 'bignums' }), extra = h('div', { class: 'col' });
  const fala = h('div', { class: 'card plain' });
  const rearmar = actionBtn('↻ Religar a linha (operador)', () => { app.plant.start(); }, 'green');
  const chk = h('input', { type: 'checkbox', onChange: ev => { detalhes = ev.target.checked; desenhar(); } });

  const el = h('div', {}, bn.el, h('div', { class: 'split' },
    h('div', { class: 'col' }, h('div', { class: 'viewport big' }, view.svg),
      h('div', { class: 'card', style: { fontSize: '15px' } },
        B('Verde'), ' = cabo em uso · ', B('vermelho tracejado'), ' = cabo de reserva · ', B('cinza'), ' = cabo rompido. Clique num cabo para romper ou consertar.')),
    h('div', { class: 'col' }, group.el, nums, extra, fala,
      h('label', { class: 'chk card', style: { fontSize: '14px' } }, chk, h('span', {}, ' Mostrar detalhes técnicos (portas RP/DP/AP, custos e velocidades)')))));

  function preparar(protocolo) {
    rede.definirProtocolo(protocolo); rede.restaurar(false);
    if (app.plant.faults.ksa401) app.plant.setFault('ksa401', false);
    if (app.plant.state !== 'OPERANDO') app.plant.quickStart();
    redeDerrubou = false;
  }

  function aplicar(m) {
    modo = m; group.set(m); clear(extra);
    const c = CENARIOS[m];
    bn.set(...c.faixa);
    fala.replaceChildren(h('div', { class: 'cardtitle' }, 'Em bom português'), ...c.fala.map(t => h('div', {}, t)));
    if (m === 'normal') preparar('RSTP');
    else if (m === 'rstp') { preparar('RSTP'); rede.alternarEnlace('e1'); }
    else if (m === 'stp') { preparar('STP'); rede.alternarEnlace('e1'); extra.append(rearmar); }
    else if (m === 'semstp') { preparar('NENHUM'); extra.append(rearmar); }
    else if (m === 'mst') {
      preparar('RSTP');
      const sub = toggleGroup([['rstp', 'Árvore do RSTP'], ['mst', 'MST da Aula 19']], k => { arvoreComparada = k || arvoreComparada; desenhar(); }, { cls: 'mid', wrapClass: 'topbtns', allowOff: false });
      sub.set(arvoreComparada); extra.append(sub.el);
    }
    desenhar();
  }

  function desenhar() {
    if (modo === 'mst') {
      const a = arvoreComparada === 'rstp' ? comp.arvore : compMST;
      view.render(comp, { destaque: new Set(a.ativos), arvore: a, mostrarPapeis: false, detalhes });
      clear(nums).append(
        bigNum('Cabo total (soma dos custos)', fmt(peso(comp.grafo, a.ativos)), 'y'),
        bigNum('Distância câmera → painel', fmt(a.custo['SW-VIS']), arvoreComparada === 'rstp' ? '' : 'r'));
      return;
    }
    view.render(rede, { detalhes });
    const p = app.plant, cam = rede.cameraAlcancavel(), rodando = p.state === 'OPERANDO';
    const estadoRede = rede.tempestade() ? 'TRAVADA' : rede.transicao ? `SE REFAZENDO ${rede.transicao.restante.toFixed(rede.transicao.total < 1 ? 1 : 0)} s` : 'OK';
    clear(nums).append(
      bigNum('Rede', estadoRede, rede.tempestade() ? 'r' : rede.transicao ? 'y' : ''),
      bigNum('Câmera ↔ CLP', cam ? 'CONECTADA' : 'SEM CONEXÃO', cam ? '' : 'r'),
      bigNum('Linha de produção', rodando ? 'RODANDO' : p.state === 'PARTINDO' ? 'LIGANDO' : 'PARADA', rodando ? '' : p.state === 'PARTINDO' ? 'y' : 'r'));
    rearmar.disabled = !(p.state === 'TRIP' || p.state === 'PARADO') || redeDerrubou;
  }

  /* acoplamento com o CLP da planta: câmera sem rota por mais que o timeout → p_KSA401 = 0 → c_PERM desarma */
  function passo(dt) {
    if (modo === 'mst') return;
    const perdeu = rede.passo(dt);
    if (perdeu !== redeDerrubou) {
      redeDerrubou = perdeu;
      app.plant.setFault('ksa401', perdeu);
      app.plant.note(perdeu ? `Rede: câmera sem rota até o CLP por mais de ${TIMEOUT_CLP} s → p_KSA401 = 0` : 'Rede: comunicação com a câmera restabelecida');
    }
  }

  aplicar('normal');
  return {
    el,
    setMode: m => { if (CENARIOS[m]) aplicar(m); },
    onShow() { desenhar(); },
    onHide() { if (redeDerrubou) { redeDerrubou = false; app.plant.setFault('ksa401', false); } },
    passo,
    update() { desenhar(); },
  };
}
