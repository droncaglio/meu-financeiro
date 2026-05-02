# Meu Financeiro

Sistema de gestão financeira empresarial baseado em partidas dobradas (double-entry bookkeeping).

Substitui planilhas complexas eliminando o trabalho manual de fechamento mensal, lançamento de contrapartidas e geração de relatórios.

## Stack

| Camada | Tecnologia |
|---|---|
| API | NestJS + TypeScript + Prisma |
| Banco | PostgreSQL 16 (RLS multi-tenant) |
| Web | React 18 + Vite + shadcn/ui |
| Mobile | Flutter (fase 2) |
| Infra | Docker Compose → VPS |

## Funcionalidades

- Plano de contas hierárquico e dinâmico
- Lançamentos em partidas dobradas com estorno automático
- Balanço Patrimonial e DRE gerados automaticamente
- Balancete de Verificação, Indicadores (IEF) e Ponto de Equilíbrio
- Contas a pagar/receber com calendário de vencimentos
- Importação de extratos bancários com categorização via IA
- Multi-tenant com isolamento por Row-Level Security

## Estrutura do Projeto

```
meu-financeiro/
├── api/          # NestJS API
├── web/          # React + Vite
├── docs/         # Especificação completa
└── docker-compose.yml
```

## Documentação

| Documento | Descrição |
|---|---|
| [IDEA.md](docs/IDEA.md) | Visão geral e conceitos |
| [REQUIREMENTS.md](docs/REQUIREMENTS.md) | Requisitos funcionais e não-funcionais |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Decisões arquiteturais |
| [DATA_MODEL.md](docs/DATA_MODEL.md) | Modelagem do banco de dados |
| [API.md](docs/API.md) | Contratos REST |
| [UI_FLOWS.md](docs/UI_FLOWS.md) | Fluxos de tela |
| [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Plano de implementação com checklists |

## Desenvolvimento Local

### Pré-requisitos
- Docker e Docker Compose
- Node.js 20+

### Setup

```bash
# 1. Clone o repositório
git clone https://github.com/droncaglio/meu-financeiro.git
cd meu-financeiro

# 2. Suba o banco de dados
docker compose up -d

# 3. API
cd api
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev

# 4. Web (outro terminal)
cd web
npm install
npm run dev
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- Web: `http://localhost:5173`
- Adminer (banco): `http://localhost:8080`

## Licença

Privado — todos os direitos reservados. 
