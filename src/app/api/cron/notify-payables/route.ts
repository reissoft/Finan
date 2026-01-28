import { db } from "~/server/db";
import { type NextRequest } from "next/server";

const formatMoney = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export async function GET(req: NextRequest) {
  // 1. Verificação de Segurança
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
   // return new Response("Unauthorized", { status: 401 });
  }

  // 2. Configura a Data (Fuso Horário pode influenciar)
  //const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
/*
  console.log("🔍 --- INICIANDO DEBUG DO CRON ---");
  console.log(`📅 Data Servidor: ${now.toISOString()}`);
  console.log(`📅 Filtrando contas com vencimento até: ${todayEnd.toISOString()}`);*/

  // 3. Busca Tenants (Igrejas) que têm contas pendentes
  const tenantsWithPayables = await db.tenant.findMany({
    where: {
      accountPayables: {
        some: {
          isPaid: false,
          dueDate: { lte: todayEnd }
        }
      }
    },
    include: {
      users: true, // Traz os usuários para ver se acha alguém
      accountPayables: {
        where: {
          isPaid: false,
          dueDate: { lte: todayEnd }
        }
      }
    }
  });

  //console.log(`🏢 Igrejas encontradas com contas pendentes: ${tenantsWithPayables.length}`);

  const results = [];

  // 4. Loop para detalhar o que está acontecendo
  for (const tenant of tenantsWithPayables) {
  //  console.log(`\n➡️ Analisando Igreja: ${tenant.name}`);
   // console.log(`   💰 Contas Vencidas/Hoje: ${tenant.accountPayables.length}`);
   // console.log(`   👥 Usuários cadastrados na equipe: ${tenant.users.length}`);

    if (tenant.users.length === 0) {
      console.log("   ❌ AVISO: Nenhum usuário vinculado a esta igreja (tenantId). Ninguém vai receber.");
      continue;
    }

    // Soma e prepara mensagem
    const totalValue = tenant.accountPayables.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const count = tenant.accountPayables.length;

    let message = `🔔 *Alerta Finan Igreja* 🔔\n\n`;
    message += `Olá! Existem *${count} contas* a pagar vencendo hoje ou atrasadas na *${tenant.name.trim()}*.\n\n`;
    tenant.accountPayables.slice(0, 3).forEach(p => {
        message += `• ${p.description}: ${formatMoney(Number(p.amount))}\n`;
    });
    if (count > 3) message += `... e mais ${count - 3} contas.\n`;
    message += `\n💰 *Total:* ${formatMoney(totalValue)}`;
    message += `\n🔗 Acesse: https://finan-production.up.railway.app/payables`;

    // Tenta enviar para cada usuário
    for (const user of tenant.users) {
      console.log(`   👤 Verificando usuário: ${user.name ?? user.email}`);
      
      if (!user.phoneNumber) {
        console.log("      ⚠️ PULADO: Usuário sem 'phoneNumber' no banco.");
        continue;
      }

      console.log(`      ✅ ENVIANDO para: ${user.phoneNumber}...`);
      await sendWhatsApp(user.phoneNumber, message);
      results.push({ tenant: tenant.name, user: user.name, status: "sent" });
    }
  }

  console.log("🏁 --- FIM DO DEBUG --- \n");
  return Response.json({ success: true, sent_count: results.length, logs: "Verifique os logs do Railway" });
}

// --- FUNÇÃO DE ENVIO ---
async function sendWhatsApp(number: string, text: string) {
  const evolutionApiUrl = process.env.EVOLUTION_API_URL;
  const evolutionApiKey = process.env.EVOLUTION_API_KEY;

  if (!evolutionApiUrl || !evolutionApiKey) {
    console.error("❌ ERRO FATAL: Variáveis da Evolution API não configuradas.");
    return;
  }

  const cleanNumber = number.replace(/\D/g, "");

  try {
    const response = await fetch(`${evolutionApiUrl}/message/sendText/instancia_principal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionApiKey
      },
      body: JSON.stringify({
        number: cleanNumber,
        options: { delay: 1200, presence: "composing" },
        text: text 
      })
    });

    if (!response.ok) {
       console.error(`      ❌ Erro da API Zap: ${response.status} - ${response.statusText}`);
    } else {
       console.log("      ✨ Sucesso API Zap!");
    }
  } catch (error) {
    console.error("      ❌ Erro de Conexão:", error);
  }
}