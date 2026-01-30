import { db } from "./src/server/db"; // Verifique se o caminho do 'db' está certo

async function main() {
  console.log("🚀 Instalando Trigger de Pagamento Automático...");

  // 1. Habilita extensão pgcrypto (para gerar UUIDs)
  await db.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

  // 2. Cria a Função
  await db.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION process_payment_transaction()
    RETURNS TRIGGER AS $$
    BEGIN
        IF NEW."isPaid" = true AND OLD."isPaid" = false THEN
            INSERT INTO "transaction" (
                "id", "description", "amount", "date", "type", 
                "categoryId", "accountId", "tenantId", "memberId"
            )
            VALUES (
                gen_random_uuid()::text,
                CONCAT('Pgto: ', NEW."description"),
                NEW."amount",
                COALESCE(NEW."paidAt", NOW()),
                'EXPENSE',
                NEW."categoryId",
                (SELECT "id" FROM "Account" WHERE "tenantId" = NEW."tenantId" LIMIT 1),
                NEW."tenantId",
                NULL
            );
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 3. Cria o Gatilho
  await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trigger_pay_bill ON "AccountPayable";`);
  await db.$executeRawUnsafe(`
    CREATE TRIGGER trigger_pay_bill
    AFTER UPDATE ON "AccountPayable"
    FOR EACH ROW
    EXECUTE FUNCTION process_payment_transaction();
  `);

  console.log("✅ Sucesso! O banco agora lança pagamentos automaticamente.");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });