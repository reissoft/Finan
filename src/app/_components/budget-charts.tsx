"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

// Tipagem dos dados que vêm do Backend
type BudgetData = {
  id: string;
  category: { name: string; type: string };
  amount: number; // Meta
  actual: number; // Realizado
};

export function BudgetCharts({ data }: { data: BudgetData[] }) {
  
  // Separar dados
  const incomeData = data.filter(i => i.category.type === "INCOME");
  const expenseData = data.filter(i => i.category.type === "EXPENSE");

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  // Componente auxiliar para renderizar um gráfico
  const CustomBarChart = ({ title, chartData, colorActual }: { title: string, chartData: any[], colorActual: string }) => (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                layout="vertical" // Gráfico de barras horizontais fica melhor para ler nomes de categorias
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                <XAxis type="number" hide />
                <YAxis 
                    dataKey="category.name" 
                    type="category" 
                    width={100} 
                    tick={{fontSize: 12, fill: '#6b7280'}} 
                />
                <Tooltip 
                    formatter={(value) => formatCurrency(Number(value))}
                    cursor={{fill: '#f9fafb'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="top" wrapperStyle={{fontSize: '12px'}}/>
                
                {/* Barra de Meta (Cinza) */}
                <Bar name="Meta" dataKey="amount" fill="#e5e7eb" radius={[0, 4, 4, 0]} barSize={20} />
                
                {/* Barra de Realizado (Colorida) */}
                <Bar name="Realizado" dataKey="actual" fill={colorActual} radius={[0, 4, 4, 0]} barSize={20}>
                    {/* Se estourar a meta, fica mais escuro/alerta */}
                    {chartData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.actual > entry.amount ? (colorActual === "#22c55e" ? "#15803d" : "#ef4444") : colorActual} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs">
              Sem dados de {title.toLowerCase()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Gráfico de Receitas (Verde) */}
      <CustomBarChart 
        title="Receitas: Meta vs Arrecadado" 
        chartData={incomeData} 
        colorActual="#22c55e" 
      />

      {/* Gráfico de Despesas (Vermelho) */}
      <CustomBarChart 
        title="Despesas: Orçado vs Gasto" 
        chartData={expenseData} 
        colorActual="#f87171" // Vermelho claro
      />
    </div>
  );
}