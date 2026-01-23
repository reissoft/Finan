"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function ContasPagarReportPage() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);
  
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("TESOUREIRO(A)");

  // --- MUDANÇA 1: Capturando erro e desligando retry ---
  const { data, refetch, isFetching, isError, error } = api.reports.getPayablesReport.useQuery(
    {
        startDate: new Date(startDate ?? ""),
        endDate: new Date(endDate ?? ""),
    },
    {
        retry: false, // Importante: Não tenta de novo se for erro de permissão
        refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (data?.treasurerName) setSignerName(data.treasurerName);
  }, [data]);

  const handlePrint = () => window.print();
  const fmt = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR');

  // =========================================================
  // MUDANÇA 2: Renderização Condicional da Tela de Bloqueio
  // =========================================================
  if (isError) {
    // Verifica se é o erro de plano (FORBIDDEN ou PLAN_LIMIT_REACHED)
    const isPlanError = error.data?.code === "FORBIDDEN" || error.message.includes("PLAN_LIMIT_REACHED");

    return (
        <main className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
            {/* Mantemos o menu superior para o usuário poder voltar */}
            <div className="w-full max-w-[210mm] bg-white p-4 rounded-lg shadow mb-8 flex flex-wrap gap-4 items-center border-l-4 border-gray-400">
                <div className="w-full flex justify-between">
                    <h1 className="font-bold text-xl text-gray-500">Relatório Bloqueado</h1>
                    <Link href="/reports" className="text-gray-500 hover:text-red-600 font-bold text-sm">← Voltar aos Relatórios</Link>
                </div>
            </div>

            {/* A TELA DE BLOQUEIO */}
            <div className="flex flex-col items-center justify-center bg-white p-12 rounded-lg shadow-xl text-center max-w-lg mt-10">
                <div className="text-6xl mb-6">
                    {isPlanError ? "🔒" : "⚠️"}
                </div>
                
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {isPlanError ? "Funcionalidade Exclusiva PRO" : "Erro ao carregar"}
                </h2>
                
                <p className="text-gray-600 mb-8 leading-relaxed">
                    {isPlanError 
                        ? "O Relatório de Contas a Pagar (Previsão Financeira) é um recurso exclusivo do plano PRO. Faça o upgrade para organizar os vencimentos da sua igreja."
                        : `Ocorreu um erro técnico: ${error.message}`
                    }
                </p>

                {isPlanError && (
                    <button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                        ⭐ Quero ser PRO
                    </button>
                )}
                
                {!isPlanError && (
                    <button onClick={() => refetch()} className="bg-gray-200 text-gray-800 px-6 py-2 rounded hover:bg-gray-300">
                        Tentar Novamente
                    </button>
                )}
            </div>
        </main>
    );
  }

  // =========================================================
  // SE NÃO TIVER ERRO, RENDERIZA O RELATÓRIO NORMALMENTE
  // =========================================================
  return (
    <main className="min-h-screen bg-gray-100 p-8 flex flex-col items-center print:bg-white print:p-0">
      
      {/* MENU DE CONTROLE */}
      <div className="w-full max-w-[210mm] bg-white p-4 rounded-lg shadow mb-8 print:hidden flex flex-wrap gap-4 items-end border-l-4 border-red-700">
        <div className="w-full flex justify-between">
            <h1 className="font-bold text-xl text-red-900">Relatório de Contas a Pagar 💸</h1>
            <Link href="/reports" className="text-gray-500 hover:text-red-600 font-bold text-sm">← Voltar</Link>
        </div>
        <input type="date" className="border p-1 rounded text-sm text-black" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <input type="date" className="border p-1 rounded text-sm text-black" value={endDate} onChange={e => setEndDate(e.target.value)} />
     
        <button onClick={() => void refetch()} className="bg-red-600 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-red-700">
            {isFetching ? "..." : "Atualizar"}
        </button>
        <button onClick={handlePrint} className="bg-gray-800 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-black">
            🖨️ Imprimir
        </button>
      </div>

      {/* FOLHA A4 */}
      <div className="w-full max-w-[210mm] bg-white p-[1cm] shadow-2xl print:shadow-none print:p-0 text-black font-sans text-xs uppercase">
        
        {/* CABEÇALHO */}
        <div className="text-center font-bold mb-6">
            <p className="text-[10px] text-gray-600 my-0.5">{data?.tenantDesc ?? "SÍNODO / PRESBITÉRIO"}</p>
            <p className="text-base mt-1">{data?.tenantName}</p>
            <div className="border-b-2 border-black w-full mt-4 mb-2"></div>
            <p>PREVISÃO DE CONTAS A PAGAR - {new Date(startDate ?? "").toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        </div>

        {/* TABELA */}
        <table className="w-full border-collapse mb-8">
            <thead>
                <tr className="border-b-2 border-black text-left font-bold">
                    <th className="py-1 w-24">VENCIMENTO</th>
                    <th className="py-1">DESCRIÇÃO</th>
                    <th className="py-1 w-32">CATEGORIA</th>
                    <th className="py-1 w-24">SITUAÇÃO</th>
                    <th className="py-1 text-right w-24">VALOR</th>
                </tr>
            </thead>
            <tbody>
                {data?.payables.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 print:border-gray-200">
                        <td className="py-1 align-top">{fmtDate(p.dueDate)}</td>
                        <td className="py-1 align-top pr-2 leading-tight">{p.description}</td>
                        <td className="py-1 align-top text-gray-500 leading-tight">{p.categoryName}</td>
                        <td className="py-1 align-top">
                            {p.isPaid ? (
                                <span className="font-bold text-black print:text-black">PAGO</span>
                            ) : (
                                <span className="font-bold text-red-600 print:text-black">ABERTO</span>
                            )}
                        </td>
                        <td className="py-1 align-top text-right font-medium">
                            {fmt(p.value)}
                        </td>
                    </tr>
                ))}
                {data?.payables.length === 0 && (
                    <tr><td colSpan={5} className="py-4 text-center italic text-gray-400">Nenhuma conta agendada para este período.</td></tr>
                )}
            </tbody>
        </table>

        {/* RESUMO DE VALORES */}
        <div className="flex justify-end mt-4 break-inside-avoid">
            <div className="w-1/2 border-t-2 border-black pt-1">
                <div className="flex justify-between py-0.5 text-gray-600">
                    <span>TOTAL JÁ PAGO</span>
                    <span>{fmt(data?.totalPaid ?? 0)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-red-800 font-bold print:text-black">
                    <span>TOTAL EM ABERTO (A PAGAR)</span>
                    <span>{fmt(data?.totalPending ?? 0)}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-sm border-t border-gray-300 mt-1">
                    <span>TOTAL GERAL DO PERÍODO</span>
                    <span>{fmt(data?.totalGeneral ?? 0)}</span>
                </div>
            </div>
        </div>

        {/* ASSINATURAS */}
        <div className="mt-16 grid grid-cols-2 gap-12 text-center break-inside-avoid">
            <div>
                <div className="border-t border-black pt-2 mx-8">
                    {signerName || "_______________________"}
                </div>
                <p className="text-[10px] mt-1">{signerRole}</p>
            </div>
            <div>
                <div className="border-t border-black pt-2 mx-8">
                    {data?.tenantCity} ({data?.tenantState}), {new Date().toLocaleDateString('pt-BR')}
                </div>
                <p className="text-[10px] mt-1">DATA DE EMISSÃO</p>
            </div>
        </div>

        <div className="text-[8px] text-gray-400 text-center mt-8 print:fixed print:bottom-2 print:w-full">
            Sistema Finan Igreja • Contas a Pagar • Pág. 1
        </div>

      </div>
    </main>
  );
}