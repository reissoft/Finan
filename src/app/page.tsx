import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { db } from "~/server/db";
import { CreateTransaction } from "./_components/create-transaction";
import { TransactionItem } from "./_components/transaction-item";
import { AuthForm } from "./_components/auth-form";
import { MonthSelector } from "./_components/month-selector";
import Link from "next/link";
import { SignOutButton } from "./_components/sign-out-button";
import { DashboardCharts } from "./_components/dashboard-charts";
import { SmartReport } from "./_components/smart-report";


type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: Props) {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-5xl font-bold text-white">
            Finan Igreja ⛪
          </h1>
          <p className="text-gray-400">Sistema de Tesouraria Inteligente</p>
        </div>
        <AuthForm />
      </main>
    );
  }

  const userFull = await db.user.findUnique({
    where: { id: session.user.id },
    include: { tenant: true },
  });
  const currentPlan = userFull?.tenant?.plan ?? "FREE";
  const tenantId = userFull?.tenantId;

  const params = await searchParams;
  const now = new Date();

  const rawMonth = Number(params?.month);
  const month = !rawMonth && isNaN(rawMonth) ? now.getMonth() + 1 : rawMonth;

  const rawYear = Number(params?.year);
  const year = !rawYear && isNaN(rawYear) ? now.getFullYear() : rawYear;

  // --- 1. BUSCA DADOS MENSAIS (Via API) ---
  const rawTransactions = await api.transaction.getAll({ month, year });
  const rawStats = await api.transaction.getDashboardStats({ month, year });

  // --- 2. BUSCA DADOS ACUMULADOS (Direto no Banco) ---
  let accumulatedBalance = 0;

  if (tenantId) {
    const allTimeStats = await db.transaction.groupBy({
      by: ["type"],
      where: { tenantId: tenantId },
      _sum: { amount: true },
    });

    const totalIncome = Number(
      allTimeStats.find((i) => i.type === "INCOME")?._sum.amount ?? 0,
    );
    const totalExpense = Number(
      allTimeStats.find((i) => i.type === "EXPENSE")?._sum.amount ?? 0,
    );
    accumulatedBalance = totalIncome - totalExpense;
  }

  // --- 3. TRATAMENTO DE DADOS ---
  const transactions = rawTransactions.map((t) => ({
    id: t.id,
    description: t.description,
    type: t.type,
    date: t.date,
    amount: Number(t.amount),
    category: { name: t.category.name },
    account: { name: t.account.name },
    member: t.member ? { name: t.member.name } : null,
  }));

  const stats = {
    income: Number(rawStats.income),
    expense: Number(rawStats.expense),
    balance: Number(rawStats.balance),
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-100 p-8">
      <div className="mb-8 flex w-full max-w-6xl items-center justify-between">
        <h1 className="text-4xl font-bold text-blue-900">Financeiro</h1>

        <div className="flex items-center gap-4">
          <div className="hidden flex-col items-end text-right sm:flex">
            <p className="text-sm leading-tight font-bold text-gray-700">
              {session.user?.name}
            </p>

            <div className="mt-1">
              {currentPlan === "FREE" ? (
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-gray-300 bg-gray-200 px-2 py-0.5 text-[10px] font-bold tracking-wide text-gray-600 uppercase">
                    Free
                  </span>
                  <Link
                    href="/settings"
                    className="flex items-center gap-0.5 text-[10px] font-bold text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                  >
                    Fazer Upgrade 🚀
                  </Link>
                </div>
              ) : (
                <span className="rounded-full border border-yellow-500 bg-gradient-to-r from-yellow-400 to-yellow-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase shadow-sm">
                  ⭐ PRO
                </span>
              )}
            </div>
          </div>

          <SignOutButton />
        </div>
      </div>

      <div className="w-full max-w-6xl space-y-6">
        {/* BOTÕES DE NAVEGAÇÃO */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/members"
            className="flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-800 transition hover:bg-blue-200"
          >
            👥 Membros
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-full bg-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-300"
          >
            ⚙️ Configurações
          </Link>
          <Link
            href="/budgets"
            className="flex items-center gap-2 rounded-full bg-teal-100 px-4 py-2 text-sm font-bold text-teal-800 transition hover:bg-teal-200"
          >
            🎯 Metas & Orçamento
          </Link>
          <Link
            href="/reports"
            className="flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-bold text-purple-800 transition hover:bg-purple-200"
          >
            📊 Relatórios
          </Link>
          <Link
            href="/staff"
            className="flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-800 transition hover:bg-orange-200"
          >
            👔 Equipe
          </Link>
          <Link
            href="/payables"
            className="flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-800 transition hover:bg-red-200"
          >
            💸 Contas a Pagar
          </Link>
        </div>

        <MonthSelector />

        {/* CARDS DE RESUMO (Entrada, Saída, Saldo Mês, Saldo Total) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Entradas */}
          <div className="rounded-lg border-l-4 border-green-500 bg-white p-6 shadow">
            <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">
              Entradas ({month}/{year})
            </p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              R$ {stats.income.toFixed(2)}
            </p>
          </div>

          {/* Card 2: Saídas */}
          <div className="rounded-lg border-l-4 border-red-500 bg-white p-6 shadow">
            <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">
              Saídas ({month}/{year})
            </p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              R$ {stats.expense.toFixed(2)}
            </p>
          </div>

          {/* Card 3: Saldo do Mês */}
          <div className="rounded-lg border-l-4 border-blue-500 bg-white p-6 shadow">
            <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">
              Resultado ({month}/{year})
            </p>
            <p className={`mt-1 text-2xl font-bold ${stats.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
              R$ {stats.balance.toFixed(2)}
            </p>
          </div>

          {/* Card 4: Saldo Acumulado */}
          <div className="rounded-lg border-l-4 border-indigo-600 bg-white p-6 shadow">
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold tracking-wider text-indigo-800 uppercase">
                Saldo em Caixa (Total)
              </p>
              <span className="rounded bg-indigo-200 px-1.5 py-0.5 text-[10px] text-indigo-800">
                Acumulado
              </span>
            </div>
            <p className={`mt-1 text-2xl font-bold ${accumulatedBalance >= 0 ? "text-indigo-700" : "text-red-600"}`}>
              R$ {accumulatedBalance.toFixed(2)}
            </p>
          </div>
        </div>

       
        {/* RELATÓRIO INTELIGENTE */}
        <SmartReport />

        {/* GRÁFICOS */}
        <DashboardCharts transactions={transactions} stats={stats} />

        <CreateTransaction />

        {/* LISTA DE TRANSAÇÕES */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 flex items-center justify-between border-b pb-2 text-2xl font-semibold">
            <span>
              Lançamentos de {month}/{year}
            </span>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
              {transactions.length} itens
            </span>
          </h2>
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <p className="py-8 text-center text-gray-500">
                Nenhum lançamento em {month}/{year}.
              </p>
            ) : (
              transactions.map((t) => (
                <TransactionItem
                  key={t.id}
                  transaction={{
                    id: t.id,
                    description: t.description,
                    type: t.type,
                    date: t.date,
                    amount: t.amount,
                    category: { name: t.category.name },
                    account: { name: t.account.name },
                    member: t.member ? { name: t.member.name } : null,
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}