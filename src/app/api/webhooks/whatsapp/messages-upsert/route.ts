import { db } from "~/server/db";
import { analyzeMessage } from "~/lib/ai";

// 1. DEFINIMOS O MOLDE DOS DADOS (TIPAGEM)
// Isso ensina ao TypeScript o que esperar do Evolution API
interface EvolutionWebhookBody {
  event: string;
  sender?: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
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
    // 2. FORÇAMOS O TIPO AQUI USANDO "AS"
    const body = (await req.json()) as EvolutionWebhookBody;

    // FILTRO BÁSICO: Ignora eventos que não sejam mensagens novas
    const eventType = body.event;
    if (eventType !== "messages.upsert") {
      return new Response("Evento ignorado", { status: 200 });
    }

    const messageData = body.data;
    
    // Ignora mensagens enviadas por mim mesmo (fromMe)
    if (messageData.key.fromMe) {
        return new Response("Ignorando minha própria mensagem", { status: 200 });
    }

    // IDENTIFICAR O USUÁRIO
    const rawPhone = body.sender ?? messageData.key.remoteJid;
    // Agora o replace funciona porque rawPhone é string garantida pela interface
    const phone = rawPhone.replace("@s.whatsapp.net", "").replace("@lid", "");
    console.log(`📱 Telefone detectado: ${phone}`);
    // Busca usuário no banco
    const user = await db.user.findFirst({
      where: { phoneNumber: phone },
      include: { tenant: true }
    });

    // Se não achar o usuário, ignora
    if (!user || !user.tenantId) {
      console.log(`🔒 Mensagem recebida de ${phone} não autorizado.`);
      return new Response("Usuário não encontrado", { status: 200 });
    }

    // EXTRAIR O TEXTO DA MENSAGEM
    // Usamos o operador ?? (nullish coalescing) para pegar o primeiro que existir
    const text = 
      messageData.message?.conversation ?? 
      messageData.message?.extendedTextMessage?.text ?? 
      "";

    if (!text) return new Response("Sem texto", { status: 200 });

    console.log(`📩 Processando mensagem de ${user.name}: "${text}"`);

    // CHAMAR A IA
    const expenseData = await analyzeMessage(text);

    if (!expenseData) {
        console.log("🤖 IA não identificou uma conta a pagar na mensagem.");
        return new Response("Não é conta", { status: 200 });
    }

    // SALVAR NO BANCO DE DADOS
    
    // Tenta achar uma categoria com nome parecido
    let category = await db.category.findFirst({
        where: { 
            tenantId: user.tenantId,
            type: "EXPENSE",
            name: { contains: expenseData.categoryGuess }
        }
    });

    // Se não achou categoria especifica, pega a primeira disponível
    category ??= await db.category.findFirst({
        where: { tenantId: user.tenantId, type: "EXPENSE" }
    });

    if (!category) {
        return new Response("Erro: Nenhuma categoria cadastrada no sistema", { status: 200 });
    }

    const newPayable = await db.accountPayable.create({
      data: {
        description: expenseData.description,
        amount: expenseData.amount, 
        dueDate: new Date(expenseData.dueDate),
        categoryId: category.id,
        tenantId: user.tenantId,
        isPaid: false
      }
    });

    console.log("✅ CONTA CRIADA VIA WHATSAPP:", newPayable.id);

    return new Response("Sucesso", { status: 200 });

  } catch (error) {
    // Tratamento de erro seguro
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("❌ Erro no Webhook:", errorMessage);
    return new Response("Erro interno", { status: 500 });
  }
}