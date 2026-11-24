/** rstp.js — porte do notebook da Aula 23: rede de 6 switches da planta, convergência distribuída por troca de BPDUs,
 *  papéis de porta RP / DP / AP e comparação com a MST de Kruskal. Sem DOM: testável no Node. */

export const CUSTO_IEEE = { '10 Gbps': 2000, '1 Gbps': 20000, '100 Mbps': 200000 };
export const BANDA_MBPS = { '10 Gbps': 10000, '1 Gbps': 1000, '100 Mbps': 100 };

/** Switches da planta (Aula 23, Seção 3.1). BID = (prioridade, MAC). */
export const SWITCHES = [
  { nome: 'SW-CORE',  zona: 'Painel central',        equipamentos: 'CLP-01, IHM, SEG-901',      prioridade: 4096,  mac: '00:1A:2B:00:00:01' },
  { nome: 'SW-REC',   zona: 'Recepção e dosagem',    equipamentos: 'FN-101, ALIM-101',          prioridade: 32768, mac: '00:1A:2B:00:00:02' },
  { nome: 'SW-TRANS', zona: 'Transporte e pesagem',  equipamentos: 'EST-201, BAL-301',          prioridade: 32768, mac: '00:1A:2B:00:00:03' },
  { nome: 'SW-VIS',   zona: 'Classificação óptica',  equipamentos: 'VIS-401 (câmera)',          prioridade: 8192,  mac: '00:1A:2B:00:00:04' },
  { nome: 'SW-EJE',   zona: 'Ejeção e pneumática',   equipamentos: 'EJE-602/603, COMP-601', prioridade: 32768, mac: '00:1A:2B:00:00:05' },
  { nome: 'SW-SIL',   zona: 'Silos',                 equipamentos: 'SILOS-700',                 prioridade: 32768, mac: '00:1A:2B:00:00:06' },
];

/** Enlaces físicos (Aula 23, Seção 3.2). */
export const ENLACES = [
  { id: 'e1', a: 'SW-CORE', b: 'SW-VIS',   velocidade: '1 Gbps' },
  { id: 'e2', a: 'SW-VIS',  b: 'SW-TRANS', velocidade: '1 Gbps' },
  { id: 'e3', a: 'SW-VIS',  b: 'SW-EJE',   velocidade: '1 Gbps' },
  { id: 'e4', a: 'SW-EJE',  b: 'SW-SIL',   velocidade: '1 Gbps' },
  { id: 'e5', a: 'SW-CORE', b: 'SW-REC',   velocidade: '100 Mbps' },
  { id: 'e6', a: 'SW-REC',  b: 'SW-TRANS', velocidade: '100 Mbps' },
  { id: 'e7', a: 'SW-SIL',  b: 'SW-CORE',  velocidade: '100 Mbps' },
];

export const custo = (enlace) => CUSTO_IEEE[enlace.velocidade];

/** Comparação lexicográfica de vetores (tuplas) de números/strings. */
export function compararVetor(x, y) {
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] === y[i]) continue;
    if (x[i] === undefined) return -1;
    if (y[i] === undefined) return 1;
    return x[i] < y[i] ? -1 : 1;
  }
  return 0;
}

/**
 * Rede viva: subconjunto de switches e enlaces atualmente em operação.
 * @param {Set<string>} switchesAtivos
 * @param {Set<string>} enlacesAtivos
 */
export function montarRede(switchesAtivos, enlacesAtivos) {
  const switches = SWITCHES.filter(s => switchesAtivos.has(s.nome));
  const enlaces = ENLACES.filter(e => enlacesAtivos.has(e.id) && switchesAtivos.has(e.a) && switchesAtivos.has(e.b));
  const porNome = Object.fromEntries(switches.map(s => [s.nome, s]));
  const vizinhos = Object.fromEntries(switches.map(s => [s.nome, []]));
  for (const e of enlaces) {
    vizinhos[e.a].push({ viz: e.b, enlace: e });
    vizinhos[e.b].push({ viz: e.a, enlace: e });
  }
  return { switches, enlaces, porNome, vizinhos, bid: (v) => [porNome[v].prioridade, porNome[v].mac] };
}

/** Componentes conexas (BFS) considerando apenas os enlaces informados. */
export function componentes(rede, idsEnlaces = null) {
  const usar = idsEnlaces ? new Set(idsEnlaces) : null;
  const comp = {};
  let n = 0;
  for (const s of rede.switches) {
    if (comp[s.nome] !== undefined) continue;
    const fila = [s.nome];
    comp[s.nome] = n;
    while (fila.length) {
      const u = fila.shift();
      for (const { viz, enlace } of rede.vizinhos[u]) {
        if (usar && !usar.has(enlace.id)) continue;
        if (comp[viz] === undefined) { comp[viz] = n; fila.push(viz); }
      }
    }
    n++;
  }
  return comp;
}

/**
 * Convergência do RSTP por rodadas síncronas de BPDUs (Bellman-Ford distribuído).
 * Funciona por componente conexa: cada ilha elege a própria raiz.
 * Vetor de prioridade: [root BID (prio, mac), custo, BID do remetente (prio, mac), id da porta].
 */
export function executarRSTP(rede) {
  const proprio = {};
  for (const s of rede.switches) {
    const b = rede.bid(s.nome);
    proprio[s.nome] = [b[0], b[1], 0, b[0], b[1], ''];
  }
  let melhor = { ...proprio };
  let rodadas = 0;
  for (;;) {
    rodadas++;
    const bpdu = {};
    for (const s of rede.switches) {
      const m = melhor[s.nome];
      const b = rede.bid(s.nome);
      bpdu[s.nome] = [m[0], m[1], m[2], b[0], b[1]];
    }
    const novo = {};
    let mudou = false;
    for (const s of rede.switches) {
      let escolhido = proprio[s.nome];
      for (const { viz, enlace } of rede.vizinhos[s.nome]) {
        const [rp, rm, c, sp, sm] = bpdu[viz];
        const recebido = [rp, rm, c + custo(enlace), sp, sm, enlace.id];
        if (compararVetor(recebido, escolhido) < 0) escolhido = recebido;
      }
      novo[s.nome] = escolhido;
      if (compararVetor(escolhido, melhor[s.nome]) !== 0) mudou = true;
    }
    melhor = novo;
    if (!mudou || rodadas > 50) break;
  }

  const raizDe = {}, custoAteRaiz = {}, portaRaiz = {}, pai = {};
  for (const s of rede.switches) {
    const m = melhor[s.nome];
    raizDe[s.nome] = rede.switches.find(x => x.prioridade === m[0] && x.mac === m[1]).nome;
    custoAteRaiz[s.nome] = m[2];
    portaRaiz[s.nome] = m[5] || null;
    pai[s.nome] = m[5] ? (() => { const e = rede.enlaces.find(x => x.id === m[5]); return e.a === s.nome ? e.b : e.a; })() : null;
  }

  const papeis = {}, estado = {};
  for (const e of rede.enlaces) {
    const va = [custoAteRaiz[e.a], ...rede.bid(e.a)];
    const vb = [custoAteRaiz[e.b], ...rede.bid(e.b)];
    const [designada, outra] = compararVetor(va, vb) < 0 ? [e.a, e.b] : [e.b, e.a];
    papeis[`${e.id}|${designada}`] = 'DP';
    papeis[`${e.id}|${outra}`] = portaRaiz[outra] === e.id ? 'RP' : 'AP';
    estado[e.id] = papeis[`${e.id}|${outra}`] === 'RP' ? 'Forwarding' : 'Discarding';
  }

  const ativos = rede.enlaces.filter(e => estado[e.id] === 'Forwarding').map(e => e.id).sort();
  const bloqueados = rede.enlaces.filter(e => estado[e.id] === 'Discarding').map(e => e.id).sort();
  return { raizDe, custo: custoAteRaiz, portaRaiz, pai, papeis, estado, ativos, bloqueados, rodadas };
}

/** Caminho (lista de enlaces) de um switch até a raiz na árvore convergida. */
export function caminhoAteRaiz(rede, res, origem) {
  const caminho = [];
  let v = origem;
  while (res.pai[v]) {
    caminho.push(rede.enlaces.find(e => e.id === res.portaRaiz[v]));
    v = res.pai[v];
  }
  return caminho;
}

/** Menor banda (Mbps) no caminho até a raiz; null se o switch é a raiz. */
export function gargaloMbps(rede, res, origem) {
  const caminho = caminhoAteRaiz(rede, res, origem);
  return caminho.length ? Math.min(...caminho.map(e => BANDA_MBPS[e.velocidade])) : null;
}

/** Número ciclomático |E| - |V| + c (c = número de componentes). */
export function numeroCiclomatico(rede) {
  const c = new Set(Object.values(componentes(rede))).size;
  return rede.enlaces.length - rede.switches.length + c;
}

/** MST por Kruskal com Union-Find (Aula 19). Empates mantêm a ordem e1..e7. Retorna os ids ordenados. */
export function kruskal(rede) {
  const pai = Object.fromEntries(rede.switches.map(s => [s.nome, s.nome]));
  const achar = x => { while (pai[x] !== x) { pai[x] = pai[pai[x]]; x = pai[x]; } return x; };
  const arvore = [];
  for (const e of [...rede.enlaces].sort((x, y) => custo(x) - custo(y))) {
    const ra = achar(e.a), rb = achar(e.b);
    if (ra !== rb) { pai[ra] = rb; arvore.push(e.id); }
  }
  return arvore.sort();
}

/** Soma dos custos de uma lista de enlaces. */
export const peso = (rede, ids) => ids.reduce((t, id) => t + custo(rede.enlaces.find(e => e.id === id)), 0);

/** Custo acumulado da raiz até cada switch usando só as arestas `ids` (BFS numa árvore). */
export function distanciasNaArvore(rede, ids, raiz) {
  const usar = new Set(ids), dist = { [raiz]: 0 }, fila = [raiz];
  while (fila.length) {
    const u = fila.shift();
    for (const { viz, enlace } of rede.vizinhos[u]) {
      if (usar.has(enlace.id) && dist[viz] === undefined) { dist[viz] = dist[u] + custo(enlace); fila.push(viz); }
    }
  }
  return dist;
}
