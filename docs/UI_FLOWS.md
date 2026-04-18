# UI FLOWS — Sistema de Gestão Financeira Empresarial

> Fluxos de tela e wireframes textuais.
> Desktop-first. Sidebar fixa de navegação.

---

## 1. Estrutura Global da Aplicação

```
┌─────────────────────────────────────────────────────────────┐
│ TOPBAR                                                      │
│ [Logo]  [Empresa LTDA ▼]              [Daniel ▼]  [?]      │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ SIDEBAR  │  CONTEÚDO PRINCIPAL                             │
│          │                                                  │
│ Dashboard│                                                  │
│          │                                                  │
│ Lança-   │                                                  │
│ mentos   │                                                  │
│          │                                                  │
│ Ctas a   │                                                  │
│ Pagar/   │                                                  │
│ Receber  │                                                  │
│          │                                                  │
│ Relatórios▼                                                 │
│  BP      │                                                  │
│  DRE     │                                                  │
│  Balancete                                                  │
│  Indicad.│                                                  │
│  Pt. Eq. │                                                  │
│          │                                                  │
│ ──────── │                                                  │
│          │                                                  │
│ Configur.▼                                                  │
│  Plano   │                                                  │
│  Contas  │                                                  │
│  Bancos  │                                                  │
│  Metas   │                                                  │
│  Usuários│                                                  │
│  Import  │                                                  │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

**Topbar:**
- **Logo** — clica volta para dashboard
- **Seletor de empresa** — dropdown para trocar tenant (aparece apenas se o usuário pertencer a mais de um)
- **Menu do usuário** — nome + avatar → Perfil / Sair

---

## 2. Autenticação

### 2.1 Cadastro

```
┌─────────────────────────────────────┐
│                                     │
│         Meu Financeiro              │
│                                     │
│  Crie sua conta                     │
│                                     │
│  Nome completo                      │
│  [________________________________] │
│                                     │
│  E-mail                             │
│  [________________________________] │
│                                     │
│  Senha                              │
│  [________________________________] │
│  ● fraca  ●● média  ●●● forte       │
│                                     │
│  Nome da empresa                    │
│  [________________________________] │
│                                     │
│  [    Criar conta    ]              │
│                                     │
│  Já tem conta? Entrar               │
│                                     │
└─────────────────────────────────────┘
```

**Fluxo:**
1. Usuário preenche e envia
2. Tela muda para confirmação: *"Enviamos um e-mail para você. Clique no link para ativar sua conta."*
3. Usuário clica no link do e-mail → redirecionado para o app já logado

---

### 2.2 Login

```
┌─────────────────────────────────────┐
│                                     │
│         Meu Financeiro              │
│                                     │
│  Entrar                             │
│                                     │
│  E-mail                             │
│  [________________________________] │
│                                     │
│  Senha                              │
│  [________________________________] │
│                                     │
│  [        Entrar        ]           │
│                                     │
│  Esqueci minha senha                │
│  Criar conta                        │
│                                     │
└─────────────────────────────────────┘
```

**Fluxo com múltiplos tenants:**
1. Usuário entra com e-mail/senha
2. Se pertencer a múltiplos tenants, aparece modal de seleção:

```
┌─────────────────────────────────┐
│  Selecione a empresa            │
│                                 │
│  ○ Empresa A  (Admin)           │
│  ○ Empresa B  (Visualizador)    │
│                                 │
│  [  Continuar  ]                │
└─────────────────────────────────┘
```

---

## 3. Dashboard

Primeira tela após login. Visão rápida do estado financeiro.

```
┌──────────────────────────────────────────────────────────────────┐
│  Dashboard                                    Abril 2026 ▼       │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ CAIXA+BANCOS │ A RECEBER    │ A PAGAR      │ RESULTADO MÊS      │
│ R$ 7.052     │ R$ 91.943    │ R$ 166.837   │ R$ 44.472          │
│ ↑ +2% mês    │ 12 títulos   │ 8 vencendo   │ Margem 19,8%       │
├──────────────┴──────────────┴──────────────┴────────────────────┤
│                                                                  │
│  Receitas vs Custos (Jan – Abr 2026)                            │
│                                                                  │
│  250k ┤          ████                                            │
│  200k ┤  ████    ████  ████                                      │
│  150k ┤  ████    ████  ████                                      │
│  100k ┤  ████    ████  ████                                      │
│   50k ┤  ░░░░    ░░░░  ░░░░                                      │
│       └──────────────────────                                    │
│          Jan     Fev    Mar    Abr                               │
│       ■ Receita  ░ Custos                                        │
│                                                                  │
├──────────────────────────┬───────────────────────────────────────┤
│  Próximos vencimentos    │  Resultado Líquido (Jan–Abr)          │
│                          │                                       │
│  ● Aluguel     10/04  ⚠  │  80k ┤        ████                   │
│    R$ 3.500              │  60k ┤  ████        ████             │
│  ● PRONAMPE    15/04     │  40k ┤                    ░░░░       │
│    R$ 1.730              │  20k ┤        ░░░░                   │
│  ● Fornecedor  20/04     │      └────────────────────           │
│    R$ 12.400             │        Jan   Fev   Mar   Abr         │
│                          │                                       │
│  [Ver calendário]        │                                       │
└──────────────────────────┴───────────────────────────────────────┘
```

**Cards do topo:** clicáveis — abrem o relatório ou lista correspondente.
**Próximos vencimentos:** ⚠ = vence hoje ou amanhã.

---

## 4. Lançamentos

### 4.1 Lista de Lançamentos

```
┌──────────────────────────────────────────────────────────────────┐
│  Lançamentos                              [+ Novo]  [↑ Importar] │
├──────────────────────────────────────────────────────────────────┤
│  Conta [Todas ▼]  Período [01/01/26 – 31/03/26]  [Buscar...]    │
├────────────┬──────────────────────────────┬──────┬──────────────┤
│ DATA       │ HISTÓRICO                    │VALOR │ CONTAS       │
├────────────┼──────────────────────────────┼──────┼──────────────┤
│ 02/01/2026 │ IOF S/ OPER. CREDITO PJ      │ 67,50│ 338 → 4122   │
│            │ Juros e Encargos             │      │              │
├────────────┼──────────────────────────────┼──────┼──────────────┤
│ 02/01/2026 │ LIQUIDACAO DE PARCELA        │2.447 │ 4122 → 422   │
│            │ DRESS TO GO                  │      │              │
├────────────┼──────────────────────────────┼──────┼──────────────┤
│ ~~estorno~~│ Estorno de: IOF S/ OPER...   │ 67,50│ 4122 → 338   │
│            │                              │      │ [ESTORNO]    │
└────────────┴──────────────────────────────┴──────┴──────────────┘
   Mostrando 1–20 de 150   [< Anterior]  [Próxima >]
```

- Linha de estorno exibida em cor diferente (cinza) com badge `[ESTORNO]`
- Clicar na linha abre o detalhe lateral (drawer)
- Hover na linha mostra ações: `[↺ Estornar]` `[⧉ Duplicar]`

---

### 4.2 Formulário de Novo Lançamento

Abre como painel lateral (drawer) ou modal — não navega para nova página.

```
┌─────────────────────────────────────────┐
│  Novo lançamento               [✕]      │
├─────────────────────────────────────────┤
│                                         │
│  Data *                                 │
│  [15/04/2026        ]                   │
│                                         │
│  Histórico *                            │
│  [Pagamento aluguel abril       ]       │
│                                         │
│  Valor *                                │
│  [R$ 3.500,00                   ]       │
│                                         │
│  Débito *                               │
│  [321 — Aluguel               ▼ ]       │
│   ↑ digite nome ou código               │
│                                         │
│  Crédito *                              │
│  [4122 — Sicredi C/C          ▼ ]       │
│                                         │
│  Terceiro                               │
│  [Proprietário João Silva       ]       │
│                                         │
│  ──────────────────────────────         │
│  □ Lançamento recorrente                │
│                                         │
│         [Cancelar]  [Salvar →]          │
│                                         │
│  ─── Últimos lançamentos ───            │
│  02/01 IOF Sicredi         R$67         │
│  02/01 Liquidação DRESS    R$2.447      │
│  05/01 Cesta relacionamento R$55        │
└─────────────────────────────────────────┘
```

**Comportamento:**
- `Tab` avança entre campos, `Enter` no último campo = Salvar e abrir novo (data pré-preenchida)
- Campo Débito/Crédito: autocomplete ao digitar código ou nome
- Ao marcar "Lançamento recorrente" expande opções de frequência/período
- "Últimos lançamentos" no rodapé para referência rápida
- Botão `[⧉ Duplicar]` no detalhe de um lançamento copia todos os campos para o formulário

---

### 4.3 Recorrência (expansão no formulário)

```
  □ Lançamento recorrente
  ┌────────────────────────────────────────┐
  │ Frequência  [Mensal              ▼]    │
  │ Início      [05/01/2026         ]      │
  │ Término     ○ Data [31/12/2026  ]      │
  │             ○ Qtd  [12] ocorrências    │
  └────────────────────────────────────────┘
```

---

### 4.4 Razão da Conta

Acessível clicando em uma conta no BP, na DRE ou no Plano de Contas.

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Plano de Contas  /  4122 — Sicredi C/C                       │
│  Período [01/01/26 – 31/03/26]  Terceiro [Buscar...]            │
├────────────────────────────────────────────────────────────────┤
│  Saldo inicial: R$ 8.874,70                                     │
├──────────┬────────────────────────────┬────────┬───────┬───────┤
│ DATA     │ HISTÓRICO                  │ DÉBITO │CRÉD.  │SALDO  │
├──────────┼────────────────────────────┼────────┼───────┼───────┤
│02/01/26  │ IOF S/ OPER. CREDITO PJ   │        │ 67,50 │8.807  │
│02/01/26  │ IOF ADICIONAL PJ          │        │238,73 │8.568  │
│02/01/26  │ LIQUIDACAO DE PARCELA     │2.447,80│       │11.016 │
│          │ DRESS TO GO               │        │       │       │
├──────────┴────────────────────────────┴────────┴───────┴───────┤
│  Saldo final: R$ 7.052,11         Total D: 943.808  C: 945.631 │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Contas a Pagar / A Receber

### 5.1 Lista com Abas

```
┌──────────────────────────────────────────────────────────────────┐
│  Contas a Pagar / A Receber                    [+ Novo]          │
├──────────────────────────────────────────────────────────────────┤
│  [Lista]  [Calendário]  [Fluxo de Caixa]                        │
├──────────────────────────────────────────────────────────────────┤
│  [A Pagar ▼]  [Pendente ▼]  Período [Abr 2026 ▼]  [Buscar...]  │
├──────────┬────────────────────┬──────────┬────────┬─────────────┤
│ VENC.    │ DESCRIÇÃO          │ TERCEIRO │ VALOR  │ STATUS      │
├──────────┼────────────────────┼──────────┼────────┼─────────────┤
│ 10/04 ⚠  │ Aluguel abril      │ Prop.João│3.500,00│ ● Pendente  │
│          │ 321 - Sicredi      │          │        │ [Pagar]     │
├──────────┼────────────────────┼──────────┼────────┼─────────────┤
│ 05/04 ✓  │ Colaboradores      │ Funcionár│8.500,00│ ● Pago      │
│          │ 311 - Sicredi      │          │        │             │
├──────────┼────────────────────┼──────────┼────────┼─────────────┤
│ 01/04 ✗  │ Fornecedor estoque │ ABC LTDA │12.400,0│ ● Vencido   │
│          │ 711 - Sicredi      │          │        │ [Pagar]     │
└──────────┴────────────────────┴──────────┴────────┴─────────────┘
```

---

### 5.2 Modal de Pagamento

Ao clicar em `[Pagar]`:

```
┌───────────────────────────────────────┐
│  Registrar pagamento             [✕]  │
├───────────────────────────────────────┤
│  Aluguel abril                        │
│  Vencimento: 10/04/2026               │
│  Valor original: R$ 3.500,00          │
│                                       │
│  Valor pago *                         │
│  [R$ 3.500,00              ]          │
│                                       │
│  Data do pagamento *                  │
│  [10/04/2026               ]          │
│                                       │
│  Conta utilizada *                    │
│  [4122 — Sicredi C/C      ▼]          │
│  (previsto: Sicredi C/C)              │
│                                       │
│  [Cancelar]  [Confirmar pagamento]    │
└───────────────────────────────────────┘
```

Se valor pago < valor original, aparece aviso:
> *"O valor parcial será registrado. Um novo compromisso de R$ X,XX será criado com nova data de vencimento."*

---

### 5.3 Calendário de Vencimentos

```
┌──────────────────────────────────────────────────────────────────┐
│  [Lista]  [Calendário]  [Fluxo de Caixa]                        │
├──────────────────────────────────────────────────────────────────┤
│  ◀ Abril 2026 ▶                          ■ Pagar  □ Receber      │
├───────┬───────┬───────┬───────┬───────┬───────┬───────────────┤
│ DOM   │ SEG   │ TER   │ QUA   │ QUI   │ SEX   │ SÁB           │
├───────┼───────┼───────┼───────┼───────┼───────┼───────────────┤
│       │       │  1    │  2    │  3    │  4    │  5            │
│       │       │       │       │       │       │ ■ Colaborad.  │
│       │       │       │       │       │       │   R$8.500     │
├───────┼───────┼───────┼───────┼───────┼───────┼───────────────┤
│  6    │  7    │  8    │  9    │  10   │  11   │  12           │
│       │       │       │       │■Aluguel       │               │
│       │       │       │       │R$3.500│       │               │
│       │       │       │       │□Boleto│       │               │
│       │       │       │       │R$5.000│       │               │
└───────┴───────┴───────┴───────┴───────┴───────┴───────────────┘
│  Total a pagar: R$ 12.000   Total a receber: R$ 25.000          │
└──────────────────────────────────────────────────────────────────┘
```

Clicar em um item do calendário abre o modal de detalhes/pagamento.

---

### 5.4 Fluxo de Caixa Projetado

```
┌──────────────────────────────────────────────────────────────────┐
│  [Lista]  [Calendário]  [Fluxo de Caixa]                        │
├──────────────────────────────────────────────────────────────────┤
│  Próximos [30 dias ▼]   Saldo atual: R$ 7.052,11                │
│                                                                  │
│  Saldo projetado                                                 │
│  40k ┤                    ╭───────────────────                  │
│  30k ┤               ╭────╯                                     │
│  20k ┤          ╭────╯                                          │
│  10k ┤  ────────╯                                               │
│   0k ┤                                                          │
│      └─────────────────────────────────────────────             │
│        15/4  20/4  25/4  30/4  05/5  10/5  15/5                 │
├──────────┬──────────────┬────────┬────────┬────────────────────┤
│ DATA     │ DESCRIÇÃO    │ PAGAR  │ RECEBER│ SALDO ACUM.        │
├──────────┼──────────────┼────────┼────────┼────────────────────┤
│ 15/04    │              │        │ 5.000  │ 12.052             │
│ 15/04    │ Boleto DRESS │        │ 5.000  │                    │
├──────────┼──────────────┼────────┼────────┼────────────────────┤
│ 20/04    │              │ 12.400 │        │ -352               │
│ 20/04    │ Fornecedor   │ 12.400 │        │                    │
└──────────┴──────────────┴────────┴────────┴────────────────────┘
```

Saldo negativo projetado é destacado em vermelho.

---

## 6. Balanço Patrimonial (BP)

```
┌──────────────────────────────────────────────────────────────────┐
│  Balanço Patrimonial          Ano [2026 ▼]    [↓ PDF]           │
├──────────────────────────────────────────────────────────────────┤
│                  │ SD ANT  │  DÉB    │  CRÉ    │SD ATUAL│  %   │ JAN  │ FEV │ MAR │...│
├──────────────────┼─────────┼─────────┼─────────┼────────┼──────┼──────┼─────┼─────┼───┤
│ ATIVO            │         │         │         │        │      │      │     │     │   │
├──────────────────┼─────────┼─────────┼─────────┼────────┼──────┼──────┼─────┼─────┼───┤
│ ▼ ATIVO CIRC.   │  37.927 │2.020.917│1.747.548│311.296 │100%  │      │     │     │   │
│   ▼ Disponível  │   8.875 │1.064.308│1.064.631│  8.552 │ 2,7% │ 1.416│14.515│8.552│   │
│     Caixas      │       0 │  100.500│   99.000│  1.500 │ 0,5% │ 1.000│ 1.000│1.500│   │
│     ▶ Bancos CC │   8.875 │  943.808│  945.631│  7.052 │ 2,3% │   416│13.515│7.052│   │
│     Aplicações  │       0 │   20.000│   20.000│      0 │  0%  │     0│    0│    0│   │
│   ▼ A Receber   │  29.052 │  514.551│  451.660│ 91.943 │29,5% │      │     │     │   │
│     Cartão      │  11.885 │  103.754│  115.639│      0 │  0%  │      │     │     │   │
│     Boletos ●   │  17.168 │  373.707│  310.949│ 79.926 │25,7% │      │     │     │   │
├──────────────────┼─────────┴─────────┴─────────┼────────┼──────┴──────┴─────┴─────┴───┤
│ ATIVO TOTAL      │                              │311.296 │100%                          │
├──────────────────┼──────────────────────────────┼────────┴──────────────────────────────┤
│ PASSIVO          │                              │                                       │
│ ▼ PASS. CIRC.   │                              │166.837 │ 53,6%                         │
│   ▶ Custos Pg.  │                              │ 86.837 │ 27,9%                         │
│   ▶ Dívidas Pg. │                              │ 80.000 │ 25,7%                         │
├──────────────────┼──────────────────────────────┼────────┴──────────────────────────────┤
│ PATRIM. LÍQUIDO  │                              │144.459 │ 46,4%                         │
├──────────────────┼──────────────────────────────┼────────┴──────────────────────────────┤
│ PASSIVO TOTAL    │                              │311.296 │ ✓ Balanceado                  │
└──────────────────┴──────────────────────────────┴──────────────────────────────────────┘
```

**Comportamento:**
- Grupos `▼` expansíveis/recolhíveis
- `●` em Boletos = clique abre o razão daquela conta no período
- Colunas mensais roláveis horizontalmente
- `[↓ PDF]` gera o relatório em PDF

---

## 7. DRE (Demonstração de Resultado)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  DRE                                     Ano [2026 ▼]  Mês [Todos ▼]   [↓ PDF]     │
├────────────────────┬────────┬────────┬──────────┬────┬──────┬──────┬───────┬────────┤
│                    │ META   │PREVISÃO│ EXECUÇÃO │ %  │VAR M │VAR P │MÉDIA  │ACUM.   │
├────────────────────┼────────┼────────┼──────────┼────┼──────┼──────┼───────┼────────┤
│ ▼ RECEITAS         │160.000 │160.000 │  477.819 │100%│      │      │39.818 │477.819 │
│   ▼ Rec. Diretas   │160.000 │        │  477.820 │100%│      │      │       │        │
│     Vend. Dinheiro │        │        │        0 │  0%│      │      │       │        │
│     Vend. Boleto ● │        │        │  325.983 │ 68%│      │      │       │        │
│     Vend. Cartão   │        │        │   89.964 │ 19%│      │      │       │        │
│   ▶ Rec. Indiretas │        │        │       -1 │  0%│      │      │       │        │
├────────────────────┼────────┼────────┼──────────┼────┼──────┼──────┼───────┼────────┤
│ ▼ CUSTOS VARIÁVEIS │        │        │  245.756 │ 51%│      │      │       │        │
│   ▶ CV Diretos     │        │        │  225.802 │ 47%│      │      │       │        │
│   ▶ CV Indiretos   │        │        │   19.954 │  4%│      │      │       │        │
├────────────────────┼────────┼────────┼──────────┼────┼──────┼──────┼───────┼────────┤
│  RCM               │        │        │  232.063 │ 49%│      │      │       │        │
├────────────────────┼────────┼────────┼──────────┼────┼──────┼──────┼───────┼────────┤
│ ▼ CUSTOS FIXOS     │        │        │  115.931 │ 24%│      │      │       │        │
│   ▶ Desp. Pessoal  │        │        │   50.511 │ 11%│      │      │       │        │
│   ▶ Desp. Instit.  │        │        │      627 │  0%│      │      │       │        │
│   ▶ Desp. Expedi.  │        │        │   64.793 │ 14%│      │      │       │        │
├────────────────────┼────────┼────────┼──────────┼────┼──────┼──────┼───────┼────────┤
│  RESULTADO LÍQUIDO │        │        │  116.133 │ 24%│      │      │       │        │
└────────────────────┴────────┴────────┴──────────┴────┴──────┴──────┴───────┴────────┘
                                                          JAN │ FEV │ MAR │ ...
                                                       199.489│54.405│223.926│
```

Colunas mensais ficam em painel deslizável à direita (scroll horizontal).

---

## 8. Plano de Contas

```
┌──────────────────────────────────────────────────────────────────┐
│  Plano de Contas                 [+ Nova conta]  [□ Ver inativas]│
├──────────────────────────────────────────────────────────────────┤
│  [Buscar por nome ou código...]                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ▼ 4 — Ativo Circulante                        [+ filha]        │
│    ▼ 41 — Disponível                           [+ filha]        │
│      ▶ 411 — Caixas                                             │
│      ▼ 412 — Bancos C/C                        [+ filha]        │
│        ● 4121 — Caixa C/C              [✎] [✕]                  │
│        ● 4122 — Sicredi C/C            [✎] [✕]                  │
│        ● 4123 — Inter C/C              [✎] [✕]                  │
│      ▶ 413 — Aplicações                                         │
│    ▶ 42 — A Receber                                             │
│    ▶ 43 — Estoques                                              │
│  ▶ 5 — Ativo Não Circulante                                     │
│  ▶ 6 — Ativo Permanente / Imobilizado                           │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ▶ 7 — Passivo Circulante                                       │
│  ▶ 9 — Patrimônio Líquido                                       │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ▶ 1 — Receitas                                                 │
│  ▶ 2 — Custos Variáveis                                         │
│  ▶ 3 — Custos Fixos                                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- `▶` = grupo recolhido | `▼` = expandido
- `●` = conta analítica (aceita lançamentos)
- `[✎]` = editar | `[✕]` = inativar
- `[+ filha]` = criar subconta

---

## 9. Importação de Extrato

### 9.1 Upload

```
┌──────────────────────────────────────────────────────────────────┐
│  Importar Extrato                                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Conta bancária                                                  │
│  [4122 — Sicredi C/C                        ▼]                  │
│                                                                  │
│  Arquivo (CSV ou OFX)                                           │
│  ┌────────────────────────────────────────┐                     │
│  │                                        │                     │
│  │     Arraste o arquivo aqui             │                     │
│  │     ou clique para selecionar          │                     │
│  │                                        │                     │
│  └────────────────────────────────────────┘                     │
│                                                                  │
│  [  Processar com IA  ]                                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### 9.2 Revisão das Sugestões

```
┌──────────────────────────────────────────────────────────────────┐
│  Revisão da Importação — extrato-jan-2026.csv                   │
│  45 linhas encontradas  │  30 pendentes  │  10 confirmadas  │  5 ignoradas │
├─────────────────────────────────────────────────────────────────┤
│  [Confirmar todas]  [Ignorar duplicatas]                        │
├──────────┬─────────────────────┬─────────┬────────┬────────────┤
│ DATA     │ DESCRIÇÃO ORIGINAL  │ VALOR   │SUGESTÃO│ AÇÃO       │
├──────────┼─────────────────────┼─────────┼────────┼────────────┤
│02/01/26  │LIQUIDACAO DE PARCEL │+2.447,80│4122→422│[✓] [✕] [✎]│
│          │                     │         │DRESS TO│ conf. 92%  │
├──────────┼─────────────────────┼─────────┼────────┼────────────┤
│02/01/26  │IOF S/ OPER. CREDITO │  -67,50 │338→4122│[✓] [✕] [✎]│
│          │                     │         │        │ conf. 85%  │
├──────────┼─────────────────────┼─────────┼────────┼────────────┤
│⚠ 05/01  │CESTA DE RELACIONAM  │  -55,51 │338→4122│[✓] [✕] [✎]│
│DUPLICATA │(já lançado 05/01)   │         │        │            │
└──────────┴─────────────────────┴─────────┴────────┴────────────┘
│  [← Voltar]                              [Confirmar selecionados]│
└──────────────────────────────────────────────────────────────────┘
```

- `[✓]` confirma a linha | `[✕]` ignora | `[✎]` edita a sugestão
- Duplicatas em fundo amarelo com aviso
- Confiança da IA exibida em texto pequeno
- `[✎]` abre mini-formulário inline para corrigir contas/histórico

---

## 10. Configurações — Usuários

```
┌──────────────────────────────────────────────────────────────────┐
│  Usuários                                  [+ Convidar usuário]  │
├──────────────────────────────────────────────────────────────────┤
│  NOME          │ E-MAIL              │ ROLE      │ AÇÕES         │
├────────────────┼─────────────────────┼───────────┼───────────────┤
│ Daniel Silva   │ daniel@empresa.com  │ Admin     │ (você)        │
│ João Souza     │ joao@empresa.com    │ Financeiro│ [✎] [✕]       │
│ Maria Lima     │ maria@empresa.com   │ Visualiz. │ [✎] [✕]       │
└────────────────┴─────────────────────┴───────────┴───────────────┘
```

---

## 11. Fluxo de Primeiro Acesso (Onboarding)

Após confirmar o e-mail, o usuário vê um assistente de 3 passos antes de entrar no sistema.

```
Passo 1 de 3 — Bem-vindo!
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Bem-vindo ao Meu Financeiro, Daniel!                           │
│                                                                  │
│  Vamos configurar sua empresa em 3 passos rápidos.              │
│                                                                  │
│  ○──────────────○──────────────○                                 │
│  1. Contas      2. Saldos      3. Pronto                        │
│                                                                  │
│  [Começar agora]   [Pular, configurar depois]                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Passo 2 de 3 — Suas contas bancárias
┌──────────────────────────────────────────────────────────────────┐
│  Adicione suas contas bancárias                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Nome       [Sicredi C/C           ]                      │   │
│  │ Banco      [Sicredi               ]                      │   │
│  │ Tipo       [Conta Corrente       ▼]                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [+ Adicionar outra conta]                                       │
│                                                                  │
│  [← Voltar]                              [Próximo →]            │
└──────────────────────────────────────────────────────────────────┘

Passo 3 de 3 — Saldos iniciais
┌──────────────────────────────────────────────────────────────────┐
│  Informe os saldos em 31/12/2025                                 │
│  (ou na data de início do seu controle)                         │
│                                                                  │
│  Data de referência: [31/12/2025     ]                          │
│                                                                  │
│  Sicredi C/C          [R$ 8.874,70   ]                          │
│  Inter C/C            [R$ 0,00       ]                          │
│  Caixa Cofre          [R$ 0,00       ]                          │
│                                                                  │
│  ── Valores a receber ──                                        │
│  Boletos a Receber    [R$ 17.167,97  ]                          │
│  Cartão a Receber     [R$ 11.884,53  ]                          │
│                                                                  │
│  ── Dívidas ──                                                  │
│  Conta Garantida      [R$ 83.236,22  ]                          │
│                                                                  │
│  [← Voltar]                         [Concluir e entrar →]       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 12. Footer — Navegação Rápida (estilo Excel)

Footer fixo na parte inferior da aplicação, sempre visível. Remete visualmente às abas da planilha Excel original e permite navegação instantânea para qualquer relatório ou razão de conta.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  CONTEÚDO PRINCIPAL                                                                      │
│                                                                                          │
│                                                                                          │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ ╔════╗╔════╗╔══════════╗╔═════╗╔════╗  ┊  ╔═════╗╔═════╗╔═════╗╔═════╗╔═════╗╔══════ ▶│
│ ║ BP ║║ DR ║║ Balancete║║ IEF ║║ PE ║  ┊  ║ 111 ║║ 112 ║║ 113 ║║ 114 ║║ 115 ║║ 116 ...│
│ ╚════╝╚════╝╚══════════╝╚═════╝╚════╝  ┊  ╚═════╝╚═════╝╚═════╝╚═════╝╚═════╝╚══════  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### Estrutura do footer

**Grupo 1 — Relatórios** (fixo à esquerda, sempre visível):
```
[ BP ] [ DR ] [ Balancete ] [ IEF ] [ PE ]
```

**Separador visual** — linha vertical fina separando relatórios das contas

**Grupo 2 — Contas analíticas** (rolável horizontalmente, segue a ordem do plano de contas):
```
← ▶  [ 111 ] [ 112 ] [ 113 ] [ 114 ] [ 115 ] [ 116 ] [ 121 ] [ 122 ] [ 211 ] [ 221 ] ...
         Receitas Diretas                               Receitas Ind.   CV Dir  CV Ind
```

As contas aparecem **agrupadas por seção** com um micro-label acima:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  Receitas Diretas          │Rec.Ind│  Custos Var.    │   Custos Fixos                  ▶│
│ [111][112][113][114][115][116] [121][122] [211][221][222] [311][312][314][321][322]...   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Comportamento

- **Clicar em relatório** (BP, DR, etc.) → navega para a tela do relatório
- **Clicar em uma conta** → abre o **razão daquela conta** (igual ao comportamento de clicar em uma conta no BP/DRE), filtrando pelo período atualmente selecionado na aplicação
- **Aba ativa** destacada com cor diferente (igual ao Excel — aba ativa fica "levantada")
- **Scroll horizontal** nas contas com setas `◀` `▶` nas extremidades
- **Tooltip** ao passar o mouse: mostra o nome completo da conta (`4122 — Sicredi C/C`)
- **Contas inativas** não aparecem no footer
- A ordem segue exatamente o plano de contas (1xx, 2xx, 3xx, 4xx, 5xx, 6xx, 7xx, 9xx)

### Exemplo visual detalhado

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│◀ [ BP ] [ DR ] [ Balancete ] [ IEF ] [ PE ]  │ Rec. Diretas  │Rec.Ind│  CV   │ CF-Pessoal│
│                                              │[111][112][116]│[121]  │[211]  │[311][312] ▶│
└──────────────────────────────────────────────────────────────────────────────────────────┘
         ↑ aba ativa                           ↑ separador     ↑ grupos de contas
```

**Aba ativa** (conta ou relatório aberto no momento) fica destacada:
```
╔══════╗  — aba ativa (fundo branco, borda superior colorida)
╚══════╝

┌──────┐  — aba inativa (fundo cinza claro)
└──────┘
```

---

## 13. Resumo de Telas (renumerado — footer é seção 12)

| Tela | Rota |
|---|---|
| Login | `/login` |
| Cadastro | `/register` |
| Verificar e-mail | `/verify-email` |
| Onboarding | `/onboarding` |
| Dashboard | `/` |
| Lançamentos | `/entries` |
| Razão da conta | `/entries/ledger/:accountId` |
| Contas a Pagar/Receber | `/commitments` |
| BP | `/reports/balance-sheet` |
| DRE | `/reports/income-statement` |
| Balancete | `/reports/trial-balance` |
| Indicadores | `/reports/indicators` |
| Ponto de Equilíbrio | `/reports/breakeven` |
| Plano de Contas | `/settings/chart-of-accounts` |
| Contas Bancárias | `/settings/bank-accounts` |
| Metas / Previsões | `/settings/goals` |
| Usuários | `/settings/users` |
| Importação | `/settings/imports` |

---

## 13. Próximos Passos

1. **IDEA.md** ✅
2. **REQUIREMENTS.md** ✅
3. **ARCHITECTURE.md** ✅
4. **DATA_MODEL.md** ✅
5. **API.md** ✅
6. **UI_FLOWS.md** ✅ ← estamos aqui
7. **Implementação** — setup do monorepo e primeiro módulo (auth)
