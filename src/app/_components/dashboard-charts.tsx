"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

type Transaction = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: Date;
  category: { name: string };
  account: { name: string };
};

type DashboardChartsProps = {
  transactions: Transaction[];
  stats: {
    income: number;
    expense: number;
    balance: number;
  };
};

const COLORS = {
  income: "#22c55e", // Green-500
  expense: "#ef4444", // Red-500
  balance: "#3b82f6", // Blue-500
  grid: "#e5e7eb",   // Gray-200
  text: "#6b7280",   // Gray-500
};

// Cores para o gráfico de pizza (Categorias)
const PIE_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", 
  "#ec4899", "#06b6d4", "#14b8a6", "#f43f5e", "#6366f1"
];

export function DashboardCharts({ transactions, stats }: DashboardChartsProps) {
  
  // 1. DADOS DO GRÁFICO DE BARRAS (Balanço Geral)
  const barData = [
    { name: "Entradas", value: stats.income, fill: COLORS.income },
    { name: "Saídas", value: stats.expense, fill: COLORS.expense },
    { name: "Saldo", value: stats.balance, fill: COLORS.balance },
  ];

  // 2. DADOS DO GRÁFICO DE PIZZA (Despesas por Categoria)
  const pieData = useMemo(() => {
    const expenseTransactions = transactions.filter((t) => t.type === "EXPENSE");
    const categoryMap = new Map<string, number>();

    expenseTransactions.forEach((t) => {
      const current = categoryMap.get(t.category.name) ?? 0;
      categoryMap.set(t.category.name, current + Number(t.amount));
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Maiores despesas primeiro
  }, [transactions]);

  // 3. (NOVO) DADOS DO GRÁFICO DE LINHA (Evolução Diária)
  const dailyData = useMemo(() => {
    // Se não tiver transação, retorna vazio
    if (transactions.length === 0) return [];

    // Descobre quantos dias tem no mês da primeira transação (ou usa o atual)
    const firstDate = new Date(transactions[0]?.date ?? new Date());
    const year = firstDate.getFullYear();
    const month = firstDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Cria um array preenchido com todos os dias do mês (1 a 30/31)
    const daysMap = new Map();
    for (let i = 1; i <= daysInMonth; i++) {
        daysMap.set(i, { day: i, income: 0, expense: 0 });
    }

    // Preenche com os valores reais
    transactions.forEach((t) => {
        const date = new Date(t.date);
        const day = date.getDate();
        const existing = daysMap.get(day);
        
        if (existing) {
            if (t.type === "INCOME") {
                existing.income += Number(t.amount);
            } else {
                existing.expense += Number(t.amount);
            }
        }
    });

    return Array.from(daysMap.values());
  }, [transactions]);

  // Formatador de Moeda para Tooltips
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <div className="space-y-6">
        
      {/* --- NOVO GRÁFICO: EVOLUÇÃO DIÁRIA --- */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-800">Fluxo Diário (Entradas vs Saídas)</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS.income} stopOpacity={0.1}/>
                                <stop offset="95%" stopColor={COLORS.income} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS.expense} stopOpacity={0.1}/>
                                <stop offset="95%" stopColor={COLORS.expense} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                        <XAxis 
                            dataKey="day" 
                            stroke={COLORS.text} 
                            fontSize={12} 
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `Dia ${val}`}
                        />
                        <YAxis 
                            stroke={COLORS.text} 
                            fontSize={12} 
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `R$${val}`}
                        />
                        {/* CORREÇÃO AQUI: Removemos o tipo explícito e forçamos Number() */}
                        <Tooltip 
                            formatter={(value) => formatCurrency(Number(value))}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="top" height={36}/>
                        <Area 
                            type="monotone" 
                            dataKey="income" 
                            name="Entradas" 
                            stroke={COLORS.income} 
                            fillOpacity={1} 
                            fill="url(#colorIncome)" 
                            strokeWidth={2}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="expense" 
                            name="Saídas" 
                            stroke={COLORS.expense} 
                            fillOpacity={1} 
                            fill="url(#colorExpense)" 
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
      </Card>

      {/* --- GRÁFICOS LADO A LADO --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Balanço do Mês */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-800">Balanço do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
                  <XAxis dataKey="name" stroke={COLORS.text} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={COLORS.text} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                  {/* CORREÇÃO AQUI: Removemos o tipo explícito e forçamos Number() */}
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Despesas por Categoria */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-800">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              {pieData.length > 0 ? (
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
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    {/* CORREÇÃO AQUI: Removemos o tipo explícito e forçamos Number() */}
                    <Tooltip 
                        formatter={(value) => formatCurrency(Number(value))}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        wrapperStyle={{ fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  Sem despesas registradas
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}