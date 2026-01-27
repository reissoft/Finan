"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Cores para o Gráfico de Pizza
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658"];

type Transaction = {
  id: string;
  amount: number;
  type: string; // "INCOME" ou "EXPENSE"
  category: { name: string };
};

type Props = {
  transactions: Transaction[];
  stats: {
    income: number;
    expense: number;
    balance: number;
  };
};

export function DashboardCharts({ transactions, stats }: Props) {
  // 1. Prepara dados para o Gráfico de Barras (Resumo)
  const barData = [
    { name: "Entradas", valor: stats.income, fill: "#16a34a" }, // Verde
    { name: "Saídas", valor: stats.expense, fill: "#dc2626" },  // Vermelho
    { name: "Saldo", valor: stats.balance, fill: "#2563eb" },   // Azul
  ];

  // 2. Prepara dados para o Gráfico de Pizza (Despesas por Categoria)
  const pieData = useMemo(() => {
    // Filtra apenas saídas para entender onde o dinheiro está indo
    const expenses = transactions.filter((t) => t.type === "EXPENSE");
    
    // Agrupa por categoria
    const grouped = expenses.reduce((acc, curr) => {
      const catName = curr.category.name;
      const amount = Number(curr.amount);
      
     acc[catName] ??= 0;
      acc[catName] += amount;
      return acc;
    }, {} as Record<string, number>);

    // Transforma em array para o gráfico
    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
    }));
  }, [transactions]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
      
      {/* GRÁFICO DE BARRAS (Visão Geral) */}
      <div className="bg-white p-6 rounded-lg shadow-md h-80 flex flex-col">
        <h3 className="text-lg font-bold text-gray-700 mb-4 text-center">Balanço do Mês</h3>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(val) => `R$${val}`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]} barSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICO DE PIZZA (Despesas por Categoria) */}
      <div className="bg-white p-6 rounded-lg shadow-md h-80 flex flex-col">
        <h3 className="text-lg font-bold text-gray-700 mb-4 text-center">Despesas por Categoria</h3>
        {pieData.length > 0 ? (
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Nenhuma despesa lançada neste mês.
          </div>
        )}
      </div>

    </div>
  );
}