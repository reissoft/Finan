"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function MonthSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pega do URL ou usa a data de hoje
  const currentMonth = Number(searchParams.get("month")) || new Date().getMonth() + 1;
  const currentYear = Number(searchParams.get("year")) || new Date().getFullYear();

  // Função para mudar o mês
  const changeMonth = (offset: number) => {
    const date = new Date(currentYear, currentMonth - 1 + offset, 1);
    const newMonth = date.getMonth() + 1;
    const newYear = date.getFullYear();

    // Atualiza a URL (isso faz a página recarregar com os dados novos)
    router.push(`/?month=${newMonth}&year=${newYear}`);
  };

  // Nome do Mês em Português
  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleString('pt-BR', { month: 'long' });
  // Primeira letra maiúscula
  const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <div className="flex items-center gap-4 bg-white p-2 rounded shadow-sm border">
      <button 
        onClick={() => changeMonth(-1)}
        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 font-bold"
      >
        &lt;
      </button>

      <span className="font-bold text-blue-900 w-40 text-center">
        {formattedMonth} {currentYear}
      </span>

      <button 
        onClick={() => changeMonth(1)}
        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 font-bold"
      >
        &gt;
      </button>
    </div>
  );
}