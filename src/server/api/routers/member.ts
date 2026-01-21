import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const memberRouter = createTRPCRouter({
  // 1. LISTAR TODOS OS MEMBROS (DA MINHA IGREJA)
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
    if (!user?.tenantId) return [];

    return ctx.db.member.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
    });
  }),

  // 2. CADASTRAR NOVO MEMBRO
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "O nome é obrigatório"),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        // z.coerce.date() transforma a string "2024-01-20" do HTML em Objeto Date automaticamente
        birthDate: z.coerce.date().optional(), 
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Usuário sem organização");

      return ctx.db.member.create({
        data: {
          name: input.name,
          phone: input.phone,
          email: input.email ?? null,
          birthDate: input.birthDate ?? null, // Salva a data se tiver
          tenant: { connect: { id: user.tenantId } },
        },
      });
    }),

  // 3. EXCLUIR MEMBRO
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.member.deleteMany({
        where: {
          id: input.id,
          tenant: { users: { some: { id: ctx.session.user.id } } }, // Segurança
        },
      });
    }),
});