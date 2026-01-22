"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function ReportsPage() {
  // Datas padrão: Início e Fim do mês atual
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);

  // Busca os dados (converte string do input para Date)
  const { data, refetch, isFetching } = api.reports.getFinancialReport.useQuery({
    startDate: new Date(startDate ?? ""),
    endDate: new Date(endDate ?? ""),
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8 flex flex-col items-center print:bg-white print:p-0">
      <div className="w-full max-w-5xl">
        
        {/* Cabeçalho (Escondido na Impressão) */}
        <div className="flex justify-between items-center mb-8 print:hidden">
            <h1 className="text-3xl font-bold text-blue-900">Relatórios 📊</h1>
            <div className="flex gap-4">
                {/* BOTÃO NOVO AQUI 👇 */}
                <Link href="/reports/balancete" className="bg-blue-800 text-white px-4 py-2 rounded font-bold hover:bg-blue-900 transition text-sm flex items-center gap-2">
                    📄 Balancete
                </Link>
                <Link href="/reports/livro-caixa" className="bg-green-700 text-white px-4 py-2 rounded font-bold hover:bg-green-800 transition text-sm flex items-center gap-2">
                    📖 Livro Caixa
                </Link>
                <Link href="/" className="text-gray-600 hover:text-blue-600 font-bold self-center">← Voltar</Link>
            </div>
        </div>

        {/* Filtros (Escondido na Impressão) */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 flex gap-4 items-end print:hidden">
            <div>
                <label className="block text-sm text-gray-500 mb-1">Data Início</label>
                <input 
                    type="date" 
                    className="border p-2 rounded text-black"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />
            </div>
            <div>
                <label className="block text-sm text-gray-500 mb-1">Data Fim</label>
                <input 
                    type="date" 
                    className="border p-2 rounded text-black"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
            </div>
            <button 
                onClick={() => void refetch()}
                className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 h-10"
            >
                {isFetching ? "..." : "Atualizar"}
            </button>
            
            <button 
                onClick={handlePrint}
                className="bg-gray-800 text-white px-6 py-2 rounded font-bold hover:bg-black h-10 ml-auto"
            >
                🖨️ Imprimir
            </button>
        </div>

        {/* --- ÁREA DO RELATÓRIO (IMPRESSA) --- */}
        <div className="bg-white p-8 rounded-lg shadow-md print:shadow-none print:w-full">
            
            <div className="text-center mb-8 border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800">Relatório Financeiro</h2>
                <p className="text-gray-500">
                    Período: {new Date(startDate ?? "").toLocaleDateString()} até {new Date(endDate ?? "").toLocaleDateString()}
                </p>
            </div>

            {/* Resumo Geral */}
            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
                <div className="p-4 bg-green-50 rounded print:border">
                    <p className="text-sm text-gray-500">Total Entradas</p>
                    <p className="text-xl font-bold text-green-700">R$ {data?.totalIncome.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-red-50 rounded print:border">
                    <p className="text-sm text-gray-500">Total Saídas</p>
                    <p className="text-xl font-bold text-red-700">R$ {data?.totalExpense.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded print:border">
                    <p className="text-sm text-gray-500">Resultado</p>
                    <p className={`text-xl font-bold ${ (data?.balance ?? 0) >= 0 ? 'text-blue-700' : 'text-red-700' }`}>
                        R$ {data?.balance.toFixed(2)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
                
                {/* Tabela de Entradas */}
                <div>
                    <h3 className="text-lg font-bold text-green-700 mb-2 border-b-2 border-green-200">Entradas por Categoria</h3>
                    <table className="w-full text-left text-sm">
                        <tbody>
                            {data?.incomeByCat.length === 0 && <tr><td className="text-gray-400 py-2">Sem registros</td></tr>}
                            {data?.incomeByCat.map((item) => (
                                <tr key={item.name} className="border-b">
                                    <td className="py-2 text-gray-700">{item.name}</td>
                                    <td className="py-2 text-right font-medium">R$ {item.value.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Tabela de Saídas */}
                <div>
                    <h3 className="text-lg font-bold text-red-700 mb-2 border-b-2 border-red-200">Saídas por Categoria</h3>
                    <table className="w-full text-left text-sm">
                        <tbody>
                            {data?.expenseByCat.length === 0 && <tr><td className="text-gray-400 py-2">Sem registros</td></tr>}
                            {data?.expenseByCat.map((item) => (
                                <tr key={item.name} className="border-b">
                                    <td className="py-2 text-gray-700">{item.name}</td>
                                    <td className="py-2 text-right font-medium">R$ {item.value.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>

            <div className="mt-8 text-center text-xs text-gray-400 print:mt-16">
                <p>Gerado automaticamente pelo Sistema Finan Igreja em {new Date().toLocaleString()}</p>
            </div>

        </div>
      </div>
    </main>
  );
}