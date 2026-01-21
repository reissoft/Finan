import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { CreateTransaction } from "./_components/create-transaction";
import { TransactionItem } from "./_components/transaction-item";
import { AuthForm } from "./_components/auth-form";
import { MonthSelector } from "./_components/month-selector";
import Link from "next/link";

// 1. MUDANÇA NO TIPO (Adicionamos Promise<...>)
type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: Props) {
  const session = await auth();

  if (!session) {
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

  // 2. MUDANÇA NA LEITURA (Precisamos do await)
  const params = await searchParams;
  const now = new Date();
  
  // 1. Tenta converter o mês para número
  const rawMonth = Number(params?.month);
  // 2. Se for NaN (inválido) ou 0, usa o mês atual
  const month = !rawMonth && isNaN(rawMonth) ? now.getMonth() + 1 : rawMonth;

  // 1. Tenta converter o ano
  const rawYear = Number(params?.year);
  // 2. Se for NaN (inválido) ou 0, usa o ano atual
  const year = !rawYear && isNaN(rawYear) ? now.getFullYear() : rawYear;
  // ---------------------
  // Agora usamos a variável "params" que já foi carregada
  //const month = Number(params?.month) && new Date().getMonth() + 1;
  //const year = Number(params?.year) && new Date().getFullYear();

  // O resto continua igual...
  const transactions = await api.transaction.getAll({ month, year });
  const stats = await api.transaction.getDashboardStats({ month, year });

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-100">
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-blue-900">Financeiro</h1>
        
        <MonthSelector /> 

        <div className="flex items-center gap-4">
             <Link 
                href="/members" 
                className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold hover:bg-blue-200 transition text-sm"
              >
                👥 Membros
              </Link>
            <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-700">{session.user?.name}</p>
            </div>
            <Link 
                href="/api/auth/signout" 
                className="bg-red-100 text-red-600 px-4 py-2 rounded text-sm font-bold hover:bg-red-200"
            >
                Sair
            </Link>
        </div>
      </div>

      <div className="w-full max-w-4xl space-y-6">
        <div className="grid grid-cols-3 gap-4">
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

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2 flex justify-between">
            <span>Lançamentos</span>
            <span className="text-sm text-gray-400 font-normal">Mostrando {transactions.length} itens</span>
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