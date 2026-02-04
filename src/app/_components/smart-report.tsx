"use client";

import { useState, useTransition } from "react";
import { generateSmartReport } from "~/app/actions/generate-smart-report";
import { useTenantPlan } from "~/hooks/use-tenant-plan";
import { ProFeatureBlock } from "~/components/ui/pro-feature-block";
import {
  Search,
  Loader2,
  FileText,
  Calendar,
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  Printer,
  Crown,
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
  const [showProBlock, setShowProBlock] = useState(true);

  // Verificar plano do tenant
  const { isPro, plan, isLoading } = useTenantPlan();

  const handleSearch = () => {
    if (!query.trim()) return;

    setError("");
    setReport(null);

    startTransition(async () => {
      try {
        const result = await generateSmartReport(query);
        if (result.success && result.report) {
          setReport(result.report as unknown as ReportData);
        } else {
          setError(result.error ?? "Erro ao gerar relatório.");
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("plano PRO")) {
          setError(
            "Relatórios com IA são exclusivos do plano PRO. Clique em 'Fazer Upgrade para PRO' para desbloquear.",
          );
        } else {
          setError(
            error instanceof Error ? error.message : "Erro ao gerar relatório.",
          );
        }
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
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num);
  };

  // Componente de bloqueio para planos gratuitos
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="text-center">
            <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isPro) {
    if (!showProBlock) {
      // Renderiza componente compacto quando fechado
      return (
        <div className="w-full">
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-amber-600" />
              <div>
                <h4 className="text-sm font-semibold text-gray-800">
                  Relatórios com IA Bloqueado
                </h4>
                <p className="text-xs text-gray-600">
                  Recursos exclusivos plano PRO
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowProBlock(true)}
              className="flex items-center gap-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
            >
              <Crown className="h-4 w-4" />
              Ver PRO
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full">
        <ProFeatureBlock
          feature="Relatórios com IA"
          description="Gere relatórios inteligentes usando Inteligência Artificial. Faça perguntas em linguagem natural e obtenha insights financeiros instantâneos."
          benefits={[
            "Relatórios com IA personalizados",
            "Perguntas em linguagem natural",
            "Insights financeiros automáticos",
            "Análise avançada de tendências",
          ]}
          onClose={() => setShowProBlock(false)}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 print:space-y-0">
      {/* 1. ÁREA DE BUSCA (Escondida na impressão) */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm print:hidden">
        <div className="mb-2 flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <label className="text-sm font-medium text-gray-700">
            ✨ Pergunte à Inteligência Artificial
          </label>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
            PRO
          </span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Ex: Gastos com energia e internet neste mês..."
              className="w-full rounded-lg border border-gray-200 py-3 pr-4 pl-10 transition-all outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isPending || !query}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Gerar"}
          </button>
        </div>
        {error && <p className="mt-2 ml-1 text-sm text-red-500">{error}</p>}
      </div>

      {/* 2. O RELATÓRIO GERADO */}
      {report && (
        <div className="animate-in fade-in slide-in-from-bottom-4 /* --- MÁGICA DA IMPRESSÃO --- */ overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg duration-500 print:fixed print:top-0 print:left-0 print:z-[9999] print:h-full print:w-full print:overflow-visible print:rounded-none print:border-none print:bg-white print:shadow-none">
          {/* BARRA DE FERRAMENTAS DO RELATÓRIO (Botões) */}
          <div className="flex justify-end gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
              title="Imprimir Relatório"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <button
              onClick={handleClose}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Fechar Relatório"
            >
              <X className="h-4 w-4" />
              Fechar
            </button>
          </div>

          {/* CABEÇALHO */}
          <div className="border-b border-gray-200 bg-gray-50 p-6 text-center print:border-black/10 print:bg-white">
            <div className="mb-2 flex justify-center print:hidden">
              <div className="rounded-full bg-blue-100 p-3">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 print:text-2xl print:text-black">
              {report.title}
            </h3>
            <div className="mt-1 flex items-center justify-center gap-2 text-sm text-gray-500 print:text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{report.period}</span>
            </div>
          </div>

          {/* LISTA (TABELA) */}
          <div className="p-0">
            {report.data.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhum registro encontrado para este filtro.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 font-medium text-gray-500 print:bg-gray-100 print:text-black">
                  <tr>
                    <th className="px-6 py-3">Data</th>
                    <th className="px-6 py-3">Descrição</th>
                    <th className="px-6 py-3">Categoria</th>
                    <th className="px-6 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                  {report.data.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-gray-50 print:hover:bg-transparent"
                    >
                      <td className="px-6 py-4 text-gray-600 print:text-black">
                        {new Date(item.date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800 print:text-black">
                        {item.description}
                        <span className="block text-xs font-normal text-gray-400 print:text-gray-500">
                          {item.account.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 print:border print:border-gray-300 print:bg-transparent">
                          {item.category.name}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-bold ${item.type === "INCOME" ? "text-green-600" : "text-red-600"} print:text-black`}
                      >
                        {item.type === "INCOME" ? "+" : "-"}{" "}
                        {formatMoney(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* TOTAL */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 p-6 print:border-t-2 print:border-black print:bg-white">
            <span className="font-bold font-medium text-gray-500 print:text-black">
              Total do Período
            </span>
            <div className="flex items-center gap-2">
              <div className="print:hidden">
                {report.total >= 0 ? (
                  <ArrowUpCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <ArrowDownCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
              <span
                className={`text-2xl font-bold ${report.total >= 0 ? "text-gray-900" : "text-red-600"} print:text-black`}
              >
                {formatMoney(report.total)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
