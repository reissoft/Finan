import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { db } from "~/server/db"; // <--- 1. IMPORTANTE: Importar o banco
import { CreateTransaction } from "./_components/create-transaction";
import { TransactionItem } from "./_components/transaction-item";
import { AuthForm } from "./_components/auth-form";
import { MonthSelector } from "./_components/month-selector";
import Link from "next/link";
import { SignOutButton } from "./_components/sign-out-button";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: Props) {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-white mb-2">Finan Igreja ⛪</h1>
          <p className="text-gray-400">Sistema de Tesouraria Inteligente</p>
        </div>
        <AuthForm />
      </main>
    );
  }

  // --- 2. BUSCA O PLANO ATUAL DO USUÁRIO ---
  const userFull = await db.user.findUnique({
    where: { id: session.user.id },
    include: { tenant: true }
  });
  const currentPlan = userFull?.tenant?.plan ?? "FREE";
  // ------------------------------------------

  const params = await searchParams;
  const now = new Date();

  const rawMonth = Number(params?.month);
  const month = !rawMonth && isNaN(rawMonth) ? now.getMonth() + 1 : rawMonth;

  const rawYear = Number(params?.year);
  const year = !rawYear && isNaN(rawYear) ? now.getFullYear() : rawYear;

  const transactions = await api.transaction.getAll({ month, year });
  const stats = await api.transaction.getDashboardStats({ month, year });

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-100">
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-blue-900">Financeiro</h1>

        <div className="flex items-center gap-4">
          
          {/* --- 3. EXIBIÇÃO DO NOME E PLANO --- */}
          <div className="text-right hidden sm:flex flex-col items-end">
            <p className="text-sm font-bold text-gray-700 leading-tight">
                {session.user?.name}
            </p>
            
            <div className="mt-1">
                {currentPlan === "FREE" ? (
                    <div className="flex items-center gap-2">
                        <span className="bg-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-gray-300">
                            Free
                        </span>
                        <Link 
                            href="/settings" // Link para sua página de planos/config
                            className="text-[10px] text-blue-600 font-bold hover:underline hover:text-blue-800 transition-colors flex items-center gap-0.5"
                        >
                            Fazer Upgrade 🚀
                        </Link>
                    </div>
                ) : (
                    <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide shadow-sm border border-yellow-500">
                        ⭐ PRO
                    </span>
                )}
            </div>
          </div>
          {/* ----------------------------------- */}

          <SignOutButton />
        </div>
      </div>
      
      <div className="w-full max-w-4xl space-y-6">
        {/* BOTÕES DE NAVEGAÇÃO */}
        <div className="flex flex-wrap gap-3">
            <Link
                href="/members"
                className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold hover:bg-blue-200 transition text-sm flex items-center gap-2"
            >
                👥 Membros
            </Link>
            <Link 
                href="/settings" 
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full font-bold hover:bg-gray-300 transition text-sm flex items-center gap-2"
            >
                ⚙️ Configurações
            </Link>
            <Link 
                href="/reports" 
                className="bg-purple-100 text-purple-800 px-4 py-2 rounded-full font-bold hover:bg-purple-200 transition text-sm flex items-center gap-2"
            >
                📊 Relatórios
            </Link>
            <Link 
                href="/staff" 
                className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full font-bold hover:bg-orange-200 transition text-sm flex items-center gap-2"
            >
                👔 Equipe
            </Link>
            <Link 
                href="/payables" 
                className="bg-red-100 text-red-800 px-4 py-2 rounded-full font-bold hover:bg-red-200 transition text-sm flex items-center gap-2"
            >
                💸 Contas a Pagar
            </Link>
        </div>

        <MonthSelector />
        
        {/* CARDS DE RESUMO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
            <p className="text-gray-500 text-sm">Entradas ({month}/{year})</p>
            <p className="text-2xl font-bold text-green-600">R$ {stats.income.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
            <p className="text-gray-500 text-sm">Saídas ({month}/{year})</p>
            <p className="text-2xl font-bold text-red-600">R$ {stats.expense.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm">Saldo ({month}/{year})</p>
            <p className={`text-2xl font-bold ${stats.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
              R$ {stats.balance.toFixed(2)}
            </p>
          </div>
        </div>

        <CreateTransaction />

        {/* LISTA DE TRANSAÇÕES */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2 flex justify-between items-center">
            <span>Lançamentos</span>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                {transactions.length} itens
            </span>
          </h2>
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
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
                    amount: Number(t.amount),
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