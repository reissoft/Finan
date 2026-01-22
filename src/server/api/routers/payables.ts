import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const payablesRouter = createTRPCRouter({
  // 1. LISTAR CONTAS (Ordenadas por Vencimento)
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
    if (!user?.tenantId) return [];

    return ctx.db.accountPayable.findMany({
      where: { tenantId: user.tenantId },
      include: { category: true },
      orderBy: [
        { isPaid: 'asc' }, // Primeiro as pendentes
        { dueDate: 'asc' } // Depois por ordem de data
      ],
    });
  }),

  // 2. CADASTRAR NOVA CONTA
  create: protectedProcedure
    .input(z.object({
      description: z.string().min(1),
      amount: z.number().min(0.01),
      dueDate: z.date(),
      categoryId: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      return ctx.db.accountPayable.create({
        data: {
          description: input.description,
          amount: input.amount,
          dueDate: input.dueDate,
          category: { 
            connect: { id: input.categoryId } 
          },
          tenant: { connect: { id: user.tenantId } },
        },
      });
    }),

  // 3. PAGAR CONTA (BAIXA + LANÇAMENTO NO CAIXA)
  pay: protectedProcedure
    .input(z.object({
      id: z.string(),
      accountId: z.string(), // De qual conta vai sair o dinheiro?
      paidDate: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      // Usamos Transaction ($transaction) para garantir que ou faz tudo ou não faz nada
      return ctx.db.$transaction(async (prisma) => {
        
        // 1. Busca a conta a pagar
        const payable = await prisma.accountPayable.findUniqueOrThrow({
            where: { id: input.id }
        });

        if (payable.isPaid) throw new Error("Esta conta já está paga!");

        // 2. Atualiza status para PAGO
        const updatedPayable = await prisma.accountPayable.update({
            where: { id: input.id },
            data: { isPaid: true, paidAt: input.paidDate }
        });

        // 3. Cria a TRANSAÇÃO de Saída (Expense) no Livro Caixa
        await prisma.transaction.create({
            data: {
                description: `PAGTO: ${payable.description}`,
                amount: payable.amount,
                type: "EXPENSE",
                date: input.paidDate,
                categoryId: payable.categoryId,
                accountId: input.accountId,
                tenantId: user.tenantId!,
            }
        });

        return updatedPayable;
      });
    }),

  // 4. EXCLUIR
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
       // Só permite apagar se não estiver paga (para não furar o caixa)
       // Se quiser permitir apagar paga, teria que estornar a transação (complexo)
       const p = await ctx.db.accountPayable.findUnique({ where: { id: input.id }});
       if (p?.isPaid) throw new Error("Não é possível apagar conta já paga. Contate o suporte.");

       return ctx.db.accountPayable.delete({ where: { id: input.id } });
    }),
});