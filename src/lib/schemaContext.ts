// src/lib/schemaContext.ts

export const PRISMA_SCHEMA_CONTEXT = `
enum TransactionType { INCOME EXPENSE }
enum Role { USER TREASURER ADMIN }

model User {
  id String @id
  name String?
  email String @unique
  phoneNumber String?
  tenantId String?
  role Role
}

model Member {
  id String @id
  name String
  phone String?
  tenantId String
}

model Category {
  id String @id
  name String
  type TransactionType
  tenantId String
}

model Account {
  id String @id
  name String
  initialBalance Decimal
  tenantId String
}

model transaction {
  id String @id
  description String?
  amount Decimal
  date DateTime
  type TransactionType
  categoryId String
  accountId String
  memberId String?
  tenantId String
}

model StaffRole {
  id String @id
  name String
  tenantId String
}

model Staff {
  id String @id
  name String
  roleId String
  phone String?
  isSalaried Boolean
  salary Decimal?
  tenantId String
}

model AccountPayable {
  id String @id
  description String
  amount Decimal
  dueDate DateTime
  isPaid Boolean
  paidAt DateTime?
  categoryId String
  staffId String?
  tenantId String
}
`;