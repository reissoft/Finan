import OpenAI from "openai";
import { env } from "~/env";

// Inicializa o cliente
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// Define o formato que queremos receber da IA
interface ExtractedExpense {
  description: string;
  amount: number;
  dueDate: string; // Formato YYYY-MM-DD
  categoryGuess: string;
}

export async function analyzeMessage(text: string): Promise<ExtractedExpense | null> {
  const today = new Date();
  
  // Prompt do Sistema: Define a personalidade e as regras
  const systemPrompt = `
    Você é um assistente financeiro de uma igreja/empresa.
    Sua função é extrair dados de uma mensagem informal para criar uma conta a pagar (Despesa).
    
    Data de hoje para referência: ${today.toLocaleDateString("pt-BR")} (${today.toISOString()}).
    
    Regras:
    1. Identifique a descrição, valor e data de vencimento.
    2. Se o usuário disser "amanhã", "segunda-feira", calcule a data baseada na data de hoje.
    3. Tente adivinhar uma categoria curta (ex: Energia, Água, Transporte, Alimentação).
    4. O valor deve ser numérico (ex: 150.50).
    5. Retorne APENAS um objeto JSON puro, sem markdown.
    
    Formato JSON esperado:
    {
      "description": "string",
      "amount": number,
      "dueDate": "YYYY-MM-DD",
      "categoryGuess": "string"
    }
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Modelo rápido e barato
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" }, // Força a saída JSON
      temperature: 0.3, // Criatividade baixa para ser mais preciso
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    const data = JSON.parse(content) as ExtractedExpense;
    return data;

  } catch (error) {
    console.error("Erro na IA:", error);
    return null;
  }
}