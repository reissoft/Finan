"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function CreateTransaction() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  // Chama a função do backend que acabamos de criar
  const createMutation = api.transaction.create.useMutation({
    onSuccess: () => {
      router.refresh(); // Atualiza a lista na tela
      setDescription("");
      setAmount("");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Aqui estamos usando IDs fixos do Seed para testar rápido.
    // Depois vamos buscar as categorias reais do banco.
    createMutation.mutate({
      description,
      amount: parseFloat(amount),
      type: "INCOME", // Testando como ENTRADA
      date: new Date(),
      // DICA: Abra o Prisma Studio e pegue um ID real de Categoria e Conta
      // Cole os IDs aqui embaixo se o erro de "Foreign Key" aparecer
      categoryId: "cmkn4z8bi0002ulbg6ezga48o", 
      accountId: "cmkn4z8n80006ulbgvaopgm8h",
    });
  };

  return (
    <form onSubmit={onSubmit} className="mb-8 p-4 bg-white rounded shadow flex gap-4">
      <input
        type="text"
        placeholder="Descrição (ex: Oferta)"
        className="border p-2 rounded flex-1 text-black"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        type="number"
        placeholder="Valor"
        className="border p-2 rounded w-32 text-black"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button
        type="submit"
        disabled={createMutation.isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {createMutation.isPending ? "Salvando..." : "Adicionar +"}
      </button>
    </form>
  );
}