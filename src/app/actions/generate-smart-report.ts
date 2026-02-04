"use server";

import { db } from "~/server/db";
import OpenAI from "openai";
import { auth } from "~/server/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateSmartReport(userQuery: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autorizado");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { tenant: true },
  });

  if (!user?.tenantId) throw new Error("Usuário sem organização");

  // Verificação de plano PRO no servidor
  if (user?.tenant?.plan !== "PRO") {
    throw new Error(
      "Relatórios com IA são exclusivos do plano PRO. Faça upgrade para acessar esta funcionalidade.",
    );
  }

  // 1. Contexto de Categorias
  const categories = await db.category.findMany({
    where: { tenantId: user.tenantId },
    select: { name: true },
  });
  const categoryNames = categories.map((c) => c.name).join(", ");

  // 2. Prompt Ajustado: IA define intenção, JS define datas exatas
  const prompt = `
    Você é um analista de dados financeiros.
    O usuário vai pedir um relatório em linguagem natural.
    Sua missão é extrair os filtros para consulta no banco de dados.

    CONTEXTO:
    - Hoje é: ${new Date().toLocaleDateString("pt-BR")}
    - Categorias disponíveis: ${categoryNames}

    REGRAS:
    - Retorne APENAS um JSON válido.
    - Se o usuário NÃO especificar datas (ex: "gastos deste mês", "contas em aberto"), retorne "startDate": null e "endDate": null. Eu vou calcular o mês atual no código.
    - Se o usuário especificar (ex: "em Janeiro de 2025"), tente preencher no formato ISO. Cuidado com anos bissextos.
    - Se o usuário falar "gastos", "saídas" ou "despesas", type = "EXPENSE".
    - Se o usuário falar "entradas", "receitas" ou "ofertas", type = "INCOME".
    - Se não especificar tipo, type = null (traz tudo).

    FORMATO DE RESPOSTA (JSON):
    {
      "reportTitle": "Título descritivo",
      "startDate": "YYYY-MM-DDT00:00:00.000Z" | null,
      "endDate": "YYYY-MM-DDT23:59:59.999Z" | null,
      "categoryFilters": ["Categoria1"], 
      "type": "INCOME" | "EXPENSE" | null
    }

    PEDIDO DO USUÁRIO: "${userQuery}"
  `;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
    });

    const filterData = JSON.parse(
      completion.choices[0]?.message.content ?? "{}",
    );

    // --- 🛠️ CORREÇÃO DE DATA (SAFETY CHECK) ---
    // Se a IA mandou null OU mandou uma data inválida (ex: 30 de fevereiro), usamos o mês atual.

    let startIso = filterData.startDate;
    let endIso = filterData.endDate;

    // Função auxiliar para pegar mês atual se necessário
    const now = new Date();
    if (!startIso || !endIso) {
      // Primeiro dia do mês atual
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      firstDay.setHours(0, 0, 0, 0);

      // Último dia do mês atual (Matematicamente correto)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      lastDay.setHours(23, 59, 59, 999);

      startIso ??= firstDay.toISOString();
      endIso ??= lastDay.toISOString();
    }

    // Validação extra: O Prisma explode se a string for data inválida (ex: 2026-02-29).
    // Tentamos criar um objeto Date. Se der "Invalid Date", voltamos para hoje.
    try {
      new Date(startIso).toISOString();
      new Date(endIso).toISOString();
    } catch {
      // Se a data da IA estiver quebrada, usa o dia de hoje como fallback de emergência
      console.log("Data inválida detectada, usando fallback.");
      startIso = new Date().toISOString();
      endIso = new Date().toISOString();
    }
    // ------------------------------------------

    const whereClause: any = {
      tenantId: user.tenantId,
      date: {
        gte: startIso,
        lte: endIso,
      },
    };

    if (filterData.type) {
      whereClause.type = filterData.type;
    }

    if (filterData.categoryFilters && filterData.categoryFilters.length > 0) {
      whereClause.category = {
        name: { in: filterData.categoryFilters },
      };
    }

    const transactions = await db.transaction.findMany({
      where: whereClause,
      include: { category: true, account: true },
      orderBy: { date: "asc" },
    });

    // Calcula total
    const total = transactions.reduce((acc, curr) => {
      return acc + Number(curr.amount);
    }, 0);

    return {
      success: true,
      report: {
        title: filterData.reportTitle,
        period: `${new Date(startIso).toLocaleDateString("pt-BR")} até ${new Date(endIso).toLocaleDateString("pt-BR")}`,
        data: transactions,
        total: total,
      },
    };
  } catch (error) {
    console.error("Erro no Smart Report:", error);
    return {
      success: false,
      error: "Não foi possível gerar o relatório. Tente reformular o pedido.",
    };
  }
}
