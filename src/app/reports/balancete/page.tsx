"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function BalancetePage() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);
  
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("TESOUREIRO(A)");

  const { data, refetch, isFetching } = api.reports.getBalanceSheet.useQuery({
    startDate: new Date(startDate ?? ""),
    endDate: new Date(endDate ?? ""),
  });

  // --- NOVO: EFEITO PARA PREENCHER O NOME AUTOMATICAMENTE ---
  useEffect(() => {
    if (data?.treasurerName) {
        setSignerName(data.treasurerName);
    }
  }, [data]);
  // -----------------------------------------------------------

  const handlePrint = () => window.print();
  const fmt = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <main className="min-h-screen bg-gray-100 p-8 flex flex-col items-center print:bg-white print:p-0">
      
      {/* --- MENU DE CONTROLE (Oculto na Impressão) --- */}
      <div className="w-full max-w-[210mm] bg-white p-4 rounded-lg shadow mb-8 print:hidden flex flex-wrap gap-4 items-end border-l-4 border-blue-900">
        <div className="w-full flex justify-between">
            <h1 className="font-bold text-xl text-blue-900">Novo Balancete</h1>
            <Link href="/reports" className="text-gray-500 hover:text-blue-600 font-bold text-sm">← Voltar aos Relatórios</Link>
        </div>

        <div>
            <label className="block text-[10px] text-gray-500 font-bold uppercase">Início</label>
            <input type="date" className="border p-1 rounded text-sm text-black" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
            <label className="block text-[10px] text-gray-500 font-bold uppercase">Fim</label>
            <input type="date" className="border p-1 rounded text-sm text-black" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        
        
        <button onClick={() => void refetch()} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-blue-700">
            {isFetching ? "..." : "Atualizar"}
        </button>
        <button onClick={handlePrint} className="bg-gray-800 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-black flex gap-2 items-center">
            🖨️ Imprimir
        </button>
      </div>

      {/* --- FOLHA A4 (O Relatório Real) --- */}
      <div className="w-full max-w-[210mm] bg-white p-[1cm] shadow-2xl print:shadow-none print:p-0 text-black font-sans text-xs uppercase">
        
        {/* CABEÇALHO [cite: 26, 27, 28] */}
        <div className="text-center font-bold mb-6">
            <p className="text-sm">IGREJA PRESBITERIANA DO BRASIL</p>
            <p className="text-[10px] text-gray-600 my-0.5">{data?.tenantDesc ?? "SÍNODO / PRESBITÉRIO"}</p>
            <p className="text-base mt-1">{data?.tenantName}</p>
            <div className="border-b-2 border-black w-full mt-4 mb-2"></div>
            <p>BALANCETE POR CONTA DE {new Date(startDate ?? "").toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        </div>

        {/* RECEITAS [cite: 34, 35] */}
        <div className="mb-4">
            <h3 className="font-bold border-b border-gray-400 mb-1">RECEITAS</h3>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="text-[10px] text-gray-500 text-left">
                        <th className="font-normal pb-1 w-3/4">CONTA</th>
                        <th className="font-normal pb-1 text-right">R$</th>
                    </tr>
                </thead>
                <tbody>
                    {data?.incomeList.map((item) => (
                        <tr key={item.name} className="border-b border-gray-100 print:border-none">
                            <td className="py-0.5 pr-2">{item.name}</td>
                            <td className="py-0.5 text-right">{fmt(item.value)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="font-bold border-t border-black">
                        <td className="py-1">TOTAL RECEITAS</td>
                        <td className="py-1 text-right">{fmt(data?.periodIncome ?? 0)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* DESPESAS [cite: 38, 39] */}
        <div className="mb-4">
            <h3 className="font-bold border-b border-gray-400 mb-1">DESPESAS</h3>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="text-[10px] text-gray-500 text-left">
                        <th className="font-normal pb-1 w-3/4">CONTA</th>
                        <th className="font-normal pb-1 text-right">R$</th>
                    </tr>
                </thead>
                <tbody>
                    {data?.expenseList.map((item) => (
                        <tr key={item.name} className="border-b border-gray-100 print:border-none">
                            <td className="py-0.5 pr-2">{item.name}</td>
                            <td className="py-0.5 text-right">{fmt(item.value)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="font-bold border-t border-black">
                        <td className="py-1">TOTAL DESPESAS</td>
                        <td className="py-1 text-right">{fmt(data?.periodExpense ?? 0)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* RESUMO [cite: 43] */}
        <div className="flex justify-end mt-6">
            <div className="w-1/2 border-t-2 border-black pt-1">
                <div className="flex justify-between py-0.5">
                    <span>SALDO ANTERIOR</span>
                    <span>{fmt(data?.previousBalance ?? 0)}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-gray-300">
                    <span>RESULTADO DO MÊS</span>
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

        {/* ASSINATURAS [cite: 45] */}
        <div className="mt-16 grid grid-cols-2 gap-12 text-center break-inside-avoid">
            <div>
                <div className="border-t border-black pt-2 mx-8">
                    {signerName || "_______________________"}
                </div>
                <p className="text-[10px] mt-1">{signerRole}</p>
            </div>
            <div>
                <div className="border-t border-black pt-2 mx-8">
                    {new Date().toLocaleDateString('pt-BR')}
                </div>
                <p className="text-[10px] mt-1">DATA EMISSÃO</p>
            </div>
        </div>
        
        <div className="text-[8px] text-gray-400 text-center mt-8 print:fixed print:bottom-2 print:w-full">
            Sistema Finan Igreja • Pág. 1
        </div>

      </div>
    </main>
  );
}