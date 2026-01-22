import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const staffRouter = createTRPCRouter({
  // 1. LISTAR EQUIPE
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
    if (!user?.tenantId) return [];

    return ctx.db.staff.findMany({
      where: { tenantId: user.tenantId },
      include: { role: true },
      orderBy: { name: "asc" },
    });
  }),

  // 2. LISTAR CARGOS
  getRoles: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
    if (!user?.tenantId) return [];

    return ctx.db.staffRole.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
    });
  }),

  // 3. CRIAR CARGO
  createRole: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      return ctx.db.staffRole.create({
        data: {
          name: input.name,
          tenant: { connect: { id: user.tenantId } },
        },
      });
    }),

  // 4. CADASTRAR FUNCIONÁRIO (COM DIA DE PAGAMENTO)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        roleId: z.string().min(1, "Cargo é obrigatório"),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        // Financeiro
        isSalaried: z.boolean(),
        salary: z.number().optional(),
        inss: z.number().optional(),
        fgts: z.number().optional(),
        otherTaxes: z.number().optional(),
        paymentDay: z.number().optional(), // Novo Campo
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      return ctx.db.staff.create({
        data: {
          name: input.name,
          role: { connect: { id: input.roleId } },
          phone: input.phone,
          email: input.email || null,
          isSalaried: input.isSalaried,
          salary: input.salary || 0,
          inss: input.inss || 0,
          fgts: input.fgts || 0,
          otherTaxes: input.otherTaxes || 0,
          paymentDay: input.paymentDay || null, // Salva o dia
          tenant: { connect: { id: user.tenantId } },
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.staff.deleteMany({
        where: {
          id: input.id,
          tenant: { users: { some: { id: ctx.session.user.id } } },
        },
      });
    }),
});