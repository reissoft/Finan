import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

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
          email: input.email && null,
          isSalaried: input.isSalaried,
          salary: input.salary ?? 0,
          inss: input.inss ?? 0,
          fgts: input.fgts ?? 0,
          otherTaxes: input.otherTaxes ?? 0,
          paymentDay: input.paymentDay ?? null, // Salva o dia
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

    generateMonthlyPayment: protectedProcedure
    .input(z.object({
      staffId: z.string(),
      targetDate: z.date(), // Data de referência (ex: dia de hoje)
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id },include: { tenant: true } });
      if (!user?.tenantId) throw new TRPCError({ code: "UNAUTHORIZED" });

      if (user?.tenant?.plan === "FREE") {
         throw new TRPCError({
           code: "FORBIDDEN",
           message: "A geração automática de folha é exclusiva do plano PRO."
         });
       }

      // 1. Busca o Funcionário
      const staff = await ctx.db.staff.findUnique({
        where: { id: input.staffId },
      });

      if (!staff?.isSalaried) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Funcionário não é remunerado." });
      }

      // --- NOVA VERIFICAÇÃO DE DUPLICIDADE ---
      const mesAtual = input.targetDate.getMonth();
      const anoAtual = input.targetDate.getFullYear();

      // Define o intervalo do mês da targetDate (do dia 1 até o último segundo do mês)
      const inicioMes = new Date(anoAtual, mesAtual, 1);
      const fimMes = new Date(anoAtual, mesAtual + 1, 0, 23, 59, 59);

      const pagamentoExistente = await ctx.db.accountPayable.findFirst({
        where: {
          tenantId: user.tenantId,
          staffId: staff.id,
          // Verifica se já existe um "Salário Líquido"
          description: { contains: "Salário Líquido" }, 
          // Verifica se a data de vencimento cai neste mês de referência
          dueDate: {
            gte: inicioMes,
            lte: fimMes,
          },
        },
      });

      if (pagamentoExistente) {
        throw new TRPCError({ 
          code: "CONFLICT", 
          message: `O pagamento deste funcionário já foi gerado para o mês ${mesAtual + 1}/${anoAtual}.` 
        });
      }
      // ---------------------------------------

      // 2. Define/Busca Categorias (Tentamos achar pelo nome, senão pega a primeira de Saída)
      let catSalario = await ctx.db.category.findFirst({
        where: { tenantId: user.tenantId, name: { contains: "Salário", mode: "insensitive" } }
      });
      
      let catImpostos = await ctx.db.category.findFirst({
        where: { tenantId: user.tenantId, name: { contains: "Imposto", mode: "insensitive" } }
      });

      // Se não achar, busca categorias genéricas de despesa para não dar erro
      //if (!catSalario) {
         catSalario ??= await ctx.db.category.findFirst({ where: { tenantId: user.tenantId, type: "EXPENSE" } });
     // }
      //if (!catImpostos) {
         catImpostos ??= catSalario; // Usa a mesma se não tiver de impostos
      //}

      if (!catSalario) throw new TRPCError({ code: "BAD_REQUEST", message: "Cadastre ao menos uma categoria de despesa." });

      // 3. Prepara os Valores (Converte Decimal do Prisma para Number)
      const salarioBruto = Number(staff.salary) || 0;

      const aliquotaInss = Number(staff.inss) || 0; 
      const aliquotaFgts = Number(staff.fgts) || 0;
      const aliquotaOutros = Number(staff.otherTaxes) || 0;

      const valorInss = salarioBruto * (aliquotaInss / 100);
      const valorFgts = salarioBruto * (aliquotaFgts / 100);
      const valorOutros = salarioBruto * (aliquotaOutros / 100);
      
      const salarioLiquidop0 = salarioBruto - valorInss; // O que cai na conta do funcionário
      const salarioLiquido = salarioLiquidop0 - valorOutros; // Já descontando outros impostos

      // 4. Define as Datas de Vencimento
      // Data do Salário (Dia configurado no staff)
      const diaPagto = staff.paymentDay ?? 5; 
      const vectoSalario = new Date(anoAtual, mesAtual, diaPagto);
      
      // Data do FGTS (Dia 7 fixo)
      const vectoFgts = new Date(anoAtual, mesAtual, 7);

      // Data do INSS (Dia 20 fixo)
      const vectoInss = new Date(anoAtual, mesAtual, 20);

      // 5. Criação das Contas (Transaction garante que cria tudo ou nada)
      await ctx.db.$transaction([
        // A. O Salário Líquido
        ctx.db.accountPayable.create({
          data: {
            tenantId: user.tenantId,
            description: `Salário Líquido - ${staff.name}`,
            amount: salarioLiquido,
            dueDate: vectoSalario,
            categoryId: catSalario.id,
            staffId: staff.id,
            isPaid: false,
          }
        }),

        // B. A Guia de INSS (se tiver valor)
        ...(valorInss > 0 ? [
          ctx.db.accountPayable.create({
            data: {
              tenantId: user.tenantId,
              description: `Guia INSS - ${staff.name}`,
              amount: valorInss,
              dueDate: vectoInss,
              categoryId: catImpostos!.id,
              staffId: staff.id,
              isPaid: false,
            }
          })
        ] : []),

        // C. A Guia de FGTS (se tiver valor)
        ...(valorFgts > 0 ? [
          ctx.db.accountPayable.create({
            data: {
              tenantId: user.tenantId,
              description: `Guia FGTS - ${staff.name}`,
              amount: valorFgts,
              dueDate: vectoFgts,
              categoryId: catImpostos!.id,
              staffId: staff.id,
              isPaid: false,
            }
          })
        ] : []),
        
        // D. A Guia de Outros Impostos (se tiver valor)
        ...(valorOutros > 0 ? [
          ctx.db.accountPayable.create({
            data: {
              tenantId: user.tenantId,
              description: `Guia Outros Impostos - ${staff.name}`,
              amount: valorOutros,
              dueDate: vectoFgts,
              categoryId: catImpostos!.id,
              staffId: staff.id,
              isPaid: false,
            }
          })
        ] : []),
      ]);

      return { success: true, message: "Folha gerada com sucesso!" };
    }),
});