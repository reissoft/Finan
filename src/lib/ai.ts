import OpenAI from "openai";

// Verificação de segurança
if (!process.env.OPENAI_API_KEY) {
  throw new Error("A variável de ambiente OPENAI_API_KEY não está configurada.");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 1. CONTEXTO DO SCHEMA
const PRISMA_SCHEMA_CONTEXT = `
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
  tenantId String
}

model Staff {
  id String @id
  name String
  phone String?
  isSalaried Boolean
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
`;

// 2. INTERFACES
export interface TenantContext {
  categories: string;
  accounts: string;
  staff: string;
}

export interface DatabaseAction {
  model: "AccountPayable" | "transaction" | "Category" | "User" | "Staff";
  action: "create" | "update" | "findFirst" | "findMany";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where?: any;
  successReply: string;
  errorReply: string;
}

// 3. FUNÇÃO PRINCIPAL
export async function analyzeIntent(
  text: string, 
  tenantId: string,
  context: TenantContext
): Promise<DatabaseAction | null> {

  // --- O SEGREDO DA DATA CERTA ---
  // Pegamos a data real do servidor agora
  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR", { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  const anoAtual = hoje.getFullYear(); // 2026

  const prompt = `
    Você é o cérebro de um ERP Financeiro. Converta o pedido em JSON para o Prisma ORM.

    ### 📅 CONTEXTO DE TEMPO (CRÍTICO)
    - **HOJE É:** ${dataFormatada}.
    - O Ano Atual é **${anoAtual}**.
    - Se o usuário disser "dia 20" e não especificar o ano, USE O ANO ${anoAtual}.
    - Se o dia 20 já passou neste mês, assuma que é do mês que vem.
    - JAMAIS use 2023, 2024 ou 2025, a menos que o usuário peça explicitamente "do ano passado".

    ### ESTRUTURA DO BANCO
    ${PRISMA_SCHEMA_CONTEXT}

    ### DADOS REAIS (Ids obrigatórios)
    [CATEGORIAS]: ${context.categories}
    [CONTAS]: ${context.accounts}
    [STAFF]: ${context.staff}

    ### REGRAS
    - 'tenantId': "${tenantId}" (Obrigatório em data e where).
    - **Datas**: Retorne em formato ISO-8601 (Ex: "${anoAtual}-02-20T12:00:00.000Z").
      ⚠️ IMPORTANTE: Sempre defina a hora como T12:00:00.000Z para evitar problemas de fuso horário.
    - Valores: Float.

    ### ENTRADA: "${text}"

    ### SAÍDA (JSON):
    Responda apenas o JSON.
  `;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4-turbo-preview", 
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const content = completion.choices[0]?.message.content;
    if (!content) return null;

    return JSON.parse(content) as DatabaseAction;

  } catch (error) {
    console.error("Erro IA:", error);
    return null;
  }
}