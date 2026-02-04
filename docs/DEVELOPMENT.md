# Development Guide - Finan

## Setup do Ambiente de Desenvolvimento

### Pré-requisitos

- Node.js 18+
- PostgreSQL 13+
- Git
- VS Code (recomendado)

### Instalação

1. **Clone o repositório**

```bash
git clone https://github.com/yourusername/finan.git
cd finan
```

2. **Instale dependências**

```bash
npm install
```

3. **Configure o ambiente**

```bash
cp .env.example .env.local
# Configure as variáveis de ambiente
```

4. **Setup do database**

```bash
# Gera o client Prisma
npx prisma generate

# Roda migrations em development
npx prisma db push

# Popula dados iniciais
npx tsx prisma/seed.ts
```

5. **Inicie o servidor de desenvolvimento**

```bash
npm run dev
```

## Estrutura do Código

### Next.js 15 App Router

O projeto utiliza App Router do Next.js 15:

```
src/app/
├── (dashboard)/           # Route groups
├── api/                   # API routes
├── auth/                  # Authentication pages
├── globals.css           # Global styles
├── layout.tsx            # Root layout
└── page.tsx              # Home page
```

### tRPC Setup

#### Server-side Configuration

```typescript
// src/server/api/trpc.ts
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

export const t = initTRPC.create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});
```

#### Routers Structure

```typescript
// src/server/api/routers/index.ts
import { memberRouter } from "./member";
import { transactionRouter } from "./transaction";
import { payableRouter } from "./payables";

export const appRouter = t.router({
  member: memberRouter,
  transaction: transactionRouter,
  payable: payableRouter,
  // ... outros routers
});

export type AppRouter = typeof appRouter;
```

### Database Schema

#### Multi-tenancy Pattern

```prisma
model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  plan      Plan     @default(FREE)

  // Relações
  users     User[]
  members   Member[]
  transactions transaction[]

  @@map("tenants")
}

model Member {
  id       String @id @default(cuid())
  name     String
  tenantId String

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
  @@map("members")
}
```

## Development Workflow

### 1. Criar Novo Router

```typescript
// src/server/api/routers/example.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}!`,
      };
    }),
});
```

### 2. Adicionar Router Principal

```typescript
// src/server/api/routers/index.ts
import { exampleRouter } from "./example";

export const appRouter = t.router({
  example: exampleRouter,
});
```

### 3. Usar no Client

```typescript
// src/app/example/page.tsx
import { api } from '~/trpc/react'

export default function ExamplePage() {
  const { data, isLoading } = api.example.hello.useQuery({ text: 'World' })

  if (isLoading) return <div>Loading...</div>

  return <div>{data?.greeting}</div>
}
```

## Code Patterns

### Componentes Reutilizáveis

#### Form Components

```typescript
// src/components/ui/input.tsx
import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && <label className="text-sm font-medium">{label}</label>}
        <input
          ref={ref}
          className={`w-full rounded-md border px-3 py-2 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }
)
```

#### Data Tables

```typescript
// src/components/ui/data-table.tsx
import React from 'react'

interface Column<T> {
  key: keyof T
  label: string
  render?: (value: any) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
}

export function DataTable<T>({ data, columns }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="px-6 py-3 text-left">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={String(column.key)} className="px-6 py-4">
                  {column.render
                    ? column.render(row[column.key])
                    : String(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### Hook Patterns

#### Data Fetching

```typescript
// src/hooks/use-members.ts
import { api } from "~/trpc/react";

export const useMembers = () => {
  const utils = api.useUtils();

  const { data, isLoading, error } = api.member.getAll.useQuery();

  const createMutation = api.member.create.useMutation({
    onSuccess: () => {
      utils.member.getAll.invalidate();
    },
  });

  return {
    members: data ?? [],
    isLoading,
    error,
    createMember: createMutation.mutate,
  };
};
```

#### Form Handling

```typescript
// src/hooks/use-form.ts
import { useState } from "react";
import { z } from "zod";

export const useForm = <T extends z.ZodSchema>(
  schema: T,
  initialValues: z.infer<T>,
) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setValue = (name: keyof z.infer<T>, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const result = schema.safeParse(values);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  return {
    values,
    errors,
    setValue,
    validate,
  };
};
```

## Testing

### Unit Tests with Jest

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

```typescript
// __tests__/components/button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from '~/components/ui/button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

### tRPC Testing

```typescript
// __tests__/api/member.test.ts
import { createTRPCMsw } from "trpc-msw";
import { setupServer } from "msw/node";
import { type AppRouter } from "~/server/api/routers";

const trpcMsw = createTRPCMsw<AppRouter>();
const server = setupServer(
  trpcMsw.member.getAll.query((req, res, ctx) => {
    return res(ctx.data([{ id: "1", name: "John" }]));
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Database Development

### Migrations

```bash
# Criar nova migration
npx prisma migrate dev --name add_new_field

# Deploy migration em produção
npx prisma migrate deploy

# Reset database (development)
npx prisma migrate reset
```

### Seed Data

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Criar tenant de exemplo
  const tenant = await prisma.tenant.create({
    data: {
      name: "Igreja Exemplo",
      slug: "igreja-exemplo",
      plan: "FREE",
    },
  });

  // Criar categorias padrão
  await prisma.category.createMany({
    data: [
      { name: "Dízimo", type: "INCOME", tenantId: tenant.id },
      { name: "Oferta", type: "INCOME", tenantId: tenant.id },
      { name: "Água", type: "EXPENSE", tenantId: tenant.id },
      { name: "Luz", type: "EXPENSE", tenantId: tenant.id },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy loading de componentes
const ReportsPage = dynamic(() => import('~/app/reports/page'), {
  loading: () => <div>Loading reports...</div>,
})
```

### Database Optimization

```sql
-- Índices compostos para queries complexas
CREATE INDEX idx_transactions_tenant_date_amount
ON transactions(tenant_id, date DESC, amount DESC);

-- Partial indexes para filtros comuns
CREATE INDEX idx_unpaid_payables
ON account_payables(tenant_id, due_date)
WHERE is_paid = false;
```

### Caching Strategy

```typescript
// Cache de queries com React Query
const { data } = api.transaction.getSummary.useQuery(
  { month, year },
  {
    staleTime: 1000 * 60 * 5, // 5 minutos
    cacheTime: 1000 * 60 * 10, // 10 minutos
  },
);
```

## Debugging

### VS Code Debugging

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### Database Debugging

```typescript
// Habilitar query logging
const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});
```

## Style Guide

### TypeScript

- Use strict mode
- Prefer explicit typing over inference
- Use Zod for runtime validation

### CSS/Tailwind

- Use Tailwind classes for styling
- Component-driven styling approach
- Consistent spacing and colors

### Git

- Conventional commits
- Feature branches
- PR reviews required

## Common Issues

### 1. Prisma Client Generation

```bash
rm -rf node_modules/@prisma
npm install
npx prisma generate
```

### 2. Next.js Build Issues

```bash
rm -rf .next
npm run build
```

### 3. Type Errors

```bash
npm run typecheck
# Fix issues one by one
```

## Environment Management

### Development

```bash
# .env.development
NODE_ENV=development
DATABASE_URL="postgresql://localhost:5432/finan_dev"
```

### Staging

```bash
# .env.staging
NODE_ENV=staging
DATABASE_URL="postgresql://staging-db:5432/finan_staging"
```

### Production

```bash
# .env.production
NODE_ENV=production
DATABASE_URL="postgresql://prod-db:5432/finan_prod"
```

## Contribuição

### Pull Request Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

## Release Process

1. Update version in `package.json`
2. Update changelog
3. Create git tag
4. Deploy to staging
5. Run E2E tests
6. Deploy to production
7. Monitor for issues
