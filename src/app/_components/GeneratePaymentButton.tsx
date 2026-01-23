"use client";

import { useState } from "react";
import { api } from "~/trpc/react"; 

interface Props {
  staffId: string;
  isSalaried: boolean;
  staffName: string;
}

export function GeneratePaymentButton({ staffId, isSalaried, staffName }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const utils = api.useUtils();

  const generate = api.staff.generateMonthlyPayment.useMutation({
    onSuccess: () => {
      alert(`✅ Sucesso! Folha de pagamento de ${staffName} foi gerada.`);
      setIsLoading(false);
      utils.reports.getPayablesReport.invalidate(); 
    },
    onError: (error) => {
      alert(`❌ Erro ao gerar folha: ${error.message}`);
      setIsLoading(false);
    }
  });

  const handleClick = () => {
    if (!confirm(`Deseja gerar as contas (Salário + Impostos) deste mês para ${staffName}?`)) return;
    
    setIsLoading(true);
    generate.mutate({
      staffId: staffId,
      targetDate: new Date(), 
    });
  };

  if (!isSalaried) return null;

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 transition-colors border border-green-600 rounded-md hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <span>⏳ Processando...</span>
      ) : (
        <span>💰 Gerar Pagamento do Mês</span>
      )}
    </button>
  );
}