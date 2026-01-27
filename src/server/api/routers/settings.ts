import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const settingsRouter = createTRPCRouter({
  // --- LEITURA GERAL (AGORA COM DADOS DO TENANT) ---
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
    if (!user?.tenantId) return { categories: [], accounts: [], tenant: null };

    // Busca dados da Igreja
    const tenant = await ctx.db.tenant.findUnique({
      where: { id: user.tenantId }
    });

    const categories = await ctx.db.category.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
    });

    const accounts = await ctx.db.account.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
    });

    return { categories, accounts, tenant };
  }),

  // --- NOVA FUNÇÃO: ATUALIZAR DADOS DA IGREJA ---
  updateTenant: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      logoUrl: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      return ctx.db.tenant.update({
        where: { id: user.tenantId },
        data: {
          name: input.name,
          description: input.description,
          logoUrl: input.logoUrl,
          city: input.city,
          state: input.state,
        },
      });
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

  // =========================================================
  // --- NOVAS FUNÇÕES: PERFIL DO USUÁRIO (ZAP) ---
  // =========================================================

  // 1. Buscar Perfil (Telefone e Preferências)
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        phoneNumber: true,
        receiveWhatsappAlerts: true
      }
    });
  }),

  // 2. Atualizar Perfil
  updateProfile: protectedProcedure
    .input(z.object({
      phoneNumber: z.string(),
      receiveWhatsappAlerts: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
      // Remove qualquer caractere que não seja número antes de salvar
      const cleanPhone = input.phoneNumber.replace(/\D/g, "");

      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          phoneNumber: cleanPhone,
          receiveWhatsappAlerts: input.receiveWhatsappAlerts
        }
      });
    }),

});