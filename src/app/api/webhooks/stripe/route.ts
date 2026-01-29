import { headers } from "next/headers";
import { db } from "~/server/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  console.log("📥 WEBHOOK: Recebido!");

  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature")!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (!webhookSecret) throw new Error("Sem STRIPE_WEBHOOK_SECRET no .env");
    
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
    console.log("✅ Assinatura Válida! Evento:", event.type);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`❌ Webhook Error: ${errorMessage}`);
    return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  // Lógica principal
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("💰 Pagamento Aprovado! Processando...");
    
    // 1. Verificamos se existe ID de assinatura E ID do Tenant
    if (session.subscription && session.metadata?.tenantId) {
        
        try {
            // 2. Buscamos a assinatura AGORA (Seguro, pois sabemos que o ID existe)
            const subscriptionId = session.subscription as string;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;

            console.log("🔄 Atualizando Banco para Tenant:", session.metadata.tenantId);
            
            await db.tenant.update({
                where: { id: session.metadata.tenantId },
                data: {
                    plan: "PRO",
                    stripeSubscriptionId: subscription.id,
                    stripeCustomerId: subscription.customer as string,
                    stripePriceId: subscription.items.data[0]?.price.id,
                    stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                    
                },
            });

            console.log("✨ SUCESSO! Plano alterado para PRO.");

        } catch (dbError) {
            console.error("❌ Erro ao atualizar banco ou buscar subscription:", dbError);
            return new Response("Erro interno", { status: 500 });
        }

    } else {
        console.error("⚠️ ALERTA: Webhook recebido sem Subscription ID ou Tenant ID.");
    }
  }

  return new Response(null, { status: 200 });
}

export function GET() {
  return new Response("ESTOU VIVO! O caminho está correto.");
}