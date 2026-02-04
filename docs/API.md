# API Documentation - Finan

## Overview

Finan é um sistema financeiro multi-tenant desenvolvido para gestão financeira de igrejas. Utiliza Next.js 15, tRPC, Prisma e PostgreSQL.

## Arquitetura

### Stack Tecnológica

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: tRPC, NextAuth.js, Prisma ORM
- **Banco de Dados**: PostgreSQL
- **Autenticação**: NextAuth.js com适配ador Prisma
- **Pagamentos**: Stripe
- **Comunicação**: WhatsApp (webhooks), Resend (emails)

## Endpoints API

### Autenticação

#### `POST /api/auth/[...nextauth]`

Rotas de autenticação NextAuth.js para login, logout, callbacks.

#### `GET /api/verify`

Verificação de email e ativação de conta.

### Webhooks

#### `POST /api/webhooks/stripe`

Recebe eventos do Stripe para gestão de assinaturas.

#### `POST /api/webhooks/whatsapp/messages-upsert`

Recebe mensagens do WhatsApp para integração.

#### `POST /api/cron/notify-payables`

Endpoint cron para notificações de contas a pagar.

### tRPC Routes

#### Routers Disponíveis:

- `auth-router`: Operações de autenticação
- `member`: Gestão de membros
- `transaction`: Lançamentos financeiros
- `payables`: Contas a pagar
- `reports`: Relatórios financeiros
- `staff`: Gestão de funcionários
- `settings`: Configurações do sistema
- `stripe`: Integração com Stripe

## Modelos de Dados

### Core Models

#### Tenant

```typescript
interface Tenant {
  id: string;
  name: string;
  slug: string;
  city?: string;
  state?: string;
  description?: string;
  logoUrl?: string;
  plan: Plan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeCurrentPeriodEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### User

```typescript
interface User {
  id: string;
  name?: string;
  email: string;
  password?: string;
  emailVerified?: Date;
  image?: string;
  role: Role;
  tenantId?: string;
  verifyToken?: string;
  phoneNumber?: string;
  receiveWhatsappAlerts: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Member

```typescript
interface Member {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthDate?: Date;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Transaction

```typescript
interface Transaction {
  id: string;
  description?: string;
  amount: Decimal;
  date: Date;
  type: TransactionType;
  tenantId: string;
  categoryId: string;
  accountId: string;
  memberId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Account

```typescript
interface Account {
  id: string;
  name: string;
  initialBalance: Decimal;
  tenantId: string;
}
```

#### Category

```typescript
interface Category {
  id: string;
  name: string;
  type: TransactionType;
  tenantId: string;
}
```

#### Staff

```typescript
interface Staff {
  id: string;
  name: string;
  roleId: string;
  phone?: string;
  email?: string;
  isSalaried: boolean;
  salary?: Decimal;
  inss?: Decimal;
  fgts?: Decimal;
  otherTaxes?: Decimal;
  tenantId: string;
  paymentDay?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### AccountPayable

```typescript
interface AccountPayable {
  id: string;
  description: string;
  amount: Decimal;
  dueDate: Date;
  isPaid: boolean;
  paidAt?: Date;
  categoryId: string;
  staffId?: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Enums

#### Plan

```typescript
enum Plan {
  FREE
  PRO
  ENTERPRISE
}
```

#### Role

```typescript
enum Role {
  USER      // Apenas visualiza
  TREASURER // Pode lançar
  ADMIN     // Pode tudo
}
```

#### TransactionType

```typescript
enum TransactionType {
  INCOME  // Entrada
  EXPENSE // Saída
}
```

## Integrações

### Stripe

- Customer management
- Subscription handling
- Webhook processing

### WhatsApp

- Message handling via webhooks
- Alert notifications

### Resend

- Email notifications
- Account verification

## Ambiente

### Variáveis de Ambiente

O projeto usa `@t3-oss/env-nextjs` para validação de variáveis de ambiente.

## Scripts Úteis

```bash
# Development
npm run dev

# Build
npm run build

# Database
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio

# Code Quality
npm run lint
npm run typecheck
npm run format:check
npm run format:write
```

## Multi-tenancy

O sistema é projetado para multi-tenancy:

- Cada tenant tem seus próprios dados isolados
- Índices otimizados por tenantId
- Middleware de autenticação por tenant

## Relatórios

### Relatórios Disponíveis:

- Balancete geral
- Livro caixa
- Contas a pagar
- Dashboard com gráficos

## Features

- Gestão completa de finanças para igrejas
- Controle de membros e dízimos
- Gestão de funcionários e folha de pagamento
- Contas a pagar com vencimentos
- Relatórios financeiros detalhados
- Integração com WhatsApp para alertas
- Sistema SaaS com planos FREE/PRO/ENTERPRISE
