import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16", // Use a versão mais recente sugerida
});

export const stripeRouter = createTRPCRouter({
  createCheckoutSession: protectedProcedure
    .mutation(async ({ ctx }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { tenant: true }
      });

      if (!user?.tenant) throw new Error("Sem organização");

      // 1. Define a URL de retorno
      const returnUrl = process.env.NEXT_PUBLIC_APP_URL + "/settings";

      // 2. Cria a Sessão de Checkout
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"], // Adicione "pix" se habilitar no painel
        mode: "subscription",
        customer_email: user.email,
        // DICA DE OURO: Metadata para sabermos QUEM pagou quando o banco avisar
        metadata: {
          tenantId: user.tenant.id,
        },
        line_items: [
          {
            // Crie um PRODUTO no painel do Stripe e cole o ID do PREÇO aqui
            price: "price_1Sstt8JT0n1PxnaSXsaWK1Cf", 
            quantity: 1,
          },
        ],
        success_url: `${returnUrl}?success=true`,
        cancel_url: `${returnUrl}?canceled=true`,
      });

      return { url: session.url };
    }),

    // ... (dentro do stripeRouter)

  // ROTA PARA ABRIR O PORTAL DE GERENCIAMENTO (CANCELAR/TROCAR CARTÃO)
  createPortalSession: protectedProcedure
    .mutation(async ({ ctx }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { tenant: true }
      });

      if (!user?.tenant?.stripeCustomerId) {
        throw new Error("Cliente não encontrado no Stripe");
      }

      const returnUrl = process.env.NEXT_PUBLIC_APP_URL + "/settings";

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.tenant.stripeCustomerId,
        return_url: returnUrl,
      });

      return { url: portalSession.url };
    }),
});