"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function CreateTransaction() {
  const router = useRouter();
  const utils = api.useUtils();
  
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [memberId, setMemberId] = useState("");
  
  // 1. Estado para a data (inicia com a data de hoje formatada YYYY-MM-DD)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: categories } = api.category.getAll.useQuery();
  const { data: accounts } = api.transaction.getAccounts.useQuery();
  const { data: members } = api.member.getAll.useQuery();

  // 2. Filtra as categorias baseado no tipo selecionado
  const filteredCategories = categories?.filter((cat) => cat.type === type);

  // 3. Função para trocar o tipo e limpar a categoria (CORRIGIDO: Agora vamos usar ela)
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as "INCOME" | "EXPENSE";
    setType(newType);
    setCategoryId(""); // Reseta a categoria para evitar erro
  };

  const createMutation = api.transaction.create.useMutation({
    onSuccess: () => {
      utils.transaction.invalidate();
      utils.account.invalidate(); 
      utils.budget.invalidate(); 
      router.refresh();
      setDescription("");
      setAmount("");
      // Reseta para hoje
      setDate(new Date().toISOString().split('T')[0]);
      setMemberId("");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !accountId) return alert("Preencha tudo!");

    createMutation.mutate({
      description,
      amount: parseFloat(amount),
      type,
      // Envia a data escolhida pelo usuário com hora fixa para evitar fuso
      date: new Date(date + "T12:00:00"), 
      categoryId,
      accountId,
      memberId: memberId || undefined,
    });
  };

  return (
    <form onSubmit={onSubmit} className="mb-8 p-4 bg-white rounded shadow flex flex-col gap-4">
      <div className="flex gap-4">
        {/* SELECT DE TIPO - AGORA USA A FUNÇÃO CORRETA */}
        <select 
            value={type} 
            onChange={handleTypeChange}
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
        
        {/* Input de Data */}
        <input 
            type="date"
            className="border p-2 rounded text-black"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
        />
      </div>

      <div className="flex gap-4">
        {/* SELECT DE CATEGORIA - AGORA USA A LISTA FILTRADA */}
        <select 
            className="border p-2 rounded flex-1 text-black"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
        >
            <option value="">
                {filteredCategories?.length === 0 
                 ? `Sem categorias de ${type === "INCOME" ? "Entrada" : "Saída"}` 
                 : "Categoria..."}
            </option>
            {/* AQUI ESTAVA O ERRO: Trocamos categories por filteredCategories */}
            {filteredCategories?.map((cat) => (
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

        {type === "INCOME" && (
            <select
                className="border p-2 rounded flex-1 text-black"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
            >
                <option value="">Anônimo / Visitante</option>
                {members?.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                ))}
            </select>
        )}
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