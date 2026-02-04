# Guia de Deploy - Finan

## Pré-requisitos

- Node.js 18+
- PostgreSQL 13+
- Redis (opcional, para cache)
- Contas Stripe, WhatsApp Business API, Resend

## Variáveis de Ambiente

### Obrigatórias

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/finan"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://yourdomain.com"

# OAuth Providers (opcional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# WhatsApp
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""
WHATSAPP_WEBHOOK_VERIFY_TOKEN=""

# Email
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# OpenAI (para relatórios inteligentes)
OPENAI_API_KEY="sk-..."
```

## Deploy Vercel (Recomendado)

### 1. Setup do Projeto

```bash
# Clone o repositório
git clone https://github.com/yourusername/finan.git
cd finan

# Instale dependências
npm install

# Configure as variáveis de ambiente no Vercel
vercel env add
```

### 2. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Rodar migrations
npx prisma migrate deploy

# (Opcional) Seed inicial
npx tsx prisma/seed.ts
```

### 3. Deploy

```bash
# Deploy para Vercel
vercel --prod
```

### 4. Webhooks Configuration

#### Stripe

1. Acesse Stripe Dashboard > Webhooks
2. Adicione endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Configure eventos: `customer.subscription.*`, `invoice.*`

#### WhatsApp

1. Configure Twilio webhook para: `https://yourdomain.com/api/webhooks/whatsapp/messages-upsert`

## Deploy Docker

### Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/finan
      - NEXTAUTH_SECRET=your-secret
    depends_on:
      - db
      - redis

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=finan
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## Deploy DigitalOcean App Platform

### 1. Criação do App

```yaml
# .do/app.yaml
name: finan
services:
  - name: web
    source_dir: /
    github:
      repo: yourusername/finan
      branch: main
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        value: ${db.DATABASE_URL}

databases:
  - name: db
    engine: PG
    version: "13"
```

## Deploy AWS

### EC2 + RDS

#### 1. Setup EC2

```bash
# SSH na instância
ssh -i key.pem ec2-user@your-ip

# Instalação
sudo yum update -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 18
```

#### 2. Setup PM2

```bash
npm install -g pm2

# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'finan',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}

pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

#### 3. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoramento e Logging

### Vercel Analytics

- Já integrado por padrão
- Métricas de performance e usuários

### Custom Monitoring

```javascript
// lib/monitoring.ts
import { createPrometheusMetrics } from './prometheus'

export const metrics = createPrometheusMetrics({
  prefix: 'finan_',
  labels: ['method', 'route', 'status']
})

// Middleware em app/layout.tsx
export async function middleware(request: Request) {
  const start = Date.now()

  const response = NextResponse.next()

  const duration = Date.now() - start
  metrics.httpRequests.inc({
    method: request.method,
    route: request.nextUrl.pathname,
    status: response.status
  })

  metrics.httpRequestDuration.observe(duration, {
    method: request.method,
    route: request.nextUrl.pathname
  })

  return response
}
```

## Backup

### Database Backup

```bash
# Script de backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="finan_backup_$DATE.sql"

pg_dump $DATABASE_URL > $BACKUP_FILE

# Upload para S3
aws s3 cp $BACKUP_FILE s3://your-backup-bucket/$BACKUP_FILE

# Limpar locais antigos
find . -name "finan_backup_*.sql" -mtime +7 -delete
```

## SSL/HTTPS

- Vercel: Automático
- Docker: Usar certbot ou Cloudflare
- AWS: Certificate Manager + Application Load Balancer

## Performance

### Otimizações

```bash
# Next.js optimizations
next.config.js = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },
  images: {
    domains: ['your-cdn-domain.com']
  }
}
```

### Database Indexes

```sql
-- Índices already in schema
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_tenant_id ON members(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_tenant_date ON transactions(tenant_id, date);
```

## Troubleshooting

### Issues Comuns

#### 1. Database Connection Timeout

```bash
# Aumentar pool size no Prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Para migrations
}
```

#### 2. Memory Issues

```bash
# Aumentar memória Node
NODE_OPTIONS="--max-old-space-size=4096"
```

#### 3. Build Errors

```bash
# Limpar cache
rm -rf .next
npm run build
```

## Scaling

### Horizontal Scaling

- Usar Redis para sessões
- Load balancer com sticky sessions
- Database read replicas

### Vertical Scaling

- Aumentar CPU/RAM
- Otimizar queries Prisma
- Implementar cache inteligente
