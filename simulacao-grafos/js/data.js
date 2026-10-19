/**
 * data.js — Fonte única de verdade dos dados da Etapa 02 (Grafos).
 * Todos os números vêm das Aulas 11 a 18 (.md e .ipynb). Nada aqui é inventado,
 * exceto os itens marcados com `premissa: true` (parâmetros do modelo que as aulas não definem).
 */

/* ------------------------------------------------------------------ */
/* Aulas 11-15: grafo da linha de classificação (14 vértices, 14 arcos) */
/* ------------------------------------------------------------------ */

// tipo: define o símbolo desenhado no sinótico
export const NODES = [
  { id: 'FN-101',    n: 1,  nome: 'Funil de Recepção',            tipo: 'funil',  inst: ['LIT-101'],                      x: 70,   y: 150 },
  { id: 'ALIM-101',  n: 2,  nome: 'Calha Vibratória Dosadora',    tipo: 'alim',   inst: ['c_ALIM'],                       x: 190,  y: 150 },
  { id: 'EST-201',   n: 3,  nome: 'Esteira — Cabeceira Motora',   tipo: 'motor',  inst: ['M-201', 'JI-201', 'ST-201'],    x: 310,  y: 150 },
  { id: 'BAL-301',   n: 4,  nome: 'Balança Dinâmica',             tipo: 'balanca',inst: ['WT-301', 'FT-301'],             x: 430,  y: 150 },
  { id: 'VIS-401',   n: 5,  nome: 'Túnel de Visão',               tipo: 'visao',  inst: ['XS-401', 'KSA-401'],            x: 550,  y: 150 },
  { id: 'DIV-501',   n: 6,  nome: 'Nó de Decisão Lógica (CLP)',   tipo: 'decisao',inst: ['KXA-501', 'KXA-502', 'KXA-503'],x: 660,  y: 150 },
  { id: 'EJE-602',   n: 7,  nome: 'Estação de Ejeção B',          tipo: 'ejetor', inst: ['FY-602', 'ZSH-602'],            x: 780,  y: 150 },
  { id: 'EJE-603',   n: 8,  nome: 'Estação de Ejeção C',          tipo: 'ejetor', inst: ['FY-603', 'ZSH-601'],            x: 930,  y: 150 },
  { id: 'CALHA-602', n: 9,  nome: 'Calha de Grãos B',             tipo: 'calha',  inst: [],                               x: 780,  y: 300 },
  { id: 'CALHA-603', n: 10, nome: 'Calha de Rejeito C',           tipo: 'calha',  inst: [],                               x: 930,  y: 300 },
  { id: 'CALHA-701', n: 11, nome: 'Calha Terminal A',             tipo: 'calha',  inst: [],                               x: 1080, y: 150 },
  { id: 'SILO-701',  n: 12, nome: 'Silo A — Aprovado',            tipo: 'silo',   inst: ['LIT-701'],                      x: 1080, y: 445 },
  { id: 'SILO-702',  n: 13, nome: 'Silo B — Secundário',          tipo: 'silo',   inst: ['LIT-702'],                      x: 780,  y: 445 },
  { id: 'SILO-703',  n: 14, nome: 'Silo C — Rejeito',             tipo: 'silo',   inst: ['LIT-703'],                      x: 930,  y: 445 },
];

// meio: correia | calha_vib | duto | pneumatico | elevador | calha
// vel [m/s]: velocidade de trânsito usada para o atraso de transporte (premissa quando não vem da aula)
export const EDGES = [
  { id: 'e1',  u: 'FN-101',    v: 'ALIM-101',  L: 1.2,  meio: 'duto',       vel: 2.0, valv: 'XV-101' },
  { id: 'e2',  u: 'ALIM-101',  v: 'EST-201',   L: 1.8,  meio: 'calha_vib',  vel: 0.5, valv: 'c_ALIM' },
  { id: 'e3',  u: 'EST-201',   v: 'BAL-301',   L: 2.5,  meio: 'correia',    vel: 1.5, valv: 'c_EST' },
  { id: 'e4',  u: 'BAL-301',   v: 'VIS-401',   L: 3.0,  meio: 'correia',    vel: 1.5, valv: 'c_EST' },
  { id: 'e5',  u: 'VIS-401',   v: 'DIV-501',   L: 1.0,  meio: 'correia',    vel: 1.5, valv: 'XS-401' },
  { id: 'e6',  u: 'DIV-501',   v: 'EJE-602',   L: 2.0,  meio: 'correia',    vel: 1.5, valv: 'ZC-602' },
  { id: 'e7',  u: 'EJE-602',   v: 'CALHA-602', L: 0.8,  meio: 'pneumatico', vel: 3.0, valv: 'FY-602' },
  { id: 'e8',  u: 'EJE-602',   v: 'EJE-603',   L: 1.5,  meio: 'correia',    vel: 1.5, valv: 'c_EST' },
  { id: 'e9',  u: 'EJE-603',   v: 'CALHA-603', L: 0.8,  meio: 'pneumatico', vel: 3.0, valv: 'FY-603' },
  { id: 'e10', u: 'EJE-603',   v: 'CALHA-701', L: 2.2,  meio: 'correia',    vel: 1.5, valv: 'c_EST' },
  { id: 'e11', u: 'CALHA-701', v: 'SILO-701',  L: 3.5,  meio: 'duto',       vel: 2.0, valv: 'XV-701' },
  { id: 'e12', u: 'CALHA-602', v: 'SILO-702',  L: 4.0,  meio: 'duto',       vel: 2.0, valv: 'XV-702' },
  { id: 'e13', u: 'CALHA-603', v: 'SILO-703',  L: 3.2,  meio: 'duto',       vel: 2.0, valv: 'XV-703' },
  { id: 'e14', u: 'SILO-702',  v: 'FN-101',    L: 12.0, meio: 'elevador',   vel: 0.8, valv: 'XV-104', reciclo: true },
];

// Polilinhas do desenho (coordenadas do viewBox 1200x600). Só visual.
export const EDGE_PATHS = {
  e1:  [[100, 150], [160, 150]],
  e2:  [[220, 150], [280, 150]],
  e3:  [[340, 150], [400, 150]],
  e4:  [[460, 150], [520, 150]],
  e5:  [[580, 150], [632, 150]],
  e6:  [[688, 150], [750, 150]],
  e7:  [[780, 178], [780, 272]],
  e8:  [[810, 150], [900, 150]],
  e9:  [[930, 178], [930, 272]],
  e10: [[960, 150], [1050, 150]],
  e11: [[1080, 178], [1080, 374]],
  e12: [[780, 328], [780, 374]],
  e13: [[930, 328], [930, 374]],
  e14: [[780, 525], [780, 565], [70, 565], [70, 190]],
};

export const SILOS = {
  'SILO-701': { nome: 'A', cap: 2000, tag: 'LIT-701', valv: 'XV-701', entrada: 'e11' },
  'SILO-702': { nome: 'B', cap: 500,  tag: 'LIT-702', valv: 'XV-702', entrada: 'e12' },
  'SILO-703': { nome: 'C', cap: 400,  tag: 'LIT-703', valv: 'XV-703', entrada: 'e13' },
};

// Parâmetros operacionais (Aula 12 §2.5)
export const PROCESS = {
  Qin: 1200,                       // kg/h — Aula 12 (nota: a Aula 17 cita 12.000 kg/h)
  split: { A: 0.75, B: 0.15, C: 0.10 },
  vEsteira: 1.5,                   // m/s — Aula 11 ex. 2 (a Aula 14 usa 1,0 m/s)
  vGravidade: 2.0,                 // m/s — Aula 11 ex. 2
  capCalha: 15,                    // kg — Aula 15, atividade 2
  capFunil: 500,                   // kg — premissa
  nivelAlto: 0.80,                 // NA — premissa (ISA-18.2: H)
  nivelCritico: 0.95,              // NC — Aula 14 atividade 1
  tolResiduo: 0.03,                // banda morta de 3 % (Aula 15 atividade 1 cita ruído de ±2 %)
};

// Vazões nominais por aresta (Aula 12 §2.5) — usadas nos testes de fidelidade
export const Q_NOMINAL = {
  e1: 1200, e2: 1200, e3: 1200, e4: 1200, e5: 1200, e6: 1200,
  e7: 180, e8: 1020, e9: 120, e10: 900, e11: 900, e12: 180, e13: 120, e14: 0,
};

/* ------------------------------------------------------------------ */
/* Aula 16: malha de inspeção (Euler) — grafo NÃO dirigido, 6 vértices  */
/* ------------------------------------------------------------------ */
export const EULER_NODES = [
  { id: 'BASE-INSP', x: 120, y: 280 },
  { id: 'FN-101',    x: 330, y: 110 },
  { id: 'VIS-401',   x: 600, y: 110 },
  { id: 'EJE-600',   x: 870, y: 110 },
  { id: 'SILO-701',  x: 870, y: 420 },
  { id: 'SILO-702',  x: 450, y: 420 },
];
export const EULER_EDGES = [
  { id: 'd1', a: 'BASE-INSP', b: 'FN-101',   L: 15.0 },
  { id: 'd2', a: 'FN-101',    b: 'VIS-401',  L: 8.5 },
  { id: 'd3', a: 'VIS-401',   b: 'EJE-600',  L: 6.0 },
  { id: 'd4', a: 'EJE-600',   b: 'SILO-701', L: 10.0 },
  { id: 'd5', a: 'SILO-701',  b: 'SILO-702', L: 5.5 },
  { id: 'd6', a: 'SILO-702',  b: 'BASE-INSP',L: 18.0 },
  { id: 'd7', a: 'FN-101',    b: 'EJE-600',  L: 12.0 },
  { id: 'd8', a: 'EJE-600',   b: 'VIS-401',  L: 6.0 },
  { id: 'd9', a: 'VIS-401',   b: 'FN-101',   L: 8.5 },
];

/* ------------------------------------------------------------------ */
/* Aula 17: AGV (TSP) — matriz de distâncias 6x6                        */
/* ------------------------------------------------------------------ */
export const AGV_NODES = [
  { id: 'LAB-CQ',   x: 130, y: 400 },
  { id: 'FN-101',   x: 250, y: 140 },
  { id: 'BAL-301',  x: 470, y: 120 },
  { id: 'VIS-401',  x: 690, y: 190 },
  { id: 'SILO-701', x: 900, y: 150 },
  { id: 'SILO-702', x: 800, y: 400 },
];
export const AGV_D = [
  [0, 45, 65, 80, 110, 75],
  [45, 0, 20, 35, 95, 80],
  [65, 20, 0, 18, 85, 70],
  [80, 35, 18, 0, 25, 40],
  [110, 95, 85, 25, 0, 35],
  [75, 80, 70, 40, 35, 0],
];

/* ------------------------------------------------------------------ */
/* Aula 18: G_M, G_V, G_E (copiados do notebook, na ordem original)     */
/* ------------------------------------------------------------------ */
export const GM_RECEBIMENTO = [
  ['Portaria', 'Balança de entrada', 30],
  ['Balança de entrada', 'Calador', 25],
  ['Calador', 'Moega MG-001', 60],
  ['Moega MG-001', 'SP-001', 35],
  ['Moega MG-001', 'SP-002', 42],
  ['SP-001', 'FN-101', 30],
  ['SP-002', 'FN-101', 20],
];
export const GM_EXPEDICAO = [
  ['SILO-701', 'EMP-801', 18],
  ['EMP-801', 'PAL-801', 12],
  ['PAL-801', 'Estoque Tipo 1', 30],
  ['Estoque Tipo 1', 'Docas', 25],
  ['SILO-702', 'BIG-802', 20],
  ['BIG-802', 'Estoque Tipo 2', 26],
  ['Estoque Tipo 2', 'Docas', 22],
  ['SILO-703', 'CAC-803', 15],
  ['CAC-803', 'Subprodutos', 40],
];
// Posições (viewBox 1200x590) do G_M completo
export const GM_POS = {
  'Portaria': [55, 60], 'Balança de entrada': [165, 60], 'Calador': [265, 60], 'Moega MG-001': [360, 60],
  'SP-001': [470, 25], 'SP-002': [470, 95], 'FN-101': [585, 60], 'ALIM-101': [685, 60], 'EST-201': [775, 60],
  'BAL-301': [865, 60], 'VIS-401': [955, 60], 'DIV-501': [1045, 60], 'EJE-602': [1140, 60],
  'CALHA-602': [1030, 150], 'EJE-603': [1140, 150], 'CALHA-603': [1030, 240], 'CALHA-701': [1140, 240],
  'SILO-701': [1140, 330], 'SILO-702': [700, 330], 'SILO-703': [900, 330],
  'EMP-801': [1140, 420], 'PAL-801': [1140, 490], 'Estoque Tipo 1': [1010, 540],
  'BIG-802': [700, 420], 'Estoque Tipo 2': [700, 490], 'Docas': [800, 540],
  'CAC-803': [900, 420], 'Subprodutos': [900, 490],
};

export const GV_EDGES = [
  ['Portaria', 'Balança de entrada', 30],
  ['Balança de entrada', 'Pátio do calador', 25],
  ['Pátio do calador', 'Moega de descarga', 60],
  ['Pátio do calador', 'Pátio de quarentena', 40],
  ['Pátio de quarentena', 'Moega de descarga', 35],
  ['Pátio de quarentena', 'Balança de saída', 120],
  ['Moega de descarga', 'Balança de saída', 110],
  ['Balança de entrada', 'Via interna leste', 95],
  ['Moega de descarga', 'Via interna leste', 70],
  ['Via interna leste', 'Docas', 55],
  ['Via interna leste', 'Pátio de subprodutos', 45],
  ['Docas', 'Balança de saída', 50],
  ['Pátio de subprodutos', 'Balança de saída', 65],
  ['Balança de saída', 'Portaria', 35],
];
export const GV_POS = {
  'Portaria': [100, 250], 'Balança de entrada': [260, 130], 'Pátio do calador': [470, 130],
  'Pátio de quarentena': [620, 40], 'Moega de descarga': [690, 190], 'Via interna leste': [780, 330],
  'Docas': [980, 280], 'Pátio de subprodutos': [980, 420], 'Balança de saída': [440, 400],
};
export const GV_VIAGENS = {
  'Graneleiro (lote aprovado)': ['Portaria', 'Pátio do calador', 'Moega de descarga', 'Portaria'],
  'Graneleiro (quarentena)': ['Portaria', 'Pátio do calador', 'Pátio de quarentena', 'Moega de descarga', 'Portaria'],
  'Graneleiro (lote recusado)': ['Portaria', 'Pátio do calador', 'Pátio de quarentena', 'Portaria'],
  'Caminhão de expedição': ['Portaria', 'Docas', 'Portaria'],
  'Caminhão de subprodutos': ['Portaria', 'Pátio de subprodutos', 'Portaria'],
};

export const GE_EDGES = [
  ['PAL-801', 'Corredor 1', 8], ['PAL-801', 'Corredor 2', 15],
  ['Corredor 1', 'A1', 6], ['Corredor 1', 'A2', 14], ['Corredor 1', 'A3', 22],
  ['Corredor 2', 'B1', 6], ['Corredor 2', 'B2', 14], ['Corredor 2', 'B3', 22],
  ['A1', 'Docas', 34], ['A2', 'Docas', 24], ['A3', 'Docas', 15],
  ['B1', 'Docas', 27], ['B2', 'Docas', 18], ['B3', 'Docas', 9],
];
export const GE_POS = {
  'PAL-801': [80, 230], 'Corredor 1': [300, 130], 'Corredor 2': [300, 330],
  'A1': [540, 60], 'A2': [540, 150], 'A3': [540, 240], 'B1': [540, 280], 'B2': [540, 370], 'B3': [540, 460],
  'Docas': [860, 260],
};

/* Teoria: tags/valores citados na tela de validação */
export const TAG_DESCRICAO = {
  'LIT-101': 'Transmissor de nível — funil', 'LIT-701': 'Nível — Silo A', 'LIT-702': 'Nível — Silo B', 'LIT-703': 'Nível — Silo C',
  'WT-301': 'Célula de carga', 'FT-301': 'Vazão mássica', 'ST-201': 'Encoder de velocidade', 'JI-201': 'Corrente do motor',
  'XS-401': 'Barreira óptica (trigger)', 'KSA-401': 'Câmera industrial', 'FY-602': 'Solenoide do ejetor B', 'FY-603': 'Solenoide do ejetor C',
  'ZSH-601': 'Fim de curso — pistão C', 'ZSH-602': 'Fim de curso — pistão B', 'PT-601': 'Pressão do ar', 'PAL-601': 'Pressostato de baixa',
  'XV-104': 'Comporta de reciclo', 'XV-701': 'Válvula — Silo A', 'XV-702': 'Válvula — Silo B', 'XV-703': 'Válvula — Silo C',
};
