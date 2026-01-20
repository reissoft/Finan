import { api } from "~/trpc/server";
// 1. Importe o componente novo (agora ele existe!)
import { CreateTransaction } from "./_components/create-transaction";

export default async function Home() {
  // O "noStore" ou force-dynamic às vezes é necessário no Next 15 para não cachear dízimos
  // mas vamos testar sem primeiro.
  const transactions = await api.transaction.getAll();

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-100">
      <h1 className="text-4xl font-bold mb-8 text-blue-900">
        Financeiro Igreja
      </h1>

      <div className="w-full max-w-4xl">
        {/* 2. Adicione o formulário aqui em cima */}
        <CreateTransaction />

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
            Últimos Lançamentos
          </h2>

          <div className="space-y-4">
            {transactions.length === 0 ? (
              <p className="text-gray-500">Nenhum lançamento encontrado.</p>
            ) : (
              transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex justify-between items-center p-4 border rounded hover:bg-gray-50"
                >
                  <div>
                    <p className="font-bold text-lg">{t.description}</p>
                    <p className="text-sm text-gray-500">
                      {t.category.name} • {t.account.name} • {t.date.toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className={`text-xl font-bold ${
                      t.type === "INCOME" ? "text-green-600" : "text-red-600"
                  }`}>
                    {t.type === "INCOME" ? "+" : "-"} 
                    R$ {Number(t.amount).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}