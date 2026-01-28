// src/lib/whatsapp.ts

export async function sendWhatsAppMessage(to: string, text: string) {
  // Ajuste a URL para o seu endereço real
  const baseUrl = "https://finan-production.up.railway.app"; 
  const instanceName = "instancia_principal"; 
  const apiKey = "Jesus_Te_Ama_2026"; // Sua API Key

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
        // CORREÇÃO AQUI: "text" agora fica na raiz, não dentro de textMessage
        text: text 
      })
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error("Erro ao enviar Zap:", errorData);
    } else {
        console.log("✅ Zap enviado com sucesso!");
    }

  } catch (error) {
    console.error("Falha na requisição do Zap:", error);
  }
}