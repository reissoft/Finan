import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BudgetOverview } from "~/app/_components/budget-card"; // Importando seu componente existente

export default function BudgetsPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        
        {/* Cabeçalho com Botão Voltar */}
        <div className="flex items-center gap-4">
          <Link 
            href="/"
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Link>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Metas & Orçamentos</h1>
            <p className="text-gray-500">Planeje suas receitas e controle suas despesas anuais.</p>
          </div>
        </div>

        <div className="h-px w-full bg-gray-200" />

        {/* O Componente que criamos antes */}
        <BudgetOverview />

      </div>
    </main>
  );
}