/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Box, Category, Transaction, Person, AuditLog, WeeklyClosing } from '../types';

export const INITIAL_USERS: (User & { passwordHash: string })[] = [
  {
    id: 'usr1',
    name: 'Amanda Souza',
    username: 'secretaria',
    role: 'SECRETARIA',
    avatarColor: 'bg-indigo-600',
    passwordHash: 'senha123'
  },
  {
    id: 'usr2',
    name: 'Pr. Carlos Mendes',
    username: 'dirigente',
    role: 'DIRIGENTE',
    avatarColor: 'bg-emerald-600',
    passwordHash: 'senha123'
  },
  {
    id: 'usr3',
    name: 'Marcos Oliveira',
    username: 'tesoureiro',
    role: 'TESOUREIRO',
    avatarColor: 'bg-blue-600',
    passwordHash: 'senha123'
  },
  {
    id: 'usr4',
    name: 'Visitante EBD',
    username: 'visitante',
    role: 'VISITANTE',
    avatarColor: 'bg-slate-500',
    passwordHash: 'senha123'
  }
];

export const INITIAL_BOXES: Box[] = [
  {
    id: 'CAIXA_5_EBD',
    name: 'Caixa 5% EBD',
    description: 'Fundo de caixa proveniente de dízimos/ofertas da igreja central (cota de 5% destinada à EBD) para manutenção diária e necessidades gerais.',
    balance: 1450.00
  },
  {
    id: 'CAIXA_LICOES',
    name: 'Caixa Lições',
    description: 'Caixa exclusivo de receitas da venda de revistas (lições dominicais) e despesas de aquisição das novas lições trimestrais.',
    balance: 620.00
  }
];

export const INITIAL_CATEGORIES: Category[] = [
  // Entradas
  { id: 'cat-ent-1', name: 'Oferta do Dia', type: 'ENTRADA' },
  { id: 'cat-ent-2', name: 'Cota 5% Igreja', type: 'ENTRADA' },
  { id: 'cat-ent-3', name: 'Venda de Revista/Lição', type: 'ENTRADA' },
  { id: 'cat-ent-4', name: 'Doações Especiais', type: 'ENTRADA' },
  { id: 'cat-ent-5', name: 'Rendimento de Caixa', type: 'ENTRADA' },
  
  // Saídas
  { id: 'cat-sai-1', name: 'Compra de Revistas/Lições', type: 'SAIDA' },
  { id: 'cat-sai-2', name: 'Material Didático/Papelaria', type: 'SAIDA' },
  { id: 'cat-sai-3', name: 'Alimentação (Lanche EBD)', type: 'SAIDA' },
  { id: 'cat-sai-4', name: 'Festividades/Eventos', type: 'SAIDA' },
  { id: 'cat-sai-5', name: 'Brindes e Premiações Alunos', type: 'SAIDA' },
  { id: 'cat-sai-6', name: 'Manutenção / Decoração de Salas', type: 'SAIDA' }
];

// Placeholder signature representation
const SAMPLE_SIGNATURE_BLUE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'><path d='M 10 80 Q 52.5 10, 95 80 T 180 20' stroke='%232563EB' stroke-width='3' fill='none'/><path d='M 30 50 Q 80 50, 150 80' stroke='%232563EB' stroke-width='2' fill='none'/></svg>";
const SAMPLE_SIGNATURE_GREEN = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'><path d='M 20 70 C 40 10, 60 10, 80 80 C 100 10, 120 10, 140 70 M 10 40 L 190 50' stroke='%23059669' stroke-width='3' fill='none'/></svg>";

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-101',
    transactionNum: 'TX-1001',
    type: 'ENTRADA',
    boxId: 'CAIXA_5_EBD',
    amount: 500.00,
    date: '2026-06-07',
    time: '08:45',
    categoryId: 'cat-ent-2',
    description: 'Repasse mensal referente aos 5% da tesouraria geral da igreja.',
    responsible: 'Marcos Oliveira',
    signature: SAMPLE_SIGNATURE_BLUE,
    createdAt: '2026-06-07T08:45:00Z',
    isApproved: true,
    approvedBy: 'Pr. Carlos Mendes',
    approvedAt: '2026-06-07T12:00:00Z'
  },
  {
    id: 'tx-102',
    transactionNum: 'TX-1002',
    type: 'ENTRADA',
    boxId: 'CAIXA_5_EBD',
    amount: 120.00,
    date: '2026-06-07',
    time: '11:15',
    categoryId: 'cat-ent-1',
    description: 'Ofertas recolhidas no culto da EBD de domingo de manhã.',
    responsible: 'Marcos Oliveira',
    signature: SAMPLE_SIGNATURE_BLUE,
    createdAt: '2026-06-07T11:15:00Z',
    isApproved: true,
    approvedBy: 'Pr. Carlos Mendes',
    approvedAt: '2026-06-07T12:02:00Z'
  },
  {
    id: 'tx-103',
    transactionNum: 'TX-1003',
    type: 'SAIDA',
    boxId: 'CAIXA_5_EBD',
    amount: 85.50,
    date: '2026-06-08',
    time: '15:30',
    categoryId: 'cat-sai-3',
    description: 'Compra de pães, suco e bolachas para o café da manhã das classes infantis.',
    responsible: 'Amanda Souza',
    signature: SAMPLE_SIGNATURE_GREEN,
    createdAt: '2026-06-08T15:30:00Z',
    isApproved: true,
    approvedBy: 'Pr. Carlos Mendes',
    approvedAt: '2026-06-08T18:00:00Z'
  },
  {
    id: 'tx-104',
    transactionNum: 'TX-1004',
    type: 'ENTRADA',
    boxId: 'CAIXA_LICOES',
    amount: 350.00,
    date: '2026-06-14',
    time: '09:00',
    categoryId: 'cat-ent-3',
    description: 'Arrecadação de venda de revistas para classe de Adultos e Jovens (2º Trimestre).',
    responsible: 'Marcos Oliveira',
    signature: SAMPLE_SIGNATURE_BLUE,
    createdAt: '2026-06-14T09:00:00Z',
    isApproved: true,
    approvedBy: 'Pr. Carlos Mendes',
    approvedAt: '2026-06-14T13:00:00Z'
  },
  {
    id: 'tx-105',
    transactionNum: 'TX-1005',
    type: 'SAIDA',
    boxId: 'CAIXA_LICOES',
    amount: 180.00,
    date: '2026-06-15',
    time: '10:45',
    categoryId: 'cat-sai-1',
    description: 'Pagamento das faturas de reposição de 12 revistas extras da CPAD.',
    responsible: 'Marcos Oliveira',
    signature: SAMPLE_SIGNATURE_BLUE,
    createdAt: '2026-06-15T10:45:00Z',
    isApproved: true,
    approvedBy: 'Pr. Carlos Mendes',
    approvedAt: '2026-06-15T14:40:00Z'
  },
  {
    id: 'tx-106',
    transactionNum: 'TX-1006',
    type: 'ENTRADA',
    boxId: 'CAIXA_5_EBD',
    amount: 195.00,
    date: '2026-06-21',
    time: '11:00',
    categoryId: 'cat-ent-1',
    description: 'Ofertas recolhidas no culto da EBD especial de dia dos namorados / família.',
    responsible: 'Marcos Oliveira',
    signature: SAMPLE_SIGNATURE_BLUE,
    createdAt: '2026-06-21T11:00:00Z',
    isApproved: false, // Pending approval
    approvedBy: undefined,
    approvedAt: undefined
  },
  {
    id: 'tx-107',
    transactionNum: 'TX-1007',
    type: 'SAIDA',
    boxId: 'CAIXA_5_EBD',
    amount: 45.00,
    date: '2026-06-21',
    time: '11:45',
    categoryId: 'cat-sai-5',
    description: 'Compra de duas Bíblias de estudo infantis para premiação do concurso de memorização.',
    responsible: 'Amanda Souza',
    signature: SAMPLE_SIGNATURE_GREEN,
    createdAt: '2026-06-21T11:45:00Z',
    isApproved: false // Pending approval
  },
  {
    id: 'tx-108',
    transactionNum: 'TX-1008',
    type: 'ENTRADA',
    boxId: 'CAIXA_LICOES',
    amount: 220.00,
    date: '2026-06-21',
    time: '09:00',
    categoryId: 'cat-ent-3',
    description: 'Entrega de valores das revistas da classe de adolescentes.',
    responsible: 'Marcos Oliveira',
    signature: SAMPLE_SIGNATURE_BLUE,
    createdAt: '2026-06-21T09:00:00Z',
    isApproved: false // Pending approval
  }
];

export const INITIAL_PEOPLE: Person[] = [
  { id: 'per-1', name: 'João Victor Silva', type: 'ALUNO', phone: '(11) 98765-4321', classGroup: 'Jovens', registeredAt: '2026-05-10' },
  { id: 'per-2', name: 'Ana Beatriz Souza', type: 'ALUNO', phone: '(11) 91234-5678', classGroup: 'Adultos', registeredAt: '2026-05-15' },
  { id: 'per-3', name: 'Sofia Helena Lima', type: 'ALUNO', phone: '(11) 95555-4444', classGroup: 'Crianças (Primários)', registeredAt: '2026-06-01' },
  { id: 'per-4', name: 'Guilherme Ferreira', type: 'VISITANTE', phone: '(11) 94444-2222', classGroup: 'Jovens', registeredAt: '2026-06-14' },
  { id: 'per-5', name: 'Maria das Graças', type: 'VISITANTE', phone: '(11) 93333-1111', classGroup: 'Adultos', registeredAt: '2026-06-21' },
  { id: 'per-6', name: 'Lucas Gabriel Albuquerque', type: 'ALUNO', phone: '(11) 99911-8822', classGroup: 'Adolescentes', registeredAt: '2026-04-18' }
];

export const INITIAL_CLOSINGS: WeeklyClosing[] = [
  {
    id: 'clos-1',
    closingNum: 'FECH-2026-W23',
    startDate: '2026-06-01',
    endDate: '2026-06-07',
    totalInflows: 620.00,
    totalOutflows: 0.00,
    startingBalance: 1015.00,
    endingBalance: 1635.00,
    difference: 0.00,
    status: 'APROVADO',
    dirigenteApprover: 'usr2',
    dirigenteApprovedAt: '2026-06-07T18:00:00Z',
    treasurerName: 'Marcos Oliveira',
    treasurerSignature: SAMPLE_SIGNATURE_BLUE,
    closedAt: '2026-06-07T12:30:00Z',
    comments: 'Fechamento tranquilo do primeiro domingo do mês. Todas as receitas foram devidamente computadas.'
  },
  {
    id: 'clos-2',
    closingNum: 'FECH-2026-W24',
    startDate: '2026-06-08',
    endDate: '2026-06-14',
    totalInflows: 350.00,
    totalOutflows: 85.50,
    startingBalance: 1635.00,
    endingBalance: 1899.50,
    difference: 0.00,
    status: 'APROVADO',
    dirigenteApprover: 'usr2',
    dirigenteApprovedAt: '2026-06-14T19:40:00Z',
    treasurerName: 'Marcos Oliveira',
    treasurerSignature: SAMPLE_SIGNATURE_BLUE,
    closedAt: '2026-06-14T14:10:00Z',
    comments: 'Inlcusão das vendas de lições dominicais na receita semanal.'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    userId: 'usr3',
    userName: 'Marcos Oliveira',
    userRole: 'TESOUREIRO',
    action: 'Inclusão de Entrada',
    details: 'Cadastrou Entrada TX-1001 de R$ 500,00 no Caixa 5% EBD.',
    ip: '192.168.1.45',
    timestamp: '2026-06-07T08:45:00Z'
  },
  {
    id: 'aud-2',
    userId: 'usr2',
    userName: 'Pr. Carlos Mendes',
    userRole: 'DIRIGENTE',
    action: 'Aprovação de Movimentação',
    details: 'Aprovou a Entrada TX-1001.',
    ip: '192.168.1.12',
    timestamp: '2026-06-07T12:00:00Z'
  },
  {
    id: 'aud-3',
    userId: 'usr3',
    userName: 'Marcos Oliveira',
    userRole: 'TESOUREIRO',
    action: 'Fechamento Semanal',
    details: 'Emitiu Fechamento Semanal FECH-2026-W23 de 01/06/2026 a 07/06/2026.',
    ip: '192.168.1.45',
    timestamp: '2026-06-07T12:30:00Z'
  },
  {
    id: 'aud-4',
    userId: 'usr2',
    userName: 'Pr. Carlos Mendes',
    userRole: 'DIRIGENTE',
    action: 'Aprovação de Fechamento',
    details: 'Aprovou o Fechamento Semanal FECH-2026-W23.',
    ip: '192.168.1.12',
    timestamp: '2026-06-07T18:00:00Z'
  }
];
