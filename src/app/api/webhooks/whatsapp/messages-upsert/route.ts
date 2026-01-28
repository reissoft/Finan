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
    };
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

    // --- LÓGICA DE RECUPERAÇÃO DO TELEFONE ---
    
    // 1. Tenta pegar o remoteJid (Padrão: 5579...@s.whatsapp.net)
    let rawPhone = messageData.key.remoteJid;

    // 2. CORREÇÃO DO LINT AQUI: Usamos ?. em vez de &&
    if (rawPhone?.includes("@lid")) {
        
        // Tenta pegar do participant (comum em alguns casos de grupo/bot)
        if (messageData.key.participant) {
            rawPhone = messageData.key.participant;
        } 
        // Se não tiver participant, tenta o sender (com Optional Chaining também)
        else if (body.sender?.includes("557481318305") === false) { 
             rawPhone = body.sender!; // O ! força dizendo que existe, pois passamos pelo if
        }
    }
    
    // Limpa o sufixo para ficar só o número (Ex: 5579920001944)
    // Se rawPhone for nulo por algum motivo, retorna string vazia para não quebrar
    const phone = (rawPhone ?? "").replace("@s.whatsapp.net", "").replace("@lid", "").split(":")[0];

    console.log(`📱 Telefone detectado para busca: ${phone}`);

    // Busca usuário no banco
    const user = await db.user.findFirst({
      where: { phoneNumber: phone },
      include: { tenant: true }
    });

    if (!user || !user.tenantId) {
      console.log(`🔒 Usuário ${phone} não encontrado ou sem permissão.`);
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