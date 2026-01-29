import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { hash } from "bcryptjs";
import { Resend } from "resend";
import crypto from "crypto"; // Para gerar o token aleatório

// Inicializa o Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Define a URL do seu site (ajuste conforme necessário, ex: localhost:3000 ou seu dominio)
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://finan-production.up.railway.app/";

export const authRouter = createTRPCRouter({
  
  // --- REGISTRO COM ENVIO DE EMAIL ---
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
      
      // Gera um token aleatório seguro
      const verifyToken = crypto.randomUUID();

      // 👇 1. Crie uma lógica para garantir slug único
      // Pega a primeira parte do email
      const baseSlug = input.email.split("@")[0]!.toLowerCase().replace(/[^a-z0-9]/g, ""); 
      // Gera 4 caracteres aleatórios (ex: 'a1b2')
      const randomSuffix = crypto.randomBytes(2).toString("hex");
      // Resultado: "joao-a1b2" (Sempre único)
      const uniqueSlug = `${baseSlug}-${randomSuffix}`;

      // CRIA O USUÁRIO JÁ COM UMA IGREJA NOVA
      const user = await ctx.db.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashedPassword,
          role: "ADMIN",
          emailVerified: null, // Ainda não verificado
          verifyToken: verifyToken, // Salva o token
          
          
          tenant: {
            create: {
                name: "Finanças de " + input.name,
                slug: uniqueSlug,
                plan: "FREE",
                categories: {
                create: [
                    { name: "Dízimos", type: "INCOME" },
                    { name: "Ofertas", type: "INCOME" },
                    { name: "Energia", type: "EXPENSE" },
                    { name: "Água", type: "EXPENSE" },
                    { name: "Manutenção", type: "EXPENSE" },
                    { name: "Salário", type: "EXPENSE" },
                    { name: "Imposto", type: "EXPENSE" },
                    { name: "Outras Entradas", type: "INCOME" },
                    { name: "Outras Saídas", type: "EXPENSE" },
                ]
                },
                staffRoles:{
                create: [
                    { name: "Pastor" },
                    { name: "Tesoureiro" },
                    { name: "Secretário" }
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

      // ENVIA O EMAIL PELO RESEND
      try {
        await resend.emails.send({
          from: 'onboarding@finansistema.online', // Use este e-mail enquanto não configura domínio próprio
          to: input.email,
          subject: 'Confirme seu cadastro - Finan Igreja',
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h1>Bem-vindo, ${input.name}!</h1>
              <p>Obrigado por se cadastrar. Para ativar sua conta, clique no link abaixo:</p>
              <a href="${BASE_URL}/verify?token=${verifyToken}" style="background: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Confirmar meu E-mail
              </a>
              <p style="margin-top: 20px; font-size: 12px; color: #666;">
                Se você não criou esta conta, apenas ignore este e-mail.
              </p>
            </div>
          `
        });
      } catch (error) {
        console.error("Erro ao enviar email:", error);
        // Opcional: Não falhar o cadastro se o email falhar, mas logar o erro
      }

      return { success: true, message: "Cadastro realizado! Verifique seu e-mail." };
    }),

  // --- NOVA ROTA: VALIDAR O TOKEN ---
  verifyEmail: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Busca usuário com esse token
      const user = await ctx.db.user.findFirst({
        where: { verifyToken: input.token },
      });

      if (!user) {
        throw new Error("Token inválido ou expirado.");
      }

      // Atualiza o usuário para verificado e limpa o token
      await ctx.db.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
          verifyToken: null, // Limpa o token para não ser usado de novo
        },
      });

      return { success: true, message: "E-mail verificado com sucesso!" };
    }),
});