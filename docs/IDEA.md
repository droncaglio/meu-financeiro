# IDEIA — Sistema de Gestão Financeira Empresarial

## Visão Geral

Sistema web de gestão financeira baseado em **partidas dobradas** (double-entry bookkeeping), pensado para substituir planilhas complexas e eliminar o trabalho manual de fechamento mensal, lançamento de contrapartidas e geração de relatórios.

Inspirado diretamente em uma planilha de 90 abas com Balanço Patrimonial, DRE, Balancete, Indicadores e Ponto de Equilíbrio — mas automatizando tudo que hoje é manual.

---

## Problema Real a Resolver

A planilha atual funciona bem conceitualmente, mas exige:

1. **Lançamento manual de cada transação** com contrapartida explícita (de onde saiu / entrou o dinheiro)
2. **Fechamento mensal manual** — entrar em cada aba e criar linha de fechamento, linkar os valores no BP e DR
3. **Sem importação de extratos** — tudo digitado à mão
4. **Sem calendário de vencimentos** — contas a pagar/receber sem alertas
5. **Estrutura rígida** — adicionar uma nova conta bancária ou categoria exige criar nova aba, relinkar fórmulas

O sistema resolve isso tudo mantendo a **mesma lógica contábil** que o usuário já conhece.

---

## Conceitos Centrais do Sistema

### 1. Plano de Contas (Chart of Accounts)

Estrutura hierárquica com código numérico, replicando a lógica da planilha:

```
ATIVO
  4   — Ativo Circulante
  41  — Disponível
  411 — Caixas
  4111 — Caixa Cofre
  412 — Bancos C/C
  4121 — Banco X C/C
  413 — Aplicações
  42  — A Receber
  421 — Cartão a Receber
  422 — Boletos a Receber
  423 — Crediário
  43  — Estoques
  5   — Ativo Não Circulante
  6   — Ativo Permanente (Imobilizado)

PASSIVO
  7   — Passivo Circulante
  71  — Custos a Pagar (Fornecedores, Conta Garantida)
  72  — Dívidas a Pagar (Empréstimos, PRONAMPE)
  9   — Patrimônio Líquido
  91  — Saldo Inicial
  92  — Decréscimos/Acréscimos do Patrimônio
  93  — Resultado Acumulado

RESULTADO (DR)
  1   — Receitas
  11  — Receitas Diretas (Vendas por canal)
  12  — Receitas Indiretas (Juros, Aplicações)
  2   — Custos Variáveis
  21  — CVD — CMV
  22  — CVI — Taxas Cartão, Simples Nacional
  3   — Custos Fixos
  31  — Despesas Pessoal
  32  — Despesas Institucionais
  33  — Despesas de Expediente
```

- O plano de contas é **totalmente dinâmico** — o usuário cria, edita e desativa contas
- Cada conta tem: código, nome, tipo (ativo/passivo/receita/custo), natureza (devedora/credora), conta-pai
- O sistema valida a árvore (não pode deletar conta com lançamentos ou filhas)

### 2. Lançamentos em Partidas Dobradas

Cada transação tem:
- **Data**
- **Histórico** (descrição)
- **Valor**
- **Conta de débito** (de onde sai)
- **Conta de crédito** (para onde vai)
- **Contraparte** (nome do cliente/fornecedor — equivalente à coluna C-P da planilha)
- **Categoria de vencimento** (opcional — para contas a pagar/receber)

Exemplo: pagar aluguel
- Débito: 321 — Aluguel (aumenta custo)
- Crédito: 4122 — Sicredi C/C (diminui banco)

Exemplo: receber boleto de cliente
- Débito: 4122 — Sicredi C/C (aumenta banco)
- Crédito: 422 — Boletos a Receber (baixa o recebível)

### 3. Fechamento Mensal Automático

O maior ganho. Hoje o usuário entra em cada aba e cria uma linha de fechamento manual. No sistema:

- O **saldo de cada mês** é calculado automaticamente pelo somatório dos lançamentos do período
- BP e DR exibem colunas Jan–Dez com saldos calculados em tempo real
- Nenhuma ação manual necessária para "fechar o mês"

---

## Módulos do Sistema

### M1 — Plano de Contas
- CRUD completo de contas
- Visualização em árvore hierárquica
- Reordenação e reorganização
- Contas-padrão pré-carregadas no primeiro acesso (baseadas na estrutura da planilha)

### M2 — Lançamentos
- Tela de lançamento com seleção de conta débito e crédito
- Campo contraparte (cliente/fornecedor)
- Lançamento avulso e lançamento recorrente
- Edição e exclusão com estorno automático
- Visualização do razão de cada conta (lista de lançamentos com saldo progressivo)
- **Importação de extrato** com assistência de LLM para categorização automática (CSV/OFX)

### M3 — Contas a Pagar / A Receber
- Cadastro de compromisso com: valor, vencimento, conta contábil, contraparte, recorrência
- Status: pendente / pago / vencido / cancelado
- Quando pago: gera automaticamente o lançamento contábil (baixa o passivo/ativo e debita/credita o banco)
- Calendário mensal com visualização de vencimentos
- Alertas (D-7, D-3, D-1, no dia)
- Relatório de fluxo de caixa projetado (a pagar/receber futuro)

### M4 — Balanço Patrimonial (BP)
- Gerado automaticamente pelos saldos das contas
- Estrutura: Ativo (Circulante, Não Circulante, Permanente) vs Passivo (Circulante, Dívidas) vs PL
- Visão: saldo anterior + movimentação (débito/crédito) + saldo atual + % + colunas por mês
- Exportação PDF

### M5 — Demonstração de Resultado (DR / DRE)
- Gerado automaticamente
- Estrutura: Receitas → (–) Custos Variáveis → RCM → (–) Custos Fixos → Resultado Líquido
- Colunas: Meta / Previsão / Execução / % / Variação / Média / Acumulado / Jan–Dez
- Suporte a metas mensais e previsão de receita
- Exportação PDF

### M6 — Balancete de Verificação (BV)
- Lista todas as contas com: saldo anterior devedor/credor, movimentação débito/crédito, saldo atual devedor/credor
- Validação automática: débitos = créditos (partidas dobradas)

### M7 — Indicadores Econômicos e Financeiros (IEF / Dashboard)
Calculados automaticamente, exibidos por mês:

**Rentabilidade**
- Margem Bruta (RCM / Receitas)
- Margem Líquida (Resultado Líquido / Receitas)
- Poder de Ganho da Empresa (Lucro / Ativo Total)

**Liquidez**
- Liquidez Corrente (Ativo Circ. / Passivo Circ.)
- Liquidez Seca (Ativo Circ. – Estoque / Passivo Circ.)
- Liquidez Geral

**Estrutura**
- % Disponível (Caixa/Bancos / Ativo Total)
- % A Receber
- % Capital de Giro
- Participação do Estoque
- Grau de Endividamento

**ROI**
- ROI da Empresa (Resultado / Patrimônio Líquido)

### M8 — Ponto de Equilíbrio (PE)
- Custos fixos + resultado desejado + margem de contribuição = meta de vendas
- Comparativo: meta vs realizado vs previsão
- Por dia e por mês

### M9 — Gestão de Contas Bancárias e Carteiras
- Cadastro dinâmico de contas (banco, tipo: C/C, poupança, aplicação, caixa físico)
- Cada conta é automaticamente uma conta no plano de contas (grupo 41x)
- Saldo em tempo real por conta
- Visão consolidada de caixa

### M10 — Relatórios e Exportação
- BP, DR, BV em PDF
- Extrato por conta (razão analítico)
- Fluxo de caixa realizado e projetado
- Exportação de lançamentos em CSV

---

## Arquitetura Multi-Tenant

- **Tenant** = empresa/organização
- **Usuário** pertence a um ou mais tenants
- **Isolamento de dados**: cada tenant tem seus próprios dados — nenhum dado de um tenant é acessível por outro
- **Roles por tenant**: Admin (acesso total) / Financeiro (lançamentos + relatórios) / Visualizador (somente leitura)
- Decisão de isolamento de banco (schema separado vs row-level security) a definir na fase de arquitetura

---

## Diferencial em Relação ao Mercado

| Feature | Nubank / Organizze | Conta Azul | Este Sistema |
|---|---|---|---|
| Balanço Patrimonial | Não | Parcial | Sim, completo |
| Partidas dobradas | Não | Sim | Sim |
| DRE com Custos Fixos/Variáveis | Não | Parcial | Sim |
| Indicadores (Margem, Liquidez, ROI) | Não | Parcial | Sim, automático |
| Ponto de Equilíbrio | Não | Não | Sim |
| Plano de contas customizável | Não | Limitado | Sim, total |
| Contas Bancárias dinâmicas | Sim | Sim | Sim |
| Calendário de vencimentos | Parcial | Sim | Sim |
| Import extrato com LLM | Não | Não | Sim |
| Multi-tenant | Não | Sim | Sim |
| Finanças pessoais como empresa | Não | Não | Sim (mesmo modelo) |

---

## Escopo Fora do MVP

- Conciliação bancária automática (OFX sync)
- Nota fiscal eletrônica (NF-e)
- Integração com contabilidade externa (SPED)
- Multi-moeda
- Módulo de folha de pagamento
- App mobile

---

## Usuário-Alvo

Dono de pequena/média empresa que:
- Já gerencia finanças em planilha elaborada
- Entende contabilidade básica (débito/crédito, BP, DR)
- Precisa de visão gerencial completa, não apenas "gastos do mês"
- Tem múltiplas contas, cartões e formas de recebimento
- Quer eliminar o trabalho manual de fechamento e digitação

---

## Próximos Passos da Jornada

1. **IDEA.md** ← estamos aqui
2. **REQUIREMENTS.md** — requisitos funcionais e não-funcionais detalhados
3. **ARCHITECTURE.md** — stack, banco de dados, estrutura de projeto
4. **DATA_MODEL.md** — modelagem do banco (entidades, relacionamentos)
5. **API.md** — contratos de API (endpoints, payloads)
6. **UI_FLOWS.md** — fluxos de tela e wireframes
7. **Implementação** — iterações por módulo
