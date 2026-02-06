import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const categoryRouter = createTRPCRouter({
  // Busca todas as categorias da igreja logada
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");
    return ctx.db.category.findMany({
      where: {
        tenantId: user.tenantId,
      },
      orderBy: {
        name: "asc", // Ordena alfabeticamente
      },
    });
  }),
});