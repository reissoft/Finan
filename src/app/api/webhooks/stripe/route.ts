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
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log("✅ Assinatura Válida! Evento:", event.type);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`❌ Webhook Error: ${msg}`);
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("💰 Pagamento Aprovado! ID:", session.id);

    if (session.subscription && session.metadata?.tenantId) {
        try {
            console.log("🔍 Buscando detalhes da assinatura no Stripe...");
            const subId = session.subscription as string;
            
            // Buscamos o objeto completo
            const subscription = await stripe.subscriptions.retrieve(subId);

            // --- 🕵️ DEBUG PROFUNDO (Começa Aqui) ---
            console.log("========================================");
            console.log("🕵️ DEBUG DE DADOS DA ASSINATURA:");
            // Forçamos 'any' para ver o que realmente existe, sem o TypeScript esconder
            const subDebug = subscription as any;
            
            console.log("1. ID:", subDebug.id);
            console.log("2. Status:", subDebug.status);
            console.log("3. current_period_end (RAIZ):", subDebug.current_period_end);
            console.log("4. items.data[0].current_period_end:", subDebug.items?.data?.[0]?.current_period_end);
            console.log("5. current_period_start:", subDebug.current_period_start);
            console.log("========================================");

            // --- 🛡️ LÓGICA DE DATA SEGURA ---
            let finalDate: Date;
            
            // Tenta pegar a data da raiz (Padrão)
            if (subDebug.current_period_end) {
                console.log("✅ Usando data da RAIZ.");
                finalDate = new Date(subDebug.current_period_end * 1000);
            } 
            // Tenta pegar do primeiro item (Alternativa)
            else if (subDebug.items?.data?.[0]?.current_period_end) {
                console.log("✅ Usando data do ITEM.");
                finalDate = new Date(subDebug.items.data[0].current_period_end * 1000);
            } 
            // FALLBACK DE EMERGÊNCIA (Se tudo falhar, define 30 dias para frente)
            else {
                console.error("⚠️ ERRO CRÍTICO: Nenhuma data encontrada! Usando fallback de 30 dias.");
                const hoje = new Date();
                hoje.setDate(hoje.getDate() + 30);
                finalDate = hoje;
            }

            console.log("📅 DATA CALCULADA FINAL:", finalDate.toISOString());

            // --- ATUALIZAÇÃO DO BANCO ---
            console.log("🔄 Atualizando Banco para Tenant:", session.metadata.tenantId);
            
            await db.tenant.update({
                where: { id: session.metadata.tenantId },
                data: {
                    plan: "PRO",
                    stripeSubscriptionId: subscription.id,
                    stripeCustomerId: subscription.customer as string,
                    stripePriceId: subscription.items.data[0]?.price.id,
                    stripeCurrentPeriodEnd: finalDate, // Usamos a variável calculada
                },
            });

            console.log("✨ SUCESSO ABSOLUTO! Plano atualizado.");

        } catch (error) {
            console.error("❌ ERRO NO PROCESSO:", error);
            // Logamos o erro mas retornamos 200 para o Stripe não ficar tentando infinitamente se for erro de lógica
            return new Response("Erro interno processado", { status: 200 });
        }
    } else {
        console.log("⚠️ Ignorado: Sem subscription ID ou Tenant ID no metadata.");
    }
  }

  return new Response(null, { status: 200 });
}

export function GET() {
  return new Response("Webhook Online");
}