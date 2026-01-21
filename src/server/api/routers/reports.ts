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
});