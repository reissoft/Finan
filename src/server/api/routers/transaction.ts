import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const transactionRouter = createTRPCRouter({
  // 1. LISTAR
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // Busca o tenantId do usuário logado
    const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
    if (!user?.tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "Usuário sem organização" });

    return ctx.db.transaction.findMany({
      where: { tenantId: user.tenantId }, // <--- FILTRO MÁGICO
      orderBy: { date: "desc" },
      include: { category: true, account: true,member: true },
      
    });
  }),

  // 2. CRIAR
  create: protectedProcedure
    .input(
      z.object({
        description: z.string().min(1),
        amount: z.number(),
        type: z.enum(["INCOME", "EXPENSE"]),
        categoryId: z.string(),
        accountId: z.string(),
        date: z.date(),
        memberId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new TRPCError({ code: "BAD_REQUEST" });

      return ctx.db.transaction.create({
        data: {
          description: input.description,
          amount: input.amount,
          type: input.type,
          date: input.date,
          category: { connect: { id: input.categoryId } },
          account: { connect: { id: input.accountId } },
          tenant: { connect: { id: user.tenantId } },
          ...(input.memberId && {
            member: { connect: { id: input.memberId } }
        }),
        },
      });
    }),

  // 3. DELETAR
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verifica se a transação pertence à mesma igreja do usuário (Segurança)
      return ctx.db.transaction.deleteMany({
         where: { 
            id: input.id,
            tenant: { users: { some: { id: ctx.session.user.id } } }
         }
      });
    }),

  // 4. CATEGORIAS (Select)
  getCategories: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
    if (!user?.tenantId) return []; // Retorna vazio se não tiver tenant

    return ctx.db.category.findMany({
        where: { tenantId: user.tenantId }, // Só traz categorias DA MINHA igreja
        orderBy: { name: "asc" }
    });
  }),

  // 5. CONTAS (Select)
  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
    if (!user?.tenantId) return [];

    return ctx.db.account.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { name: "asc" }
    });
  }),

  // 6. DASHBOARD
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
    if (!user?.tenantId) return { income: 0, expense: 0, balance: 0 };

    const income = await ctx.db.transaction.aggregate({
      where: { type: "INCOME", tenantId: user.tenantId },
      _sum: { amount: true },
    });

    const expense = await ctx.db.transaction.aggregate({
      where: { type: "EXPENSE", tenantId: user.tenantId },
      _sum: { amount: true },
    });

    const totalIncome = Number(income._sum.amount || 0);
    const totalExpense = Number(expense._sum.amount || 0);

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
    };
  }),
});