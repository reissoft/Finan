# Finan - Sistema Financeiro para Igrejas

Plataforma SaaS completa para gestão financeira de igrejas, desenvolvida com Next.js 15, tRPC, Prisma e arquitetura multi-tenant.

## 🚀 Quick Start

```bash
# Clone e instale
git clone https://github.com/yourusername/finan.git
cd finan
npm install

# Configure ambiente
cp .env.example .env.local
# Edite suas credenciais

# Setup database
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts

# Inicie desenvolvimento
npm run dev
```

## 📚 Documentação

- [📖 Guia Completo](./docs/README.md)
- [🔧 API Reference](./docs/API.md)
- [🚀 Deployment Guide](./docs/DEPLOYMENT.md)
- [💻 Development Guide](./docs/DEVELOPMENT.md)

## ✨ Features

- 💰 **Gestão Financeira**: Controle completo de entradas e saídas
- 👥 **Gestão de Membros**: Cadastro e acompanhamento de dízimos
- 📊 **Relatórios Inteligentes**: Dashboard e relatórios com IA
- 💳 **Pagamentos**: Integração Stripe para assinaturas
- 🔔 **Notificações**: WhatsApp e email automáticos
- 🏗️ **Multi-tenant**: Arquitetura escalável para múltiplas igrejas

## 🛠️ Stack

```
Frontend: Next.js 15 + React 19 + Tailwind CSS
Backend:  tRPC + NextAuth.js + Prisma ORM
Database: PostgreSQL (multi-tenant)
Deploy:   Vercel + Docker
```

## 📁 Estrutura

```
finan/
├── docs/                 # Documentação completa
├── prisma/              # Schema e seeds
├── src/
│   ├── app/            # App Router (Next.js 15)
│   ├── lib/            # Utilitários
│   └── server/         # Backend tRPC
└── package.json
```

## 🚀 Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run db:studio    # Prisma Studio
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

## 🤝 Contribuição

Contribuições são bem-vindas! Veja o [Development Guide](./docs/DEVELOPMENT.md).

## 📄 Licença

MIT License - veja [LICENSE](LICENSE).
