export async function sendWhatsAppMessage(to: string, text: string) {
  // Ajuste a URL se necessário (sem barra no final)
  const baseUrl = "https://evolution-api-production-6a59.up.railway.app"; 
  const instanceName = "instancia_principal"; 
  const apiKey = "Jesus_Te_Ama_2026"; 

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
        // CORREÇÃO: 'text' agora fica aqui, fora de textMessage
        text: text
      })
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error("❌ Erro ao enviar Zap:", errorData);
    } else {
        console.log("✅ Zap enviado com sucesso!");
    }

  } catch (error) {
    console.error("Falha na requisição do Zap:", error);
  }
}