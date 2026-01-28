import { db } from "~/server/db";
import { analyzeMessage } from "~/lib/ai";

interface EvolutionWebhookBody {
  event: string;
  sender?: string; 
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      participant?: string;
      senderPn?: string; // <--- NOVO CAMPO IMPORTANTE
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EvolutionWebhookBody;

    // FILTRO BÁSICO
    if (body.event !== "messages.upsert") {
      return new Response("Evento ignorado", { status: 200 });
    }

    const messageData = body.data;
    
    // Ignora minhas próprias mensagens
    if (messageData.key.fromMe) {
        return new Response("Ignorando minha própria mensagem", { status: 200 });
    }

    // --- LÓGICA DE RECUPERAÇÃO DO TELEFONE (CORRIGIDA) ---
    
    // 1. Começamos com o remoteJid padrão
    let rawPhone = messageData.key.remoteJid;

    // 2. A GRANDE CORREÇÃO:
    // Se existir o campo 'senderPn' (que apareceu no seu log), usamos ele!
    // Ele traz o número real (5579...) mesmo que o remoteJid seja @lid.
    if (messageData.key.senderPn) {
        rawPhone = messageData.key.senderPn;
    } 
    // Fallback: Se não tiver senderPn mas for um grupo/bot, tenta participant
    else if (rawPhone?.includes("@lid") && messageData.key.participant) {
        rawPhone = messageData.key.participant;
    }

    // Limpeza final: Remove sufixos e pega só os números
    const phone = (rawPhone ?? "")
      .replace("@s.whatsapp.net", "")
      .replace("@lid", "")
      .split(":")[0];

    console.log(`📱 Telefone FINAL detectado: ${phone}`);

    // Busca usuário no banco
    const user = await db.user.findFirst({
      where: { phoneNumber: phone },
      include: { tenant: true }
    });

    if (!user || !user.tenantId) {
      console.log(`🔒 Usuário ${phone} não encontrado ou sem permissão.`);
      // Tenta buscar pelo nome se tiver pushName, como fallback extra (opcional)
      if (body.data.pushName) {
          console.log(`ℹ️ Dica: O nome no WhatsApp é '${body.data.pushName}'`);
      }
      return new Response("Usuário não encontrado", { status: 200 });
    }

    // EXTRAIR O TEXTO
    const text = 
      messageData.message?.conversation ?? 
      messageData.message?.extendedTextMessage?.text ?? 
      "";

    if (!text) return new Response("Sem texto", { status: 200 });

    console.log(`📩 Processando mensagem de ${user.name}: "${text}"`);

    // CHAMAR A IA
    const expenseData = await analyzeMessage(text);

    if (!expenseData) {
        return new Response("Não é conta", { status: 200 });
    }

    // BUSCAR CATEGORIA
    let category = await db.category.findFirst({
        where: { 
            tenantId: user.tenantId,
            type: "EXPENSE",
            name: { contains: expenseData.categoryGuess }
        }
    });

    category ??= await db.category.findFirst({
        where: { tenantId: user.tenantId, type: "EXPENSE" }
    });

    if (!category) {
        return new Response("Erro: Nenhuma categoria cadastrada", { status: 200 });
    }

    // SALVAR NO BANCO
    await db.accountPayable.create({
      data: {
        description: expenseData.description,
        amount: expenseData.amount, 
        dueDate: new Date(expenseData.dueDate),
        categoryId: category.id,
        tenantId: user.tenantId,
        isPaid: false
      }
    });

    console.log("✅ SUCESSO! Conta criada.");

    return new Response("Sucesso", { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("❌ Erro no Webhook:", errorMessage);
    return new Response("Erro interno", { status: 500 });
  }
}