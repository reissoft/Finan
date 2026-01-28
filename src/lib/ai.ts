import OpenAI from "openai";

// Verificação de segurança para não quebrar o build se a chave faltar
if (!process.env.OPENAI_API_KEY) {
  throw new Error("A variável de ambiente OPENAI_API_KEY não está configurada.");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ------------------------------------------------------------------
// 1. CONTEXTO DO SCHEMA (Estrutura simplificada do banco para a IA)
// ------------------------------------------------------------------
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

// ------------------------------------------------------------------
// 2. INTERFACES (Exportadas para uso no route.ts)
// ------------------------------------------------------------------

// O "Menu" de IDs que passamos para a IA
export interface TenantContext {
  categories: string;
  accounts: string;
  staff: string;
}

// A resposta estruturada que a IA devolve
export interface DatabaseAction {
  // Adicione aqui todos os Models que você quer que a IA possa manipular
  model: "AccountPayable" | "transaction" | "Category" | "User" | "Staff";
  
  // As ações permitidas
  action: "create" | "update" | "findFirst" | "findMany";

  // Usamos 'any' aqui para permitir flexibilidade no retorno da IA
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  
  // Usamos 'any' aqui para permitir filtros complexos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where?: any;

  // Textos de resposta para o WhatsApp
  successReply: string;
  errorReply: string;
}

// ------------------------------------------------------------------
// 3. FUNÇÃO PRINCIPAL (Exportada)
// ------------------------------------------------------------------
export async function analyzeIntent(
  text: string, 
  tenantId: string,
  context: TenantContext
): Promise<DatabaseAction | null> {

  const prompt = `
    Você é o cérebro de um ERP Financeiro (Igreja/Empresa). 
    Sua missão é converter linguagem natural em um comando JSON para o Prisma ORM.

    ### 1. ESTRUTURA DO BANCO (SCHEMA)
    ${PRISMA_SCHEMA_CONTEXT}

    ### 2. DADOS REAIS DESTE CLIENTE (Ids obrigatórios)
    Use estritamente estes IDs quando o usuário mencionar os nomes abaixo.
    
    [CATEGORIAS DISPONÍVEIS]
    ${context.categories}

    [CONTAS BANCÁRIAS / CAIXAS]
    ${context.accounts}

    [FUNCIONÁRIOS / STAFF]
    ${context.staff}

    ### 3. REGRAS DE NEGÓCIO
    - **TenantId**: É OBRIGATÓRIO incluir "tenantId": "${tenantId}" em todos os objetos 'data' (create) e 'where' (update/find).
    - **Categorias/Contas**: Se o usuário falar "Conta de Luz", procure "Luz" na lista acima e use o ID exato. Se não achar, tente o mais próximo.
    - **Dízimos/Ofertas**: Devem ser criados na tabela 'transaction' com type: 'INCOME'.
    - **Pagamentos/Contas**: Devem ser criados na tabela 'AccountPayable'.
    - **Datas**: Converta termos como "hoje", "amanhã", "dia 15" para data ISO-8601 (Considerando ano atual 2026).
    - **Valores**: Extraia apenas números (Decimal). Ex: "200 reais" -> 200.00.

    ### ENTRADA DO USUÁRIO:
    "${text}"

    ### SAÍDA ESPERADA (JSON VÁLIDO APENAS):
    Responda apenas com o JSON, sem markdown.
    Exemplo:
    {
      "model": "AccountPayable",
      "action": "create",
      "data": {
        "description": "Conta de Luz",
        "amount": 150.00,
        "dueDate": "2026-02-10T00:00:00.000Z",
        "categoryId": "cuid_da_categoria_luz",
        "tenantId": "${tenantId}",
        "isPaid": false
      },
      "successReply": "✅ Agendei a conta de Luz de R$ 150,00 para dia 10!",
      "errorReply": "❌ Tive um problema ao tentar agendar a conta."
    }
  `;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4-turbo-preview", // Modelo inteligente necessário para lidar com contexto
      response_format: { type: "json_object" },
      temperature: 0, // Zero criatividade para garantir precisão nos IDs
    });

    const content = completion.choices[0]?.message.content;
    
    if (!content) {
        console.error("IA retornou vazio");
        return null;
    }

    // Faz o parse do JSON retornado pela IA
    const result = JSON.parse(content) as DatabaseAction;
    return result;

  } catch (error) {
    console.error("Erro fatal na IA:", error);
    return null;
  }
}