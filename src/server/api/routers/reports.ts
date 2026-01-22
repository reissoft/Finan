import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const reportsRouter = createTRPCRouter({
  getFinancialReport: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      // 1. Busca todas as transações no período
      const transactions = await ctx.db.transaction.findMany({
        where: {
          tenantId: user.tenantId,
          date: {
            gte: input.startDate, // Maior ou igual data inicial
            lte: input.endDate,   // Menor ou igual data final
          },
        },
        include: { category: true },
      });

      // 2. Agrupa os dados
      const incomeMap = new Map<string, number>();
      const expenseMap = new Map<string, number>();
      let totalIncome = 0;
      let totalExpense = 0;

      for (const t of transactions) {
        const val = Number(t.amount);
        const catName = t.category.name;

        if (t.type === "INCOME") {
          totalIncome += val;
          incomeMap.set(catName, (incomeMap.get(catName) ?? 0) + val);
        } else {
          totalExpense += val;
          expenseMap.set(catName, (expenseMap.get(catName) ?? 0) + val);
        }
      }

      // 3. Formata para enviar para tela
      const incomeByCat = Array.from(incomeMap.entries()).map(([name, value]) => ({ name, value }));
      const expenseByCat = Array.from(expenseMap.entries()).map(([name, value]) => ({ name, value }));

      return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        incomeByCat,
        expenseByCat,
        transactionCount: transactions.length
      };
    }),

    // ... (Mantenha a função getFinancialReport igualzinha estava)

  // ... dentro de reportsRouter ...

  getBalanceSheet: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      // 1.a Buscar Saldo Inicial das Contas (O valor que já existia antes de usar o sistema)
      const accounts = await ctx.db.account.aggregate({
        where: { tenantId: user.tenantId },
        _sum: { initialBalance: true }
      });
      const totalInitial = Number(accounts._sum.initialBalance) || 0;

      // 1.b Calcular Movimentações Antigas (Tudo antes da data de início)
      const pastIncome = await ctx.db.transaction.aggregate({
        where: { tenantId: user.tenantId, date: { lt: input.startDate }, type: "INCOME" },
        _sum: { amount: true }
      });
      const pastExpense = await ctx.db.transaction.aggregate({
        where: { tenantId: user.tenantId, date: { lt: input.startDate }, type: "EXPENSE" },
        _sum: { amount: true }
      });
      
      // CÁLCULO FINAL DO SALDO ANTERIOR CORRIGIDO
      const previousBalance = totalInitial + (Number(pastIncome._sum.amount) || 0) - (Number(pastExpense._sum.amount) || 0);

      // 2. Buscar Movimentação do Mês (Igual anterior)
      const transactions = await ctx.db.transaction.findMany({
        where: {
          tenantId: user.tenantId,
          date: { gte: input.startDate, lte: input.endDate },
        },
        include: { category: true },
      });

      // 3. Agrupar por Categoria (Igual anterior)
      const incomeMap = new Map<string, number>();
      const expenseMap = new Map<string, number>();
      let periodIncome = 0;
      let periodExpense = 0;

      for (const t of transactions) {
        const val = Number(t.amount);
        const catName = t.category.name.toUpperCase();

        if (t.type === "INCOME") {
          periodIncome += val;
          incomeMap.set(catName, (incomeMap.get(catName) ?? 0) + val);
        } else {
          periodExpense += val;
          expenseMap.set(catName, (expenseMap.get(catName) ?? 0) + val);
        }
      }

      const incomeList = Array.from(incomeMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const expenseList = Array.from(expenseMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // 4. Buscar Dados da Igreja (Igual anterior)
      const tenant = await ctx.db.tenant.findUnique({
        where: { id: user.tenantId }
      });

      // 5. Buscar Tesoureiro (Igual anterior)
      let treasurerRole = await ctx.db.staffRole.findFirst({
        where: { tenantId: user.tenantId, name: { contains: "Tesour", mode: "insensitive" } }
      });

      if (!treasurerRole) {
        treasurerRole = await ctx.db.staffRole.findFirst({
            where: { tenantId: user.tenantId },
            orderBy: { name: 'asc' }
        });
      }

      let treasurerName = "";
      if (treasurerRole) {
          const staffMember = await ctx.db.staff.findFirst({
              where: { tenantId: user.tenantId, roleId: treasurerRole.id },
              orderBy: { createdAt: 'asc' } 
          });
          if (staffMember) treasurerName = staffMember.name.toUpperCase();
      }

      return {
        tenantName: tenant?.name?.toUpperCase() ?? "MINHA IGREJA",
        tenantDesc: tenant?.description?.toUpperCase(),
        tenantCity: tenant?.city?.toUpperCase() ?? "CIDADE",
        tenantState: tenant?.state?.toUpperCase() ?? "UF",
        cite_start: previousBalance, // Agora inclui o saldo inicial das contas [cite: 11]
        periodIncome,
        periodExpense,
        currentBalance: previousBalance + periodIncome - periodExpense,
        result: periodIncome - periodExpense,
        incomeList,
        expenseList,
        treasurerName
      };
    }),
    // ... (código anterior)

  // --- NOVO: LIVRO CAIXA (Detalhado) ---
  getCashBook: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      // 1. Saldo Anterior (Contas Iniciais + Movimentações Antigas)
      const accounts = await ctx.db.account.aggregate({
        where: { tenantId: user.tenantId },
        _sum: { initialBalance: true }
      });
      const totalInitial = Number(accounts._sum.initialBalance) || 0;

      const pastIncome = await ctx.db.transaction.aggregate({
        where: { tenantId: user.tenantId, date: { lt: input.startDate }, type: "INCOME" },
        _sum: { amount: true }
      });
      const pastExpense = await ctx.db.transaction.aggregate({
        where: { tenantId: user.tenantId, date: { lt: input.startDate }, type: "EXPENSE" },
        _sum: { amount: true }
      });
      
      const previousBalance = totalInitial + (Number(pastIncome._sum.amount) || 0) - (Number(pastExpense._sum.amount) || 0);

      // 2. Transações do Período (Ordenadas por Data)
      const transactions = await ctx.db.transaction.findMany({
        where: {
          tenantId: user.tenantId,
          date: { gte: input.startDate, lte: input.endDate },
        },
        include: { category: true },
        orderBy: { date: 'asc' } // Cronológico
      });

      // 3. Cálculos do Período
      let totalCredits = 0;
      let totalDebits = 0;

      const formattedTransactions = transactions.map(t => {
        const val = Number(t.amount);
        if (t.type === "INCOME") totalCredits += val;
        else totalDebits += val;

        return {
          id: t.id,
          date: t.date,
          categoryName: t.category.name.toUpperCase(),
          description: t.description?.toUpperCase() || t.category.name.toUpperCase(), // Se não tiver descrição, repete a categoria
          value: val,
          type: t.type // INCOME ou EXPENSE
        };
      });

      // 4. Dados da Igreja e Tesoureiro
      const tenant = await ctx.db.tenant.findUnique({ where: { id: user.tenantId } });

      let treasurerRole = await ctx.db.staffRole.findFirst({
        where: { tenantId: user.tenantId, name: { contains: "Tesour", mode: "insensitive" } }
      });
      if (!treasurerRole) {
        treasurerRole = await ctx.db.staffRole.findFirst({
            where: { tenantId: user.tenantId },
            orderBy: { name: 'asc' }
        });
      }
      let treasurerName = "";
      if (treasurerRole) {
          const staffMember = await ctx.db.staff.findFirst({
              where: { tenantId: user.tenantId, roleId: treasurerRole.id },
              orderBy: { createdAt: 'asc' } 
          });
          if (staffMember) treasurerName = staffMember.name.toUpperCase();
      }

      return {
        tenantName: tenant?.name?.toUpperCase() ?? "MINHA IGREJA",
        tenantDesc: tenant?.description?.toUpperCase(),
        tenantCity: tenant?.city?.toUpperCase() ?? "CIDADE",
        tenantState: tenant?.state?.toUpperCase() ?? "UF",
        previousBalance,
        totalCredits,
        totalDebits,
        result: totalCredits - totalDebits,
        currentBalance: previousBalance + (totalCredits - totalDebits),
        transactions: formattedTransactions,
        treasurerName
      };
    }),
});



