import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? "gsk_dummy_key_for_testing",
});

export async function generateWithGroq(prompt: string): Promise<string> {
  try {
    console.log("🤖 Gerando relatório com Groq...");

    const response = await groq.chat.completions.create({
      model: "llama3-3-70b-versatile", // Modelo mais capaz e versátil
      messages: [{ role: "system", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.1, // Baixo para JSON consistente
      top_p: 0.9,
      stream: false,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia do Groq");
    }

    console.log("✅ Groq response received successfully");
    return content;
  } catch (error) {
    console.error("❌ Erro no Groq:", error);

    // Fallback para OpenAI se Groq falhar
    if (process.env.GROQ_API_KEY) {
      console.log("🔄 Tentando fallback para OpenAI...");
      return await generateWithOpenAIFallback(prompt);
    }

    throw new Error(
      "Erro ao gerar relatório com IA: " +
        (error instanceof Error ? error.message : "Erro desconhecido"),
    );
  }
}

// Fallback para OpenAI durante migração
async function generateWithOpenAIFallback(prompt: string): Promise<string> {
  try {
    // Import dinâmico para evitar require
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.1,
    });

    return completion.choices[0]?.message?.content ?? "{}";
  } catch (fallbackError) {
    console.error("❌ Fallback OpenAI também falhou:", fallbackError);
    throw new Error("Todos os provedores IA falharam");
  }
}

// Exportar cliente para uso direto se necessário
export { groq };
