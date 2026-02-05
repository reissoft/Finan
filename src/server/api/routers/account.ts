import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const accountRouter = createTRPCRouter({
  // Procedimento para buscar todas as contas do usuário logado
  getAll: protectedProcedure.query(async ({ ctx }) => {

    const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
    if (!user?.tenantId) return [];
    return ctx.db.account.findMany({
      where: {
        tenantId: user?.tenantId,
      },
      // IMPORTANTE: Incluímos as transações para calcular o saldo no frontend
      include: {
        transactions: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }),
});