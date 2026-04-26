# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Meu Financeiro** is an enterprise financial management system implementing double-entry bookkeeping (partidas dobradas). It replaces a complex Excel spreadsheet with a multi-tenant SaaS, eliminating manual monthly closing and counter-entry posting.

Core principle: every financial event produces exactly two journal entry lines — one debit, one credit — always balanced. Reports (Balance Sheet, DRE, Trial Balance) are computed on-demand from these entries, never pre-stored.

## Repository Layout

```
meu-financeiro/
├── api/          # NestJS backend
├── web/          # React + Vite frontend
├── docs/         # Full specification (REQUIREMENTS, ARCHITECTURE, DATA_MODEL, API, UI_FLOWS, IMPLEMENTATION_PLAN)
└── docker-compose.yml  # PostgreSQL 16 + Adminer
```

## Commands

### Infrastructure
```bash
docker compose up -d           # Start PostgreSQL (port 5432) + Adminer (port 8080)
docker compose down -v         # Tear down and wipe database
```

### API (`cd api`)
```bash
npm run start:dev              # Dev server with watch mode (port 3000)
npm run build                  # Compile to dist/
npm run test                   # Unit tests
npm run test:watch             # Unit tests in watch mode
npm run test:cov               # Coverage report
npm run test:e2e               # E2E tests
npm run lint                   # ESLint (auto-fix)
npm run format                 # Prettier

npx prisma migrate dev         # Apply pending migrations
npx prisma migrate reset       # Drop and recreate DB (dev only)
npx prisma studio              # Web DB inspector
```

### Web (`cd web`)
```bash
npm run dev                    # Vite dev server (port 5173)
npm run build                  # Production build
npm run lint                   # ESLint check
```

### Swagger UI
Available at `http://localhost:3000/api/docs` while the API is running.

## Architecture

### Multi-Tenancy via PostgreSQL RLS

All business tables have a `tenant_id UUID` column. Row-Level Security is enforced at the database level via a PostgreSQL policy:

```sql
tenant_id = current_setting('app.current_tenant_id')::uuid
```

The [TenantContextInterceptor](api/src/common/interceptors/tenant-context.interceptor.ts) runs before every request and injects the tenant ID into the PostgreSQL session. This means a bug in application logic cannot leak cross-tenant data.

### API Request Lifecycle

1. `JwtGuard` validates the Bearer token and extracts `user_id` + `tenant_id`
2. `TenantContextInterceptor` runs `SET app.current_tenant_id = '<tenant_id>'`
3. All subsequent Prisma queries are automatically filtered by RLS

### Auth Flow

- `POST /auth/register` → creates user + sends email verification
- `GET /auth/verify-email?token=xxx` → activates user, creates tenant, returns tokens
- `POST /auth/login` → returns access token (15 min, in response body) + refresh token (7 days, httpOnly cookie)
- `POST /auth/refresh` → rotates tokens using the httpOnly cookie
- Web stores access token in Zustand (memory only). Axios interceptor in [api.ts](web/src/lib/api.ts) auto-refreshes on 401.

### Database

Prisma 7 with `@prisma/adapter-pg` (connection pool via `pg`). Schema at [api/prisma/schema.prisma](api/prisma/schema.prisma). RLS policies at [api/prisma/rls-policies.sql](api/prisma/rls-policies.sql) — these must be applied manually after migrations (`psql < prisma/rls-policies.sql`).

All PKs are UUIDs (`@default(uuid())`), all timestamps use `@db.Timestamptz`.

### Frontend

SPA (no SSR — dashboard is fully behind login). Key wiring:
- [App.tsx](web/src/App.tsx) — React Router with `ProtectedRoute` guard
- [auth.store.ts](web/src/store/auth.store.ts) — Zustand store for `user`, `tenant`, `accessToken`
- [api.ts](web/src/lib/api.ts) — Axios instance with Bearer header + silent refresh
- `@/` path alias maps to `web/src/`

UI components come from shadcn/ui (added individually via `npx shadcn@latest add <component>`), styled with Tailwind CSS v4.

## Key Design Decisions

- **RLS over schema-per-tenant**: simpler migrations, single DB for all tenants
- **SPA over Next.js**: no SEO needed; Vite gives faster DX for a private dashboard
- **Zustand over Redux**: minimal boilerplate for auth state
- **On-demand report calculation**: reports query journal entries directly — no aggregation tables to keep in sync
- **Pepper + bcrypt**: password hashing uses `APP_PEPPER` env var before bcrypt to add protection against DB-only breaches

## Environment Variables

See [.env.example](.env.example) for all required variables. Local dev uses `.env` at the root (Docker Compose) and `api/.env` (NestJS reads `DATABASE_URL`).

## Implementation Roadmap

Documented step-by-step in [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md). Completed steps:

- **Step 1**: Scaffolding — NestJS + React/Vite, Docker Compose, Prisma schema, RLS foundation

Upcoming: Auth module → Chart of Accounts → Journal Entries → Reports → Payables/Receivables → Bank imports with Claude AI categorization.
