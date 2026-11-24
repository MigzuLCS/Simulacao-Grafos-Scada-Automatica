/** huffman.js — Aula 20: árvore de Huffman dos eventos do historiador do SCADA (lote de 1000 eventos).
 *  Dados do arquivo "20 - Codificacao de Huffman.md" do repositório do grupo. Sem DOM: testável no Node. */

/** Alfabeto de eventos (Seção 3.1): tag, descrição curta e frequência em 1000 eventos. */
export const EVENTOS = [
  { tag: 'KXA-501', nome: 'Grão A aprovado', f: 720 },
  { tag: 'KXA-502', nome: 'Grão B secundário', f: 150 },
  { tag: 'KXA-503', nome: 'Grão C rejeitado', f: 60 },
  { tag: 'XS-401', nome: 'Pulso da câmera', f: 40 },
  { tag: 'ALR_NA', nome: 'Silo quase cheio', f: 15 },
  { tag: 'ALR_PAL', nome: 'Ar baixo', f: 8 },
  { tag: 'ALR_JI', nome: 'Motor sobrecarga', f: 5 },
  { tag: 'XA-901', nome: 'Emergência', f: 2 },
];
export const TOTAL = EVENTOS.reduce((s, e) => s + e.f, 0);

/**
 * Huffman com fila de prioridade: junta sempre os dois nós de menor frequência.
 * Empates: quem entrou primeiro na fila sai primeiro (mesma regra do heapq do notebook).
 * O primeiro retirado vira o ramo 0 (esquerda), o segundo o ramo 1 (direita).
 * @returns {{raiz:object, fusoes:object[], codigos:Object<string,string>}}
 */
export function construir(eventos = EVENTOS) {
  let ordem = 0;
  const fila = eventos.map(e => ({ folha: true, tag: e.tag, nome: e.nome, f: e.f, ordem: ordem++ }));
  const fusoes = [];
  const tirar = () => { fila.sort((x, y) => x.f - y.f || x.ordem - y.ordem); return fila.shift(); };
  while (fila.length > 1) {
    const zero = tirar(), um = tirar();
    const no = { folha: false, f: zero.f + um.f, zero, um, ordem: ordem++, passo: fusoes.length + 1 };
    fusoes.push(no); fila.push(no);
  }
  const raiz = fila[0], codigos = {};
  (function visitar(n, c) { if (n.folha) codigos[n.tag] = c || '0'; else { visitar(n.zero, c + '0'); visitar(n.um, c + '1'); } })(raiz, '');
  return { raiz, fusoes, codigos };
}

/** Métricas da Seção 4: bits fixos, comprimento médio, entropia, economia e eficiência. */
export function metricas(codigos, eventos = EVENTOS) {
  const tot = eventos.reduce((s, e) => s + e.f, 0);
  const fixo = Math.ceil(Math.log2(eventos.length));
  const medio = eventos.reduce((s, e) => s + (e.f / tot) * codigos[e.tag].length, 0);
  const H = -eventos.reduce((s, e) => s + (e.f / tot) * Math.log2(e.f / tot), 0);
  return { fixo, medio, H, bitsFixo: fixo * tot, bitsHuffman: Math.round(medio * tot), economia: 1 - medio / fixo, eficiencia: H / medio };
}

/** Decodifica um fluxo de bits andando na árvore (0 = esquerda, 1 = direita). */
export function decodificar(raiz, bits) {
  const saida = []; let n = raiz;
  for (const b of bits) { n = b === '0' ? n.zero : n.um; if (n.folha) { saida.push(n.tag); n = raiz; } }
  return saida;
}
