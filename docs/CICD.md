# CI/CD — Meu Financeiro

Documentação completa do pipeline de integração e entrega contínua.

---

## Stack de infraestrutura

| Camada | Tecnologia | Função |
|---|---|---|
| Controle de versão | GitHub | Repositório + gatilho do pipeline |
| CI/CD | GitHub Actions | Lint, testes, build e deploy automatizados |
| Registry de imagens | GitHub Container Registry (GHCR) | Armazena as imagens Docker geradas |
| Contêineres | Docker + Docker Compose | Empacotamento e orquestração dos serviços |
| Reverse proxy / SSL | Caddy | Roteamento HTTP/HTTPS com certificado automático via Let's Encrypt |
| Servidor | VPS KingHost (4 GB RAM, 2 vCPU, Ubuntu 24.04) | Hospedagem de produção |
| Banco de dados | PostgreSQL 16 | Persistência dos dados |

---

## Arquitetura de produção

```mermaid
graph TB
    Internet["🌐 Internet"]

    subgraph VPS["VPS KingHost — 187.45.255.182"]
        Caddy["Caddy\n(portas 80 / 443)\nSSL automático via Let's Encrypt"]
        Web["web\nnginx:alpine\nReact SPA estática"]
        API["api\nnode:alpine\nNestJS :3000"]
        PG["postgres\nPostgreSQL 16\n:5432 (interno)"]
    end

    GHCR["📦 GHCR\nghcr.io/droncaglio/\nmeu-financeiro-api\nmeu-financeiro-web"]

    Internet -->|"HTTPS\nmeu-financeiro.vps-kinghost.net"| Caddy
    Caddy -->|"/api/*"| API
    Caddy -->|"/*"| Web
    API -->|"SQL via RLS"| PG
    GHCR -->|"docker pull"| API
    GHCR -->|"docker pull"| Web
```

### Roteamento do Caddy

| Caminho | Destino | Exemplo |
|---|---|---|
| `/api/v1/*` | NestJS (porta 3000) | `GET /api/v1/health` |
| `/api/docs` | Swagger UI (NestJS) | `GET /api/docs` |
| `/*` | nginx servindo React | `GET /` |

---

## Pipeline CI/CD

```mermaid
flowchart TD
    Dev(["👨‍💻 git push / PR"])

    subgraph CI["CI — roda em todo push e PR"]
        direction TB
        LintAPI["ci-api\n1. npm ci\n2. prisma generate\n3. eslint\n4. tsc --noEmit\n5. jest (com postgres)"]
        LintWeb["ci-web\n1. npm ci\n2. eslint\n3. vite build"]
    end

    subgraph Deploy["Deploy — só no push para main, após CI passar"]
        direction TB
        BuildPush["Build & Push\nDocker Buildx\nbuild API + Web\npush → GHCR com SHA e :latest"]
        SSH["Deploy via SSH\n1. docker login GHCR\n2. docker compose pull\n3. docker compose up -d\n4. docker image prune"]
    end

    VPS(["🖥️ VPS em produção\nnova versão no ar"])

    Dev --> LintAPI & LintWeb
    LintAPI & LintWeb -->|"ambos aprovados"| BuildPush
    BuildPush --> SSH
    SSH --> VPS

    LintAPI & LintWeb -->|"qualquer falha"| Blocked(["🚫 deploy bloqueado"])
```

### Jobs do pipeline

#### `ci-api`
Roda com um serviço PostgreSQL efêmero (`postgres:16-alpine`) para que os testes de integração tenham banco real disponível.

```
actions/checkout
actions/setup-node (Node 20, cache npm)
npm ci
npx prisma generate       ← gera o client antes do lint (tipos necessários para ESLint)
npm run lint              ← ESLint com auto-fix
npx tsc --noEmit          ← typecheck sem emitir arquivos
npm test                  ← Jest com DATABASE_URL apontando para o postgres efêmero
```

#### `ci-web`
```
actions/checkout
actions/setup-node (Node 20, cache npm)
npm ci
npm run lint              ← ESLint
npm run build             ← tsc -b && vite build (valida que o bundle compila)
```

#### `deploy` (somente `push` na `main`, após CI)
```
docker/login-action       ← autentica no GHCR com GITHUB_TOKEN (automático)
docker/setup-buildx       ← habilita BuildKit com cache GHA
docker/build-push-action  ← build multi-stage API + push com tags :latest e :<sha>
docker/build-push-action  ← build multi-stage Web + push com tags :latest e :<sha>
appleboy/ssh-action       ← SSH no VPS, pull das imagens novas, docker compose up
```

---

## Imagens Docker

### API — build multi-stage

```mermaid
flowchart LR
    subgraph builder["Stage: builder (node:20-alpine)"]
        B1["COPY package.json +\nprisma.config.ts + prisma/"]
        B2["npm ci\n(todas as deps)"]
        B3["npx prisma generate\n(gera client TypeScript)"]
        B4["COPY src/"]
        B5["nest build\n→ dist/"]
        B1 --> B2 --> B3 --> B4 --> B5
    end

    subgraph runner["Stage: runner (node:20-alpine)"]
        R1["npm ci --omit=dev\n(só prod deps)"]
        R2["COPY .prisma/\n(client gerado)"]
        R3["COPY dist/\n(app compilado)"]
        R4["CMD node dist/main"]
        R1 --> R2 --> R3 --> R4
    end

    builder -->|"dist/ + .prisma/"| runner
```

**Por que dois stages?**
O stage `builder` tem o compilador TypeScript, `@nestjs/cli`, Jest e todas as devDependencies. O stage `runner` carrega apenas as dependências de produção (~70% menor).

**Observação sobre `prisma.config.ts`:**
O arquivo fica na raiz do projeto (fora de `src/`). Se incluído na compilação, o TypeScript muda o `rootDir` implícito e o output passa para `dist/src/main.js` em vez de `dist/main.js`. Por isso ele é excluído em `tsconfig.build.json` — o Prisma CLI o lê diretamente, sem compilação.

### Web — build multi-stage

```mermaid
flowchart LR
    subgraph builder["Stage: builder (node:20-alpine)"]
        W1["npm ci"]
        W2["ARG VITE_API_URL=/api/v1"]
        W3["vite build\n→ dist/ (assets estáticos)"]
        W1 --> W2 --> W3
    end

    subgraph runner["Stage: runner (nginx:1.27-alpine)"]
        N1["COPY dist/ → /usr/share/nginx/html"]
        N2["COPY nginx.conf\ntry_files para SPA routing"]
        N3["nginx -g daemon off"]
        N1 --> N2 --> N3
    end

    builder -->|"dist/"| runner
```

**`VITE_API_URL=/api/v1`:**
Como Caddy serve web e API no mesmo domínio, a URL da API é relativa (`/api/v1`). O Axios resolve contra a origem atual — nenhum domínio hardcoded na imagem.

---

## Fluxo de deploy completo

```mermaid
sequenceDiagram
    participant Dev as Desenvolvedor
    participant GH as GitHub
    participant GA as GitHub Actions
    participant GHCR as GHCR (Registry)
    participant VPS as VPS (Docker)

    Dev->>GH: git push main
    GH->>GA: dispara workflow pipeline.yml
    GA->>GA: ci-api (lint + typecheck + tests)
    GA->>GA: ci-web (lint + build)
    GA->>GHCR: docker push api:<sha> + :latest
    GA->>GHCR: docker push web:<sha> + :latest
    GA->>VPS: SSH — docker compose pull
    VPS->>GHCR: pull meu-financeiro-api:<sha>
    VPS->>GHCR: pull meu-financeiro-web:<sha>
    GA->>VPS: SSH — docker compose up -d
    VPS->>VPS: recria containers api + web
    VPS->>VPS: api roda prisma migrate deploy
    VPS->>VPS: docker image prune (limpa imagens antigas)
    GA-->>Dev: ✅ deploy concluído
```

---

## Secrets necessários no GitHub

`Settings → Secrets and variables → Actions`

| Secret | Valor | Uso |
|---|---|---|
| `VPS_HOST` | IP do servidor | Endereço SSH |
| `VPS_USER` | `deploy` | Usuário SSH sem privilégios de root |
| `VPS_SSH_KEY` | Chave privada Ed25519 completa | Autenticação SSH do Actions no VPS |
| `GHCR_TOKEN` | GitHub PAT com `read:packages` | Login no GHCR dentro do VPS para `docker pull` |
| `GITHUB_TOKEN` | Automático (não precisa criar) | Login no GHCR para `docker push` no Actions |

---

## Estrutura de arquivos

```
meu-financeiro/
├── .github/
│   └── workflows/
│       └── pipeline.yml        # CI + CD (lint, tests, build, deploy)
│
├── api/
│   ├── Dockerfile              # Multi-stage: builder + runner
│   ├── .dockerignore
│   └── tsconfig.build.json     # Exclui prisma.config.ts da compilação
│
├── web/
│   ├── Dockerfile              # Multi-stage: builder + nginx
│   ├── nginx.conf              # SPA routing + cache de assets
│   ├── .dockerignore
│   └── tsconfig.app.json       # ignoreDeprecations para baseUrl
│
├── docker-compose.yml          # Dev local: só PostgreSQL + Adminer
├── docker-compose.prod.yml     # Produção: Caddy + API + Web + Postgres
└── Caddyfile                   # Reverse proxy: /api/* → NestJS, /* → React
```

---

## Variáveis de ambiente em produção

Arquivo `/home/deploy/meu-financeiro/.env` no VPS (nunca commitado):

```env
# PostgreSQL
POSTGRES_DB=meu_financeiro
POSTGRES_USER=mfuser
POSTGRES_PASSWORD=<senha forte>

# API — host "postgres" = nome do serviço no docker-compose
DATABASE_URL="postgresql://mfuser:<senha>@postgres:5432/meu_financeiro"

# Segredos JWT e pepper — gerados com crypto.randomBytes(64)
JWT_SECRET=<64 bytes hex>
JWT_REFRESH_SECRET=<64 bytes hex>
APP_PEPPER=<64 bytes hex>

PORT=3000
NODE_ENV=production
```
