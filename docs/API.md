# API — Sistema de Gestão Financeira Empresarial

> REST API — NestJS + TypeScript  
> Base URL: `/api/v1`  
> Todas as requisições autenticadas exigem: `Authorization: Bearer <access_token>`  
> Content-Type: `application/json`

---

## Convenções

### Paginação
Endpoints de listagem aceitam:
```
?page=1&limit=20&sort=date&order=desc
```
Resposta sempre inclui:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Erros
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Descrição do erro",
  "details": ["campo: mensagem específica"]
}
```

Códigos usados:
| Código | Significado |
|---|---|
| 400 | Dados inválidos |
| 401 | Não autenticado |
| 403 | Sem permissão (role insuficiente) |
| 404 | Recurso não encontrado |
| 409 | Conflito (ex: e-mail já cadastrado) |
| 422 | Regra de negócio violada |
| 500 | Erro interno |

### Roles
- `super_user` — acesso cross-tenant
- `admin` — acesso total ao tenant
- `financial` — lançamentos + relatórios
- `viewer` — somente leitura

---

## 1. Auth

### POST `/auth/register`
Cria usuário e tenant. Envia e-mail de confirmação.

**Público (sem auth)**

**Request:**
```json
{
  "name": "Daniel Silva",
  "email": "daniel@empresa.com",
  "password": "MinhaS3nha!",
  "tenantName": "Empresa LTDA"
}
```

**Response `201`:**
```json
{
  "message": "Conta criada. Verifique seu e-mail para ativar o acesso."
}
```

**Erros:** `409` e-mail já cadastrado | `400` senha fraca

---

### GET `/auth/verify-email`
Confirma o e-mail via token enviado por e-mail.

**Público**

**Query:** `?token=abc123`

**Response `200`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": "uuid", "name": "Daniel", "email": "..." },
  "tenant": { "id": "uuid", "name": "Empresa LTDA" }
}
```

**Erros:** `400` token inválido ou expirado

---

### POST `/auth/login`
Autentica o usuário.

**Público**

**Request:**
```json
{
  "email": "daniel@empresa.com",
  "password": "MinhaS3nha!",
  "tenantId": "uuid"
}
```
> `tenantId` opcional — se omitido e o usuário pertencer a apenas um tenant, usa-o automaticamente. Se pertencer a múltiplos, retorna a lista de tenants disponíveis.

**Response `200`:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "id": "uuid", "name": "Daniel", "email": "..." },
  "tenant": { "id": "uuid", "name": "Empresa LTDA", "role": "admin" }
}
```

**Response `200` (múltiplos tenants, tenantId não informado):**
```json
{
  "requiresTenantSelection": true,
  "tenants": [
    { "id": "uuid1", "name": "Empresa A", "role": "admin" },
    { "id": "uuid2", "name": "Empresa B", "role": "viewer" }
  ]
}
```

**Erros:** `401` credenciais inválidas | `403` e-mail não confirmado

---

### POST `/auth/refresh`
Renova o access token.

**Público**

**Request:**
```json
{ "refreshToken": "eyJ..." }
```

**Response `200`:**
```json
{ "accessToken": "eyJ..." }
```

**Erros:** `401` refresh token inválido ou expirado

---

### POST `/auth/logout`
Revoga o refresh token.

**Auth: qualquer role**

**Request:**
```json
{ "refreshToken": "eyJ..." }
```

**Response `204`:** (sem body)

---

### POST `/auth/forgot-password`
Envia e-mail com link de redefinição.

**Público**

**Request:**
```json
{ "email": "daniel@empresa.com" }
```

**Response `200`:**
```json
{ "message": "Se o e-mail existir, você receberá as instruções." }
```

---

### POST `/auth/reset-password`
Redefine a senha via token.

**Público**

**Request:**
```json
{
  "token": "abc123",
  "password": "NovaSenha!2"
}
```

**Response `200`:**
```json
{ "message": "Senha redefinida com sucesso." }
```

---

### POST `/auth/switch-tenant`
Troca o tenant ativo sem novo login.

**Auth: qualquer role**

**Request:**
```json
{ "tenantId": "uuid" }
```

**Response `200`:**
```json
{
  "accessToken": "eyJ...",
  "tenant": { "id": "uuid", "name": "Empresa B", "role": "viewer" }
}
```

**Erros:** `403` usuário não pertence ao tenant

---

## 2. Tenants

### GET `/tenants/me`
Dados do tenant atual.

**Auth: viewer+**

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "Empresa LTDA",
  "slug": "empresa-ltda",
  "status": "active",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

---

### PATCH `/tenants/me`
Atualiza dados do tenant.

**Auth: admin**

**Request:**
```json
{ "name": "Novo Nome LTDA" }
```

**Response `200`:** tenant atualizado

---

### GET `/tenants/me/users`
Lista usuários do tenant.

**Auth: admin**

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "name": "Daniel",
    "email": "daniel@...",
    "role": "admin",
    "joinedAt": "2026-01-01T00:00:00Z"
  }
]
```

---

### POST `/tenants/me/users/invite`
Convida usuário por e-mail.

**Auth: admin**

**Request:**
```json
{
  "email": "joao@empresa.com",
  "role": "financial"
}
```

**Response `201`:**
```json
{ "message": "Convite enviado para joao@empresa.com" }
```

**Erros:** `409` usuário já pertence ao tenant

---

### PATCH `/tenants/me/users/:userId/role`
Altera role de um usuário.

**Auth: admin**

**Request:**
```json
{ "role": "viewer" }
```

**Response `200`:** usuário atualizado

---

### DELETE `/tenants/me/users/:userId`
Remove usuário do tenant.

**Auth: admin**

**Erros:** `422` não é possível remover o único admin

**Response `204`:** (sem body)

---

## 3. Super User (Admin do Sistema)

> Todas as rotas `/admin/*` exigem `is_super_user = true`. Ações são registradas no audit log com flag de suporte.

### GET `/admin/tenants`
Lista todos os tenants.

**Auth: super_user**

**Query:** `?page=&limit=&search=`

**Response `200`:** lista paginada de tenants

---

### GET `/admin/tenants/:tenantId`
Detalhes de um tenant específico.

**Auth: super_user**

**Response `200`:** tenant + usuários + estatísticas (total de lançamentos, último acesso)

---

### POST `/admin/tenants/:tenantId/impersonate`
Gera token de acesso ao tenant como super user.

**Auth: super_user**

**Response `200`:**
```json
{
  "accessToken": "eyJ...",
  "tenant": { "id": "uuid", "name": "..." },
  "isSuperUserAccess": true
}
```

---

### POST `/admin/users/super`
Cria um super user. Só pode ser chamado por outro super user ou via CLI de setup.

**Auth: super_user**

**Request:**
```json
{
  "name": "Admin Sistema",
  "email": "admin@sistema.com",
  "password": "SenhaAdmin!"
}
```

**Response `201`:** usuário criado

---

## 4. Plano de Contas

### GET `/accounts`
Retorna a árvore completa do plano de contas.

**Auth: viewer+**

**Query:** `?includeInactive=false`

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "code": "4",
    "name": "Ativo Circulante",
    "type": "current_asset",
    "nature": "debit",
    "isLeaf": false,
    "acceptsEntries": false,
    "isActive": true,
    "children": [
      {
        "id": "uuid",
        "code": "41",
        "name": "Disponível",
        "type": "current_asset",
        "nature": "debit",
        "isLeaf": false,
        "acceptsEntries": false,
        "isActive": true,
        "children": [...]
      }
    ]
  }
]
```

---

### GET `/accounts/flat`
Lista plana de contas (para autocomplete e selects).

**Auth: viewer+**

**Query:** `?search=sicredi&type=current_asset&acceptsEntries=true&isActive=true`

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "code": "4122",
    "name": "Sicredi C/C",
    "fullName": "Ativo Circulante > Disponível > Bancos C/C > Sicredi C/C",
    "type": "current_asset",
    "nature": "debit",
    "acceptsEntries": true
  }
]
```

---

### POST `/accounts`
Cria uma nova conta.

**Auth: admin**

**Request:**
```json
{
  "parentId": "uuid-do-pai",
  "code": "4124",
  "name": "Bradesco C/C",
  "type": "current_asset",
  "nature": "debit",
  "sortOrder": 4
}
```

**Response `201`:** conta criada

**Erros:** `409` código já existe no tenant | `422` parent não aceita filhos (é analítica com lançamentos)

---

### GET `/accounts/:id`
Detalhes de uma conta, incluindo saldo atual.

**Auth: viewer+**

**Response `200`:**
```json
{
  "id": "uuid",
  "code": "4122",
  "name": "Sicredi C/C",
  "type": "current_asset",
  "nature": "debit",
  "isLeaf": true,
  "acceptsEntries": true,
  "isActive": true,
  "balance": 7052.11,
  "parent": { "id": "uuid", "code": "412", "name": "Bancos C/C" }
}
```

---

### PATCH `/accounts/:id`
Atualiza nome, código ou ordem de uma conta.

**Auth: admin**

**Request:**
```json
{
  "name": "Sicredi C/C Principal",
  "sortOrder": 1
}
```

**Response `200`:** conta atualizada

**Erros:** `409` código duplicado

---

### DELETE `/accounts/:id`
Inativa uma conta (soft delete).

**Auth: admin**

**Response `204`:** (sem body)

**Erros:** `422` conta tem lançamentos | `422` conta tem filhas ativas

---

## 5. Lançamentos

### GET `/entries`
Lista de lançamentos com filtros.

**Auth: viewer+**

**Query:** `?startDate=2026-01-01&endDate=2026-03-31&accountId=uuid&thirdParty=DRESS&search=boleto&page=1&limit=20`

**Response `200`:** lista paginada
```json
{
  "data": [
    {
      "id": "uuid",
      "date": "2026-01-02",
      "description": "LIQUIDACAO DE PARCELA - Boleto a receber",
      "amount": 2447.80,
      "thirdParty": "DRESS TO GO",
      "status": "posted",
      "debitAccount": { "id": "uuid", "code": "4122", "name": "Sicredi C/C" },
      "creditAccount": { "id": "uuid", "code": "422", "name": "Boletos a Receber" },
      "reversalOf": null,
      "reversedBy": null,
      "createdBy": { "id": "uuid", "name": "Daniel" },
      "createdAt": "2026-01-02T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

---

### POST `/entries`
Cria um lançamento.

**Auth: financial+**

**Request:**
```json
{
  "date": "2026-01-02",
  "description": "Pagamento aluguel janeiro",
  "amount": 3500.00,
  "debitAccountId": "uuid-321-aluguel",
  "creditAccountId": "uuid-4122-sicredi",
  "thirdParty": "Proprietário João Silva"
}
```

**Response `201`:**
```json
{
  "id": "uuid",
  "date": "2026-01-02",
  "description": "Pagamento aluguel janeiro",
  "amount": 3500.00,
  "status": "posted",
  "debitAccount": { "id": "uuid", "code": "321", "name": "Aluguel" },
  "creditAccount": { "id": "uuid", "code": "4122", "name": "Sicredi C/C" },
  "thirdParty": "Proprietário João Silva",
  "createdAt": "2026-04-15T10:00:00Z"
}
```

**Erros:** `422` conta não aceita lançamentos (sintética) | `422` conta inativa | `422` valor zero ou negativo

---

### GET `/entries/:id`
Detalhes de um lançamento.

**Auth: viewer+**

**Response `200`:** lançamento completo (mesmo formato do POST response)

---

### POST `/entries/:id/reverse`
Estorna um lançamento. Cria lançamento inverso automaticamente.

**Auth: financial+**

**Request:**
```json
{
  "description": "Estorno: lançamento incorreto"
}
```
> Se omitido, description padrão: `"Estorno de: [descrição original]"`

**Response `201`:** novo lançamento de estorno

**Erros:** `422` lançamento já estornado | `422` lançamento é um estorno (não pode estornar estorno)

---

### GET `/entries/ledger/:accountId`
Razão da conta — extrato com saldo progressivo.

**Auth: viewer+**

**Query:** `?startDate=2026-01-01&endDate=2026-03-31&thirdParty=DRESS&page=1&limit=50`

**Response `200`:**
```json
{
  "account": { "id": "uuid", "code": "4122", "name": "Sicredi C/C" },
  "openingBalance": 8874.70,
  "closingBalance": 7052.11,
  "data": [
    {
      "id": "uuid",
      "date": "2026-01-02",
      "description": "IOF S/ OPER. CREDITO PJ",
      "debit": null,
      "credit": 67.50,
      "side": "credit",
      "balance": 8807.20,
      "thirdParty": null,
      "entryId": "uuid"
    }
  ],
  "meta": { "page": 1, "limit": 50, "total": 87, "totalPages": 2 }
}
```

---

### POST `/entries/recurrences`
Cria uma série de lançamentos recorrentes.

**Auth: financial+**

**Request:**
```json
{
  "description": "Pró-labore mensal",
  "amount": 5000.00,
  "debitAccountId": "uuid-312",
  "creditAccountId": "uuid-4122",
  "thirdParty": "Daniel Silva",
  "frequency": "monthly",
  "startDate": "2026-01-05",
  "endDate": "2026-12-05"
}
```

**Response `201`:**
```json
{
  "id": "uuid",
  "frequency": "monthly",
  "startDate": "2026-01-05",
  "endDate": "2026-12-05",
  "occurrences": 12,
  "description": "Pró-labore mensal"
}
```

---

### GET `/entries/recurrences`
Lista séries recorrentes ativas.

**Auth: viewer+**

**Response `200`:** lista de séries

---

### DELETE `/entries/recurrences/:id`
Cancela séries futuras de uma recorrência.

**Auth: financial+**

**Response `204`:** (sem body)

---

### POST `/entries/opening-balances`
Lançamentos de saldo inicial (assistente de abertura).

**Auth: admin**

**Request:**
```json
{
  "date": "2025-12-31",
  "balances": [
    { "accountId": "uuid-4122", "balance": 8874.70 },
    { "accountId": "uuid-422",  "balance": 17167.97 },
    { "accountId": "uuid-714",  "balance": -83236.22 }
  ]
}
```
> Valores negativos = conta credora com saldo devedor (ou vice-versa — raro)

**Response `201`:**
```json
{
  "entriesCreated": 5,
  "message": "Saldos iniciais lançados. Verifique o Balancete para confirmar o fechamento."
}
```

**Erros:** `422` já existem lançamentos no tenant (só pode rodar uma vez)

---

## 6. Contas a Pagar / A Receber

### GET `/commitments`
Lista compromissos com filtros.

**Auth: viewer+**

**Query:** `?type=payable&status=pending&startDueDate=2026-04-01&endDueDate=2026-04-30&thirdParty=&page=1&limit=20`

**Response `200`:** lista paginada
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "payable",
      "status": "pending",
      "description": "Aluguel abril",
      "amount": 3500.00,
      "amountPaid": 0,
      "dueDate": "2026-04-10",
      "thirdParty": "Proprietário João",
      "account": { "id": "uuid", "code": "321", "name": "Aluguel" },
      "bankAccount": { "id": "uuid", "name": "Sicredi C/C" }
    }
  ],
  "meta": { ... }
}
```

---

### POST `/commitments`
Cria um compromisso.

**Auth: financial+**

**Request:**
```json
{
  "type": "payable",
  "description": "Aluguel abril",
  "amount": 3500.00,
  "dueDate": "2026-04-10",
  "accountId": "uuid-321",
  "bankAccountId": "uuid-sicredi",
  "thirdParty": "Proprietário João",
  "notes": "Vence todo dia 10"
}
```

**Response `201`:** compromisso criado

---

### GET `/commitments/:id`
Detalhes de um compromisso.

**Auth: viewer+**

**Response `200`:** compromisso completo

---

### PATCH `/commitments/:id`
Atualiza dados de um compromisso pendente.

**Auth: financial+**

**Erros:** `422` compromisso já pago ou cancelado

---

### POST `/commitments/:id/pay`
Marca como pago e gera lançamento contábil automático.

**Auth: financial+**

**Request:**
```json
{
  "paidDate": "2026-04-10",
  "paidBankAccountId": "uuid-sicredi",
  "amount": 3500.00,
  "notes": "Pago via PIX"
}
```
> `paidBankAccountId` pode ser diferente do planejado no cadastro.
> Se `amount` < total, cria compromisso residual com saldo restante.

**Response `200`:**
```json
{
  "commitment": { "id": "uuid", "status": "paid", ... },
  "entry": { "id": "uuid", "description": "Aluguel abril", "amount": 3500.00, ... }
}
```

**Erros:** `422` compromisso não está pendente

---

### POST `/commitments/:id/cancel`
Cancela um compromisso.

**Auth: financial+**

**Response `204`:** (sem body)

**Erros:** `422` compromisso já pago

---

### GET `/commitments/calendar`
Vencimentos do mês em formato de calendário.

**Auth: viewer+**

**Query:** `?year=2026&month=4`

**Response `200`:**
```json
{
  "year": 2026,
  "month": 4,
  "days": {
    "10": [
      {
        "id": "uuid",
        "type": "payable",
        "status": "pending",
        "description": "Aluguel",
        "amount": 3500.00,
        "thirdParty": "Proprietário João"
      }
    ],
    "15": [ ... ]
  },
  "summary": {
    "totalPayable": 12000.00,
    "totalReceivable": 25000.00,
    "totalPaid": 3500.00,
    "totalOverdue": 0
  }
}
```

---

### GET `/commitments/cash-flow`
Fluxo de caixa projetado.

**Auth: viewer+**

**Query:** `?days=30` (30, 60 ou 90)

**Response `200`:**
```json
{
  "startDate": "2026-04-15",
  "endDate": "2026-05-15",
  "openingBalance": 7052.11,
  "projectedBalance": 14500.00,
  "days": [
    {
      "date": "2026-04-16",
      "payable": 0,
      "receivable": 5000.00,
      "net": 5000.00,
      "accumulatedBalance": 12052.11,
      "commitments": [...]
    }
  ]
}
```

---

### POST `/commitments/recurrences`
Cria série de compromissos recorrentes.

**Auth: financial+**

**Request:**
```json
{
  "type": "payable",
  "description": "Aluguel mensal",
  "amount": 3500.00,
  "accountId": "uuid-321",
  "bankAccountId": "uuid-sicredi",
  "thirdParty": "Proprietário João",
  "frequency": "monthly",
  "startDate": "2026-01-10",
  "endDate": "2026-12-10"
}
```

**Response `201`:** série criada + lista dos compromissos gerados

---

## 7. Contas Bancárias

### GET `/bank-accounts`
Lista contas bancárias.

**Auth: viewer+**

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "name": "Sicredi C/C",
    "institution": "Sicredi",
    "type": "checking",
    "agency": "0001",
    "accountNumber": "12345-6",
    "isActive": true,
    "balance": 7052.11,
    "account": { "id": "uuid", "code": "4122", "name": "Sicredi C/C" }
  }
]
```

---

### POST `/bank-accounts`
Cria conta bancária e a conta contábil vinculada automaticamente.

**Auth: admin**

**Request:**
```json
{
  "name": "Nubank C/C",
  "institution": "Nubank",
  "type": "checking",
  "parentAccountId": "uuid-412",
  "accountCode": "4125",
  "agency": null,
  "accountNumber": "999999-9",
  "initialBalance": 0,
  "initialBalanceDate": "2026-01-01"
}
```

**Response `201`:** conta bancária + conta contábil criada

---

### PATCH `/bank-accounts/:id`
Atualiza dados da conta bancária.

**Auth: admin**

---

### DELETE `/bank-accounts/:id`
Inativa conta bancária e a conta contábil vinculada.

**Auth: admin**

**Erros:** `422` conta tem lançamentos futuros pendentes

**Response `204`:** (sem body)

---

## 8. Relatórios

> Todos os relatórios são calculados sob demanda. Nenhum dado é pré-armazenado.

### GET `/reports/balance-sheet`
Balanço Patrimonial.

**Auth: viewer+**

**Query:** `?year=2026`

**Response `200`:**
```json
{
  "year": 2026,
  "generatedAt": "2026-04-15T10:00:00Z",
  "assets": {
    "current": {
      "total": 311296.06,
      "children": [
        {
          "id": "uuid",
          "code": "41",
          "name": "Disponível",
          "openingBalance": 8874.70,
          "debit": 1064307.97,
          "credit": 1064630.56,
          "balance": 8552.11,
          "percentage": 0.027,
          "monthly": {
            "jan": 1416.35,
            "feb": 14514.64,
            "mar": 8552.11,
            "apr": 0, "may": 0, "jun": 0,
            "jul": 0, "aug": 0, "sep": 0,
            "oct": 0, "nov": 0, "dec": 0
          },
          "children": [...]
        }
      ]
    },
    "nonCurrent": { "total": 0, "children": [] },
    "investment": { "total": 0, "children": [] },
    "fixed": { "total": 0, "children": [] },
    "intangible": { "total": 0, "children": [] },
    "total": 311296.06
  },
  "liabilities": {
    "current": { "total": 166837.22, "children": [...] },
    "nonCurrent": { "total": 0, "children": [] },
    "total": 166837.22
  },
  "equity": {
    "total": 144458.84,
    "children": [...]
  },
  "totalLiabilitiesAndEquity": 311296.06,
  "balanced": true,
  "difference": 0
}
```

---

### GET `/reports/income-statement`
Demonstração de Resultado (DRE).

**Auth: viewer+**

**Query:** `?year=2026&month=3` (`month` opcional — omitir para visão anual)

**Response `200`:**
```json
{
  "year": 2026,
  "month": null,
  "generatedAt": "2026-04-15T10:00:00Z",
  "revenues": {
    "total": { "target": 160000, "forecast": 160000, "actual": 477818.81, "average": 39818.23, "accumulated": 477818.81 },
    "children": [
      {
        "id": "uuid",
        "code": "11",
        "name": "Receitas Diretas",
        "target": 160000,
        "forecast": 160000,
        "actual": 477819.66,
        "percentage": 1.0,
        "varianceTarget": 317819.66,
        "varianceForecast": 317819.66,
        "varianceAverage": -39818.31,
        "average": 39818.31,
        "accumulated": 477819.66,
        "monthly": { "jan": 199488.72, "feb": 54405.00, "mar": 223925.94, ... },
        "children": [...]
      }
    ]
  },
  "variableCosts": { ... },
  "grossResult": { ... },
  "fixedCosts": { ... },
  "netResult": {
    "target": null,
    "forecast": null,
    "actual": 116132.64,
    "monthly": { "jan": 63359.13, "feb": 8301.25, "mar": 44472.26, ... }
  }
}
```

---

### GET `/reports/trial-balance`
Balancete de Verificação.

**Auth: viewer+**

**Query:** `?year=2026&month=3`

**Response `200`:**
```json
{
  "year": 2026,
  "month": 3,
  "generatedAt": "2026-04-15T10:00:00Z",
  "accounts": [
    {
      "id": "uuid",
      "code": "4122",
      "name": "Sicredi C/C",
      "openingDebit": 8874.70,
      "openingCredit": 0,
      "periodDebit": 943807.97,
      "periodCredit": 945630.56,
      "closingDebit": 7052.11,
      "closingCredit": 0
    }
  ],
  "totals": {
    "openingDebit": 37927.20,
    "openingCredit": 37927.20,
    "periodDebit": 2020917.02,
    "periodCredit": 2020917.02,
    "closingDebit": 311296.06,
    "closingCredit": 311296.06
  },
  "balanced": true
}
```

---

### GET `/reports/indicators`
Indicadores Econômicos e Financeiros (IEF).

**Auth: viewer+**

**Query:** `?year=2026`

**Response `200`:**
```json
{
  "year": 2026,
  "profitability": {
    "grossMargin":   { "jan": 0.479, "feb": 0.565, "mar": 0.472, ... },
    "netMargin":     { "jan": 0.319, "feb": 0.153, "mar": 0.198, ... },
    "earningPower":  { "jan": 0.403, "feb": 0.045, "mar": 0.143, ... }
  },
  "liquidity": {
    "current": { "jan": 0.534, "feb": 0.587, "mar": 1.866, ... },
    "quick":   { "jan": 0.562, "feb": 0.368, "mar": 0.602, ... },
    "general": { "jan": 0.534, "feb": 0.587, "mar": 1.866, ... }
  },
  "structure": {
    "availablePct":      { "jan": 0.009, "feb": 0.079, "mar": 0.027, ... },
    "receivablePct":     { "jan": 1.044, "feb": 0.547, "mar": 0.295, ... },
    "workingCapitalPct": { "jan": 1.0,   "feb": 1.0,   "mar": 1.0,   ... },
    "inventoryPct":      { "jan": -0.053,"feb": 0.374, "mar": 0.677, ... },
    "debtRatio":         { "jan": 0.751, "feb": 0.747, "mar": 0.536, ... },
    "equityRatio":       { "jan": 0.249, "feb": 0.253, "mar": 0.464, ... }
  },
  "roi": {
    "company": { "jan": 2.484, "feb": 22.099, "mar": 6.982, ... }
  }
}
```

---

### GET `/reports/breakeven`
Ponto de Equilíbrio.

**Auth: viewer+**

**Query:** `?year=2026`

**Response `200`:**
```json
{
  "year": 2026,
  "monthly": {
    "jan": {
      "fixedCosts": 31894.59,
      "desiredResult": 20000.00,
      "targetMarginPct": 0.85,
      "practicedMarginPct": 0.479,
      "targetSales": 61053.64,
      "actualSales": 199488.72,
      "surplusDeficit": 138435.08,
      "targetSalesPerDay": 1969.47,
      "actualSalesPerDay": 6435.12
    }
  }
}
```

---

## 9. Metas e Previsões

### GET `/goals`
Lista metas/previsões do ano.

**Auth: viewer+**

**Query:** `?year=2026&type=target`

**Response `200`:**
```json
[
  {
    "accountId": "uuid",
    "accountCode": "111",
    "accountName": "Vendas - Dinheiro",
    "type": "target",
    "year": 2026,
    "months": { "jan": 5000, "feb": 5000, "mar": 8000, ... }
  }
]
```

---

### PUT `/goals`
Salva metas/previsões em lote (upsert).

**Auth: financial+**

**Request:**
```json
{
  "type": "target",
  "year": 2026,
  "goals": [
    { "accountId": "uuid", "month": 1, "amount": 5000.00 },
    { "accountId": "uuid", "month": 2, "amount": 5000.00 }
  ]
}
```

**Response `200`:** `{ "updated": 2 }`

---

## 10. Configuração do Ponto de Equilíbrio

### GET `/breakeven-config`
Configuração atual.

**Auth: viewer+**

**Query:** `?year=2026`

**Response `200`:**
```json
[
  { "year": 2026, "month": 1, "targetMarginPct": 0.85, "desiredResult": 20000 },
  { "year": 2026, "month": 2, "targetMarginPct": 0.85, "desiredResult": 20000 }
]
```

---

### PUT `/breakeven-config`
Salva configuração (upsert).

**Auth: financial+**

**Request:**
```json
{
  "year": 2026,
  "configs": [
    { "month": 1, "targetMarginPct": 0.85, "desiredResult": 20000 },
    { "month": 2, "targetMarginPct": 0.80, "desiredResult": 25000 }
  ]
}
```

**Response `200`:** `{ "updated": 2 }`

---

## 11. Importação de Extratos

### POST `/imports`
Inicia uma importação. Upload do arquivo + contexto.

**Auth: financial+**

**Request:** `multipart/form-data`
```
file: <arquivo.csv ou arquivo.ofx>
bankAccountId: uuid (opcional)
```

**Response `201`:**
```json
{
  "id": "uuid",
  "filename": "extrato-jan-2026.csv",
  "fileType": "csv",
  "status": "processing",
  "totalLines": 0,
  "createdAt": "2026-04-15T10:00:00Z"
}
```
> O processamento pelo LLM acontece em background. O cliente deve consultar o status.

---

### GET `/imports`
Lista importações.

**Auth: financial+**

**Response `200`:** lista de batches com status

---

### GET `/imports/:batchId`
Status e resumo de uma importação.

**Auth: financial+**

**Response `200`:**
```json
{
  "id": "uuid",
  "filename": "extrato-jan-2026.csv",
  "status": "reviewing",
  "totalLines": 45,
  "pendingLines": 30,
  "confirmedLines": 10,
  "skippedLines": 5,
  "duplicateLines": 2
}
```

---

### GET `/imports/:batchId/lines`
Linhas da importação para revisão.

**Auth: financial+**

**Query:** `?status=pending&page=1&limit=20`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "lineNumber": 1,
      "rawDate": "2026-01-02",
      "rawDescription": "LIQUIDACAO DE PARCELA 34028...",
      "rawAmount": -2447.80,
      "suggestedDescription": "Liquidação de boleto a receber - DRESS TO GO",
      "suggestedDebitAccount": { "id": "uuid", "code": "4122", "name": "Sicredi C/C" },
      "suggestedCreditAccount": { "id": "uuid", "code": "422", "name": "Boletos a Receber" },
      "suggestedThirdParty": "DRESS TO GO",
      "llmConfidence": 0.92,
      "status": "pending",
      "isDuplicate": false
    }
  ],
  "meta": { ... }
}
```

---

### PATCH `/imports/:batchId/lines/:lineId`
Ajusta a sugestão de uma linha antes de confirmar.

**Auth: financial+**

**Request:**
```json
{
  "finalDescription": "Boleto DRESS TO GO - jan/2026",
  "finalDebitAccountId": "uuid-4122",
  "finalCreditAccountId": "uuid-422",
  "finalThirdParty": "DRESS TO GO",
  "status": "confirmed"
}
```

**Response `200`:** linha atualizada

---

### POST `/imports/:batchId/confirm`
Confirma todas as linhas marcadas como `confirmed` e cria os lançamentos.

**Auth: financial+**

**Response `200`:**
```json
{
  "entriesCreated": 28,
  "linesSkipped": 5,
  "linesDuplicate": 2
}
```

---

### POST `/imports/:batchId/cancel`
Cancela a importação (descarta todas as linhas não confirmadas).

**Auth: financial+**

**Response `204`:** (sem body)

---

## 12. Resumo dos Endpoints

| Módulo | Endpoints |
|---|---|
| Auth | 7 |
| Tenants | 6 |
| Super User | 4 |
| Plano de Contas | 6 |
| Lançamentos | 8 |
| Contas a Pagar/Receber | 9 |
| Contas Bancárias | 4 |
| Relatórios | 5 |
| Metas | 2 |
| PE Config | 2 |
| Importação | 7 |
| **Total** | **60** |

---

## 13. Próximos Passos

1. **IDEA.md** ✅
2. **REQUIREMENTS.md** ✅
3. **ARCHITECTURE.md** ✅
4. **DATA_MODEL.md** ✅
5. **API.md** ✅ ← estamos aqui
6. **UI_FLOWS.md** — fluxos de tela e wireframes
7. **Implementação** — por módulo
