import { headers } from "next/headers";
import { db } from "~/server/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(req: Request) {
  console.log("📥 WEBHOOK: Recebido!"); // <--- Log 1

  const body = await req.text();
  const signature = headers().get("Stripe-Signature") as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log("🔑 Segredo usado:", webhookSecret?.slice(0, 10) + "..."); // <--- Log 2

  let event: Stripe.Event;

  try {
    if (!webhookSecret) throw new Error("Sem STRIPE_WEBHOOK_SECRET no .env");
    
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
    console.log("✅ Assinatura Válida! Evento:", event.type); // <--- Log 3
  } catch (error: any) {
    console.error("❌ Erro de Assinatura:", error.message);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    console.log("💰 Pagamento Aprovado! Processando..."); // <--- Log 4
    console.log("Metadata recebido:", session.metadata);

    // Recupera a assinatura completa para pegar as datas
    const subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription?.id;

    if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        if (session?.metadata?.tenantId) {
            console.log("🔄 Atualizando Banco de Dados para Tenant:", session.metadata.tenantId);
            
            await db.tenant.update({
                where: { id: session.metadata.tenantId },
                data: {
                    plan: "PRO",
                    stripeSubscriptionId: subscription.id,
                    stripeCustomerId: subscription.customer as string,
                    stripePriceId: subscription.items.data[0]?.price.id,
                    stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
                },
            });
            console.log("✨ SUCESSO! Plano alterado para PRO.");
        } else {
            console.error("❌ ERRO: TenantId não encontrado no metadata.");
        }
    }
  }

  return new Response(null, { status: 200 });
}
export function GET() {
  return new Response("ESTOU VIVO! O caminho está correto.");
}