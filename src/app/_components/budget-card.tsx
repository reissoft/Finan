"use client";

import { api } from "~/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Loader2, Trash2, AlertTriangle, CheckCircle, TrendingUp, Trophy, Target } from "lucide-react";
import { CreateBudget } from "./create-budget";
import { BudgetCharts } from "./budget-charts"; // <--- 1. IMPORTAR AQUI

export function BudgetOverview() {
  const { data: budgets, isLoading, refetch } = api.budget.getBudgetProgress.useQuery();
  const deleteBudget = api.budget.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const formatMoney = (val: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  if (isLoading) {
    return (
      <Card className="w-full h-40 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" />
      </Card>
    );
  }

  const getBarColor = (type: string, status: string) => {
    if (type === "EXPENSE") {
        if (status === "EXCEEDED") return "bg-red-500";
        if (status === "WARNING") return "bg-yellow-400";
        return "bg-slate-500";
    } else {
        if (status === "ACHIEVED") return "bg-green-500";
        return "bg-blue-500";
    }
  };

  return (
    <div className="space-y-6"> {/* Envolvi tudo numa div para separar Gráfico da Lista */}
        
      {/* 2. INSERIR O GRÁFICO AQUI SE TIVER DADOS */}
      {budgets && budgets.length > 0 && (
          <BudgetCharts data={budgets} />
      )}

      <Card className="w-full shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-900" />
              <CardTitle className="text-lg font-bold text-gray-800">Detalhamento das Metas</CardTitle>
          </div>
          <CreateBudget />
        </CardHeader>
        
        <CardContent className="space-y-6 pt-4">
          {(!budgets || budgets.length === 0) ? (
              <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  Nenhuma meta definida. Clique em Nova Meta para começar.
              </div>
          ) : (
              budgets.map((item) => (
              <div key={item.id} className="space-y-2">
                  
                  {/* Info do Orçamento */}
                  <div className="flex justify-between items-end">
                      <div>
                          <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  item.category.type === 'INCOME' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                              }`}>
                                  {item.category.type === 'INCOME' ? 'Receita' : 'Despesa'}
                              </span>
                              <p className="font-semibold text-gray-800 text-sm">{item.category.name}</p>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 ml-1">
                              {new Date(item.startDate).toLocaleDateString('pt-BR')} - {new Date(item.endDate).toLocaleDateString('pt-BR')}
                          </p>
                      </div>
                      <div className="text-right">
                          <span className={`text-sm font-bold ${
                              item.status === 'EXCEEDED' ? 'text-red-600' : 
                              item.status === 'ACHIEVED' ? 'text-green-600' : 'text-gray-700'
                          }`}>
                              {formatMoney(item.actual)}
                          </span>
                          <span className="text-xs text-gray-400"> / {formatMoney(item.amount)}</span>
                      </div>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="relative w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                          className={`h-full rounded-full transition-all duration-500 ${getBarColor(item.category.type, item.status)}`}
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      />
                  </div>

                  {/* Mensagens de Status */}
                  <div className="flex justify-between items-center text-xs">
                      <div>
                          {item.category.type === "EXPENSE" && (
                              <>
                                  {item.status === 'EXCEEDED' && (
                                      <span className="flex items-center gap-1 text-red-600 font-bold">
                                          <AlertTriangle className="h-3 w-3" /> Orçamento Estourado!
                                      </span>
                                  )}
                                  {item.status === 'WARNING' && (
                                      <span className="text-yellow-600 flex items-center gap-1 font-medium">
                                          <AlertTriangle className="h-3 w-3" /> Atenção! Perto do limite.
                                      </span>
                                  )}
                                  {item.status === 'NORMAL' && (
                                      <span className="text-gray-500 flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3" /> Dentro do esperado ({item.percentage.toFixed(0)}%)
                                      </span>
                                  )}
                              </>
                          )}

                          {item.category.type === "INCOME" && (
                              <>
                                  {item.status === 'ACHIEVED' ? (
                                      <span className="flex items-center gap-1 text-green-600 font-bold">
                                          <Trophy className="h-3 w-3" /> Meta Alcançada! Parabéns!
                                      </span>
                                  ) : (
                                      <span className="text-blue-600 flex items-center gap-1 font-medium">
                                          <TrendingUp className="h-3 w-3" /> Em progresso ({item.percentage.toFixed(0)}%)
                                      </span>
                                  )}
                              </>
                          )}
                      </div>

                      <button 
                          onClick={() => {
                              if(confirm("Deseja apagar esta meta?")) deleteBudget.mutate({ id: item.id })
                          }}
                          className="text-gray-300 hover:text-red-500 transition p-1"
                          title="Excluir meta"
                      >
                          <Trash2 className="h-3 w-3" />
                      </button>
                  </div>
              </div>
              ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}