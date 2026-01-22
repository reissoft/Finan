"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function PayablesPage() {
  // FORM STATES
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [catId, setCatId] = useState("");

  // STATES PARA NOVA CATEGORIA (IGUAL CARGOS)
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  // MODAL DE PAGAMENTO
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedPayableId, setSelectedPayableId] = useState("");
  const [payAccountId, setPayAccountId] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // QUERIES
  // Renomeamos refetch para não dar conflito
  const { data: payables, refetch: refetchPayables } = api.payables.getAll.useQuery();
  const { data: settings, refetch: refetchSettings } = api.settings.getAll.useQuery(); 

  // MUTATIONS
  const createMutation = api.payables.create.useMutation({
    onSuccess: () => {
      void refetchPayables();
      setDesc(""); setAmount(""); setDueDate(""); setCatId("");
    }
  });

  // Mutation para criar Categoria na hora (Forçando tipo SAÍDA/EXPENSE)
  const createCatMutation = api.settings.createCategory.useMutation({
      onSuccess: (data) => {
          void refetchSettings(); // Atualiza a lista
          setCatId(data.id);      // Já seleciona a nova
          setIsCreatingCat(false);
          setNewCatName("");
      }
  });

  const payMutation = api.payables.pay.useMutation({
    onSuccess: () => {
      void refetchPayables();
      setPayModalOpen(false);
      alert("Conta paga e lançada no caixa com sucesso!");
    }
  });

  const deleteMutation = api.payables.delete.useMutation({
    onSuccess: () => void refetchPayables(),
    onError: (e) => alert(e.message)
  });

  // HANDLERS
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catId) return alert("Selecione uma categoria");
    
    createMutation.mutate({
        description: desc,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        categoryId: catId
    });
  };

  const handleCreateCat = () => {
      if(!newCatName) return;
      // Cria sempre como "EXPENSE" (Saída) pois estamos no Contas a Pagar
      createCatMutation.mutate({ name: newCatName, type: "EXPENSE" });
  }

  const handlePay = (e: React.FormEvent) => {
      e.preventDefault();
      if(!payAccountId) return alert("Selecione a conta de onde saiu o dinheiro");
      
      payMutation.mutate({
          id: selectedPayableId,
          accountId: payAccountId,
          paidDate: new Date(payDate)
      });
  }

  // AUXILIAR
  const isLate = (date: Date) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      return new Date(date) < today;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-red-900">Contas a Pagar 💸</h1>
            <Link href="/" className="text-gray-600 hover:text-red-600 font-bold">← Voltar</Link>
        </div>

        {/* --- FORMULÁRIO DE CADASTRO --- */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 border-t-4 border-red-500">
            <h2 className="text-lg font-bold mb-4 text-gray-700">Nova Conta / Boleto</h2>
            <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
                
                {/* Descrição */}
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-gray-500">Descrição</label>
                    <input 
                        className="border p-2 rounded w-full text-black" 
                        placeholder="Ex: Energia Leitura Setembro" 
                        value={desc} onChange={e => setDesc(e.target.value)} required 
                    />
                </div>

                {/* Valor */}
                <div className="w-32">
                    <label className="text-xs font-bold text-gray-500">Valor (R$)</label>
                    <input 
                        type="number" step="0.01" 
                        className="border p-2 rounded w-full text-black" 
                        value={amount} onChange={e => setAmount(e.target.value)} required 
                    />
                </div>

                {/* Vencimento */}
                <div className="w-40">
                    <label className="text-xs font-bold text-gray-500">Vencimento</label>
                    <input 
                        type="date" 
                        className="border p-2 rounded w-full text-black" 
                        value={dueDate} onChange={e => setDueDate(e.target.value)} required 
                    />
                </div>

                {/* --- SELETOR DE CATEGORIA INTELIGENTE (IGUAL CARGOS) --- */}
                <div className="w-64">
                    <label className="text-xs font-bold text-gray-500">Categoria</label>
                    <div className="flex gap-1 h-[42px]">
                        {isCreatingCat ? (
                            // MODO CRIAÇÃO
                            <>
                                <input 
                                    autoFocus
                                    className="border p-2 rounded text-black flex-1 border-red-500"
                                    placeholder="Nova categoria..."
                                    value={newCatName} onChange={e => setNewCatName(e.target.value)}
                                />
                                <button 
                                    type="button" 
                                    onClick={handleCreateCat} 
                                    disabled={createCatMutation.isPending}
                                    className="bg-green-600 text-white px-3 rounded font-bold"
                                >
                                    OK
                                </button>
                                <button type="button" onClick={() => setIsCreatingCat(false)} className="text-red-500 px-2 font-bold">✕</button>
                            </>
                        ) : (
                            // MODO SELEÇÃO
                            <>
                                <select 
                                    className="border p-2 rounded text-black flex-1 h-full"
                                    value={catId} onChange={e => setCatId(e.target.value)}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {settings?.categories
                                        .filter(c => c.type === "EXPENSE")
                                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                    }
                                </select>
                                <button 
                                    type="button" 
                                    onClick={() => setIsCreatingCat(true)}
                                    className="bg-red-100 text-red-600 px-3 rounded font-bold hover:bg-red-200 border border-red-200"
                                    title="Criar nova categoria"
                                >
                                    +
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <button 
                    type="submit" disabled={createMutation.isPending}
                    className="bg-red-600 text-white px-6 py-2 rounded font-bold hover:bg-red-700 h-[42px]"
                >
                    AGENDAR
                </button>
            </form>
        </div>

        {/* --- LISTA DE CONTAS (Mantida Igual) --- */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                    <tr>
                        <th className="p-4 text-gray-600">Vencimento</th>
                        <th className="p-4 text-gray-600">Descrição</th>
                        <th className="p-4 text-gray-600">Categoria</th>
                        <th className="p-4 text-gray-600">Valor</th>
                        <th className="p-4 text-gray-600">Status</th>
                        <th className="p-4 text-right text-gray-600">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {payables?.map((p) => {
                        const late = !p.isPaid && isLate(p.dueDate);
                        return (
                            <tr key={p.id} className={`border-b hover:bg-gray-50 ${p.isPaid ? 'bg-gray-50 opacity-60' : ''}`}>
                                <td className={`p-4 font-mono ${late ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                                    {new Date(p.dueDate).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="p-4 font-medium text-gray-800">
                                    {p.description}
                                </td>
                                <td className="p-4 text-sm text-gray-500">
                                    {p.category.name}
                                </td>
                                <td className="p-4 font-bold text-gray-800">
                                    R$ {Number(p.amount).toFixed(2)}
                                </td>
                                <td className="p-4">
                                    {p.isPaid ? (
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200">
                                            PAGO EM {p.paidAt?.toLocaleDateString()}
                                        </span>
                                    ) : late ? (
                                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200 animate-pulse">
                                            ATRASADO
                                        </span>
                                    ) : (
                                        <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold border border-blue-100">
                                            A VENCER
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    {!p.isPaid ? (
                                        <div className="flex gap-2 justify-end">
                                            <button 
                                                onClick={() => { setSelectedPayableId(p.id); setPayModalOpen(true); }}
                                                className="bg-green-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-700 shadow-sm"
                                            >
                                                $ PAGAR
                                            </button>
                                            <button 
                                                onClick={() => { if(confirm("Excluir agendamento?")) deleteMutation.mutate({ id: p.id }) }}
                                                className="text-red-400 hover:text-red-600 px-2"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-xs">Finalizado</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {payables?.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nenhuma conta agendada.</td></tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* --- MODAL DE PAGAMENTO (Mantido Igual) --- */}
        {payModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                    <h3 className="text-lg font-bold mb-4 text-gray-800">Confirmar Pagamento</h3>
                    <form onSubmit={handlePay}>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Data do Pagamento</label>
                            <input 
                                type="date" required
                                className="border p-2 rounded w-full text-black"
                                value={payDate} onChange={e => setPayDate(e.target.value)}
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Saiu de qual conta?</label>
                            <select 
                                required
                                className="border p-2 rounded w-full text-black"
                                value={payAccountId} onChange={e => setPayAccountId(e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                {settings?.accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Isso criará uma despesa no Livro Caixa automaticamente.</p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setPayModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700">Confirmar Baixa</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

      </div>
    </main>
  );
}