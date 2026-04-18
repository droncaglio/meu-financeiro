# ARCHITECTURE — Sistema de Gestão Financeira Empresarial

---

## 1. Visão Geral

```
┌─────────────────┐     ┌─────────────────┐
│   React Web     │     │  Flutter Mobile │
│  (Vite + SPA)   │     │   (iOS/Android) │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │         REST API (HTTPS/JSON)
         │                       │
         └───────────┬───────────┘
                     │
          ┌──────────▼──────────┐
          │    NestJS API       │
          │  (REST + Guards +   │
          │   RLS Context)      │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │    PostgreSQL       │
          │  (RLS por tenant)   │
          └─────────────────────┘
```

Uma **API central** em NestJS serve tanto o frontend web (React SPA) quanto o app mobile (Flutter). Toda a lógica de negócio vive na API — o frontend é apenas apresentação.

---

## 2. Stack de Tecnologia

### Backend — API
| Camada | Tecnologia | Justificativa |
|---|---|---|
| Runtime | Node.js 20 LTS | Estável, performance adequada para o volume |
| Framework | **NestJS** + TypeScript | Familiar ao dev, estrutura modular, decorators, guards |
| ORM | **Prisma** | Migrations versionadas, type-safety, client gerado, suporte a RLS |
| Banco | **PostgreSQL 16** | RLS nativo, ACID, suporte robusto |
| Auth | JWT (access 15min + refresh 7d) | Stateless, compatível com web e mobile |
| Validação | class-validator + class-transformer | Integrado ao NestJS |
| LLM (import) | Anthropic SDK (Claude) | Categorização de extratos bancários em português |
| Testes | Jest + Supertest | Padrão NestJS |
| Documentação | Swagger (OpenAPI) via @nestjs/swagger | Auto-gerado dos decorators |

### Frontend Web
| Camada | Tecnologia | Justificativa |
|---|---|---|
| Build | **Vite** + TypeScript | Extremamente rápido, ideal para SPA pura |
| Framework | **React 18** | Familiar ao dev, base de tudo, sem overhead de SSR |
| UI Components | **shadcn/ui** + Tailwind CSS | Componentes acessíveis, customizáveis, sem lock-in |
| Estado global | **Zustand** | Leve, simples, sem boilerplate |
| Fetch / Cache | **TanStack Query** | Cache, loading states, refetch automático |
| Gráficos | **Recharts** | Leve, compatível com React |
| Formulários | **React Hook Form** + Zod | Performance, validação integrada |
| Tabelas | **TanStack Table** | Tabelas complexas com sort, filtro e paginação (BP, DRE, razão) |
| Roteamento | **React Router v6** | SPA routing |

> **Por que não Next.js?** O dashboard fica atrás de login — sem necessidade de SSR ou SEO. Vite + React entrega SPA pura com DX excelente e zero complexidade desnecessária.

### Mobile (fase 2)
| Camada | Tecnologia |
|---|---|
| Framework | **Flutter** + Dart |
| HTTP | Dio |
| Estado | Riverpod |
| Armazenamento local | flutter_secure_storage (tokens) |

A API já será desenhada para suportar mobile desde o início (REST puro, paginação, tokens).

### Infraestrutura
| Ambiente | Tecnologia |
|---|---|
| Dev local | Docker Compose (API + PostgreSQL) |
| CI/CD | GitHub Actions |
| Produção fase 1 | VPS — Hetzner CX22 (~€4/mês) ou DigitalOcean $6 |
| Containerização | Docker + Docker Compose |
| Proxy reverso | Nginx (SSL via Let's Encrypt) |
| Produção fase 2 | AWS ECS + RDS ao escalar |

**Decisão de infra:** Começar no VPS mais barato com Docker Compose. Custo mínimo para poucos tenants e a migração para AWS é simples — basta apontar o container para RDS.

---

## 3. Estratégia Multi-Tenant — RLS

### Decisão: Row-Level Security no PostgreSQL

Todas as tabelas têm `tenant_id`. O PostgreSQL garante o isolamento via políticas RLS — nenhuma query retorna dados de outro tenant, mesmo que o código esqueça de filtrar.

### Como funciona

**1. Política RLS (exemplo):**
```sql
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON entries
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**2. Interceptor NestJS** seta o contexto antes de cada request:
```typescript
// Prisma middleware injeta o tenant_id na sessão PostgreSQL
await prisma.$executeRaw`
  SELECT set_config('app.current_tenant_id', ${tenantId}, true)
`;
```

**3. Super User** usa role com BYPASSRLS:
```sql
ALTER ROLE app_superuser BYPASSRLS;
```

**4. Criar novo tenant** = inserir uma linha em `tenants`. Sem criar banco, sem criar schema. Migrations rodam uma vez para todos.

---

## 4. Estrutura do Projeto (Monorepo)

```
meu-financeiro/
├── api/                            # NestJS
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/               # Login, JWT, refresh, confirmação email
│   │   │   ├── tenants/            # Tenants, usuários, roles, convites
│   │   │   ├── chart-of-accounts/  # Plano de contas
│   │   │   ├── entries/            # Lançamentos contábeis
│   │   │   ├── commitments/        # Contas a pagar/receber
│   │   │   ├── bank-accounts/      # Contas bancárias
│   │   │   ├── reports/            # BP, DRE, BV, IEF, PE
│   │   │   ├── imports/            # Importação de extratos + LLM
│   │   │   └── goals/              # Metas e previsões (DRE)
│   │   ├── common/
│   │   │   ├── decorators/         # @CurrentTenant, @CurrentUser, @SuperUser
│   │   │   ├── guards/             # JwtGuard, RolesGuard, SuperUserGuard
│   │   │   ├── filters/            # Exception filters globais
│   │   │   └── interceptors/       # TenantContext, AuditLog
│   │   ├── database/
│   │   │   └── prisma.service.ts
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── test/
│   └── Dockerfile
│
├── web/                            # React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/               # Login, cadastro, confirmação email
│   │   │   ├── dashboard/
│   │   │   ├── entries/            # Lançamentos
│   │   │   ├── commitments/        # Contas a pagar/receber + calendário
│   │   │   ├── chart-of-accounts/  # Plano de contas
│   │   │   └── reports/
│   │   │       ├── balance-sheet/  # BP
│   │   │       ├── income-statement/ # DRE
│   │   │       └── trial-balance/  # BV
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui
│   │   │   └── features/           # componentes de domínio
│   │   ├── lib/
│   │   │   ├── api.ts              # cliente HTTP (axios)
│   │   │   ├── hooks/              # TanStack Query hooks
│   │   │   └── store/              # Zustand stores
│   │   └── main.tsx
│   └── Dockerfile
│
├── docker-compose.yml              # Dev local
├── docker-compose.prod.yml         # Produção
└── .github/
    └── workflows/
        └── deploy.yml
```

---

## 5. Módulos da API

| Módulo | Responsabilidade |
|---|---|
| **auth** | Cadastro, confirmação de email, login, refresh token, recuperação de senha |
| **tenants** | CRUD de tenants, convite de usuários, gestão de roles, acesso Super User |
| **chart-of-accounts** | CRUD do plano de contas, validação de hierarquia, seed do plano padrão |
| **entries** | Lançamentos com estorno automático, recorrência, razão da conta, saldo inicial |
| **commitments** | Contas a pagar/receber, fluxo de pagamento, recorrência, alertas de vencimento |
| **bank-accounts** | CRUD de contas bancárias + criação automática no plano de contas |
| **reports** | BP, DRE, BV, IEF, PE — calculados sob demanda, exportação PDF |
| **imports** | Upload CSV/OFX, parsing, integração com Claude, revisão e confirmação em lote |
| **goals** | Metas e previsões mensais por conta (usado na DRE) |

---

## 6. Fluxo de Autenticação

```
1. POST /auth/register
   → cria user (status: pending_verification)
   → envia e-mail com token de confirmação

2. GET /auth/verify-email?token=xxx
   → ativa o user
   → cria o tenant automaticamente
   → retorna access_token + refresh_token

3. POST /auth/login
   → valida credenciais
   → retorna access_token (15min) + refresh_token (7d, httpOnly cookie)

4. POST /auth/refresh
   → valida refresh_token
   → retorna novo access_token

5. Toda requisição autenticada:
   → Header: Authorization: Bearer <access_token>
   → JwtGuard extrai user + tenant_id
   → TenantInterceptor seta app.current_tenant_id no PostgreSQL
   → RLS filtra automaticamente todos os dados
```

---

## 7. Cálculo dos Relatórios

BP e DRE são **calculados sob demanda** a partir dos lançamentos — nunca armazenados.

```
saldo_conta(conta_id, período) =
  saldo_inicial
  + Σ débitos no período
  - Σ créditos no período
  (sinal invertido para contas de natureza credora)

saldo_sintético(conta_pai) =
  Σ saldo_conta(filhas_recursivo)
```

**Performance:** índices compostos em `(tenant_id, account_id, date)` e `(tenant_id, date)` na tabela de lançamentos.

**Plano de escala:** se o volume crescer (> 100k lançamentos/tenant), adicionar **materialized views** mensais como cache — recalculadas automaticamente após cada fechamento.

---

## 8. Decisões Arquiteturais (ADR)

| # | Decisão | Alternativa rejeitada | Motivo |
|---|---|---|---|
| ADR-01 | RLS no PostgreSQL para multi-tenancy | Schema por tenant | Migrations simples, operação trivial, criar tenant = inserir linha |
| ADR-02 | NestJS como framework da API | Fastify puro / Go | Familiar ao dev, módulos prontos, decorators |
| ADR-03 | Prisma como ORM | TypeORM | Migrations mais seguras, DX superior, type-safety |
| ADR-04 | React + Vite como frontend | Next.js | Dashboard fica atrás de login — sem necessidade de SSR ou SEO |
| ADR-05 | Relatórios calculados sob demanda | Snapshots pré-calculados | Dados sempre corretos, sem complexidade de sincronização |
| ADR-06 | VPS único no início | AWS ECS desde o dia 1 | Custo mínimo (~€4/mês) para poucos tenants, migração simples depois |
| ADR-07 | API REST única para web e mobile | BFF separado por cliente | YAGNI — contratos idênticos por enquanto |
| ADR-08 | shadcn/ui + Tailwind | MUI / Ant Design | Sem lock-in de estilo, componentes acessíveis, customização total |
| ADR-09 | Claude (Anthropic) para categorização de extratos | GPT-4 / regras manuais | Qualidade superior em português, SDK disponível |

---

## 9. Próximos Passos

1. **IDEA.md** ✅
2. **REQUIREMENTS.md** ✅
3. **ARCHITECTURE.md** ✅ ← estamos aqui
4. **DATA_MODEL.md** — modelagem completa do banco (entidades, relacionamentos, índices, políticas RLS)
5. **API.md** — contratos REST (endpoints, request/response, erros)
6. **Implementação** — por módulo, começando pelo núcleo (auth → plano de contas → lançamentos → relatórios)
