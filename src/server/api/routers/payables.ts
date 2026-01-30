import { TRPCError } from "@trpc/server";
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
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id },include: { tenant: true } });
      if (!user?.tenantId) throw new Error("Sem organização");


      // --- TRAVA: PLANO FREE (MÁX 50 CONTAS NO MÊS DE VENCIMENTO) ---
      if (user.tenant?.plan === "FREE") {
        // Calcula o intervalo do mês baseado na Data de Vencimento
        // 1. Extrai Ano e Mês em UTC (Para não cair no dia anterior/mês anterior)
        const year = input.dueDate.getUTCFullYear();
        const month = input.dueDate.getUTCMonth(); // 0 = Jan, 11 = Dez

        // 2. Cria o intervalo forçando UTC (Date.UTC)
        // Inicio: Dia 1, 00:00:00
        const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0));
        
        // Fim: Dia 0 do próximo mês (último dia do mês atual), 23:59:59
        const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));


        const count = await ctx.db.accountPayable.count({
          where: {
            tenantId: user.tenantId,
            dueDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        });


      console.log("----------------------");

        if (count >= 30) {
            const msge = `Limite do Plano Grátis atingido! Você só pode agendar 30 contas para este mês. (Atual: ${count})`;
          throw new TRPCError({
            code: "FORBIDDEN",
            message: msge
          });
        }
      }
      // ----------------------------------------------------------------

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
  // 3. PAGAR CONTA (ATUALIZADO PARA USAR O TRIGGER DO BANCO)
  pay: protectedProcedure
    .input(z.object({
      id: z.string(),
      accountId: z.string(), // Mantemos no input para não quebrar o Frontend, mas o Trigger usará a conta padrão
      paidDate: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      // 1. Verificamos se a conta existe e se já não foi paga
      const payable = await ctx.db.accountPayable.findUnique({
          where: { id: input.id }
      });

      if (!payable) throw new Error("Conta não encontrada.");
      if (payable.tenantId !== user.tenantId) throw new Error("Acesso negado.");
      if (payable.isPaid) throw new Error("Esta conta já está paga!");

      // 2. APENAS ATUALIZAMOS O STATUS
      // Removemos o "prisma.transaction.create".
      // Ao mudar "isPaid" para true, o Trigger do PostgreSQL vai disparar 
      // e criar o lançamento no caixa automaticamente em milissegundos.
      return ctx.db.accountPayable.update({
          where: { id: input.id },
          data: { 
              isPaid: true, 
              paidAt: input.paidDate 
          }
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