/** rede.js — estado vivo da rede Ethernet da planta (Aula 23): falhas físicas, reconvergência STP/RSTP no tempo simulado,
 *  tempestade de broadcast sem STP e alcance CLP ↔ câmera. Sem DOM: testável no Node. */
import { SWITCHES, ENLACES, montarRede, executarRSTP, componentes } from './rstp.js';

/** Tempo para a árvore voltar a encaminhar depois que um enlace ATIVO cai (Aula 23, Seção 7). */
export const TEMPO_CONVERGENCIA = { RSTP: 0.2, STP: 30 };
/** Timeout de comunicação do CLP com a câmera (proposta da Aula 23). */
export const TIMEOUT_CLP = 0.5;

export class Rede {
  constructor() {
    this.protocolo = 'RSTP';                 // 'RSTP' | 'STP' | 'NENHUM'
    this.restaurar(false);
  }

  /** Volta todos os cabos e switches ao normal, já convergida. */
  restaurar(registrar = true) {
    this.enlacesOk = new Set(ENLACES.map(e => e.id));
    this.switchesOk = new Set(SWITCHES.map(s => s.nome));
    this.recalcular();
    this.transicao = null;
    this.tempoSemCamera = 0;
    this.copias = 0;
    if (!this.eventos) this.eventos = [];
    if (registrar) this.evento('Rede restaurada: todos os cabos e switches em operação.');
  }

  recalcular() {
    this.grafo = montarRede(this.switchesOk, this.enlacesOk);
    this.arvore = executarRSTP(this.grafo);
    this.encaminhando = this.protocolo === 'NENHUM' ? new Set(this.grafo.enlaces.map(e => e.id)) : new Set(this.arvore.ativos);
  }

  evento(texto) { this.eventos.unshift(texto); if (this.eventos.length > 8) this.eventos.pop(); }

  definirProtocolo(p) {
    if (p === this.protocolo) return;
    this.protocolo = p; this.transicao = null; this.copias = 0;
    this.recalcular();
    this.evento({ RSTP: 'Protocolo: RSTP (IEEE 802.1w).', STP: 'Protocolo: STP clássico (IEEE 802.1D).', NENHUM: 'Protocolo de árvore DESLIGADO: todos os cabos encaminham.' }[p]);
  }

  /** Mudança física (cabo ou switch). Se um enlace que encaminhava caiu, abre um período de reconvergência. */
  mudancaFisica(descricao) {
    const antes = this.encaminhando;
    this.grafo = montarRede(this.switchesOk, this.enlacesOk);
    const nova = executarRSTP(this.grafo), vivos = new Set(this.grafo.enlaces.map(e => e.id));
    if (this.protocolo === 'NENHUM') {
      this.arvore = nova; this.encaminhando = vivos; this.transicao = null;
      this.evento(`${descricao}. Sem STP: ${vivos.size} cabos encaminham.`);
      return;
    }
    const perdeuAtivo = [...antes].some(id => !vivos.has(id));
    if (perdeuAtivo) {
      const total = TEMPO_CONVERGENCIA[this.protocolo];
      this.transicao = { restante: total, total, nova };
      this.encaminhando = new Set([...antes].filter(id => vivos.has(id)));   // árvore antiga, sem o cabo perdido
      this.evento(`${descricao}: caminho ativo cortado. ${this.protocolo} reconvergindo (${total} s).`);
    } else {
      this.arvore = nova; this.encaminhando = new Set(nova.ativos); this.transicao = null;
      this.evento(`${descricao}. Árvore recalculada sem interrupção.`);
    }
  }

  alternarEnlace(id) {
    const rompe = this.enlacesOk.has(id);
    rompe ? this.enlacesOk.delete(id) : this.enlacesOk.add(id);
    this.mudancaFisica(rompe ? `Cabo ${id} rompido` : `Cabo ${id} reparado`);
  }

  alternarSwitch(nome) {
    const cai = this.switchesOk.has(nome);
    cai ? this.switchesOk.delete(nome) : this.switchesOk.add(nome);
    this.mudancaFisica(cai ? `Switch ${nome} fora de operação` : `Switch ${nome} de volta`);
  }

  /** Sem STP e com ciclo entre os cabos que encaminham ⇒ tempestade de broadcast. */
  tempestade() {
    if (this.protocolo !== 'NENHUM') return false;
    const c = new Set(Object.values(componentes(this.grafo, [...this.encaminhando]))).size;
    return this.encaminhando.size > this.grafo.switches.length - c;
  }

  /** Switches com caminho até o SW-CORE (onde ficam o CLP e o SCADA) pelos cabos que encaminham. */
  alcancaveis() {
    if (!this.switchesOk.has('SW-CORE') || this.tempestade()) return new Set();
    const comp = componentes(this.grafo, [...this.encaminhando]);
    return new Set(Object.keys(comp).filter(v => comp[v] === comp['SW-CORE']));
  }

  cameraAlcancavel() { return this.alcancaveis().has('SW-VIS'); }

  /** Avança dt segundos de tempo simulado. Retorna true se o CLP deve considerar a câmera perdida (p_KSA401 = 0). */
  passo(dt) {
    if (this.transicao) {
      this.transicao.restante -= dt;
      if (this.transicao.restante <= 0) {
        this.arvore = this.transicao.nova; this.encaminhando = new Set(this.arvore.ativos); this.transicao = null;
        this.evento(`${this.protocolo} convergiu: bloqueados ${this.arvore.bloqueados.join(', ') || 'nenhum'}.`);
      }
    }
    this.copias = this.tempestade() ? Math.min(1e15, Math.max(2, this.copias * Math.pow(1.6, dt * 20))) : 0;
    this.tempoSemCamera = this.cameraAlcancavel() ? 0 : this.tempoSemCamera + dt;
    return this.tempoSemCamera > TIMEOUT_CLP;
  }
}
