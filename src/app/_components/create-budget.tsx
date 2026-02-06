"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "~/components/ui/dialog";
import { PlusCircle, Loader2 } from "lucide-react";

export function CreateBudget() {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-01-01`); // Padrão: 01 Jan
  const [endDate, setEndDate] = useState(`${new Date().getFullYear()}-12-31`);   // Padrão: 31 Dez

  const ctx = api.useUtils();

  // Busca categorias para o Select
  const { data: categories } = api.category.getAll.useQuery();

  const createBudget = api.budget.create.useMutation({
    onSuccess: () => {
      ctx.budget.getBudgetProgress.invalidate(); // Atualiza a lista
      setOpen(false); // Fecha o modal
      setAmount(""); // Limpa campo
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount) return;

    createBudget.mutate({
      categoryId,
      amount: Number(amount),
      startDate: new Date(startDate), // Converte string para Date
      endDate: new Date(endDate),     // Converte string para Date
      description: "Orçamento Anual", // Opcional
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-bold transition">
          <PlusCircle className="h-4 w-4" />
          Nova Meta
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Definir Orçamento / Meta</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          
          {/* SELEÇÃO DE CATEGORIA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              className="w-full border rounded-md p-2 text-sm bg-white"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.type === 'INCOME' ? 'Entrada' : 'Saída'})
                </option>
              ))}
            </select>
          </div>

          {/* VALOR DA META */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Meta (R$)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Ex: 5000.00"
              className="w-full border rounded-md p-2 text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* DATAS (INICIO E FIM) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
              <input
                type="date"
                className="w-full border rounded-md p-2 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fim</label>
              <input
                type="date"
                className="w-full border rounded-md p-2 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={createBudget.isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-md transition flex justify-center items-center gap-2"
          >
            {createBudget.isPending && <Loader2 className="animate-spin h-4 w-4" />}
            Salvar Orçamento
          </button>

        </form>
      </DialogContent>
    </Dialog>
  );
}