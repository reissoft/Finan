# Finan - Sistema Financeiro para Igrejas

## Visão Geral

Finan é uma plataforma SaaS completa para gestão financeira de igrejas, desenvolvida com tecnologias modernas e arquitetura escalável. O sistema oferece controle total sobre finanças, membros, funcionários e relatórios, com suporte multi-tenant para servir múltiplas igrejas de forma isolada.

## 🚀 Features Principais

### 💰 Gestão Financeira Completa

- **Lançamentos**: Controle de entradas (dízimos, ofertas) e saídas (despesas)
- **Contas Bancárias**: Gestão de múltiplas contas e caixas
- **Categorias**: Plano de contas personalizável
- **Conciliação**: Saldo automático e conciliação bancária

### 👥 Gestão de Membros

- **Cadastro**: Informações completas dos membros
- **Histórico**: Acompanhamento de dízimos por membro
- **Comunicação**: Integração com WhatsApp

### 📊 Relatórios Inteligentes

- **Balancete Geral**: Visão completa da situação financeira
- **Livro Caixa**: Detalhamento de todas as movimentações
- **Contas a Pagar**: Controle de vencimentos e pagamentos
- **Dashboard**: Gráficos e métricas em tempo real
- **AI Reports**: Relatórios gerados por IA

### 👨‍💼 Gestão de Funcionários

- **Cadastro**: Dados completos dos funcionários
- **Folha de Pagamento**: Cálculo automático com INSS, FGTS
- **Cargos**: Sistema de roles e permissões

### 🔔 Notificações Automáticas

- **WhatsApp**: Alertas de vencimentos e pagamentos
- **Email**: Relatórios periódicos e comunicações

### 💳 Pagamentos e Assinaturas

- **Stripe**: Processamento seguro de pagamentos
- **Planos**: FREE, PRO, ENTERPRISE
- **Trial**: Período gratuito para novos clientes

## 🏗️ Arquitetura Técnica

### Stack Moderno

```
Frontend:    Next.js 15 + React 19 + Tailwind CSS
Backend:     tRPC + NextAuth.js + Prisma ORM
Database:    PostgreSQL (multi-tenant)
Deploy:      Vercel (production) + Docker (self-hosted)
Integrations: Stripe, WhatsApp, Resend, OpenAI
```

### Multi-tenancy

- **Isolamento Completo**: Dados separados por tenant
- **Performance**: Índices otimizados por tenantId
- **Escalabilidade**: Suporte a milhares de igrejas

### Segurança

- **Autenticação**: NextAuth.js com múltiplos providers
- **Autorização**: Sistema de roles (USER, TREASURER, ADMIN)
- **Validação**: Zod para type safety
- **HTTPS**: SSL em todas as requisições

## 📁 Estrutura do Projeto

```
finan/
├── docs/                    # Documentação
│   ├── API.md              # API Reference
│   ├── DEPLOYMENT.md       # Guia de Deploy
│   └── README.md           # Este arquivo
├── prisma/
│   ├── schema.prisma       # Modelo de dados
│   └── seed.ts             # Dados iniciais
├── src/
│   ├── app/                # App Router (Next.js 15)
│   │   ├── _components/    # Componentes compartilhados
│   │   ├── api/            # API routes e webhooks
│   │   ├── auth/           # Páginas de autenticação
│   │   ├── members/        # Gestão de membros
│   │   ├── payables/       # Contas a pagar
│   │   ├── reports/        # Relatórios
│   │   ├── staff/          # Funcionários
│   │   └── settings/       # Configurações
│   ├── lib/                # Utilitários e configs
│   │   ├── ai.ts           # Integração OpenAI
│   │   ├── whatsapp.ts     # WhatsApp integration
│   │   └── schemaContext.ts # Contexto validação
│   └── server/             # Backend
│       ├── api/            # tRPC routers
│       ├── auth/           # Config NextAuth
│       └── db.ts           # Database connection
├── next.config.js          # Config Next.js
├── package.json            # Dependencies
└── tailwind.config.js      # Config Tailwind
```

## 🚀 Getting Started

### Pré-requisitos

- Node.js 18+
- PostgreSQL 13+
- Contas Stripe, WhatsApp Business API, Resend

### Instalação Rápida

1. **Clone o projeto**

```bash
git clone https://github.com/yourusername/finan.git
cd finan
```

2. **Instale dependências**

```bash
npm install
```

3. **Configure variáveis de ambiente**

```bash
cp .env.example .env.local
# Edite .env.local com suas credenciais
```

4. **Setup do database**

```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

5. **Inicie o desenvolvimento**

```bash
npm run dev
```

Acesse `http://localhost:3000` para começar.

### Variáveis de Ambiente Essenciais

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/finan"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# WhatsApp
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="whatsapp:+14155238886"

# Email
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# OpenAI
OPENAI_API_KEY="sk-..."
```

## 📖 Documentação

- [📚 API Reference](./API.md) - Documentação completa da API
- [🚀 Deployment Guide](./DEPLOYMENT.md) - Guia de deploy em produção
- [🔧 Development Guide](./DEVELOPMENT.md) - Guia para desenvolvedores

## 🎯 Fluxos Principais

### 1. Onboarding de Nova Igreja

1. Cadastro no sistema
2. Escolha do plano (FREE inicia)
3. Configuração inicial (dados da igreja)
4. Importação de membros (opcional)
5. Setup de contas bancárias

### 2. Rotina Financeira

1. **Receitas**: Lançar dízimos e ofertass
2. **Despesas**: Registrar pagamentos e contas
3. **Conciliação**: Verificar saldos
4. **Relatórios**: Analisar resultados

### 3. Gestão de Contas a Pagar

1. Cadastrar contas e vencimentos
2. Acompanhar status (pendente/pago)
3. Gerar pagamentos automáticos
4. Receber notificações

## 🔮 Roadmap

### v1.0 (Current)

- ✅ Core financeiro completo
- ✅ Multi-tenancy
- ✅ WhatsApp integration
- ✅ AI reports

### v1.1 (Next)

- 🔄 Mobile app (React Native)
- 🔄 Advanced analytics
- 🔄 Budget planning
- 🔄 Receipt scanning (OCR)

### v2.0 (Future)

- 📋 Fixed assets management
- 📋 Event management
- 📋 Volunteer management
- 📋 Advanced permissions

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/amazing-feature`)
3. Commit suas mudanças (`git commit -m 'Add amazing feature'`)
4. Push para a branch (`git push origin feature/amazing-feature`)
5. Abra um Pull Request

### Development Standards

- TypeScript para type safety
- Prettier + ESLint para code quality
- Testes unitários para novas features
- Commits semânticos

## 📄 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- **Email**: support@finan.com
- **Discord**: [Comunidade Finan](https://discord.gg/finan)
- **Documentation**: [docs.finan.com](https://docs.finan.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/finan/issues)

## 🙏 Agradecimentos

- [T3 Stack](https://create.t3.gg/) - Boilerplate incrível
- [Next.js](https://nextjs.org/) - Framework React production-ready
- [Prisma](https://prisma.io/) - ORM moderno e type-safe
- [tRPC](https://trpc.io/) - End-to-end typesafe APIs
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

---

**Finan** - Simplificando a gestão financeira das igrejas 🏛️💰
