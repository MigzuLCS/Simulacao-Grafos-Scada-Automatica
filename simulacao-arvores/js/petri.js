/** petri.js — Aula 24: rede de Petri do ciclo da estação de ejeção C (EJE-603) e do Silo C (LIT-703),
 *  árvore de atingibilidade / cobertura (Karp-Miller, com ω) e verificação de propriedades. Sem DOM: testável no Node.
 *  Modelo das orientações do grupo para a Aula 24 (tags iguais às do CLP: p_POS603, c_FY603, ZSH-601, p_FALHA_EJETOR). */

export const OMEGA = Infinity;

/** Lugares em ordem fixa (índice = posição no vetor de marcação). */
export const LUGARES = [
  { id: 'p1', nome: 'Ejetor pronto', tag: 'ZSH-601 = 0' },
  { id: 'p2', nome: 'Grão C na posição', tag: 'p_POS603' },
  { id: 'p3', nome: 'Pistão avançando', tag: 'c_FY603' },
  { id: 'p4', nome: 'Falha do ejetor', tag: 'p_FALHA_EJETOR' },
  { id: 'p5', nome: 'Lotes no Silo C', tag: 'LIT-703' },
  { id: 'p6', nome: 'Espaço livre no silo', tag: 'capacidade' },
];

/** Transições: pré e pós como {índiceDoLugar: peso}. `comCap` = arcos que só existem com o lugar complementar p6. */
const T = [
  { id: 't1', nome: 'Grão C chega', pre: { 0: 1 }, pos: { 1: 1 } },
  { id: 't2', nome: 'Dispara FY-603', pre: { 1: 1 }, pos: { 2: 1 }, preCap: { 5: 1 } },
  { id: 't3', nome: 'ZSH-601 confirma', pre: { 2: 1 }, pos: { 0: 1, 4: 1 } },
  { id: 't4', nome: 'Tempo esgotado', pre: { 2: 1 }, pos: { 3: 1 }, posCap: { 5: 1 } },
  { id: 't5', nome: 'Reset manual', pre: { 3: 1 }, pos: { 0: 1 } },
  { id: 't6', nome: 'Descarregar silo', pre: { 4: 1 }, pos: { 5: 1 }, soCap: true },
];

/**
 * Monta uma das três redes da aula.
 *  'A' = só o ciclo do ejetor (p1..p4) · 'B' = + Silo C sem descarga (p1..p5) · 'C' = + espaço livre p6 com capacidade K e descarga t6.
 */
export function rede(parte = 'A', K = 3) {
  const nL = { A: 4, B: 5, C: 6 }[parte], cap = parte === 'C';
  const transicoes = T.filter(t => !t.soCap || cap).map(t => {
    const pre = { ...t.pre, ...(cap ? t.preCap : {}) }, pos = { ...t.pos, ...(cap ? t.posCap : {}) };
    for (const m of [pre, pos]) for (const k of Object.keys(m)) if (+k >= nL) delete m[k];   // tira arcos de lugares que não existem
    return { id: t.id, nome: t.nome, pre, pos };
  });
  const M0 = [1, 0, 0, 0, 0, K].slice(0, nL);
  return { parte, K, lugares: LUGARES.slice(0, nL), transicoes, M0 };
}

export const habilitada = (t, M) => Object.entries(t.pre).every(([i, w]) => M[i] >= w);
export function disparar(t, M) {
  const N = [...M];
  for (const [i, w] of Object.entries(t.pre)) N[i] = N[i] === OMEGA ? OMEGA : N[i] - w;
  for (const [i, w] of Object.entries(t.pos)) N[i] = N[i] === OMEGA ? OMEGA : N[i] + w;
  return N;
}
export const chave = M => M.map(x => (x === OMEGA ? 'ω' : x)).join(',');
export const texto = M => '[' + M.map(x => (x === OMEGA ? 'ω' : x)).join(', ') + ']';

/**
 * Árvore de cobertura (Karp-Miller). Sem ω, é a própria árvore de atingibilidade.
 * Um nó repetido (marcação já vista antes na árvore) vira folha "duplicada" e não é expandido.
 * @returns {{nos:{id:number,M:number[],pai:number|null,t:string|null,dup:boolean,morto:boolean,filhos:number[]}[]}}
 */
export function arvoreCobertura(net, limite = 200) {
  const nos = [{ id: 0, M: [...net.M0], pai: null, t: null, dup: false, morto: false, filhos: [] }];
  const vistos = new Set([chave(net.M0)]), fila = [0];
  while (fila.length && nos.length < limite) {
    const n = nos[fila.shift()];
    const hab = net.transicoes.filter(t => habilitada(t, n.M));
    if (!hab.length) { n.morto = true; continue; }
    for (const t of hab) {
      let M = disparar(t, n.M);
      for (let a = n; a; a = a.pai === null ? null : nos[a.pai]) {            // ancestral coberto → ω onde cresceu
        if (a.M.every((x, i) => x <= M[i]) && a.M.some((x, i) => x < M[i])) M = M.map((x, i) => (x > a.M[i] ? OMEGA : x));
      }
      const k = chave(M), dup = vistos.has(k);
      const novo = { id: nos.length, M, pai: n.id, t: t.id, dup, morto: false, filhos: [] };
      nos.push(novo); n.filhos.push(novo.id);
      if (!dup) { vistos.add(k); fila.push(novo.id); }
    }
  }
  return { nos };
}

/** Marcações distintas da árvore, deadlocks, presença de ω e limite (máximo de fichas por lugar). */
export function propriedades(net) {
  const { nos } = arvoreCobertura(net);
  const distintas = new Map();
  for (const n of nos) distintas.set(chave(n.M), n.M);
  const lista = [...distintas.values()];
  return {
    arvore: nos, marcacoes: lista,
    temOmega: lista.some(M => M.includes(OMEGA)),
    deadlocks: lista.filter(M => !net.transicoes.some(t => habilitada(t, M))),
    limite: Math.max(...lista.flat()),
  };
}

/** Invariantes da Parte C: ejetor em exatamente um estado; massa do silo (inclui o grão em trânsito no pistão) = K. */
export const invarianteEjetor = M => M[0] + M[1] + M[2] + M[3];
export const invarianteSilo = M => M[2] + M[4] + M[5];
