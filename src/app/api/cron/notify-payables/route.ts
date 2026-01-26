import { db } from "~/server/db";
import { type NextRequest } from "next/server";

// Função auxiliar para formatar dinheiro
const formatMoney = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export async function GET(req: NextRequest) {
  // 1. SEGURANÇA: Verifica se quem chamou tem a chave secreta
  // Você vai colocar CRON_SECRET="uma_senha_dificil" no seu .env
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Define datas (Hoje)
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Final do dia de hoje

  // 3. Busca todas as contas pendentes até hoje (Vencidas ou Vencendo hoje)
  // Agrupamos por Tenant para mandar uma mensagem só por Igreja
  const tenantsWithPayables = await db.tenant.findMany({
    where: {
      payables: {
        some: {
          status: "OPEN", // Apenas contas abertas
          dueDate: { lte: today } // Vencimento menor ou igual a hoje
        }
      }
    },
    include: {
      // Pega os usuários da igreja para saber pra quem mandar
      users: true, 
      // Pega as contas atrasadas
      payables: {
        where: {
          status: "OPEN",
          dueDate: { lte: today }
        }
      }
    }
  });

  const results = [];

  // 4. Loop por Igreja
  for (const tenant of tenantsWithPayables) {
    const totalValue = tenant.payables.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const count = tenant.payables.length;

    // Monta a mensagem bonitinha
    let message = `🔔 *Alerta Finan Igreja* 🔔\n\n`;
    message += `Olá! Existem *${count} contas* a pagar vencendo hoje ou atrasadas na *${tenant.name}*.\n\n`;
    
    // Lista as 3 primeiras para não ficar gigante
    tenant.payables.slice(0, 3).forEach(p => {
        message += `• ${p.description}: ${formatMoney(Number(p.amount))}\n`;
    });
    
    if (count > 3) message += `... e mais ${count - 3} contas.\n`;
    
    message += `\n💰 *Total:* ${formatMoney(totalValue)}`;
    message += `\n🔗 Acesse para pagar: https://seu-app.com/payables`;

    // 5. Envia para todos os usuários daquela igreja que têm telefone cadastrado
    for (const user of tenant.users) {
      if (user.phoneNumber) {
        await sendWhatsApp(user.phoneNumber, message);
        results.push({ tenant: tenant.name, user: user.name, status: "sent" });
      }
    }
  }

  return Response.json({ success: true, sent_count: results.length, details: results });
}

// --- FUNÇÃO DE ENVIO (MOCKADA PARA EVOLUTION API) ---
async function sendWhatsApp(number: string, text: string) {
  const evolutionApiUrl = process.env.EVOLUTION_API_URL; // Ex: https://api.seuzap.com
  const evolutionApiKey = process.env.EVOLUTION_API_KEY;

  if (!evolutionApiUrl) {
    console.log("⚠️ API de Whatsapp não configurada. Logando mensagem:", text);
    return;
  }

  try {
    await fetch(`${evolutionApiUrl}/message/sendText/instancia_principal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionApiKey!
      },
      body: JSON.stringify({
        number: number, // O número deve estar no formato 5574999...
        options: {
          delay: 1200,
          presence: "composing",
        },
        textMessage: {
          text: text
        }
      })
    });
  } catch (error) {
    console.error("Erro ao enviar Zap:", error);
  }
}