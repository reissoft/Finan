"use client";

import { api } from "~/trpc/react";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { Wallet, TrendingUp, TrendingDown, Calculator, PiggyBank } from "lucide-react";

export function AccountsSummary() {
  const accountsData = api.account.getAll.useQuery(undefined, {
    staleTime: 0,
  });

  if (accountsData.isLoading || !accountsData.data) {
    return (
      <Card className="w-full">
        <CardContent>
          <div className="flex items-center gap-2 py-4">
            <Wallet className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-700">Carregando...</h3>
          </div>
        </CardContent>
      </Card>
    );
  }

  const accounts = accountsData.data;
  if (!accounts || accounts.length === 0) {
    return (
      <Card className="w-full">
        <CardContent>
          <div className="flex items-center gap-2 text-center py-8 flex-col justify-center">
            <PiggyBank className="h-8 w-8 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-700">Nenhuma Conta</h3>
            <p className="text-gray-500">Cadastre suas contas bancárias para começar a gerenciar o fluxo financeiro</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- 🔴 AQUI ESTAVA O ERRO ---
  // Calcular totais por conta (Considerando Entrada vs Saída)
  const accountsWithBalance = accounts.map((account) => {
    const transactionTotal = account.transactions.reduce((sum, t) => {
      const value = Number(t.amount);
      // Se for DESPESA, subtrai. Se for RECEITA, soma.
      return t.type === "EXPENSE" ? sum - value : sum + value;
    }, 0);

    const currentBalance = Number(account.initialBalance) + transactionTotal;
    
    return {
      ...account,
      transactionTotal,
      currentBalance,
    };
  });
  // -----------------------------

  // Calcular totais gerais
  const totalTransactions = accountsWithBalance.reduce((sum, acc) => sum + acc.transactionTotal, 0);
  const totalInitialBalance = accounts.reduce((sum, acc) => sum + Number(acc.initialBalance), 0);
  const totalCurrentBalance = totalInitialBalance + totalTransactions;

  // Separar contas por tipo
  const positiveAccounts = accountsWithBalance.filter(acc => acc.currentBalance >= 0);
  const negativeAccounts = accountsWithBalance.filter(acc => acc.currentBalance < 0);

  const totalPositive = positiveAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const totalNegative = Math.abs(negativeAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0));

  return (
    <Card className="w-full">
      <CardContent className="space-y-6 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Resumo Geral de Contas</h3>
              <p className="text-sm text-gray-600">
                Saldo total de todas as contas bancárias
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${totalCurrentBalance >= 0 ? "text-gray-700" : "text-red-600"}`}>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(totalCurrentBalance)}
            </div>
          </div>
        </div>

        {/* Grid de Contas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accountsWithBalance
            .sort((a, b) => b.currentBalance - a.currentBalance)
            .map((account) => (
              <Card
                key={account.id}
                className={`${
                  account.currentBalance > 0 
                    ? 'border-green-200 bg-green-50' 
                    : account.currentBalance < 0 
                    ? 'border-red-200 bg-red-50' 
                    : 'border-gray-200'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-800">{account.name}</h4>
                      <p className="text-xs text-gray-500">
                        Saldo inicial: {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Number(account.initialBalance))}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        account.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(account.currentBalance)}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="text-xs text-gray-500">Movimento</span>
                      <div className={`text-sm font-medium ${
                        account.transactionTotal >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Math.abs(account.transactionTotal))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        account.transactionTotal >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ({account.transactionTotal >= 0 ? '+' : '-'}{account.transactions.length}{' '}
                        {' '}
                        {/* Ícone dinâmico: Sobe se positivo, Desce se negativo */}
                        {account.transactionTotal >= 0 
                            ? <TrendingUp className="h-3 w-3 inline" /> 
                            : <TrendingDown className="h-3 w-3 inline" />
                        }
                        {' '}
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(Math.abs(account.transactionTotal))}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                        account.currentBalance >= 0 ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className={`text-xs font-medium ${
                        account.currentBalance >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                        {account.currentBalance >= 0 ? 'Positivo' : 'Negativo'}
                        </span>
                    </div>
                  </div>
                </CardContent>

                {/* Footer */}
                <CardFooter className="flex justify-between items-center text-xs text-gray-500 p-4 pt-0">
                  <span>{account.transactions.length} movimentos</span>
                  <span>Saldo atual</span>
                </CardFooter>
              </Card>
            ))}
        </div>

        {/* Resumo Geral */}
        <div className="border-t pt-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total por Tipo */}
            <Card>
              <CardContent className="text-center pt-6">
                <div className="flex justify-center items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-lg font-bold text-green-600">+{totalPositive}</div>
                    <p className="text-sm text-gray-600">Total em Contas Positivas</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(totalPositive)}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="text-center pt-6">
                <div className="flex justify-center items-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="text-lg font-bold text-red-600">-{totalNegative}</div>
                    <p className="text-sm text-gray-600">Total em Contas Negativas</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(totalNegative)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informações Detalhadas */}
            <Card className="md:col-span-2">
              <CardContent className="pt-6">
                <h4 className="font-semibold text-gray-800 mb-4">Informações Detalhadas</h4>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Saldo Inicial Total:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(totalInitialBalance)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Total Movimentado (Líquido):</span>
                    <span className={`font-medium ${totalTransactions >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(totalTransactions)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Saldo Atual:</span>
                    <span className={`font-bold ${
                      totalCurrentBalance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(totalCurrentBalance)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Número de Contas:</span>
                    <span className="font-medium">{accounts.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>

      <CardFooter className="text-xs text-gray-500">
        <p>Resumo gerado em {new Date().toLocaleDateString('pt-BR')}</p>
      </CardFooter>
    </Card>
  );
}