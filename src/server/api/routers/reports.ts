import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const reportsRouter = createTRPCRouter({
  
  // ==========================================================
  // 1. RELATÓRIO SIMPLES (DASHBOARD)
  // ==========================================================
  getFinancialReport: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      // Busca transações do período
      const transactions = await ctx.db.transaction.findMany({
        where: {
          tenantId: user.tenantId,
          date: { gte: input.startDate, lte: input.endDate },
        },
        include: { category: true },
      });

      // Agrupa os dados
      const incomeMap = new Map<string, number>();
      const expenseMap = new Map<string, number>();
      let totalIncome = 0;
      let totalExpense = 0;

      for (const t of transactions) {
        const val = Number(t.amount);
        const catName = t.category.name;

        if (t.type === "INCOME") {
          totalIncome += val;
          incomeMap.set(catName, (incomeMap.get(catName) ?? 0) + val);
        } else {
          totalExpense += val;
          expenseMap.set(catName, (expenseMap.get(catName) ?? 0) + val);
        }
      }

      const incomeByCat = Array.from(incomeMap.entries()).map(([name, value]) => ({ name, value }));
      const expenseByCat = Array.from(expenseMap.entries()).map(([name, value]) => ({ name, value }));

      return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        incomeByCat,
        expenseByCat,
        transactionCount: transactions.length
      };
    }),

  // ==========================================================
  // 2. BALANCETE (Com Saldo Anterior Calculado)
  // ==========================================================
  getBalanceSheet: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      // --- CÁLCULO DO SALDO ANTERIOR (O CORAÇÃO DO FIX) ---
      
      // A. Saldo Inicial das Contas (O que já tinha no banco antes do sistema)
      const accounts = await ctx.db.account.aggregate({
        where: { tenantId: user.tenantId },
        _sum: { initialBalance: true }
      });
      const totalInitial = Number(accounts._sum.initialBalance) || 0;

      // B. Entradas Antigas (Tudo antes da data inicial do filtro)
      const pastIncome = await ctx.db.transaction.aggregate({
        where: { tenantId: user.tenantId, date: { lt: input.startDate }, type: "INCOME" },
        _sum: { amount: true }
      });

      // C. Saídas Antigas (Tudo antes da data inicial do filtro)
      const pastExpense = await ctx.db.transaction.aggregate({
        where: { tenantId: user.tenantId, date: { lt: input.startDate }, type: "EXPENSE" },
        _sum: { amount: true }
      });
      
      // D. Saldo Anterior Final = Inicial + Entradas Antigas - Saídas Antigas
      const previousBalance = totalInitial + (Number(pastIncome._sum.amount) || 0) - (Number(pastExpense._sum.amount) || 0);

      // --- DADOS DO PERÍODO SELECIONADO ---
      
      const transactions = await ctx.db.transaction.findMany({
        where: {
          tenantId: user.tenantId,
          date: { gte: input.startDate, lte: input.endDate },
        },
        include: { category: true },
      });

      const incomeMap = new Map<string, number>();
      const expenseMap = new Map<string, number>();
      let periodIncome = 0;
      let periodExpense = 0;

      for (const t of transactions) {
        const val = Number(t.amount);
        const catName = t.category.name.toUpperCase();

        if (t.type === "INCOME") {
          periodIncome += val;
          incomeMap.set(catName, (incomeMap.get(catName) ?? 0) + val);
        } else {
          periodExpense += val;
          expenseMap.set(catName, (expenseMap.get(catName) ?? 0) + val);
        }
      }

      const incomeList = Array.from(incomeMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const expenseList = Array.from(expenseMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Busca Dados da Igreja
      const tenant = await ctx.db.tenant.findUnique({
        where: { id: user.tenantId }
      });

      // Busca Nome do Tesoureiro
      let treasurerRole = await ctx.db.staffRole.findFirst({
        where: { tenantId: user.tenantId, name: { contains: "Tesour", mode: "insensitive" } }
      });
      if (!treasurerRole) {
        treasurerRole = await ctx.db.staffRole.findFirst({
            where: { tenantId: user.tenantId },
            orderBy: { name: 'asc' }
        });
      }

      let treasurerName = "";
      if (treasurerRole) {
          const staffMember = await ctx.db.staff.findFirst({
            where: { tenantId: user.tenantId, roleId: treasurerRole.id },
            orderBy: { createdAt: 'asc' } 
          });
          if (staffMember) treasurerName = staffMember.name.toUpperCase();
      }

      return {
        tenantName: tenant?.name?.toUpperCase() ?? "MINHA IGREJA",
        tenantDesc: tenant?.description?.toUpperCase(),
        tenantCity: tenant?.city?.toUpperCase() ?? "CIDADE",
        tenantState: tenant?.state?.toUpperCase() ?? "UF",
        
        previousBalance,
        periodIncome,
        periodExpense,
        currentBalance: previousBalance + periodIncome - periodExpense, // Saldo Final
        result: periodIncome - periodExpense, // Resultado do Exercício
        
        incomeList,
        expenseList,
        treasurerName
      };
    }),

  // ==========================================================
  // 3. LIVRO CAIXA (Extrato Detalhado)
  // ==========================================================
  getCashBook: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      // --- REUTILIZA O CÁLCULO DO SALDO ANTERIOR ---
      const accounts = await ctx.db.account.aggregate({
        where: { tenantId: user.tenantId },
        _sum: { initialBalance: true }
      });
      const totalInitial = Number(accounts._sum.initialBalance) || 0;

      const pastIncome = await ctx.db.transaction.aggregate({
        where: { tenantId: user.tenantId, date: { lt: input.startDate }, type: "INCOME" },
        _sum: { amount: true }
      });
      const pastExpense = await ctx.db.transaction.aggregate({
        where: { tenantId: user.tenantId, date: { lt: input.startDate }, type: "EXPENSE" },
        _sum: { amount: true }
      });
      
      const previousBalance = totalInitial + (Number(pastIncome._sum.amount) || 0) - (Number(pastExpense._sum.amount) || 0);

      // --- DADOS DETALHADOS ---
      const transactions = await ctx.db.transaction.findMany({
        where: {
          tenantId: user.tenantId,
          date: { gte: input.startDate, lte: input.endDate },
        },
        include: { category: true },
        orderBy: { date: 'asc' } // Ordem Cronológica para o Livro Caixa
      });

      let totalCredits = 0;
      let totalDebits = 0;

      const formattedTransactions = transactions.map(t => {
        const val = Number(t.amount);
        if (t.type === "INCOME") totalCredits += val;
        else totalDebits += val;

        return {
          id: t.id,
          date: t.date,
          categoryName: t.category.name.toUpperCase(),
          description: t.description?.toUpperCase() || t.category.name.toUpperCase(),
          value: val,
          type: t.type
        };
      });

      // Dados Administrativos (Igreja/Tesoureiro)
      const tenant = await ctx.db.tenant.findUnique({ where: { id: user.tenantId } });

      let treasurerRole = await ctx.db.staffRole.findFirst({
        where: { tenantId: user.tenantId, name: { contains: "Tesour", mode: "insensitive" } }
      });
      if (!treasurerRole) {
        treasurerRole = await ctx.db.staffRole.findFirst({
            where: { tenantId: user.tenantId },
            orderBy: { name: 'asc' }
        });
      }
      let treasurerName = "";
      if (treasurerRole) {
          const staffMember = await ctx.db.staff.findFirst({
            where: { tenantId: user.tenantId, roleId: treasurerRole.id },
            orderBy: { createdAt: 'asc' } 
          });
          if (staffMember) treasurerName = staffMember.name.toUpperCase();
      }

      return {
        tenantName: tenant?.name?.toUpperCase() ?? "MINHA IGREJA",
        tenantDesc: tenant?.description?.toUpperCase(),
        tenantCity: tenant?.city?.toUpperCase() ?? "CIDADE",
        tenantState: tenant?.state?.toUpperCase() ?? "UF",
        
        previousBalance,
        totalCredits,
        totalDebits,
        result: totalCredits - totalDebits,
        currentBalance: previousBalance + (totalCredits - totalDebits),
        
        transactions: formattedTransactions,
        treasurerName
      };
    }),

  // ==========================================================
  // 4. RELATÓRIO DE CONTAS A PAGAR
  // ==========================================================
  getPayablesReport: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.tenantId) throw new Error("Sem organização");

      const payables = await ctx.db.accountPayable.findMany({
        where: {
          tenantId: user.tenantId,
          dueDate: { gte: input.startDate, lte: input.endDate },
        },
        include: { category: true },
        orderBy: { dueDate: 'asc' }
      });

      let totalPending = 0;
      let totalPaid = 0;
      
      const formattedPayables = payables.map(p => {
        const val = Number(p.amount);
        if (p.isPaid) totalPaid += val;
        else totalPending += val;

        return {
          id: p.id,
          dueDate: p.dueDate,
          description: p.description.toUpperCase(),
          categoryName: p.category.name.toUpperCase(),
          value: val,
          isPaid: p.isPaid,
          paidAt: p.paidAt
        };
      });

      const tenant = await ctx.db.tenant.findUnique({ where: { id: user.tenantId } });

      let treasurerRole = await ctx.db.staffRole.findFirst({
        where: { tenantId: user.tenantId, name: { contains: "Tesour", mode: "insensitive" } }
      });
      if (!treasurerRole) {
        treasurerRole = await ctx.db.staffRole.findFirst({
            where: { tenantId: user.tenantId },
            orderBy: { name: 'asc' }
        });
      }
      let treasurerName = "";
      if (treasurerRole) {
          const staffMember = await ctx.db.staff.findFirst({
            where: { tenantId: user.tenantId, roleId: treasurerRole.id },
            orderBy: { createdAt: 'asc' } 
          });
          if (staffMember) treasurerName = staffMember.name.toUpperCase();
      }

      return {
        tenantName: tenant?.name?.toUpperCase() ?? "MINHA IGREJA",
        tenantDesc: tenant?.description?.toUpperCase(),
        tenantCity: tenant?.city?.toUpperCase() ?? "CIDADE",
        tenantState: tenant?.state?.toUpperCase() ?? "UF",
        payables: formattedPayables,
        totalPending,
        totalPaid,
        totalGeneral: totalPending + totalPaid,
        treasurerName
      };
    }),
});