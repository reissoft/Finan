import { db } from "~/server/db";
import { analyzeIntent } from "~/lib/ai";
import { sendWhatsAppMessage } from "~/lib/whatsapp";

/* eslint-disable @typescript-eslint/no-explicit-any */
type PrismaModel = any; 

interface EvolutionWebhookBody {
  event: string;
  sender?: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      participant?: string;
      senderPn?: string;
      id: string; // Adicionamos o ID aqui
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
    };
  };
}

// --- 🛡️ CACHE DE DEDUPLICAÇÃO (EM MEMÓRIA) ---
// Isso impede que a mesma mensagem seja processada 2x em menos de 2 minutos
const processedMessages = new Map<string, number>();

// Limpa o cache a cada 10 minutos para não encher a memória RAM
setInterval(() => {
  const now = Date.now();
  for (const [id, timestamp] of processedMessages.entries()) {
    if (now - timestamp > 5 * 60 * 1000) { // Remove mensagens mais velhas que 5 min
      processedMessages.delete(id);
    }
  }
}, 10 * 60 * 1000); 


export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EvolutionWebhookBody;

    // 1. FILTRO DE SEGURANÇA BÁSICO
    if (body.event !== "messages.upsert") {
      return new Response("Evento ignorado", { status: 200 });
    }

    const messageData = body.data;

    // Ignora mensagens enviadas pelo próprio bot/você
    if (messageData.key.fromMe) {
      return new Response("Ignorando minha própria mensagem", { status: 200 });
    }

    // --- 🛡️ 1.1 VERIFICAÇÃO DE DUPLICIDADE ---
    const messageId = messageData.key.id;
    if (messageId && processedMessages.has(messageId)) {
        console.log(`🚫 Mensagem duplicada ignorada: ${messageId}`);
        // Retornamos 200 para a Evolution parar de tentar enviar
        return new Response("Duplicata ignorada", { status: 200 });
    }

    // Se não é duplicada, adiciona no cache
    if (messageId) {
        processedMessages.set(messageId, Date.now());
    }

    // --- 2. RECUPERAÇÃO DO TELEFONE ---
    let rawPhone = messageData.key.remoteJid;

    if (messageData.key.senderPn) {
      rawPhone = messageData.key.senderPn;
    } else if (rawPhone?.includes("@lid") && messageData.key.participant) {
      rawPhone = messageData.key.participant;
    }

    // Limpeza: remove caracteres não numéricos
    let phone = (rawPhone ?? "").replace(/\D/g, "");

    // Verifica se é um número brasileiro (começa com 55) e se tem 12 dígitos (falta o 9)
    if (phone.startsWith("55") && phone.length === 12) {
      const prefixo = phone.slice(0, 4);
      const sufixo = phone.slice(4);
      const primeiroDigito = parseInt(sufixo[0]!); // O ! garante que existe
      
      if (primeiroDigito >= 6) {
          phone = `${prefixo}9${sufixo}`;
          console.log("✅ 9º dígito adicionado automaticamente.");
      }
    }

    console.log(`📱 Telefone processado: ${phone}`);

    // --- 3. AUTENTICAÇÃO DO USUÁRIO ---
    const user = await db.user.findFirst({
      where: { phoneNumber: phone },
      include: { tenant: true },
    });

    if (!user || !user.tenantId) {
      console.log(`🔒 Usuário ${phone} desconhecido ou sem Tenant.`);
      return new Response("Unauthorized", { status: 200 });
    }

    // --- 4. EXTRAÇÃO DO TEXTO ---
    const text =
      messageData.message?.conversation ??
      messageData.message?.extendedTextMessage?.text ??
      "";

    if (!text) return new Response("Sem texto", { status: 200 });

    console.log(`📩 Comando de ${user.name}: "${text}"`);

    // --- 5. PREPARAÇÃO DO "MENU" (CONTEXTO) ---
    const [categories, accounts, staff] = await Promise.all([
      db.category.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, name: true, type: true },
      }),
      db.account.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, name: true },
      }),
      db.staff.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, name: true },
      }),
    ]);

    const contextData = {
      categories: categories
        .map((c) => `- ${c.name} (${c.type}) -> ID: ${c.id}`)
        .join("\n"),
      accounts: accounts.map((a) => `- ${a.name} -> ID: ${a.id}`).join("\n"),
      staff: staff.map((s) => `- ${s.name} -> ID: ${s.id}`).join("\n"),
    };

    // Bloqueia se não for PRO
    if(user.tenant?.plan !== "PRO") {
      await sendWhatsAppMessage(
        rawPhone ?? phone,
        "Você precisa estar no plano PRO para usar este recurso."
      );
      return new Response("Plano não permite uso", { status: 200 });
    }

    // --- 6. CHAMADA À IA ---
    const actionPlan = await analyzeIntent(text, user.tenantId, contextData);

    // Se a IA falhar
    if (!actionPlan) {
      await sendWhatsAppMessage(
        rawPhone ?? phone, 
        "🤔 Não consegui entender esse comando. Tente reformular."
      );
      return new Response("IA não retornou plano", { status: 200 });
    }

    // --- 7. EXECUTOR DE BANCO DE DADOS ---
    console.log(`🛠 Executando no Prisma: ${actionPlan.model}.${actionPlan.action}`);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const model = (db as any)[actionPlan.model] as PrismaModel;

      if (!model) {
        throw new Error(`Tabela '${actionPlan.model}' não encontrada no Prisma.`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      let dbResult: any;

      switch (actionPlan.action) {
        case "create":
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          dbResult = await model.create({
            data: actionPlan.data,
          });
          break;

        case "updateMany": 
        case "update":
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          dbResult = await model.updateMany({
            where: actionPlan.where,
            data: actionPlan.data,
          });
          break;

        case "findFirst":
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          dbResult = await model.findFirst({
            where: actionPlan.where,
          });
          break;
          
        default:
          throw new Error(`Ação '${actionPlan.action}' não suportada.`);
      }

      console.log("✅ DB Sucesso:", dbResult);

      // --- 8. FEEDBACK POSITIVO ---
      await sendWhatsAppMessage(rawPhone ?? phone, actionPlan.successReply);

    } catch (dbError) {
      console.error("❌ Erro na Execução do Banco:", dbError);
      
      // --- 9. FEEDBACK NEGATIVO ---
      await sendWhatsAppMessage(rawPhone ?? phone, actionPlan.errorReply);
    }

    return new Response("Sucesso", { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("❌ Erro Crítico no Webhook:", errorMessage);
    return new Response("Erro interno", { status: 500 });
  }
}