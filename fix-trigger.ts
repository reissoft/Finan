import { db } from "./src/server/db";

async function main() {
  console.log("🔧 Ajustando Trigger para os nomes reais das tabelas...");

  try {
    // 1. Limpa tudo para garantir
    await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trigger_pay_bill ON "AccountPayable";`);
    await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS process_payment_transaction;`);

    // 2. Cria a Função com os nomes CORRETOS (baseado no seu @@map)
    await db.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION process_payment_transaction()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW."isPaid" = true AND OLD."isPaid" = false THEN
                
                INSERT INTO "transactions" (  -- Tabela real: 'transactions'
                    "id",
                    "description",
                    "amount",
                    "date",
                    "type",
                    "categoryId",
                    "accountId",
                    "tenantId",
                    "memberId",
                    "updatedAt" -- Adicionado para evitar erro de not-null
                )
                VALUES (
                    gen_random_uuid()::text,
                    CONCAT('Pgto: ', NEW."description"),
                    NEW."amount",
                    COALESCE(NEW."paidAt", NOW()),
                    'EXPENSE',
                    NEW."categoryId",
                    -- AQUI ESTAVA O ERRO: Mudamos de "Account" para "accounts"
                    (SELECT "id" FROM "accounts" WHERE "tenantId" = NEW."tenantId" LIMIT 1),
                    NEW."tenantId",
                    NULL,
                    NOW() -- updatedAt
                );
                
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);

    // 3. Recria o Gatilho
    await db.$executeRawUnsafe(`
        CREATE TRIGGER trigger_pay_bill
        AFTER UPDATE ON "AccountPayable"
        FOR EACH ROW
        EXECUTE FUNCTION process_payment_transaction();
    `);

    console.log("✅ Trigger corrigido! Agora apontando para a tabela 'accounts'.");

  } catch (e) {
    console.error("❌ Erro ao corrigir:", e);
  }
}

main()
  .finally(async () => {
    await db.$disconnect();
  });