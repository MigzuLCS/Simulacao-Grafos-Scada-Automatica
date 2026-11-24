/** mst.js — Aula 19: rede de cabeamento (11 nós, 19 trechos de eletrocalha) e os algoritmos de Kruskal e Prim passo a passo.
 *  Dados do arquivo "19 - Arvore Geradora Minima (Kruskal e Prim).md" do repositório do grupo. Sem DOM: testável no Node. */

/** Nós de automação (Seção 4.1) com posição no desenho (1200 × 520). */
export const NOS = [
  { id: 'CLP-01_Painel', curto: 'CLP-01', x: 420, y: 70 },
  { id: 'SEG-901_Emergencia', curto: 'SEG-901', x: 110, y: 70 },
  { id: 'FN-101_Funil', curto: 'FN-101', x: 90, y: 260 },
  { id: 'ALIM-101_Calha', curto: 'ALIM-101', x: 260, y: 410 },
  { id: 'EST-201_Esteira', curto: 'EST-201', x: 420, y: 250 },
  { id: 'BAL-301_Balanca', curto: 'BAL-301', x: 590, y: 420 },
  { id: 'VIS-401_Visao', curto: 'VIS-401', x: 700, y: 240 },
  { id: 'EJE-602_EstacaoB', curto: 'EJE-602', x: 880, y: 420 },
  { id: 'EJE-603_EstacaoC', curto: 'EJE-603', x: 1110, y: 330 },
  { id: 'COMP-601_Pneumatica', curto: 'COMP-601', x: 1000, y: 70 },
  { id: 'SILOS-700_Coleta', curto: 'SILOS-700', x: 960, y: 485 },
];

/** Trechos viáveis de eletrocalha (Seção 4.2), comprimento em metros. */
export const TRECHOS = [
  ['CLP-01_Painel', 'SEG-901_Emergencia', 3.5], ['CLP-01_Painel', 'FN-101_Funil', 8.2], ['CLP-01_Painel', 'EST-201_Esteira', 6.4],
  ['CLP-01_Painel', 'VIS-401_Visao', 9.8], ['CLP-01_Painel', 'COMP-601_Pneumatica', 7.1],
  ['SEG-901_Emergencia', 'FN-101_Funil', 5.6], ['SEG-901_Emergencia', 'ALIM-101_Calha', 6.9],
  ['FN-101_Funil', 'ALIM-101_Calha', 2.4], ['ALIM-101_Calha', 'EST-201_Esteira', 3.1], ['EST-201_Esteira', 'BAL-301_Balanca', 3.8],
  ['BAL-301_Balanca', 'VIS-401_Visao', 4.2], ['BAL-301_Balanca', 'COMP-601_Pneumatica', 7.5],
  ['VIS-401_Visao', 'EJE-602_EstacaoB', 3.9], ['EJE-602_EstacaoB', 'EJE-603_EstacaoC', 2.1],
  ['EJE-602_EstacaoB', 'COMP-601_Pneumatica', 4.7], ['EJE-602_EstacaoB', 'SILOS-700_Coleta', 6.2],
  ['EJE-603_EstacaoC', 'COMP-601_Pneumatica', 4.3], ['EJE-603_EstacaoC', 'SILOS-700_Coleta', 4.9], ['COMP-601_Pneumatica', 'SILOS-700_Coleta', 5.8],
].map(([a, b, m], i) => ({ id: 't' + (i + 1), a, b, m }));

export const RAIZ_PRIM = 'CLP-01_Painel';
const r1 = x => Math.round(x * 10) / 10;
export const total = ids => r1(ids.reduce((s, id) => s + TRECHOS.find(t => t.id === id).m, 0));

/** Kruskal: passos na ordem crescente de comprimento. Cada passo: {trecho, aceito, acumulado}. */
export function kruskalPassos(trechos = TRECHOS, nos = NOS.map(n => n.id)) {
  const pai = Object.fromEntries(nos.map(n => [n, n]));
  const achar = x => { while (pai[x] !== x) { pai[x] = pai[pai[x]]; x = pai[x]; } return x; };
  const passos = []; let acc = 0, aceitos = 0;
  for (const t of [...trechos].sort((x, y) => x.m - y.m)) {
    if (aceitos === nos.length - 1) break;
    const ra = achar(t.a), rb = achar(t.b), aceito = ra !== rb;
    if (aceito) { pai[ra] = rb; acc = r1(acc + t.m); aceitos++; }
    passos.push({ trecho: t, aceito, acumulado: acc });
  }
  return passos;
}

/** Prim a partir do painel: cada passo adiciona o trecho mais curto da fronteira. */
export function primPassos(trechos = TRECHOS, nos = NOS.map(n => n.id), raiz = RAIZ_PRIM) {
  const dentro = new Set([raiz]), passos = []; let acc = 0;
  while (dentro.size < nos.length) {
    const fronteira = trechos.filter(t => dentro.has(t.a) !== dentro.has(t.b));
    if (!fronteira.length) break;
    const t = fronteira.reduce((x, y) => (y.m < x.m ? y : x));
    const novo = dentro.has(t.a) ? t.b : t.a;
    dentro.add(novo); acc = r1(acc + t.m);
    passos.push({ trecho: t, novo, acumulado: acc });
  }
  return passos;
}

/** Componentes conexas usando só os trechos `ids`. */
export function componentes(ids, nos = NOS.map(n => n.id)) {
  const adj = Object.fromEntries(nos.map(n => [n, []]));
  for (const id of ids) { const t = TRECHOS.find(x => x.id === id); adj[t.a].push(t.b); adj[t.b].push(t.a); }
  const comp = {}; let k = 0;
  for (const n of nos) {
    if (comp[n] !== undefined) continue;
    const pilha = [n]; comp[n] = k;
    while (pilha.length) { const u = pilha.pop(); for (const v of adj[u]) if (comp[v] === undefined) { comp[v] = k; pilha.push(v); } }
    k++;
  }
  return comp;
}

/** Rompimento de um trecho da MST: quem fica isolado do painel e qual trecho mais curto religa (segunda melhor árvore). */
export function rompimento(mstIds, idRompido) {
  const resto = mstIds.filter(id => id !== idRompido), comp = componentes(resto);
  const isolados = NOS.map(n => n.id).filter(n => comp[n] !== comp[RAIZ_PRIM]);
  const religa = TRECHOS.filter(t => t.id !== idRompido && !mstIds.includes(t.id) && comp[t.a] !== comp[t.b]).sort((x, y) => x.m - y.m)[0];
  return { isolados, religa, nova: [...resto, religa.id], comprimento: total([...resto, religa.id]) };
}
