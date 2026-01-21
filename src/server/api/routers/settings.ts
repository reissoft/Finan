import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const settingsRouter = createTRPCRouter({
  // --- LEITURA GERAL ---
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
    if (!user?.tenantId) return { categories: [], accounts: [] };

    const categories = await ctx.db.category.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
    });

    const accounts = await ctx.db.account.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
    });

    return { categories, accounts };
  }),

  // --- CATEGORIAS ---
  createCategory: protectedProcedure
    .input(z.object({ name: z.string().min(1), type: z.enum(["INCOME", "EXPENSE"]) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      return ctx.db.category.create({
        data: {
          name: input.name,
          type: input.type,
          tenant: { connect: { id: user.tenantId } },
        },
      });
    }),

  deleteCategory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Nota: Isso pode falhar se já existirem transações usando essa categoria
      return ctx.db.category.deleteMany({
        where: { id: input.id, tenant: { users: { some: { id: ctx.session.user.id } } } },
      });
    }),

  // --- CONTAS (CAIXAS/BANCOS) ---
  createAccount: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      return ctx.db.account.create({
        data: {
          name: input.name,
          tenant: { connect: { id: user.tenantId } },
        },
      });
    }),

  deleteAccount: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.account.deleteMany({
        where: { id: input.id, tenant: { users: { some: { id: ctx.session.user.id } } } },
      });
    }),
});