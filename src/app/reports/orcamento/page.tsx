"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { AlertTriangle, CheckCircle, TrendingUp, Trophy } from "lucide-react";

export default function OrcamentoReportPage() {
  // Buscamos os dados do orçamento (Já vem calculado do backend)
  const { data: budgets, isLoading, refetch } = api.budget.getBudgetProgress.useQuery();

  const handlePrint = () => {
    window.print();
  };

  const formatMoney = (val: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <main className="min-h-screen bg-gray-100 p-8 flex flex-col items-center print:bg-white print:p-0">
      <div className="w-full max-w-5xl">
        
        {/* Cabeçalho (Escondido na Impressão) */}
        <div className="flex justify-between items-center mb-8 print:hidden">
            <h1 className="text-3xl font-bold text-purple-900">Relatório de Orçamentos 🎯</h1>
            <div className="flex gap-4">
                <button 
                    onClick={() => void refetch()}
                    className="bg-purple-600 text-white px-6 py-2 rounded font-bold hover:bg-purple-700 h-10"
                >
                    Atualizar
                </button>
                <button 
                    onClick={handlePrint}
                    className="bg-gray-800 text-white px-6 py-2 rounded font-bold hover:bg-black h-10"
                >
                    🖨️ Imprimir
                </button>
                <Link href="/reports" className="text-gray-600 hover:text-blue-600 font-bold self-center ml-2">← Voltar</Link>
            </div>
        </div>

        {/* --- ÁREA DO RELATÓRIO (IMPRESSA) --- */}
        <div className="bg-white p-8 rounded-lg shadow-md print:shadow-none print:w-full">
            
            <div className="text-center mb-8 border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800">Execução Orçamentária</h2>
                <p className="text-gray-500">
                   Acompanhamento de Metas de Receitas e Limites de Despesas
                </p>
                <p className="text-xs text-gray-400 mt-1">Gerado em {new Date().toLocaleString()}</p>
            </div>

            {isLoading ? (
                 <div className="text-center py-10 text-gray-500">Carregando dados...</div>
            ) : (!budgets || budgets.length === 0) ? (
                <div className="text-center py-10 text-gray-500 border border-dashed rounded bg-gray-50">
                    Nenhum orçamento cadastrado para este período.
                </div>
            ) : (
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider border-b border-gray-200">
                            <th className="p-3">Categoria / Meta</th>
                            <th className="p-3">Vigência</th>
                            <th className="p-3 text-right">Meta (R$)</th>
                            <th className="p-3 text-right">Realizado (R$)</th>
                            <th className="p-3 text-right">Diferença</th>
                            <th className="p-3 text-center">%</th>
                            <th className="p-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {budgets.map((item) => {
                            const diff = item.amount - item.actual;
                            // Se for receita, Diferença Positiva é ruim (faltou arrecadar). 
                            // Se for despesa, Diferença Positiva é boa (sobrou dinheiro).
                            
                            return (
                                <tr key={item.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3">
                                        <div className="font-bold text-gray-800">{item.category.name}</div>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                            item.category.type === 'INCOME' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {item.category.type === 'INCOME' ? 'Receita' : 'Despesa'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-xs text-gray-500">
                                        {new Date(item.startDate).toLocaleDateString()} <br/> a {new Date(item.endDate).toLocaleDateString()}
                                    </td>
                                    <td className="p-3 text-right font-medium text-gray-600">
                                        {formatMoney(item.amount)}
                                    </td>
                                    <td className="p-3 text-right font-bold text-gray-800">
                                        {formatMoney(item.actual)}
                                    </td>
                                    <td className={`p-3 text-right font-bold ${
                                        item.category.type === 'EXPENSE' 
                                            ? (diff >= 0 ? 'text-green-600' : 'text-red-600') // Despesa: Sobrar é verde
                                            : (diff <= 0 ? 'text-green-600' : 'text-red-600') // Receita: Sobrar (ultrapassar meta) é verde
                                    }`}>
                                        {formatMoney(diff)}
                                        <div className="text-[10px] font-normal text-gray-400">
                                            {item.category.type === 'EXPENSE' ? (diff >= 0 ? 'Disponível' : 'Estourado') : (diff > 0 ? 'Falta' : 'Excedente')}
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="font-bold">{item.percentage.toFixed(1)}%</span>
                                        </div>
                                        {/* Barrinha visual na tabela */}
                                        <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                                            <div 
                                                className={`h-full ${
                                                    item.category.type === 'INCOME' 
                                                        ? (item.percentage >= 100 ? 'bg-green-500' : 'bg-blue-500')
                                                        : (item.percentage >= 100 ? 'bg-red-500' : 'bg-green-500')
                                                }`} 
                                                style={{width: `${Math.min(item.percentage, 100)}%`}}
                                            />
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        {item.status === 'EXCEEDED' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                                                <AlertTriangle className="h-3 w-3" /> Estourou
                                            </span>
                                        )}
                                        {item.status === 'WARNING' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
                                                <AlertTriangle className="h-3 w-3" /> Atenção
                                            </span>
                                        )}
                                        {item.status === 'NORMAL' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                                                <CheckCircle className="h-3 w-3" /> Normal
                                            </span>
                                        )}
                                        {item.status === 'ACHIEVED' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                                <Trophy className="h-3 w-3" /> Meta Batida
                                            </span>
                                        )}
                                        {item.status === 'IN_PROGRESS' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                                <TrendingUp className="h-3 w-3" /> Em Curso
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            {/* Rodapé do Relatório */}
            <div className="mt-12 pt-4 border-t border-gray-200 flex justify-between text-xs text-gray-500">
                <div>
                    <p className="font-bold">Legenda:</p>
                    <p>🟢 Receitas: Meta atingida ou superada.</p>
                    <p>🔴 Despesas: Limite orçamentário excedido.</p>
                </div>
                <div className="text-right">
                    <p>Assinatura do Tesoureiro: __________________________</p>
                    <br/>
                    <p>Assinatura do Pastor/Presidente: __________________________</p>
                </div>
            </div>
        </div>
      </div>
    </main>
  );
}