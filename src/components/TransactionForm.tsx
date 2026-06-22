/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BoxId, Category, TransactionType } from '../types';
import SignaturePad from './SignaturePad';
import { PlusCircle, AlertCircle, Calendar, DollarSign, PenTool, LayoutGrid, CheckCircle } from 'lucide-react';

interface TransactionFormProps {
  categories: Category[];
  onSubmit: (data: {
    type: TransactionType;
    boxId: BoxId;
    amount: number;
    date: string;
    categoryId: string;
    description: string;
    signature: string;
  }) => void;
  currentUser: { name: string; role: string } | null;
}

export default function TransactionForm({ categories, onSubmit, currentUser }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('ENTRADA');
  const [boxId, setBoxId] = useState<BoxId>('CAIXA_5_EBD');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [signature, setSignature] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Filter categories by movement type
  const filteredCategories = categories.filter(cat => cat.type === type);

  // Automatically select first category of list when list updates
  useEffect(() => {
    if (filteredCategories.length > 0) {
      setCategoryId(filteredCategories[0].id);
    } else {
      setCategoryId('');
    }
  }, [type, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate Value
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Por favor, informe um valor financeiro válido maior que zero.');
      return;
    }

    // Validate Category
    if (!categoryId) {
      setError('Por favor, selecione uma categoria válida.');
      return;
    }

    // Validate Signature
    if (!signature) {
      setError('A assinatura digital do responsável é obrigatória para concluir a transação.');
      return;
    }

    // Process submission
    onSubmit({
      type,
      boxId,
      amount: numAmount,
      date,
      categoryId,
      description,
      signature
    });

    setSuccess(true);
    
    // Clear form fields
    setAmount('');
    setDescription('');
    setSignature(null);

    // Auto fadeout success badge after 3s
    setTimeout(() => {
      setSuccess(false);
    }, 3000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
        <PlusCircle className="w-5 h-5 text-indigo-600" />
        <h3 className="font-extrabold text-slate-800 tracking-tight text-base">Nova Movimentação Financeira</h3>
      </div>

      {success && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-start gap-2.5 animate-slide-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Sucesso!</p>
            <p className="text-xs text-emerald-700">Lançamento cadastrado e enviado para o fluxo de aprovação.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start gap-2.5 animate-bounce-subtle">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Atenção Necessária</p>
            <p className="text-xs text-amber-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type selector tab-button */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setType('ENTRADA')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              type === 'ENTRADA'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Entradas (Ofertas/Doações)
          </button>
          
          <button
            type="button"
            onClick={() => setType('SAIDA')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              type === 'SAIDA'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Saídas (Despesas/Compras)
          </button>
        </div>

        {/* Amount and Date row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-indigo-500" /> Valor R$ <span className="text-red-500">*</span>
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-400 text-xs font-medium">BRL</span>
              </div>
              <input
                type="text"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="block w-full pl-11 pr-3 py-2.5 sm:text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Data Operação <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full px-3 py-2.5 sm:text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-semibold"
            />
          </div>
        </div>

        {/* Box selector and Category selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" /> Caixa Associado <span className="text-red-500">*</span>
            </label>
            <select
              value={boxId}
              onChange={(e) => setBoxId(e.target.value as BoxId)}
              className="block w-full px-3 py-2.5 sm:text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-medium"
            >
              <option value="CAIXA_5_EBD">Caixa 01 - 5% EBD</option>
              <option value="CAIXA_LICOES">Caixa 02 - Lições</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-500" /> Categoria <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="block w-full px-3 py-2.5 sm:text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-medium"
            >
              {filteredCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* User context information */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">Responsável Técnico</span>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-800 block">{currentUser?.name || 'Tesoureiro'}</span>
            <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5 uppercase tracking-wide">
              {currentUser?.role || 'Apoiador'}
            </span>
          </div>
        </div>

        {/* Detailed description */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Descrição detalhada
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Exemplo: Compra de materiais de suporte para a sala preparatória de professores."
            rows={2}
            className="block w-full px-3 py-2.5 sm:text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 placeholder-slate-400"
          />
        </div>

        {/* Mandatory Signature Canvas drawing box */}
        <div className="pt-2">
          <SignaturePad onChange={setSignature} value={signature} />
        </div>

        {/* Submission button */}
        <button
          type="submit"
          className="w-full mt-4 bg-slate-900 border border-slate-800 text-white rounded-xl py-3 px-4 font-bold text-xs shadow-md transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
        >
          Salvar Movimentação e Emitir Recibo
        </button>
      </form>
    </div>
  );
}
