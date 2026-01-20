import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando o seed do banco...");

  // 1. Criar uma Igreja (Tenant)
  const igreja = await prisma.tenant.create({
    data: {
      name: "Igreja Batista Central",
      slug: "ib-central",
      plan: "PRO",
    },
  });

  console.log(`⛪ Igreja criada: ${igreja.name}`);

  // 2. Criar Categorias Básicas
  const catDizimo = await prisma.category.create({
    data: { name: "Dízimos", type: "INCOME", tenantId: igreja.id },
  });
  
  const catLuz = await prisma.category.create({
    data: { name: "Energia Elétrica", type: "EXPENSE", tenantId: igreja.id },
  });

  // 3. Criar uma Conta Bancária
  const banco = await prisma.account.create({
    data: { name: "Banco do Brasil", tenantId: igreja.id },
  });

  // 4. Criar um Membro
  const membro = await prisma.member.create({
    data: { name: "João Tesoureiro", tenantId: igreja.id },
  });

  // 5. Criar algumas Transações (Entradas e Saídas)
  
  // Entrada: Dízimo de R$ 500,00
  await prisma.transaction.create({
    data: {
      amount: 500.00,
      type: "INCOME",
      description: "Dízimo de Domingo",
      date: new Date(),
      tenantId: igreja.id,
      categoryId: catDizimo.id,
      accountId: banco.id,
      memberId: membro.id,
    },
  });

  // Saída: Conta de Luz R$ 150,50
  await prisma.transaction.create({
    data: {
      amount: 150.50,
      type: "EXPENSE",
      description: "Conta de Luz Janeiro",
      date: new Date(),
      tenantId: igreja.id,
      categoryId: catLuz.id,
      accountId: banco.id,
    },
  });

  console.log("✅ Banco populado com sucesso!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });