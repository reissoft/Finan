import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const budgetRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      description: z.string().optional(),
      amount: z.number(),
      categoryId: z.string(),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");
      return ctx.db.budget.create({
        data: {
          tenantId: user.tenantId,
          description: input.description,
          amount: input.amount,
          categoryId: input.categoryId,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      });
    }),

  getBudgetProgress: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      const { tenantId } = user;
      if (!tenantId) return [];

      const budgets = await ctx.db.budget.findMany({
        where: { tenantId: tenantId },
        include: { category: true }, // Inclui a categoria para sabermos o TYPE
        orderBy: { startDate: 'desc' }
      });

      const budgetsWithProgress = await Promise.all(budgets.map(async (budget) => {
        const transactions = await ctx.db.transaction.aggregate({
          _sum: { amount: true },
          where: {
            tenantId: tenantId,
            categoryId: budget.categoryId,
            date: {
              gte: budget.startDate,
              lte: budget.endDate,
            },
          },
        });

        const actual = Number(transactions._sum.amount ?? 0);
        const budgeted = Number(budget.amount);
        const percentage = budgeted > 0 ? (actual / budgeted) * 100 : 0;
        const isExpense = budget.category.type === "EXPENSE";
        
        // --- NOVA LÓGICA DE STATUS ---
        let status = "NORMAL"; // Padrão

        if (isExpense) {
            // Lógica para DESPESAS (Queremos gastar MENOS que a meta)
            if (percentage >= 100) status = "EXCEEDED"; // Ruim
            else if (percentage >= 80) status = "WARNING"; // Atenção
        } else {
            // Lógica para RECEITAS (Queremos arrecadar MAIS que a meta)
            if (percentage >= 100) status = "ACHIEVED"; // Ótimo! Meta batida
            else status = "IN_PROGRESS"; // Ainda correndo atrás
        }

        return {
          ...budget,
          amount: budgeted,
          actual,
          percentage,
          status,
          type: budget.category.type // Enviamos o tipo para o frontend pintar as cores
        };
      }));

      return budgetsWithProgress;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.budget.delete({
        where: { id: input.id },
      });
    }),
});
