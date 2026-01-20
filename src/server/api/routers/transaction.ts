import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const transactionRouter = createTRPCRouter({
  // 1. LEITURA (Já tínhamos)
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.transaction.findMany({
      orderBy: { date: "desc" },
      include: {
        category: true,
        account: true,
        member: true,
      },
    });
  }),

  // 2. ESCRITA (Novo!)
  create: publicProcedure
    .input(z.object({
      description: z.string().min(1),
      amount: z.number().min(0.01),
      type: z.enum(["INCOME", "EXPENSE"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // --- TRUQUE PARA O MVP ---
      // Como não temos login nem dropdowns ainda, vamos pegar
      // a primeira Igreja, Categoria e Conta que existirem no banco.
      const tenant = await ctx.db.tenant.findFirst();
      const category = await ctx.db.category.findFirst({ 
        where: { type: input.type, tenantId: tenant?.id } // Pega uma categoria compatível (Entrada ou Saída)
      });
      const account = await ctx.db.account.findFirst({
        where: { tenantId: tenant?.id }
      });

      if (!tenant || !category || !account) {
        throw new Error("Faltam dados base (Igreja/Categoria/Conta). Rode o seed!");
      }

      // Criar no Banco
      return ctx.db.transaction.create({
        data: {
          tenantId: tenant.id,
          categoryId: category.id,
          accountId: account.id,
          amount: input.amount,
          description: input.description,
          type: input.type,
          date: new Date(),
        },
      });
    }),
});