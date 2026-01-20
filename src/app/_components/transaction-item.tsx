"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

// Definindo o que esse componente recebe de dados
type TransactionProps = {
  transaction: {
    id: string;
    description: string | null;
    amount: number; // O Prisma devolve Decimal, mas serializamos como number
    type: "INCOME" | "EXPENSE";
    date: Date;
    category: { name: string };
    account: { name: string };
  };
};

export function TransactionItem({ transaction: t }: TransactionProps) {
  const router = useRouter();

  const deleteMutation = api.transaction.delete.useMutation({
    onSuccess: () => {
      router.refresh(); // Atualiza a tela após deletar
    },
  });

  const handleDelete = () => {
    if (confirm("Tem certeza que quer apagar?")) {
      deleteMutation.mutate({ id: t.id });
    }
  };

  return (
    <div className="flex justify-between items-center p-4 border rounded hover:bg-gray-50 bg-white shadow-sm transition-all">
      <div className="flex flex-col">
        <span className="font-bold text-lg text-gray-800">{t.description}</span>
        <span className="text-sm text-gray-500">
          {t.category.name} • {t.account.name} • {t.date.toLocaleDateString()}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span
          className={`text-xl font-bold ${
            t.type === "INCOME" ? "text-green-600" : "text-red-600"
          }`}
        >
          {t.type === "INCOME" ? "+" : "-"} 
          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(t.amount))}
        </span>

        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
          title="Excluir"
        >
          {deleteMutation.isPending ? "..." : "🗑️"}
        </button>
      </div>
    </div>
  );
}