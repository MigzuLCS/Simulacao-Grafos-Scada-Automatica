/** rrt.js — Aula 22: RRT e RRT* no galpão de 50 × 40 m, com o mapa e os parâmetros do notebook
 *  "Aula 22 - Rapidly-exploring Random Trees - code.ipynb" do repositório do grupo. Sem DOM: testável no Node. */
import { sorteador } from './binarias.js';

export const LARGURA = 50, ALTURA = 40, MARGEM = 0.8;
/** Obstáculos: [x, y, largura, altura, nome] em metros (canto inferior esquerdo). */
export const OBSTACULOS = [
  [10, 18, 24, 4, 'Esteira EST-201'], [18, 22, 6, 5, 'Túnel VIS-401'], [30, 22, 5, 6, 'Ar comp.'],
  [2, 25, 8, 10, 'Sala de controle'], [38, 10, 8, 12, 'Silos'], [15, 5, 6, 6, 'Manutenção'],
];
export const PARTIDA = [6, 6], DESTINO = [44, 34];
export const PARAMS = { passo: 2.2, viesAlvo: 0.15, maxIter: 1200, raio: 6 };

export function colidePonto(x, y) {
  if (x < MARGEM || x > LARGURA - MARGEM || y < MARGEM || y > ALTURA - MARGEM) return true;
  return OBSTACULOS.some(([ox, oy, w, h]) => ox - MARGEM <= x && x <= ox + w + MARGEM && oy - MARGEM <= y && y <= oy + h + MARGEM);
}
/** Teste contínuo no segmento por 15 amostras, como no notebook (+ amostragem mínima a cada 0,25 m). */
export function colideSegmento(a, b) {
  const n = Math.max(15, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.25));
  for (let i = 0; i <= n; i++) { const t = i / n; if (colidePonto(a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]))) return true; }
  return false;
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Planeja de PARTIDA a DESTINO. Devolve a árvore inteira (para animar), o caminho e quantos sorteios foram feitos.
 * @param {{estrela?:boolean, semente?:number}} o
 */
export function planejar({ estrela = false, semente = 42 } = {}) {
  const rnd = sorteador(semente), { passo, viesAlvo, maxIter, raio } = PARAMS;
  const raiz = { x: PARTIDA[0], y: PARTIDA[1], pai: null, custo: 0, id: 0 }, alvo = { x: DESTINO[0], y: DESTINO[1] };
  const nos = [raiz], historico = [];   // historico: snapshots de (filho, pai) na ordem em que entraram
  for (let it = 1; it <= maxIter; it++) {
    const r = rnd() < viesAlvo ? alvo : { x: 1 + rnd() * 48, y: 1 + rnd() * 38 };
    const perto = nos.reduce((m, n) => (dist(n, r) < dist(m, r) ? n : m));
    const d = dist(perto, r), s = Math.min(passo, d);
    if (d < 1e-9) continue;
    const novo = { x: perto.x + s * (r.x - perto.x) / d, y: perto.y + s * (r.y - perto.y) / d, pai: perto, custo: perto.custo + s, id: nos.length };
    if (colideSegmento([perto.x, perto.y], [novo.x, novo.y])) continue;
    if (estrela) {
      const viz = nos.filter(n => dist(n, novo) <= raio);
      for (const v of viz) {
        const c = v.custo + dist(v, novo);
        if (c < novo.custo && !colideSegmento([v.x, v.y], [novo.x, novo.y])) { novo.pai = v; novo.custo = c; }
      }
      for (const v of viz) {
        const c = novo.custo + dist(v, novo);
        if (c < v.custo && !colideSegmento([novo.x, novo.y], [v.x, v.y])) { v.pai = novo; v.custo = c; historico.push({ religou: v.id }); }
      }
    }
    nos.push(novo); historico.push({ novo: novo.id });
    if (dist(novo, alvo) <= passo && !colideSegmento([novo.x, novo.y], [alvo.x, alvo.y])) {
      const fim = { ...alvo, pai: novo, custo: novo.custo + dist(novo, alvo), id: nos.length };
      nos.push(fim); historico.push({ novo: fim.id });
      const caminho = [];
      for (let n = fim; n; n = n.pai) caminho.unshift([n.x, n.y]);
      return { nos, historico, caminho, sorteios: it, comprimento: comprimento(caminho) };
    }
  }
  return { nos, historico, caminho: null, sorteios: maxIter, comprimento: Infinity };
}

export function comprimento(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }

/** Poda de atalhos do notebook: de cada ponto, pula para o mais distante visível em linha reta. */
export function atalhos(caminho) {
  const out = [caminho[0]]; let i = 0;
  while (i < caminho.length - 1) {
    let j = caminho.length - 1;
    while (j > i + 1 && colideSegmento(caminho[i], caminho[j])) j--;
    out.push(caminho[j]); i = j;
  }
  return out;
}
