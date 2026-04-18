# DATA MODEL — Sistema de Gestão Financeira Empresarial

> Modelagem completa do banco de dados PostgreSQL.
> Convenções: snake_case, UUID como PK, timestamps em todas as tabelas, soft delete onde indicado.

---

## 1. Diagrama de Entidades (ERD simplificado)

```
tenants ──< users (via tenant_users)
tenants ──< accounts (plano de contas)
tenants ──< entries (lançamentos)
tenants ──< commitments (contas a pagar/receber)
tenants ──< bank_accounts

accounts ──< accounts (hierarquia pai/filho)
accounts ──< entry_lines (linhas de lançamento)
bank_accounts ──> accounts (conta contábil vinculada)

entries ──< entry_lines (débito + crédito)
entries ──> commitments (lançamento gerado por compromisso)
entries ──> entries (estorno referencia o original)

commitments ──> accounts (conta contábil de destino)
commitments ──> bank_accounts (conta de liquidação)
commitments ──> commitments (recorrência: instâncias da mesma série)
```

---

## 2. Tabelas

### 2.1 `tenants`
Organização/empresa. Raiz de todo o isolamento de dados.

```sql
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,  -- usado em URLs futuras
  status      VARCHAR(20)  NOT NULL DEFAULT 'active',  -- active | suspended
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

---

### 2.2 `users`
Usuários globais do sistema. Um usuário pode pertencer a múltiplos tenants.

> **Salt + Pepper:**
> - **Salt** — gerado automaticamente pelo bcrypt/argon2, sem implementação extra.
> - **Pepper** — segredo global em variável de ambiente (`APP_PEPPER`), nunca persistido no banco. Aplicado antes do hash: `bcrypt(APP_PEPPER + password)`. Se o banco vazar, as senhas permanecem protegidas sem o pepper.

```sql
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 VARCHAR(255) NOT NULL UNIQUE,
  password_hash         VARCHAR(255) NOT NULL,  -- bcrypt(APP_PEPPER + password)
  name                  VARCHAR(255) NOT NULL,
  is_super_user         BOOLEAN      NOT NULL DEFAULT false,
  email_verified_at     TIMESTAMPTZ,                        -- null = não confirmado
  email_verify_token    VARCHAR(255),
  reset_password_token  VARCHAR(255),
  reset_password_exp    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

---

### 2.3 `tenant_users`
Relacionamento N:N entre usuários e tenants com role por tenant.

```sql
CREATE TABLE tenant_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL DEFAULT 'viewer',
                          -- admin | financial | viewer
  invited_by  UUID        REFERENCES users(id),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, user_id)
);
```

---

### 2.4 `refresh_tokens`
Refresh tokens para renovação de sessão.

```sql
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id   UUID        REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 2.5 `audit_logs`
Registro imutável de ações sensíveis. Sem RLS — Super User sempre tem acesso.

```sql
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID         REFERENCES tenants(id) ON DELETE SET NULL,
  user_id      UUID         REFERENCES users(id)   ON DELETE SET NULL,
  is_super_user BOOLEAN     NOT NULL DEFAULT false,
  action       VARCHAR(100) NOT NULL,  -- ex: entry.create, entry.reverse, user.invite
  entity       VARCHAR(100),           -- ex: entries, accounts
  entity_id    UUID,
  payload      JSONB,                  -- snapshot dos dados antes/depois
  ip_address   INET,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

---

### 2.6 `accounts` (Plano de Contas)
Estrutura hierárquica de contas contábeis. Uma das tabelas centrais.

```sql
-- Classificação gerencial (não fiscal/societária).
-- Ativo Não Circulante subdivide-se em: Realizável a LP, Investimentos, Imobilizado e Intangível
-- conforme Lei 11.638/2007 (convergência IFRS). Para fins gerenciais, mantemos a subdivisão
-- prática usada pelo usuário (circulante, não circulante realizável, imobilizado).
CREATE TYPE account_type AS ENUM (
  'current_asset',            -- Ativo Circulante
  'non_current_asset',        -- Ativo Não Circulante — Realizável a Longo Prazo
  'investment_asset',         -- Ativo Não Circulante — Investimentos
  'fixed_asset',              -- Ativo Não Circulante — Imobilizado (ex-Ativo Permanente)
  'intangible_asset',         -- Ativo Não Circulante — Intangível
  'current_liability',        -- Passivo Circulante
  'non_current_liability',    -- Passivo Não Circulante
  'equity',                   -- Patrimônio Líquido
  'revenue',                  -- Receita
  'variable_cost',            -- Custo Variável (gerencial)
  'fixed_cost'                -- Custo Fixo (gerencial)
);

CREATE TYPE account_nature AS ENUM (
  'debit',   -- Devedora: débito aumenta, crédito diminui (ativos, custos)
  'credit'   -- Credora:  crédito aumenta, débito diminui (passivos, receitas)
);

CREATE TABLE accounts (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_id      UUID          REFERENCES accounts(id) ON DELETE RESTRICT,
  code           VARCHAR(20)   NOT NULL,         -- ex: '4122', '311'
  name           VARCHAR(255)  NOT NULL,
  type           account_type  NOT NULL,
  nature         account_nature NOT NULL,
  is_leaf        BOOLEAN       NOT NULL DEFAULT true,  -- false = sintética
  accepts_entries BOOLEAN      NOT NULL DEFAULT true,  -- apenas folhas aceitam
  is_active      BOOLEAN       NOT NULL DEFAULT true,
  sort_order     INTEGER       NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, code)
);

-- Índices
CREATE INDEX idx_accounts_tenant     ON accounts(tenant_id);
CREATE INDEX idx_accounts_parent     ON accounts(tenant_id, parent_id);
CREATE INDEX idx_accounts_type       ON accounts(tenant_id, type);
CREATE INDEX idx_accounts_active     ON accounts(tenant_id, is_active);

-- RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON accounts
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 2.7 `entries` (Lançamentos)
Cabeçalho do lançamento. Cada lançamento tem exatamente duas linhas em `entry_lines`.

```sql
CREATE TYPE entry_status AS ENUM (
  'posted',    -- lançamento normal, ativo
  'reversed'   -- foi estornado (não altera saldos — o estorno já fez isso)
);

CREATE TABLE entries (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date                DATE          NOT NULL,
  description         VARCHAR(500)  NOT NULL,
  amount              NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  third_party         VARCHAR(255),              -- cliente/fornecedor (C-P)
  status              entry_status  NOT NULL DEFAULT 'posted',

  -- Rastreabilidade
  reversed_by         UUID          REFERENCES entries(id),  -- aponta para o estorno
  reversal_of         UUID          REFERENCES entries(id),  -- estorno aponta para o original
  commitment_id       UUID          REFERENCES commitments(id),  -- gerado por compromisso?
  recurrence_id       UUID          REFERENCES entry_recurrences(id),

  created_by          UUID          NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Índices críticos para performance dos relatórios
CREATE INDEX idx_entries_tenant_date      ON entries(tenant_id, date);
CREATE INDEX idx_entries_tenant_status    ON entries(tenant_id, status);
CREATE INDEX idx_entries_third_party      ON entries(tenant_id, third_party);
CREATE INDEX idx_entries_commitment       ON entries(commitment_id);

-- RLS
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON entries
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 2.8 `entry_lines` (Linhas do Lançamento)
Sempre exatamente 2 linhas por `entry_id`: uma de débito e uma de crédito.

```sql
CREATE TYPE entry_line_side AS ENUM ('debit', 'credit');

CREATE TABLE entry_lines (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_id    UUID              NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  account_id  UUID              NOT NULL REFERENCES accounts(id),
  side        entry_line_side   NOT NULL,
  amount      NUMERIC(15,2)     NOT NULL CHECK (amount > 0),
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- Índice principal para cálculo de saldos (usado em TODOS os relatórios)
CREATE INDEX idx_entry_lines_account_date
  ON entry_lines(tenant_id, account_id)
  INCLUDE (side, amount);

-- Index para joins com entries (filtro por data)
CREATE INDEX idx_entry_lines_entry ON entry_lines(entry_id);

-- Constraint: débito = crédito por lançamento (garantido via trigger)
-- Ver seção 4 — Triggers

-- RLS
ALTER TABLE entry_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON entry_lines
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 2.9 `entry_recurrences` (Séries Recorrentes)
Controla lançamentos recorrentes. Cada instância aponta para esta tabela.

```sql
CREATE TYPE recurrence_frequency AS ENUM (
  'daily', 'weekly', 'biweekly', 'monthly', 'yearly'
);

CREATE TABLE entry_recurrences (
  id              UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID                  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  frequency       recurrence_frequency  NOT NULL,
  start_date      DATE                  NOT NULL,
  end_date        DATE,                            -- null = sem data de término
  max_occurrences INTEGER,                         -- null = sem limite
  occurrences     INTEGER               NOT NULL DEFAULT 0,
  is_active       BOOLEAN               NOT NULL DEFAULT true,

  -- Template do lançamento
  description     VARCHAR(500)          NOT NULL,
  amount          NUMERIC(15,2)         NOT NULL,
  third_party     VARCHAR(255),
  debit_account_id  UUID               NOT NULL REFERENCES accounts(id),
  credit_account_id UUID               NOT NULL REFERENCES accounts(id),

  created_by      UUID                  NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ           NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ           NOT NULL DEFAULT now()
);

ALTER TABLE entry_recurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON entry_recurrences
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 2.10 `bank_accounts` (Contas Bancárias)
Contas bancárias e carteiras do tenant. Cada uma vinculada a uma conta no plano de contas.

```sql
CREATE TYPE bank_account_type AS ENUM (
  'checking',    -- Conta Corrente
  'savings',     -- Poupança
  'investment',  -- Aplicação
  'cash',        -- Caixa físico
  'credit_card'  -- Cartão de crédito
);

CREATE TABLE bank_accounts (
  id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id        UUID              NOT NULL REFERENCES accounts(id),  -- conta no plano de contas
  name              VARCHAR(255)      NOT NULL,
  institution       VARCHAR(255),                -- nome do banco
  type              bank_account_type NOT NULL,
  agency            VARCHAR(20),
  account_number    VARCHAR(50),
  initial_balance   NUMERIC(15,2)     NOT NULL DEFAULT 0,
  initial_balance_date DATE,
  is_active         BOOLEAN           NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ       NOT NULL DEFAULT now()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bank_accounts
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 2.11 `commitments` (Contas a Pagar / A Receber)

```sql
CREATE TYPE commitment_type AS ENUM ('payable', 'receivable');

CREATE TYPE commitment_status AS ENUM (
  'pending',   -- aguardando pagamento
  'paid',      -- pago/recebido
  'overdue',   -- vencido (atualizado por job)
  'cancelled', -- cancelado
  'partial'    -- pago parcialmente
);

CREATE TABLE commitments (
  id                    UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID               NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type                  commitment_type    NOT NULL,
  status                commitment_status  NOT NULL DEFAULT 'pending',
  description           VARCHAR(500)       NOT NULL,
  amount                NUMERIC(15,2)      NOT NULL CHECK (amount > 0),
  amount_paid           NUMERIC(15,2)      NOT NULL DEFAULT 0,
  due_date              DATE               NOT NULL,
  paid_date             DATE,
  third_party           VARCHAR(255),
  notes                 TEXT,

  -- Conta contábil de destino (ex: 321 - Aluguel)
  account_id            UUID               NOT NULL REFERENCES accounts(id),
  -- Conta bancária prevista para liquidação
  bank_account_id       UUID               REFERENCES bank_accounts(id),
  -- Conta bancária efetivamente usada no pagamento (pode ser diferente)
  paid_bank_account_id  UUID               REFERENCES bank_accounts(id),

  -- Lançamento gerado ao pagar
  entry_id              UUID               REFERENCES entries(id),

  -- Recorrência
  recurrence_series_id  UUID               REFERENCES commitment_recurrences(id),
  recurrence_index      INTEGER,           -- qual instância da série (1, 2, 3...)

  created_by            UUID               NOT NULL REFERENCES users(id),
  created_at            TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ        NOT NULL DEFAULT now()
);

CREATE INDEX idx_commitments_tenant_due     ON commitments(tenant_id, due_date);
CREATE INDEX idx_commitments_tenant_status  ON commitments(tenant_id, status);
CREATE INDEX idx_commitments_series         ON commitments(recurrence_series_id);

ALTER TABLE commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON commitments
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 2.12 `commitment_recurrences` (Séries de Compromissos Recorrentes)

```sql
CREATE TABLE commitment_recurrences (
  id              UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID                  NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type            commitment_type       NOT NULL,
  frequency       recurrence_frequency  NOT NULL,
  start_date      DATE                  NOT NULL,
  end_date        DATE,
  max_occurrences INTEGER,
  is_active       BOOLEAN               NOT NULL DEFAULT true,

  -- Template do compromisso
  description     VARCHAR(500)          NOT NULL,
  amount          NUMERIC(15,2)         NOT NULL,
  third_party     VARCHAR(255),
  account_id      UUID                  NOT NULL REFERENCES accounts(id),
  bank_account_id UUID                  REFERENCES bank_accounts(id),

  created_by      UUID                  NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ           NOT NULL DEFAULT now()
);

ALTER TABLE commitment_recurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON commitment_recurrences
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 2.13 `goals` (Metas e Previsões para DRE)
Metas e previsões mensais por conta. Usadas nas colunas "Meta" e "Previsão" da DRE.

```sql
CREATE TYPE goal_type AS ENUM ('target', 'forecast');  -- meta | previsão

CREATE TABLE goals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id  UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type        goal_type   NOT NULL,
  year        SMALLINT    NOT NULL,
  month       SMALLINT    NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, account_id, type, year, month)
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON goals
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 2.14 `breakeven_config` (Configuração do Ponto de Equilíbrio)
Configuração de margem de contribuição meta e resultado desejado por mês.

```sql
CREATE TABLE breakeven_config (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year                  SMALLINT      NOT NULL,
  month                 SMALLINT      NOT NULL CHECK (month BETWEEN 1 AND 12),
  target_margin_pct     NUMERIC(5,4)  NOT NULL DEFAULT 0.85,  -- ex: 0.85 = 85%
  desired_result        NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, year, month)
);

ALTER TABLE breakeven_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON breakeven_config
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 2.15 `import_batches` (Importações de Extrato)
Controla cada importação de extrato bancário e seu estado de revisão.

```sql
CREATE TYPE import_status AS ENUM (
  'processing',  -- LLM categorizando
  'reviewing',   -- usuário revisando
  'completed',   -- confirmado e lançado
  'cancelled'
);

CREATE TABLE import_batches (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bank_account_id UUID          REFERENCES bank_accounts(id),
  filename        VARCHAR(255)  NOT NULL,
  file_type       VARCHAR(10)   NOT NULL,  -- csv | ofx
  status          import_status NOT NULL DEFAULT 'processing',
  total_lines     INTEGER       NOT NULL DEFAULT 0,
  confirmed_lines INTEGER       NOT NULL DEFAULT 0,
  skipped_lines   INTEGER       NOT NULL DEFAULT 0,
  created_by      UUID          NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE import_lines (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  batch_id          UUID        NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  line_number       INTEGER     NOT NULL,

  -- Dados brutos do arquivo
  raw_date          DATE        NOT NULL,
  raw_description   TEXT        NOT NULL,
  raw_amount        NUMERIC(15,2) NOT NULL,  -- positivo = crédito, negativo = débito

  -- Sugestão do LLM
  suggested_description  VARCHAR(500),
  suggested_debit_id     UUID    REFERENCES accounts(id),
  suggested_credit_id    UUID    REFERENCES accounts(id),
  suggested_third_party  VARCHAR(255),
  llm_confidence         NUMERIC(3,2),  -- 0.00 a 1.00

  -- Decisão do usuário
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
                    -- pending | confirmed | skipped | duplicate
  final_description VARCHAR(500),
  final_debit_id    UUID        REFERENCES accounts(id),
  final_credit_id   UUID        REFERENCES accounts(id),
  final_third_party VARCHAR(255),
  is_duplicate      BOOLEAN     NOT NULL DEFAULT false,
  entry_id          UUID        REFERENCES entries(id),  -- lançamento criado

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON import_batches
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

ALTER TABLE import_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON import_lines
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

## 3. Plano de Contas Padrão (Seed)

Carregado automaticamente no primeiro acesso do tenant. Espelha a estrutura da planilha original.

```
4     Ativo Circulante                   [current_asset, credit, sintética]
  41    Disponível                       [current_asset, debit, sintética]
    411   Caixas                         [current_asset, debit, sintética]
    412   Bancos - C/C                   [current_asset, debit, sintética]
    413   Aplicações                     [current_asset, debit, sintética]
  42    A Receber                        [current_asset, debit, sintética]
    421   Cartão - a Receber             [current_asset, debit, analítica]
    422   Boletos - a Receber            [current_asset, debit, analítica]
    423   Crediário - a Receber          [current_asset, debit, analítica]
    424   Cheques - a Receber            [current_asset, debit, analítica]
  43    Estoques                         [current_asset, debit, sintética]
5     Ativo Não Circulante               [sintética — agrupa os subgrupos abaixo]
  51    Realizável a Longo Prazo         [non_current_asset, debit, sintética]
  52    Investimentos                    [investment_asset, debit, sintética]
  53    Imobilizado                      [fixed_asset, debit, sintética]
    531   Escritório                     [fixed_asset, debit, analítica]
    532   Equipamentos                   [fixed_asset, debit, analítica]
  54    Intangível                       [intangible_asset, debit, sintética]

7     Passivo Circulante                 [current_liability, credit, sintética]
  71    Custos a Pagar                   [current_liability, credit, sintética]
    711   Fornecedores de Mercadorias    [current_liability, credit, analítica]
    712   Fornecedores de Equipamentos   [current_liability, credit, analítica]
    714   Conta Garantida                [current_liability, credit, analítica]
    715   Boletos Antecipados            [current_liability, credit, analítica]
  72    Dívidas a Pagar                  [current_liability, credit, sintética]
    721   Aporte Sócios                  [current_liability, credit, analítica]
    724   Empréstimos Bancários          [current_liability, credit, analítica]
8     Passivo Não Circulante             [non_current_liability, credit, sintética]
9     Patrimônio Líquido                 [equity, credit, sintética]
  91    Saldo Inicial                    [equity, credit, analítica]
  92    Decréscimos e Acréscimos         [equity, credit, analítica]
  93    Resultado Acumulado              [equity, credit, analítica]

1     Receitas                           [revenue, credit, sintética]
  11    Receitas Diretas                 [revenue, credit, sintética]
    111   Vendas - Dinheiro              [revenue, credit, analítica]
    112   Vendas - Cheque                [revenue, credit, analítica]
    113   Vendas - Crediário             [revenue, credit, analítica]
    114   Vendas - Transferência         [revenue, credit, analítica]
    115   Vendas - Cartão de Crédito     [revenue, credit, analítica]
    116   Vendas - Boleto                [revenue, credit, analítica]
  12    Receitas Indiretas               [revenue, credit, sintética]
    121   Juros e Multas de Clientes     [revenue, credit, analítica]
    122   Juros de Aplicações            [revenue, credit, analítica]

2     Custos Variáveis                   [variable_cost, debit, sintética]
  21    Custos Variáveis Diretos         [variable_cost, debit, sintética]
    211   CMV                            [variable_cost, debit, analítica]
  22    Custos Variáveis Indiretos       [variable_cost, debit, sintética]
    221   Taxas de Cartão                [variable_cost, debit, analítica]
    222   Simples Nacional               [variable_cost, debit, analítica]

3     Custos Fixos                       [fixed_cost, debit, sintética]
  31    Despesas Pessoal                 [fixed_cost, debit, sintética]
    311   Colaboradores                  [fixed_cost, debit, analítica]
    312   Pró-labore                     [fixed_cost, debit, analítica]
    314   Honorários e Serv. Terceiros   [fixed_cost, debit, analítica]
    318   Outras Despesas Pessoal        [fixed_cost, debit, analítica]
  32    Despesas Institucionais          [fixed_cost, debit, sintética]
    321   Aluguel                        [fixed_cost, debit, analítica]
    322   Água                           [fixed_cost, debit, analítica]
    323   Luz                            [fixed_cost, debit, analítica]
    324   Telefone / Internet            [fixed_cost, debit, analítica]
    325   Manutenções do Imóvel          [fixed_cost, debit, analítica]
    326   Manutenções de Equipamentos    [fixed_cost, debit, analítica]
    328   Seguros                        [fixed_cost, debit, analítica]
  33    Despesas de Expediente           [fixed_cost, debit, sintética]
    331   Material de Expediente         [fixed_cost, debit, analítica]
    332   Material de Limpeza            [fixed_cost, debit, analítica]
    333   Publicidade e Propaganda       [fixed_cost, debit, analítica]
    335   Combustíveis                   [fixed_cost, debit, analítica]
    336   Viagem e Locomoção             [fixed_cost, debit, analítica]
    337   Impostos e Taxas               [fixed_cost, debit, analítica]
    338   Tarifas Bancárias              [fixed_cost, debit, analítica]
    339   Juros e Encargos               [fixed_cost, debit, analítica]
    3310  Frete de Mercadorias           [fixed_cost, debit, analítica]
    3311  Frete de Clientes              [fixed_cost, debit, analítica]
    3312  Prejuízos e Avarias            [fixed_cost, debit, analítica]
```

---

## 4. Triggers e Constraints

### TRG-01 — Validação de Partidas Dobradas
Garante que cada `entry` tenha exatamente uma linha de débito e uma de crédito com mesmo valor.

```sql
CREATE OR REPLACE FUNCTION validate_double_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_debit_sum  NUMERIC;
  v_credit_sum NUMERIC;
  v_count      INTEGER;
BEGIN
  SELECT
    COUNT(*),
    SUM(CASE WHEN side = 'debit'  THEN amount ELSE 0 END),
    SUM(CASE WHEN side = 'credit' THEN amount ELSE 0 END)
  INTO v_count, v_debit_sum, v_credit_sum
  FROM entry_lines
  WHERE entry_id = NEW.entry_id;

  IF v_count <> 2 THEN
    RAISE EXCEPTION 'Lançamento deve ter exatamente 2 linhas (débito e crédito)';
  END IF;

  IF v_debit_sum <> v_credit_sum THEN
    RAISE EXCEPTION 'Débito (%) deve ser igual ao crédito (%)', v_debit_sum, v_credit_sum;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_validate_double_entry
  AFTER INSERT OR UPDATE ON entry_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION validate_double_entry();
```

### TRG-02 — Atualização de `is_leaf` nas Contas
Quando uma conta recebe filhos, ela vira sintética automaticamente.

```sql
CREATE OR REPLACE FUNCTION update_account_leaf_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    UPDATE accounts
    SET is_leaf = false, accepts_entries = false
    WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_account_leaf_status
  AFTER INSERT ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_account_leaf_status();
```

---

## 5. View de Saldo por Conta

View auxiliar para cálculo de saldos — usada pelos relatórios.

```sql
CREATE OR REPLACE VIEW account_balances AS
SELECT
  el.tenant_id,
  el.account_id,
  a.nature,
  DATE_TRUNC('month', e.date) AS month,
  SUM(CASE WHEN el.side = 'debit'  THEN el.amount ELSE 0 END) AS total_debit,
  SUM(CASE WHEN el.side = 'credit' THEN el.amount ELSE 0 END) AS total_credit,
  SUM(
    CASE
      WHEN a.nature = 'debit'  THEN
        CASE WHEN el.side = 'debit' THEN el.amount ELSE -el.amount END
      WHEN a.nature = 'credit' THEN
        CASE WHEN el.side = 'credit' THEN el.amount ELSE -el.amount END
    END
  ) AS balance
FROM entry_lines el
JOIN entries e  ON e.id = el.entry_id AND e.status = 'posted'
JOIN accounts a ON a.id = el.account_id
GROUP BY el.tenant_id, el.account_id, a.nature, DATE_TRUNC('month', e.date);
```

---

## 6. Resumo das Tabelas

| Tabela | Tem RLS | tenant_id | Descrição |
|---|---|---|---|
| tenants | Não | — | Organizações |
| users | Não | — | Usuários globais |
| tenant_users | Não | Sim | Vínculo usuário-tenant com role |
| refresh_tokens | Não | Sim | Sessões |
| audit_logs | Não | Sim | Log imutável |
| accounts | Sim | Sim | Plano de contas |
| entries | Sim | Sim | Lançamentos (cabeçalho) |
| entry_lines | Sim | Sim | Linhas de lançamento (débito/crédito) |
| entry_recurrences | Sim | Sim | Séries de lançamentos recorrentes |
| bank_accounts | Sim | Sim | Contas bancárias |
| commitments | Sim | Sim | Contas a pagar/receber |
| commitment_recurrences | Sim | Sim | Séries de compromissos recorrentes |
| goals | Sim | Sim | Metas e previsões para DRE |
| breakeven_config | Sim | Sim | Configuração do PE |
| import_batches | Sim | Sim | Importações de extrato (cabeçalho) |
| import_lines | Sim | Sim | Linhas de importação com sugestão LLM |

---

## 7. Próximos Passos

1. **IDEA.md** ✅
2. **REQUIREMENTS.md** ✅
3. **ARCHITECTURE.md** ✅
4. **DATA_MODEL.md** ✅ ← estamos aqui
5. **API.md** — contratos REST (endpoints, request/response, erros)
6. **Implementação** — por módulo, começando pelo núcleo
