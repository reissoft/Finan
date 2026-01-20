"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function CreateTransaction() {
  const router = useRouter();
  
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  
  // 1. NOVO: Estado para a data (inicia com a data de hoje formatada YYYY-MM-DD)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: categories } = api.transaction.getCategories.useQuery();
  const { data: accounts } = api.transaction.getAccounts.useQuery();

  const createMutation = api.transaction.create.useMutation({
    onSuccess: () => {
      router.refresh();
      setDescription("");
      setAmount("");
      // Reseta para hoje
      setDate(new Date().toISOString().split('T')[0]);
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !accountId) return alert("Preencha tudo!");

    createMutation.mutate({
      description,
      amount: parseFloat(amount),
      type,
      // 2. NOVO: Envia a data escolhida pelo usuário
      // Adicionamos T12:00 para garantir que não volte um dia por causa do fuso horário
      date: new Date(date + "T12:00:00"), 
      categoryId,
      accountId,
    });
  };

  return (
    <form onSubmit={onSubmit} className="mb-8 p-4 bg-white rounded shadow flex flex-col gap-4">
      <div className="flex gap-4">
        <select 
            value={type} 
            onChange={(e) => setType(e.target.value as "INCOME" | "EXPENSE")}
            className={`border p-2 rounded font-bold ${type === "INCOME" ? "text-green-600" : "text-red-600"}`}
        >
            <option value="INCOME">Entrada (+)</option>
            <option value="EXPENSE">Saída (-)</option>
        </select>

        <input
            type="text"
            placeholder="Descrição"
            className="border p-2 rounded flex-1 text-black"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
        />

        <input
            type="number"
            placeholder="Valor"
            className="border p-2 rounded w-32 text-black"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01" // Permite centavos
            required
        />
        
        {/* 3. NOVO: Input de Data */}
        <input 
            type="date"
            className="border p-2 rounded text-black"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
        />
      </div>

      <div className="flex gap-4">
        <select 
            className="border p-2 rounded flex-1 text-black"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
        >
            <option value="">Categoria...</option>
            {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
        </select>

        <select 
            className="border p-2 rounded flex-1 text-black"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
        >
            <option value="">Conta...</option>
            {accounts?.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
        </select>

        <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-blue-600 text-white px-8 py-2 rounded hover:bg-blue-700 font-bold transition-all"
        >
            {createMutation.isPending ? "..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}