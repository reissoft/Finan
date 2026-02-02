"use client";

import { useState, useTransition } from "react";
import { generateSmartReport } from "~/app/actions/generate-smart-report";
import { 
  Search, 
  Loader2, 
  FileText, 
  Calendar, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  X, 
  Printer 
} from "lucide-react";

type Transaction = {
  id: string;
  description: string;
  amount: number | string | object;
  date: Date;
  type: "INCOME" | "EXPENSE";
  category: { name: string };
  account: { name: string };
};

type ReportData = {
  title: string;
  period: string;
  data: Transaction[];
  total: number;
} | null;

export function SmartReport() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<ReportData>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSearch = () => {
    if (!query.trim()) return;
    
    setError("");
    setReport(null);

    startTransition(async () => {
      const result = await generateSmartReport(query);
      if (result.success && result.report) {
        setReport(result.report as unknown as ReportData);
      } else {
        setError(result.error ?? "Erro ao gerar relatório.");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClose = () => {
    setReport(null);
    setQuery(""); // Opcional: limpa a busca também
  };

  const handlePrint = () => {
    window.print();
  };

  const formatMoney = (val: number | string | object) => {
    const num = Number(val);
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  };

  return (
    <div className="w-full space-y-6 print:space-y-0">
      {/* 1. ÁREA DE BUSCA (Escondida na impressão) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:hidden">
        <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
          ✨ Pergunte à Inteligência Artificial
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Ex: Gastos com energia e internet neste mês..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isPending || !query}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "Gerar"}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2 ml-1">{error}</p>}
      </div>

      {/* 2. O RELATÓRIO GERADO */}
      {report && (
        <div className="
          bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden 
          animate-in fade-in slide-in-from-bottom-4 duration-500
          
          /* --- MÁGICA DA IMPRESSÃO --- */
          print:fixed print:top-0 print:left-0 print:w-full print:h-full print:z-[9999] 
          print:bg-white print:border-none print:shadow-none print:rounded-none
          print:overflow-visible
        ">
          
          {/* BARRA DE FERRAMENTAS DO RELATÓRIO (Botões) */}
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-end gap-2 print:hidden">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors"
              title="Imprimir Relatório"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <button 
              onClick={handleClose}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors"
              title="Fechar Relatório"
            >
              <X className="h-4 w-4" />
              Fechar
            </button>
          </div>

          {/* CABEÇALHO */}
          <div className="bg-gray-50 p-6 border-b border-gray-200 text-center print:bg-white print:border-black/10">
            <div className="flex justify-center mb-2 print:hidden">
              <div className="bg-blue-100 p-3 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 print:text-2xl print:text-black">{report.title}</h3>
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mt-1 print:text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{report.period}</span>
            </div>
          </div>

          {/* LISTA (TABELA) */}
          <div className="p-0">
            {report.data.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Nenhum registro encontrado para este filtro.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b print:bg-gray-100 print:text-black">
                  <tr>
                    <th className="px-6 py-3">Data</th>
                    <th className="px-6 py-3">Descrição</th>
                    <th className="px-6 py-3">Categoria</th>
                    <th className="px-6 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                  {report.data.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors print:hover:bg-transparent">
                      <td className="px-6 py-4 text-gray-600 print:text-black">
                        {new Date(item.date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800 print:text-black">
                        {item.description}
                        <span className="block text-xs text-gray-400 font-normal print:text-gray-500">{item.account.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 print:border print:border-gray-300 print:bg-transparent">
                          {item.category.name}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${item.type === 'INCOME' ? 'text-green-600' : 'text-red-600'} print:text-black`}>
                        {item.type === 'INCOME' ? '+' : '-'} {formatMoney(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* TOTAL */}
          <div className="bg-gray-50 p-6 border-t border-gray-200 flex justify-between items-center print:bg-white print:border-t-2 print:border-black">
             <span className="text-gray-500 font-medium print:text-black font-bold">Total do Período</span>
             <div className="flex items-center gap-2">
                <div className="print:hidden">
                  {report.total >= 0 ? (
                      <ArrowUpCircle className="text-green-600 h-6 w-6" />
                  ) : (
                      <ArrowDownCircle className="text-red-600 h-6 w-6" />
                  )}
                </div>
                <span className={`text-2xl font-bold ${report.total >= 0 ? 'text-gray-900' : 'text-red-600'} print:text-black`}>
                    {formatMoney(report.total)}
                </span>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}