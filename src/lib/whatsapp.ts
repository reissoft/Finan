// src/lib/whatsapp.ts

export async function sendWhatsAppMessage(to: string, text: string) {
  // Configurações do Evolution
  // Ajuste a URL se sua variável de ambiente tiver outro nome
  const baseUrl = "https://evolution-api-production-6a59.up.railway.app"; 
  const instanceName = "instancia_principal"; 
  const apiKey = "Jesus_Te_Ama_2026"; // Ou use process.env.AUTHENTICATION_API_KEY

  const url = `${baseUrl}/message/sendText/${instanceName}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey
      },
      body: JSON.stringify({
        number: to,
        options: {
          delay: 1200,
          presence: "composing",
        },
        textMessage: {
          text: text
        }
      })
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error("Erro ao enviar Zap:", errorData);
    }

  } catch (error) {
    console.error("Falha na requisição do Zap:", error);
  }
}