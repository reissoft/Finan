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
setInterval(
  () => {
    const now = Date.now();
    for (const [id, timestamp] of processedMessages.entries()) {
      if (now - timestamp > 5 * 60 * 1000) {
        // Remove mensagens mais velhas que 5 min
        processedMessages.delete(id);
      }
    }
  },
  10 * 60 * 1000,
);

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
    if (user.tenant?.plan !== "PRO") {
      await sendWhatsAppMessage(
        rawPhone ?? phone,
        "Você precisa estar no plano PRO para usar este recurso.",
      );
      return new Response("Plano não permite uso", { status: 200 });
    }

    // --- 6. CHAMADA À IA ---
    const actionPlan = await analyzeIntent(text, user.tenantId, contextData);

    // Se a IA falhar
    if (!actionPlan) {
      await sendWhatsAppMessage(
        rawPhone ?? phone,
        "🤔 Não consegui entender esse comando. Tente reformular.",
      );
      return new Response("IA não retornou plano", { status: 200 });
    }

    // --- 7. EXECUTOR DE BANCO DE DADOS ---
    console.log(
      `🛠 Executando no Prisma: ${actionPlan.model}.${actionPlan.action}`,
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const model = (db as any)[actionPlan.model] as PrismaModel;

      if (!model) {
        throw new Error(
          `Tabela '${actionPlan.model}' não encontrada no Prisma.`,
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      let dbResult: any;

      switch (actionPlan.action) {
        case "create":
          // DADOS PUROS VINDOS DA IA
          const rawData = actionPlan.data;

          // O objeto que será enviado ao Prisma
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prismaPayload: any = {};

          // --- 🔄 TRANSFORMADOR GENÉRICO (A MÁGICA) ---
          // Varre cada campo que a IA mandou e decide como formatar para o Prisma
          for (const [key, value] of Object.entries(rawData)) {
            // 1. Ignora campos nulos/undefined (limpeza)
            if (value === null || value === undefined) continue;

            // 2. Se for o Tenant (Sempre obrigatório)
            if (key === "tenantId") {
              prismaPayload.tenant = { connect: { id: user.tenantId } };
              continue;
            }

            // 3. Se for qualquer outro campo de relacionamento (termina em 'Id')
            // Ex: categoryId -> category: { connect: { id: ... } }
            // Ex: accountId  -> account:  { connect: { id: ... } }
            if (key.endsWith("Id") && key !== "id") {
              const relationName = key.replace("Id", ""); // Remove o sufixo "Id"
              prismaPayload[relationName] = { connect: { id: value } };
            }
            // 4. Se for dado comum (description, amount, date...)
            else {
              prismaPayload[key] = value;
            }
          }

          // Execução Cega (O Prisma valida se os campos existem ou não)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          dbResult = await model.create({
            data: prismaPayload,
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

        case "findMany":
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          dbResult = await model.findMany({
            where: actionPlan.where,
          });
          break;

        default:
          throw new Error(`Ação não suportada.`);
      }

      console.log("✅ DB Sucesso:", dbResult);

      // --- 8. FEEDBACK POSITIVO ---
      console.log(
        "✅ DB Sucesso, linhas afetadas/retornadas:",
        Array.isArray(dbResult) ? dbResult.length : 1,
      );

      // --- 8. PREPARAÇÃO DA RESPOSTA (NOVO) ---
      let finalMessage = actionPlan.successReply;

      // Se foi uma busca (findMany/findFirst), anexa os dados formatados
      if (actionPlan.action.startsWith("find")) {
        const formattedData = formatDatabaseResult(actionPlan.model, dbResult);
        finalMessage += `\n${formattedData}`;
      }

      // Se foi um updateMany (ex: "Pagar todas"), mostra quantos foram afetados
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (actionPlan.action === "updateMany" && dbResult?.count) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        finalMessage += `\n\n(Total processado: ${dbResult.count} itens)`;
      }

      // --- 9. ENVIO DO WHATSAPP ---
      console.log(`📱 Enviando WhatsApp para ${rawPhone ?? phone}:`);
      console.log(`💬 Mensagem: ${finalMessage}`);
      console.log(`📏 Tamanho da mensagem: ${finalMessage?.length} caracteres`);

      await sendWhatsAppMessage(rawPhone ?? phone, finalMessage);
    } catch (dbError) {
      console.error("❌ Erro na Execução do Banco:", dbError);

      // --- 9. FEEDBACK NEGATIVO ---
      await sendWhatsAppMessage(rawPhone ?? phone, actionPlan.errorReply);
    }

    return new Response("Sucesso", { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erro desconhecido";
    console.error("❌ Erro Crítico no Webhook:", errorMessage);
    return new Response("Erro interno", { status: 500 });
  }
}

// --- FUNÇÃO AUXILIAR DE FORMATAÇÃO (NOVA) ---
// Transforma JSON do banco em texto bonitinho pro WhatsApp
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDatabaseResult(model: string, data: any): string {
  if (!data) return "";

  // Se for uma lista (Array), formata item por item
  if (Array.isArray(data)) {
    if (data.length === 0) return "\n_(Nenhum registro encontrado)_";
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return "\n" + data.map((item) => formatSingleItem(model, item)).join("\n");
  }

  // Se for um item único
  return "\n" + formatSingleItem(model, data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatSingleItem(model: string, item: any): string {
  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  const date =
    (item.date ?? item.dueDate)
      ? new Date(item.date ?? item.dueDate).toLocaleDateString("pt-BR")
      : "";

  switch (model) {
    case "AccountPayable":
      // Ex: 📅 10/02 - Luz (R$ 150,00) - [Pendente]
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const status = item.isPaid ? "✅ Pago" : "⏳ Aberto";
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
      return `📅 ${date} - *${item.description}*\n   💰 ${currency.format(item.amount)} - ${status}`;

    case "transaction":
      // Ex: 💰 R$ 100,00 - Oferta (Entrada) - 10/02
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const icon = item.type === "INCOME" ? "📈" : "📉";
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
      return `${icon} *${currency.format(item.amount)}* - ${item.description}\n   📅 ${date}`;

    default:
      // Genérico para tabelas que não mapeamos (Category, Member)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return `• ${item.name ?? item.description ?? JSON.stringify(item)}`;
  }
}
