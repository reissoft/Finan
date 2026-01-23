"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

// --- FUNÇÃO AUXILIAR PARA LIMPAR CARACTERES ESPECIAIS XML ---
const escapeXml = (unsafe: string | number | undefined | null) => {
  if (unsafe === undefined || unsafe === null) return "";
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export default function BalancetePage() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastDay.toISOString().split('T')[0]);
  
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("TESOUREIRO(A)");

  // --- MUDANÇA 1: Capturando erro e desligando retry ---
  const { data, refetch, isFetching, isError, error } = api.reports.getBalanceSheet.useQuery(
    {
        startDate: new Date(startDate ?? ""),
        endDate: new Date(endDate ?? ""),
    },
    {
        retry: false, // Importante: Não tenta de novo se for erro de permissão
        refetchOnWindowFocus: false,
    }
  );

  // --- EFEITO PARA PREENCHER O NOME AUTOMATICAMENTE ---
  useEffect(() => {
    if (data?.treasurerName) {
        setSignerName(data.treasurerName);
    }
  }, [data]);

  const handlePrint = () => window.print();

  // --- FUNÇÃO: GERAR E BAIXAR XML ---
  const handleDownloadXML = () => {
    if (!data) return;

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<Balancete>\n';
    
    xml += '  <Cabecalho>\n';
    xml += `    <Instituicao>${escapeXml(data.tenantName)}</Instituicao>\n`;
    xml += `    <Descricao>${escapeXml(data.tenantDesc)}</Descricao>\n`;
    xml += `    <Cidade>${escapeXml(data.tenantCity)}</Cidade>\n`;
    xml += `    <Estado>${escapeXml(data.tenantState)}</Estado>\n`;
    xml += `    <PeriodoInicio>${startDate}</PeriodoInicio>\n`;
    xml += `    <PeriodoFim>${endDate}</PeriodoFim>\n`;
    xml += `    <Tesoureiro>${escapeXml(signerName)}</Tesoureiro>\n`;
    xml += '  </Cabecalho>\n';

    xml += '  <Resumo>\n';
    xml += `    <SaldoAnterior>${data.previousBalance.toFixed(2)}</SaldoAnterior>\n`;
    xml += `    <TotalReceitas>${data.periodIncome.toFixed(2)}</TotalReceitas>\n`;
    xml += `    <TotalDespesas>${data.periodExpense.toFixed(2)}</TotalDespesas>\n`;
    xml += `    <ResultadoExercicio>${data.result.toFixed(2)}</ResultadoExercicio>\n`;
    xml += `    <SaldoAtual>${data.currentBalance.toFixed(2)}</SaldoAtual>\n`;
    xml += '  </Resumo>\n';

    xml += '  <Receitas>\n';
    data.incomeList.forEach(item => {
      xml += '    <Item>\n';
      xml += `      <Conta>${escapeXml(item.name)}</Conta>\n`;
      xml += `      <Valor>${item.value.toFixed(2)}</Valor>\n`;
      xml += '    </Item>\n';
    });
    xml += '  </Receitas>\n';

    xml += '  <Despesas>\n';
    data.expenseList.forEach(item => {
      xml += '    <Item>\n';
      xml += `      <Conta>${escapeXml(item.name)}</Conta>\n`;
      xml += `      <Valor>${item.value.toFixed(2)}</Valor>\n`;
      xml += '    </Item>\n';
    });
    xml += '  </Despesas>\n';

    xml += '</Balancete>';

    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balancete_${startDate}_${endDate}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fmt = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // =========================================================
  // MUDANÇA 2: Renderização Condicional da Tela de Bloqueio
  // =========================================================
  if (isError) {
    // Verifica se é o erro de plano que criamos no backend
    const isPlanError = error.data?.code === "FORBIDDEN" || error.message.includes("PLAN_LIMIT_REACHED");

    return (
        <main className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
            {/* Mantemos o menu superior para o usuário poder voltar */}
            <div className="w-full max-w-[210mm] bg-white p-4 rounded-lg shadow mb-8 flex flex-wrap gap-4 items-center border-l-4 border-gray-400">
                <div className="w-full flex justify-between">
                    <h1 className="font-bold text-xl text-gray-500">Relatório Bloqueado</h1>
                    <Link href="/reports" className="text-gray-500 hover:text-blue-600 font-bold text-sm">← Voltar aos Relatórios</Link>
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
                        ? "O Balancete Detalhado, Livro Caixa e Contas a Pagar são recursos exclusivos do plano PRO. Faça o upgrade da sua igreja para acessar relatórios avançados."
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
        <button onClick={handleDownloadXML} disabled={!data} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex gap-2 items-center">
            📥 XML
        </button>
      </div>

      {/* --- FOLHA A4 (O Relatório Real) --- */}
      <div className="w-full max-w-[210mm] bg-white p-[1cm] shadow-2xl print:shadow-none print:p-0 text-black font-sans text-xs uppercase">
        
        {/* CABEÇALHO */}
        <div className="text-center font-bold mb-6">
            <p className="text-[10px] text-gray-600 my-0.5">{data?.tenantDesc ?? "SÍNODO / PRESBITÉRIO"}</p>
            <p className="text-base mt-1">{data?.tenantName}</p>
            <div className="border-b-2 border-black w-full mt-4 mb-2"></div>
            <p>BALANCETE POR CONTA DE {new Date(startDate ?? "").toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        </div>

        {/* RECEITAS */}
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

        {/* DESPESAS */}
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

        {/* RESUMO */}
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