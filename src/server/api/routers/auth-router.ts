import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { hash } from "bcryptjs";

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const exists = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (exists) {
        throw new Error("Este e-mail já está cadastrado.");
      }

      const hashedPassword = await hash(input.password, 10);

      // CRIA O USUÁRIO JÁ COM UMA IGREJA NOVA
      return ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashedPassword,
          role: "ADMIN", // Quem cria a conta é Admin
          // Em vez de conectar na ib-central, criamos uma nova!
          tenant: {
  create: {
    name: "Finanças de " + input.name,
    slug: input.email.split("@")[0]!,
    plan: "FREE",
    // JÁ CRIA AS CATEGORIAS E CONTAS PADRÃO
    categories: {
      create: [
        { name: "Dízimos", type: "INCOME" },
        { name: "Ofertas", type: "INCOME" },
        { name: "Energia", type: "EXPENSE" },
        { name: "Água", type: "EXPENSE" },
        { name: "Manutenção", type: "EXPENSE" },
      ]
    },
    accounts: {
      create: [
        { name: "Caixa Físico", initialBalance: 0 },
        { name: "Banco Principal", initialBalance: 0 }
      ]
    }
  }
}
        },
      });
    }),
});