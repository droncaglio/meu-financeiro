# IMPLEMENTATION PLAN — Meu Financeiro

> Checklist completo de implementação por etapa.
> Marcar cada item com `[x]` conforme concluído.

---

## Visão Geral das Etapas

- [x] **Step 1** — Setup do Monorepo e Infraestrutura Base
- [ ] **Step 2** — Autenticação (Auth)
- [ ] **Step 3** — Plano de Contas
- [ ] **Step 4** — Lançamentos Contábeis
- [ ] **Step 5** — Relatórios (BP, DRE, BV)
- [ ] **Step 6** — Contas a Pagar / A Receber
- [ ] **Step 7** — Dashboard e Indicadores (IEF, PE)
- [ ] **Step 8** — Importação de Extrato + LLM
- [ ] **Step 9** — Onboarding e Configurações *(renumerado)*
- [ ] **Step 10** — Observabilidade (Logs, Métricas, Alertas)

---

## Step 1 — Setup do Monorepo e Infraestrutura Base

### Git e Estrutura
- [ ] `git init` na raiz `/home/daniel/meu-financeiro`
- [ ] Criar `.gitignore` (node_modules, .env, dist, .DS_Store)
- [ ] Criar pastas `api/` e `web/`
- [ ] Primeiro commit com os documentos de especificação

### Docker Compose
- [ ] Criar `docker-compose.yml` com serviço `postgres:16-alpine` na porta 5432
- [ ] Adicionar serviço `adminer` (porta 8080) para inspeção do banco em dev
- [ ] Criar `.env` na raiz com: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- [ ] Validar: `docker compose up -d` sobe sem erro
- [ ] Validar: Adminer acessível em `http://localhost:8080`

### NestJS API (`/api`)
- [ ] Scaffold: `npx @nestjs/cli new api --package-manager npm --skip-git`
- [ ] Instalar dependências de produção:
  - [ ] `@nestjs/config`
  - [ ] `@prisma/client` + `prisma`
  - [ ] `@nestjs/jwt` + `@nestjs/passport` + `passport` + `passport-jwt`
  - [ ] `bcryptjs`
  - [ ] `class-validator` + `class-transformer`
  - [ ] `@nestjs/swagger` + `swagger-ui-express`
- [ ] Instalar dependências de tipos: `@types/bcryptjs` `@types/passport-jwt`
- [ ] Configurar `main.ts`: ValidationPipe global, Swagger em `/api/docs`, prefixo `/api/v1`
- [ ] Criar `src/database/prisma.service.ts` com `PrismaService` singleton
- [ ] Criar `src/common/interceptors/tenant-context.interceptor.ts` (seta `app.current_tenant_id` no PostgreSQL)
- [ ] Criar endpoint `GET /api/health` retornando `{ status: 'ok', timestamp: ... }`
- [ ] Validar: `npm run start:dev` responde em `http://localhost:3000`
- [ ] Validar: Swagger acessível em `http://localhost:3000/api/docs`

### Prisma Schema (`/api/prisma`)
- [ ] Criar `prisma/schema.prisma` com provider `postgresql` e `uuid` como default
- [ ] Modelar tabela `tenants` (id, name, slug, status, timestamps)
- [ ] Modelar tabela `users` (id, email, password_hash, name, is_super_user, email_verified_at, tokens, timestamps)
- [ ] Modelar tabela `roles` (id, tenant_id, name, description, is_system, timestamps)
- [ ] Modelar tabela `role_permissions` (id, role_id, permission — UNIQUE role+permission)
- [ ] Modelar tabela `tenant_users` (id, tenant_id, user_id, role_id, joined_at — UNIQUE tenant+user)
- [ ] Modelar tabela `refresh_tokens` (id, user_id, tenant_id, token_hash, expires_at, revoked_at)
- [ ] Modelar tabela `audit_logs` (id, tenant_id, user_id, is_super_user, action, entity, entity_id, payload Json, ip, created_at)
- [ ] Rodar `npx prisma migrate dev --name init`
- [ ] Criar `prisma/rls-policies.sql` com políticas RLS para as tabelas com tenant_id
- [ ] Executar script SQL das políticas RLS no banco
- [ ] Validar: `npx prisma studio` abre e mostra as tabelas

### React + Vite (`/web`)
- [ ] Scaffold: `npm create vite@latest web -- --template react-ts`
- [ ] Instalar dependências:
  - [ ] `tailwindcss` + `postcss` + `autoprefixer` — `npx tailwindcss init -p`
  - [ ] `react-router-dom`
  - [ ] `axios`
  - [ ] `@tanstack/react-query`
  - [ ] `zustand`
  - [ ] `react-hook-form` + `zod` + `@hookform/resolvers`
  - [ ] `@tanstack/react-table`
  - [ ] `recharts`
- [ ] Inicializar shadcn/ui: `npx shadcn@latest init`
- [ ] Instalar componentes shadcn base: `button`, `input`, `form`, `dialog`, `dropdown-menu`, `toast`
- [ ] Criar `src/lib/api.ts` — instância Axios com interceptor de Bearer token e refresh automático
- [ ] Criar `src/lib/query-client.ts` — configuração do TanStack Query
- [ ] Criar `src/store/auth.store.ts` — Zustand com user, tenant, tokens, actions (login, logout, switchTenant)
- [ ] Criar `src/App.tsx` com RouterProvider e rotas base (login, register, verify-email, app)
- [ ] Criar layout básico da aplicação autenticada (sidebar + topbar + footer de abas placeholder)
- [ ] Validar: `npm run dev` abre em `http://localhost:5173` sem erros

---

## Step 2 — Autenticação

### Backend (NestJS)
- [ ] Criar módulo `auth` com NestJS CLI
- [ ] Criar `AuthService`: `register`, `verifyEmail`, `login`, `refresh`, `logout`, `forgotPassword`, `resetPassword`, `switchTenant`
- [ ] Implementar hash de senha com pepper: `bcrypt(APP_PEPPER + password)`
- [ ] Implementar envio de e-mail de confirmação (nodemailer ou provider SMTP)
- [ ] Criar `JwtStrategy` (passport) para validar access token
- [ ] Criar `JwtAuthGuard` para proteger rotas
- [ ] Criar `PermissionsGuard` — carrega permissões do role do usuário no tenant e valida contra `@RequiresPermission()`
- [ ] Criar `SuperUserGuard` para rotas de admin do sistema
- [ ] Criar decorators: `@CurrentUser()`, `@CurrentTenant()`, `@RequiresPermission('recurso:ação')`, `@SuperUser()`
- [ ] Implementar `TenantContextInterceptor` — seta `SET LOCAL app.current_tenant_id` antes de cada query
- [ ] Criar `AuthController` com todos os endpoints (POST /register, GET /verify-email, POST /login, POST /refresh, POST /logout, POST /forgot-password, POST /reset-password, POST /switch-tenant)
- [ ] Ao criar tenant (em `verifyEmail`): criar role **owner** (`is_system=true`) com todas as 16 permissões e vincular o usuário a esse role
- [ ] Adicionar tabelas `roles` e `role_permissions` ao schema Prisma e rodar migration
- [ ] Testar todos os endpoints no Swagger

### Frontend (React)
- [ ] Criar `pages/auth/RegisterPage.tsx` (formulário: nome, email, senha, nome da empresa)
- [ ] Criar `pages/auth/LoginPage.tsx` (formulário: email, senha + seleção de tenant se múltiplos)
- [ ] Criar `pages/auth/VerifyEmailPage.tsx` (lê token da URL, chama API, redireciona)
- [ ] Criar `pages/auth/ForgotPasswordPage.tsx`
- [ ] Criar `pages/auth/ResetPasswordPage.tsx`
- [ ] Implementar rota protegida — redireciona para `/login` se não autenticado
- [ ] Implementar refresh automático de token no interceptor Axios
- [ ] Testar fluxo completo: cadastro → e-mail → confirmação → login → dashboard

---

## Step 3 — Plano de Contas

### Backend
- [ ] Adicionar tabela `accounts` ao schema Prisma e rodar migration
- [ ] Adicionar política RLS na tabela `accounts`
- [ ] Criar módulo `chart-of-accounts`
- [ ] Criar `AccountsService`: `findTree`, `findFlat`, `create`, `update`, `deactivate`
- [ ] Implementar lógica de `is_leaf` e `accepts_entries` automático via trigger no banco
- [ ] Criar seed do plano de contas padrão (todos os ~60 itens do DATA_MODEL.md)
- [ ] Criar `AccountsController` com todos os endpoints (GET /accounts, GET /accounts/flat, POST, GET /:id, PATCH /:id, DELETE /:id)
- [ ] Executar seed no primeiro acesso do tenant (hook no registro)

### Frontend
- [ ] Criar `pages/settings/ChartOfAccountsPage.tsx` — árvore expansível
- [ ] Implementar grupos expansíveis/recolhíveis (`▶` / `▼`)
- [ ] Drawer para criar/editar conta
- [ ] Toggle para mostrar/ocultar contas inativas
- [ ] Busca por nome ou código
- [ ] Implementar **footer de abas** (componente global `AccountsFooter.tsx`):
  - [ ] Grupo fixo: BP, DR, Balancete, IEF, PE
  - [ ] Separador visual
  - [ ] Abas de contas analíticas rolável horizontalmente (grupos com micro-labels)
  - [ ] Aba ativa destacada
  - [ ] Tooltip com nome completo da conta
  - [ ] Clique navega para razão da conta ou relatório

---

## Step 4 — Lançamentos Contábeis

### Backend
- [ ] Adicionar tabelas `entries`, `entry_lines`, `entry_recurrences` ao schema Prisma
- [ ] Adicionar políticas RLS
- [ ] Criar trigger `validate_double_entry` no banco (garante partidas dobradas)
- [ ] Criar módulo `entries`
- [ ] Criar `EntriesService`: `create`, `findAll`, `findOne`, `reverse`, `getLedger`
- [ ] Implementar estorno automático (lançamento inverso + referência ao original)
- [ ] Implementar lançamentos recorrentes (criação da série + instâncias futuras)
- [ ] Implementar assistente de saldo inicial (`POST /entries/opening-balances`)
- [ ] Criar `EntriesController` com todos os endpoints

### Frontend
- [ ] Criar `pages/entries/EntriesPage.tsx` — lista com filtros
- [ ] Criar `components/entries/EntryFormDrawer.tsx` — drawer lateral com:
  - [ ] Navegação Tab+Enter
  - [ ] Autocomplete de contas (débito e crédito)
  - [ ] Campo Terceiro com autocomplete
  - [ ] Painel de últimos lançamentos
  - [ ] Expansão de recorrência
- [ ] Botão "Duplicar" (Ctrl+D) no hover da linha
- [ ] Modal de confirmação de estorno
- [ ] Criar `pages/entries/LedgerPage.tsx` — razão da conta com saldo progressivo

---

## Step 5 — Relatórios

### Backend
- [ ] Criar módulo `reports`
- [ ] Criar view `account_balances` no banco (DATA_MODEL.md seção 5)
- [ ] Criar `ReportsService`:
  - [ ] `getBalanceSheet(tenantId, year)` — BP
  - [ ] `getIncomeStatement(tenantId, year, month?)` — DRE
  - [ ] `getTrialBalance(tenantId, year, month)` — Balancete
  - [ ] `getIndicators(tenantId, year)` — IEF
  - [ ] `getBreakeven(tenantId, year)` — PE
- [ ] Criar `ReportsController` com todos os endpoints GET
- [ ] Validar cálculos com os dados da planilha original (jan–mar 2026)

### Frontend
- [ ] Criar `pages/reports/BalanceSheetPage.tsx` — BP com grupos expansíveis, colunas mensais, % e PDF
- [ ] Criar `pages/reports/IncomeStatementPage.tsx` — DRE com todas as colunas, meses rolável
- [ ] Criar `pages/reports/TrialBalancePage.tsx` — Balancete com totais e validação
- [ ] Criar `pages/reports/IndicatorsPage.tsx` — IEF com gráficos de linha por mês
- [ ] Criar `pages/reports/BreakevenPage.tsx` — PE com metas e comparativo
- [ ] Implementar exportação PDF nos relatórios BP, DRE e BV

---

## Step 6 — Contas a Pagar / A Receber

### Backend
- [ ] Adicionar tabelas `commitments`, `commitment_recurrences` ao schema Prisma
- [ ] Adicionar políticas RLS
- [ ] Criar módulo `commitments`
- [ ] Criar `CommitmentsService`: `create`, `findAll`, `findOne`, `update`, `pay`, `cancel`, `getCalendar`, `getCashFlow`
- [ ] Implementar lógica de pagamento: gera lançamento contábil automaticamente
- [ ] Implementar pagamento parcial: cria compromisso residual
- [ ] Implementar job agendado para marcar vencidos automaticamente (cron `@nestjs/schedule`)
- [ ] Implementar alertas de vencimento (D-7, D-3, D-1, no dia) via notificação no sistema
- [ ] Criar `CommitmentsController` com todos os endpoints

### Frontend
- [ ] Criar `pages/commitments/CommitmentsPage.tsx` com abas (Lista / Calendário / Fluxo de Caixa)
- [ ] Criar lista com filtros (tipo, status, período, terceiro)
- [ ] Modal de pagamento com seleção de conta bancária e valor parcial
- [ ] Criar `components/commitments/CommitmentsCalendar.tsx` — calendário mensal com cor por status
- [ ] Criar `pages/commitments/CashFlowPage.tsx` — gráfico + tabela de projeção

---

## Step 7 — Dashboard e Indicadores

### Backend
- [ ] Criar endpoint `GET /dashboard` com: saldo caixa/bancos, total a receber, total a pagar, resultado do mês, próximos vencimentos

### Frontend
- [ ] Criar `pages/DashboardPage.tsx`:
  - [ ] Cards de resumo (caixa, a receber, a pagar, resultado)
  - [ ] Gráfico de barras Receita vs Custos (Jan–Dez)
  - [ ] Gráfico de linha Resultado Líquido (Jan–Dez)
  - [ ] Painel de próximos vencimentos com link para calendário
- [ ] Conectar indicadores do IEF ao dashboard

---

## Step 8 — Importação de Extrato + LLM

### Backend
- [ ] Adicionar tabelas `import_batches`, `import_lines` ao schema Prisma
- [ ] Instalar `@anthropic-ai/sdk` e `multer`
- [ ] Criar módulo `imports`
- [ ] Criar parser de CSV (detectar colunas data/histórico/valor)
- [ ] Criar parser de OFX
- [ ] Criar `ImportsService`:
  - [ ] `uploadAndProcess` — salva arquivo, cria batch, dispara categorização async
  - [ ] `categorizeLinesWithLLM` — envia linhas para Claude, recebe sugestões de conta+histórico
  - [ ] `confirmBatch` — cria lançamentos contábeis das linhas confirmadas
  - [ ] Detectar duplicatas (mesmo valor+data+histórico já lançado)
- [ ] Criar `ImportsController` com todos os endpoints

### Frontend
- [ ] Criar `pages/settings/ImportsPage.tsx`:
  - [ ] Upload drag-and-drop com seleção de conta bancária
  - [ ] Polling de status enquanto LLM processa
  - [ ] Tabela de revisão linha a linha (data, descrição original, valor, sugestão, confiança)
  - [ ] Botões: confirmar, ignorar, editar sugestão
  - [ ] Confirmar em lote
  - [ ] Highlight de duplicatas

---

## Step 9 — Onboarding e Configurações

### Backend
- [ ] Criar módulo `tenants` completo (CRUD de usuários, convites, gestão de roles e permissões)
  - [ ] `GET /tenants/me/users` — listar usuários do tenant com role
  - [ ] `POST /tenants/me/users/invite` — convidar usuário (e-mail + role_id)
  - [ ] `PATCH /tenants/me/users/:userId/role` — reatribuir role (requer `users:manage`)
  - [ ] `DELETE /tenants/me/users/:userId` — remover usuário do tenant
  - [ ] `GET /tenants/me/roles` — listar roles do tenant com permissões
  - [ ] `POST /tenants/me/roles` — criar role customizado (requer `roles:manage`)
  - [ ] `PATCH /tenants/me/roles/:roleId` — editar nome/permissões de role (requer `roles:manage`, proibido em is_system)
  - [ ] `DELETE /tenants/me/roles/:roleId` — excluir role (requer `roles:manage`, proibido em is_system ou com usuários vinculados)
- [ ] Criar módulo `bank-accounts` (CRUD + criação automática no plano de contas)
- [ ] Criar módulo `goals` (metas e previsões para DRE)
- [ ] Criar módulo `breakeven-config`
- [ ] Criar módulo `admin` (Super User — listar tenants, impersonate)

### Frontend
- [ ] Criar fluxo de onboarding em 3 passos (contas bancárias → saldos iniciais → pronto)
- [ ] Criar `pages/settings/BankAccountsPage.tsx`
- [ ] Criar `pages/settings/UsersPage.tsx`:
  - [ ] Lista de usuários com nome, e-mail e role
  - [ ] Botão convidar — modal com campo e-mail + seletor de role
  - [ ] Inline selector para reatribuir role (com confirmação)
  - [ ] Botão remover usuário (com confirmação)
- [ ] Criar `pages/settings/RolesPage.tsx`:
  - [ ] Lista de roles com quantidade de usuários vinculados
  - [ ] Badge "Sistema" no role Owner
  - [ ] Criar/editar role via drawer com checkboxes agrupados por módulo
  - [ ] Excluir role (desabilitado se is_system ou com usuários vinculados)
- [ ] Criar `pages/settings/GoalsPage.tsx` (metas mensais por conta)
- [ ] Criar `pages/settings/BreakevenConfigPage.tsx`

---

## Step 10 — Observabilidade

### Infraestrutura (Docker Compose)
- [ ] Adicionar serviço `prometheus` ao `docker-compose.yml`
- [ ] Adicionar serviço `grafana` ao `docker-compose.yml`
- [ ] Criar `prometheus.yml` com scrape config apontando para `api:3000/metrics`

### Backend (NestJS)
- [ ] Instalar `pino` + `nestjs-pino` — substituir logger padrão por JSON estruturado
- [ ] Instalar `@willsoto/nestjs-prometheus` — expor endpoint `GET /metrics`
- [ ] Criar métricas customizadas: `http_requests_total`, `http_request_duration_seconds`, `db_query_duration_seconds`
- [ ] Configurar log level por ambiente (debug em dev, info em prod)
- [ ] Adicionar `requestId` em todos os logs de request (correlação)

### Dashboards Grafana
- [ ] Criar dashboard HTTP: requests/s, latência p50/p95/p99, erros 4xx/5xx
- [ ] Criar dashboard DB: queries lentas, pool de conexões
- [ ] Criar dashboard de negócio: tenants ativos, lançamentos criados/dia

---

## Validações Finais (Pré-launch)

- [ ] Testar fluxo completo com os dados reais da planilha (jan–mar 2026)
- [ ] Validar BP e DRE batem com os valores da planilha original
- [ ] Testar isolamento de tenant (usuário A não vê dados do tenant B)
- [ ] Testar Super User acessa todos os tenants
- [ ] Revisar segurança: HTTPS, rate limiting, pepper funcionando
- [ ] Testar importação de extrato com arquivo CSV real
- [ ] Checar performance: BP/DRE carregam em < 3s
- [ ] Criar tenant de demonstração com dados fictícios
- [ ] Configurar domínio e SSL em produção (VPS)
- [ ] Deploy: `docker compose -f docker-compose.prod.yml up -d`
- [ ] Convidar os 3 primeiros clientes

---

## Notas Técnicas

| Item | Decisão |
|---|---|
| Senha | `bcrypt(APP_PEPPER + password)` — pepper no `.env`, nunca no banco |
| Multi-tenancy | PostgreSQL RLS com `SET LOCAL app.current_tenant_id` por request |
| Partidas dobradas | Garantidas por trigger no banco (`validate_double_entry`) |
| Relatórios | Calculados sob demanda — nunca armazenados |
| Importação LLM | Claude (Anthropic) — prompt em português para categorização |
| Estorno | Imutável — edição/exclusão gera lançamento inverso automático |
| Criação de tenant | Inserir linha em `tenants` — sem criar banco ou schema |
| Footer de abas | Alimentado pelo plano de contas do tenant (dinâmico) |
