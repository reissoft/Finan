"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function LivroCaixaPage() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);
  
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("TESOUREIRO(A)");

  // --- MUDANÇA 1: Capturando erro e desligando retry ---
  const { data, refetch, isFetching, isError, error } = api.reports.getCashBook.useQuery(
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
                    <Link href="/reports" className="text-gray-500 hover:text-green-600 font-bold text-sm">← Voltar aos Relatórios</Link>
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
                        ? "O Livro Caixa detalhado é um recurso exclusivo do plano PRO. O plano Grátis oferece apenas o Resumo Financeiro. Faça o upgrade para acessar."
                        : `Ocorreu um erro técnico: ${error.message}`
                    }
                </p>

                {isPlanError && (
                    <button onClick={() => window.location.href = "/settings"} className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
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
      <div className="w-full max-w-[210mm] bg-white p-4 rounded-lg shadow mb-8 print:hidden flex flex-wrap gap-4 items-end border-l-4 border-green-700">
        <div className="w-full flex justify-between">
            <h1 className="font-bold text-xl text-green-900">Novo Livro Caixa 📖</h1>
            <Link href="/reports" className="text-gray-500 hover:text-green-600 font-bold text-sm">← Voltar</Link>
        </div>
        <input type="date" className="border p-1 rounded text-sm text-black" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <input type="date" className="border p-1 rounded text-sm text-black" value={endDate} onChange={e => setEndDate(e.target.value)} />
        
        <button onClick={() => void refetch()} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-green-700">
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
            <p>LIVRO CAIXA DE {new Date(startDate ?? "").toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        </div>

        {/* TABELA DE LANÇAMENTOS */}
        <table className="w-full border-collapse mb-8">
            <thead>
                <tr className="border-b-2 border-black text-left font-bold">
                    <th className="py-1 w-20">DATA</th>
                    <th className="py-1 w-48">CONTA</th>
                    <th className="py-1">HISTÓRICO</th>
                    <th className="py-1 text-right w-24">VALOR D/C</th>
                </tr>
            </thead>
            <tbody>
                {data?.transactions.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 print:border-gray-200">
                        <td className="py-1 align-top">{fmtDate(t.date)}</td>
                        <td className="py-1 align-top pr-2 leading-tight">{t.categoryName}</td>
                        <td className="py-1 align-top text-gray-700 leading-tight">{t.description}</td>
                        <td className="py-1 align-top text-right font-medium whitespace-nowrap">
                            {fmt(t.value)} <span className="ml-1 font-bold">{t.type === 'INCOME' ? 'C' : 'D'}</span>
                        </td>
                    </tr>
                ))}
                {data?.transactions.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center italic text-gray-400">Nenhum lançamento neste período.</td></tr>
                )}
            </tbody>
        </table>

        {/* RESUMO (Igual PDF Pág 3) */}
        <div className="flex justify-end mt-4 break-inside-avoid">
            <div className="w-1/3 border-t-2 border-black pt-1">
                <div className="flex justify-between py-0.5">
                    <span>SALDO ANTERIOR</span>
                    <span>{fmt(data?.previousBalance ?? 0)}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-gray-300">
                    <span>RESULTADO</span>
                    <span className={(data?.result ?? 0) < 0 ? 'text-red-700 print:text-black' : ''}>
                        {fmt(data?.result ?? 0)}
                    </span>
                </div>
                <div className="flex justify-between py-2 font-bold text-sm">
                    <span>SALDO ATUAL</span>
                    <span>{fmt(data?.currentBalance ?? 0)}</span>
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
            Sistema Finan Igreja • Livro Caixa • Pág. 1
        </div>

      </div>
    </main>
  );
}