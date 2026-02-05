import { generateWithGroq } from "./groq";

// Sistema inteligente de provider
async function getAIProvider() {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  if (provider === "groq" || process.env.GROQ_API_KEY) {
    console.log("🤖 Usando Groq para análise de comandos");
    return { generate: generateWithGroq, name: "groq" };
  }

  // Fallback para OpenAI
  if (process.env.OPENAI_API_KEY) {
    console.log("⚠️ Usando OpenAI fallback para comandos");
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    return {
      name: "openai",
      generate: async (prompt: string) => {
        const completion = await openai.chat.completions.create({
          messages: [{ role: "system", content: prompt }],
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          temperature: 0,
        });
        return completion.choices[0]?.message.content ?? "{}";
      },
    };
  }

  throw new Error(
    "Nenhum provedor IA configurado para comandos. Configure AI_PROVIDER ou GROQ_API_KEY",
  );
}

export interface TenantContext {
  categories: string;
  accounts: string;
  staff: string;
}

export interface DatabaseAction {
  model: "AccountPayable" | "transaction" | "Category" | "User" | "Staff";
  action: "create" | "update" | "findFirst" | "findMany" | "updateMany";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where?: any;
  successReply: string;
}

export async function analyzeIntent(
  text: string,
  tenantId: string,
  context: TenantContext,
): Promise<DatabaseAction | null> {
  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const anoAtual = hoje.getFullYear();

  const prompt = `
    Você é um especialista em Prisma ORM.

    ### OBJETIVO
    Gerar um JSON exato para criar/buscar dados no banco, baseado no pedido do usuário.

    ### 📅 DATA DE HOJE
    - Hoje é: ${dataFormatada}.
    - Ano: ${anoAtual}.
    - Se o usuário falar "dia 20" (sem mês), assuma o mês atual. Se já passou, mês que vem. USE ANO ${anoAtual}.

    ### SCHEMA (TABELAS)
    enum TransactionType { INCOME EXPENSE }
    enum Role { USER TREASURER ADMIN }

    model User {
      id String @id
      name String?
      email String @unique
      phoneNumber String?
      tenantId String?
      role Role
    }

    model Member {
      id String @id
      name String
      phone String?
      tenantId String
    }

    model Category {
      id String @id
      name String
      type TransactionType
      tenantId String
    }

    model Account {
      id String @id
      name String
      initialBalance Decimal
      tenantId String
    }

    model transaction {
      id String @id
      description String?
      amount Decimal
      date DateTime
      type TransactionType
      categoryId String
      accountId String
      memberId String?
      tenantId String
    }

    model StaffRole {
      id String @id
      name String
      tenantId String
    }

    model Staff {
      id String @id
      name String
      roleId String
      phone String?
      isSalaried Boolean
      salary Decimal?
      tenantId String
    }

    model AccountPayable {
      id String @id
      description String
      amount Decimal
      dueDate DateTime
      isPaid Boolean
      paidAt DateTime?
      categoryId String
      staffId String?
      tenantId String
    }

    ### DADOS DO CLIENTE (IDs REAIS)
    [CATEGORIAS]: ${context.categories}
    [CONTAS]: ${context.accounts}
    *(Use o primeiro ID desta lista como 'Conta Padrão' se o usuário não especificar o banco em lançamentos de caixa)*
    [STAFF]: ${context.staff}

    ### REGRAS OBRIGATÓRIAS
    1. 'tenantId': "${tenantId}" deve estar em todos os 'data' e 'where'.
    2. Respeite RIGOROSAMENTE o Schema.
       - Se for 'transaction': DEVE incluir 'accountId' e 'categoryId'.
       - Se for 'AccountPayable': DEVE incluir 'categoryId', mas JAMAIS inclua 'accountId' (essa tabela não tem vínculo bancário).
    3. NUNCA invente IDs. Use os da lista acima. Se não achar, use null ou tente buscar por nome.
    4. Datas: ISO-8601 com hora fixa T12:00:00.000Z.
    5. Model: Deve ser EXATAMENTE o nome da tabela (ex: "AccountPayable", não "account_payable").
    6. Lançamentos entrada e saída: "transaction" com type "INCOME" ou "EXPENSE", deixe sempre o campo memberId vazio, categoria deve ser sempre "Outras Entradas ou Outras Saídas", se o pedido especificar nomes coloque na descrição.
    7. Se não entender o comando responda "Desculpe, não entendi o comando"
    8. Cadastro de Staff só se o usuário pedir explicitamente e sempre cadastre com isSalaried: false".
    9. Nunca aceite comandos para deletar, apagar ou excluir dados, se for o caso responda "Desculpe, não posso ajudar com isso".
    🔥 10. DIFERENÇA VITAL (PODE GERAR ERROS):
       - Se for "transaction" (Caixa/Pago agora): OBRIGATÓRIO incluir 'accountId' e 'categoryId'.
       - Se for "AccountPayable" (Conta a Pagar/Agendado): PROIBIDO incluir 'accountId' ou 'account'. Essa tabela NÃO tem vínculo com banco. Use apenas 'categoryId', 'amount', 'dueDate', 'description'.
    🔥 11. AÇÕES EM MASSA ("TODAS" / "TUDO"):
       Se o usuário pedir para "Baixar todas", "Pagar tudo que venceu" ou "Marcar todas como pagas":
       - Use 'action': 'updateMany'.
       - Use 'model': 'AccountPayable'.
       - No 'where': { "isPaid": false, "dueDate": { "lte": "${new Date().toISOString()}" } } (Se for "atrasadas") OU apenas { "isPaid": false } (Se for "todas").
       - No 'data': { "isPaid": true, "paidAt": "${new Date().toISOString()}" }.
       - IMPORTANTE: O 'tenantId' deve estar no 'where', NUNCA no 'data' para updates.
    ### PEDIDO: "${text}"
  `;

  try {
    const aiProvider = await getAIProvider();
    console.log(`🎯 Usando provider para comandos: ${aiProvider.name}`);

    const content = await aiProvider.generate(prompt);

    // LOG DE DEPURAÇÃO (Para vermos o que a IA mandou se der erro)
    console.log("🤖 RESPOSTA BRUTA DA IA:", content);

    if (!content) {
      console.error("❌ IA retornou conteúdo vazio");
      return null;
    }

    const result = JSON.parse(content) as DatabaseAction;

    // Validação extra simples
    if (!result.model || !result.action) {
      console.error("❌ IA retornou JSON incompleto:", result);
      console.error("❌ Model:", result.model);
      console.error("❌ Action:", result.action);
      console.error("❌ Data:", result.data);
      return null;
    }

    // 🔥 GERAR successReply SEMPRE (NUNCA VAZIO)
    const defaultSuccessMessages = {
      transaction: "✅ Transação criada com sucesso!",
      AccountPayable: "✅ Conta a pagar criada com sucesso! Vencimento: 15/02",
      Category: "✅ Categoria 'Energia' atualizada com sucesso!",
      User: "✅ Usuário João Silva criado com sucesso!",
      Staff: "✅ Funcionário Maria Santos adicionado com sucesso!",
      findMany: "✅ Encontrados 5 registros",
      updateMany: "✅ 10 contas marcadas como pagas!",
    };

    // Verificar e adicionar successReply
    if (!result.successReply) {
      console.log("🔄 Gerando successReply padrão para modelo:", result.model);
      result.successReply =
        defaultSuccessMessages[
          result.model as keyof typeof defaultSuccessMessages
        ] || "✅ Comando executado com sucesso!";
      console.log("✅ SuccessReply gerado:", result.successReply);
    } else {
      console.log(
        "✅ SuccessReply encontrado no resultado da IA:",
        result.successReply,
      );
    }

    return result;
  } catch (error) {
    console.error("Erro IA:", error);
    return null;
  }
}
