/** binarias.js — Aula 21: árvores binárias de decisão (segurança e classificação do grão) e árvore AVL do historiador.
 *  Regras do notebook "Aula 21 - Árvores Binárias - code.ipynb" do repositório do grupo. Sem DOM: testável no Node. */

/**
 * Árvore de decisão de segurança (SIS), em ordem de gravidade. Cada pergunta "sim" leva a uma folha;
 * "não" leva à próxima pergunta. Comandos = [c_EST, c_ALIM, c_FY, a_ALARM].
 */
export const SIS = {
  perguntas: [
    { chave: 'p_EMERG', texto: 'Emergência apertada? (XA-901)', sim: { estado: 'TRIP DE EMERGÊNCIA', cmd: [0, 0, 0, 1] } },
    { chave: 'p_PAL601', texto: 'Ar comprimido baixo? (PAL-601)', sim: { estado: 'TRIP: AR BAIXO', cmd: [0, 0, 0, 1] } },
    { chave: 'p_JI201', texto: 'Motor sobrecarregado? (JI-201)', sim: { estado: 'TRIP: MOTOR', cmd: [0, 0, 0, 1] } },
    { chave: 'p_SILO_CHEIO', texto: 'Algum silo cheio?', sim: { estado: 'PARADA: SILO CHEIO', cmd: [0, 0, 0, 1] } },
    { chave: 'p_FALHA_CAM', texto: 'Câmera com falha? (KSA-401)', sim: { estado: 'STANDBY: SEM VISÃO', cmd: [1, 0, 0, 1] } },
  ],
  fim: { estado: 'OPERAÇÃO NORMAL', cmd: [1, 1, 1, 0] },
};

/** Árvore de classificação do grão no túnel VIS-401 (função classificar_grao_bdt do notebook). */
export const GRAO = {
  perguntas: [
    { chave: 'praga', texto: 'Tem praga ou impureza?', teste: g => g.praga || g.impureza, sim: { estado: 'C', motivo: 'praga/impureza' } },
    { chave: 'dano', texto: 'Tem dano grave (trinca)?', teste: g => g.dano, sim: { estado: 'C', motivo: 'dano' } },
    { chave: 'tamanho', texto: 'Comprimento fora de 4,4–7,5 mm?', teste: g => g.comprimento < 4.4 || g.comprimento > 7.5, sim: { estado: 'C', motivo: 'tamanho fora' } },
    { chave: 'secundario', texto: 'Cor secundária, curto (< 6 mm) ou fino (< 1,8 mm)?', teste: g => g.corSecundaria || g.comprimento < 6.0 || g.largura < 1.8, sim: { estado: 'B', motivo: 'padrão secundário' } },
  ],
  fim: { estado: 'A', motivo: 'grão perfeito' },
};

/** Percorre uma árvore "em espinha": devolve o índice da folha alcançada e quantas perguntas foram feitas. */
export function decidir(arvore, entrada, teste = (p, e) => (p.teste ? p.teste(e) : !!e[p.chave])) {
  for (let i = 0; i < arvore.perguntas.length; i++) {
    const p = arvore.perguntas[i];
    if (teste(p, entrada)) return { folha: p.sim, nivel: i, perguntas: i + 1 };
  }
  return { folha: arvore.fim, nivel: arvore.perguntas.length, perguntas: arvore.perguntas.length };
}

/** Gerador pseudoaleatório reprodutível (mulberry32). */
export function sorteador(semente = 1) {
  let a = semente >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Sorteia um grão com características plausíveis: ~75 % A, ~15 % B, ~10 % C, como a planta nominal. */
export function sortearGrao(rnd) {
  const r = rnd();
  const comprimento = r < 0.03 ? (rnd() < 0.5 ? 3.6 + rnd() * 0.7 : 7.6 + rnd() * 0.6)   // fora da faixa → C
    : r < 0.10 ? 5.0 + rnd() * 0.9                                                       // curto → B
    : 6.1 + rnd() * 1.3;
  return {
    praga: rnd() < 0.02, impureza: rnd() < 0.02, dano: rnd() < 0.03,
    comprimento: Math.round(comprimento * 10) / 10,
    largura: Math.round((rnd() < 0.04 ? 1.6 + rnd() * 0.19 : 1.85 + rnd() * 0.45) * 100) / 100,
    corSecundaria: rnd() < 0.04,
  };
}

/* ------------------------------------------------------------ árvore de busca comum × AVL */

const alt = n => (n ? n.altura : 0);
const atualiza = n => { n.altura = 1 + Math.max(alt(n.esq), alt(n.dir)); return n; };
const fb = n => alt(n.dir) - alt(n.esq);   // fator de balanceamento (convenção do notebook)

/** Insere numa árvore binária de busca comum (sem balancear). Iterativo: aguenta 2.500 chaves em ordem. */
export function inserirComum(raiz, chave) {
  const novo = { chave, esq: null, dir: null, altura: 1 };
  if (!raiz) return novo;
  let n = raiz;
  for (;;) {
    if (chave < n.chave) { if (!n.esq) { n.esq = novo; break; } n = n.esq; }
    else { if (!n.dir) { n.dir = novo; break; } n = n.dir; }
  }
  return raiz;
}

/** Altura de qualquer árvore (iterativo). */
export function altura(raiz) {
  let h = 0; const pilha = raiz ? [[raiz, 1]] : [];
  while (pilha.length) { const [n, d] = pilha.pop(); h = Math.max(h, d); if (n.esq) pilha.push([n.esq, d + 1]); if (n.dir) pilha.push([n.dir, d + 1]); }
  return h;
}

/** Inserção AVL com as 4 rotações (mesma lógica do notebook). `rot` conta as rotações feitas. */
export function inserirAVL(n, chave, rot = { n: 0 }) {
  if (!n) return { chave, esq: null, dir: null, altura: 1 };
  if (chave < n.chave) n.esq = inserirAVL(n.esq, chave, rot);
  else if (chave > n.chave) n.dir = inserirAVL(n.dir, chave, rot);
  else return n;
  atualiza(n);
  const b = fb(n);
  const girarDir = z => { const y = z.esq; z.esq = y.dir; y.dir = z; atualiza(z); atualiza(y); rot.n++; return y; };
  const girarEsq = z => { const y = z.dir; z.dir = y.esq; y.esq = z; atualiza(z); atualiza(y); rot.n++; return y; };
  if (b < -1 && fb(n.esq) <= 0) return girarDir(n);
  if (b > 1 && fb(n.dir) >= 0) return girarEsq(n);
  if (b < -1 && fb(n.esq) > 0) { n.esq = girarEsq(n.esq); return girarDir(n); }
  if (b > 1 && fb(n.dir) < 0) { n.dir = girarDir(n.dir); return girarEsq(n); }
  return n;
}

/** Quantos nós a busca visita até achar a chave. */
export function passosBusca(raiz, chave) {
  let n = raiz, k = 0;
  while (n) { k++; if (chave === n.chave) return k; n = chave < n.chave ? n.esq : n.dir; }
  return k;
}

/** Todos os nós com |fator de balanceamento| ≤ 1? */
export function balanceada(raiz) {
  const pilha = raiz ? [raiz] : [];
  while (pilha.length) { const n = pilha.pop(); if (Math.abs(altura(n.dir) - altura(n.esq)) > 1) return false; if (n.esq) pilha.push(n.esq); if (n.dir) pilha.push(n.dir); }
  return true;
}
