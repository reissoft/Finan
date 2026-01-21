"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function SettingsPage() {
  // States para formulários
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [accName, setAccName] = useState("");

  // Buscando dados
  const { data, refetch } = api.settings.getAll.useQuery();

  // Mutations (Ações)
  // CORREÇÃO: Adicionado 'void' antes de todos os refetch()
  const createCat = api.settings.createCategory.useMutation({ 
    onSuccess: () => { void refetch(); setCatName(""); } 
  });
  
  const deleteCat = api.settings.deleteCategory.useMutation({ 
    onSuccess: () => void refetch(), 
    onError: () => alert("Não é possível apagar categoria em uso.") 
  });

  const createAcc = api.settings.createAccount.useMutation({ 
    onSuccess: () => { void refetch(); setAccName(""); } 
  });
  
  const deleteAcc = api.settings.deleteAccount.useMutation({ 
    onSuccess: () => void refetch(), 
    onError: () => alert("Não é possível apagar conta em uso.") 
  });

  return (
    <main className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-blue-900">Configurações ⚙️</h1>
            <Link href="/" className="text-gray-600 hover:text-blue-600 font-bold">← Voltar para Financeiro</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* COLUNA 1: CATEGORIAS */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Categorias</h2>
                
                {/* Form Categoria */}
                <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    // CORREÇÃO: void aqui
                    createCat.mutate({ name: catName, type: catType }); 
                }} className="flex gap-2 mb-6">
                    <input 
                        className="border p-2 rounded flex-1 text-black" 
                        placeholder="Nova Categoria..." 
                        value={catName} onChange={e => setCatName(e.target.value)} required 
                    />
                    <select 
                        className="border p-2 rounded text-black"
                        value={catType} onChange={(e) => setCatType(e.target.value as "INCOME" | "EXPENSE")}
                    >
                        <option value="INCOME">Entrada</option>
                        <option value="EXPENSE">Saída</option>
                    </select>
                    <button type="submit" disabled={createCat.isPending} className="bg-green-600 text-white px-4 rounded font-bold">+</button>
                </form>

                {/* Lista Categorias */}
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                    {data?.categories.map(c => (
                        <li key={c.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border rounded">
                            <span className="text-gray-700">
                                {c.name} 
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded ${c.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {c.type === 'INCOME' ? 'Entrada' : 'Saída'}
                                </span>
                            </span>
                            <button 
                                onClick={() => { 
                                    // CORREÇÃO: void aqui
                                    if(confirm("Apagar?")) void deleteCat.mutate({ id: c.id }) 
                                }} 
                                className="text-red-400 hover:text-red-600"
                            >
                                🗑️
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* COLUNA 2: CONTAS BANCÁRIAS */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Contas / Caixas</h2>
                
                {/* Form Conta */}
                <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    // CORREÇÃO: void aqui
                    createAcc.mutate({ name: accName }); 
                }} className="flex gap-2 mb-6">
                    <input 
                        className="border p-2 rounded flex-1 text-black" 
                        placeholder="Nome da Conta (ex: Cofre)" 
                        value={accName} onChange={e => setAccName(e.target.value)} required 
                    />
                    <button type="submit" disabled={createAcc.isPending} className="bg-blue-600 text-white px-4 rounded font-bold">+</button>
                </form>

                {/* Lista Contas */}
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                    {data?.accounts.map(a => (
                        <li key={a.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border rounded">
                            <span className="text-gray-700 font-medium">🏦 {a.name}</span>
                            <button 
                                onClick={() => { 
                                    // CORREÇÃO: void aqui
                                    if(confirm("Apagar?")) void deleteAcc.mutate({ id: a.id }) 
                                }} 
                                className="text-red-400 hover:text-red-600"
                            >
                                🗑️
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

        </div>
      </div>
    </main>
  );
}