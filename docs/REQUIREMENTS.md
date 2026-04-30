# REQUIREMENTS — Sistema de Gestão Financeira Empresarial

> Documento vivo. Atualizar conforme decisões de produto forem tomadas.

---

## 1. Requisitos Funcionais

### RF-01 — Autenticação e Multi-Tenancy

| ID | Requisito |
|---|---|
| RF-01.1 | O usuário deve conseguir criar uma conta com e-mail e senha |
| RF-01.2 | Após o cadastro, um **e-mail de confirmação** é enviado — o acesso só é liberado após clicar no link de confirmação |
| RF-01.3 | O usuário deve conseguir fazer login e logout |
| RF-01.4 | Na criação da conta, um **tenant** (organização/empresa) é criado automaticamente e o usuário torna-se **Owner** do tenant |
| RF-01.5 | Um usuário com permissão `users:manage` pode convidar outros usuários para o tenant via e-mail |
| RF-01.6 | O sistema usa **RBAC customizável por tenant**: cada tenant pode criar seus próprios roles e definir quais permissões cada role tem |
| RF-01.7 | Um usuário pode pertencer a múltiplos tenants e alternar entre eles |
| RF-01.8 | Sessão expira após inatividade configurável |
| RF-01.9 | Recuperação de senha por e-mail |
| RF-01.10 | Existe um papel global **Super User** (fora da hierarquia de tenant) que tem acesso a todos os tenants do sistema — destinado ao suporte e administração da plataforma |
| RF-01.11 | O Super User pode visualizar e operar qualquer tenant sem precisar ser convidado |
| RF-01.12 | Ações do Super User dentro de um tenant são registradas no audit log com identificação clara ("acesso via suporte") |
| RF-01.13 | Super Users são criados apenas via acesso direto ao sistema (não há fluxo de cadastro público para esse papel) |

#### RF-01 — RBAC: Roles e Permissões

| ID | Requisito |
|---|---|
| RF-01.14 | Ao criar um tenant, o sistema cria automaticamente o role **Owner** para aquele tenant — com todas as permissões e marcado como sistema (não pode ser excluído ou modificado) |
| RF-01.15 | O Owner pode criar roles customizados para o tenant, atribuindo qualquer subconjunto das permissões disponíveis |
| RF-01.16 | Um usuário tem exatamente um role por tenant |
| RF-01.17 | Permissões são granulares por módulo e ação — a tabela completa está em RN-11 |
| RF-01.18 | Roles customizados podem ser renomeados, editados e excluídos pelo Owner, desde que não haja usuários vinculados ao role no momento da exclusão |
| RF-01.19 | O convite de usuário deve incluir o role que será atribuído ao usuário ao aceitar |
| RF-01.20 | Um usuário com `users:manage` pode reatribuir o role de qualquer usuário do tenant, exceto do próprio Owner |

---

### RF-02 — Plano de Contas

| ID | Requisito |
|---|---|
| RF-02.1 | O sistema deve manter um **plano de contas hierárquico** com código numérico (ex: 4, 41, 411, 4111) |
| RF-02.2 | Cada conta tem: código, nome, tipo, natureza, conta-pai, status (ativa/inativa) |
| RF-02.3 | **Tipos de conta**: Ativo Circulante, Ativo Não Circulante, Ativo Permanente, Passivo Circulante, Passivo Não Circulante, Patrimônio Líquido, Receita, Custo Variável Direto, Custo Variável Indireto, Custo Fixo |
| RF-02.4 | **Natureza da conta**: Devedora (ativo, custos/despesas) ou Credora (passivo, receitas) — determina o impacto do débito/crédito no saldo |
| RF-02.5 | **Conta sintética** (agrupadora, não aceita lançamentos) vs **Conta analítica** (folha da árvore, aceita lançamentos) |
| RF-02.6 | No primeiro acesso do tenant, o sistema carrega um plano de contas padrão baseado na estrutura desta documentação |
| RF-02.7 | O usuário pode criar novas contas em qualquer nível da hierarquia |
| RF-02.8 | O usuário pode editar nome e código de uma conta, desde que não cause conflito |
| RF-02.9 | Não é possível excluir uma conta que possua lançamentos |
| RF-02.10 | Não é possível excluir uma conta sintética que possua contas filhas ativas |
| RF-02.11 | Inativar uma conta impede novos lançamentos, mas mantém o histórico |
| RF-02.12 | Contas inativas podem ser **ocultadas da visualização** do plano de contas — toggle "exibir inativas" na tela |
| RF-02.13 | Contas inativas **nunca aparecem** no autocomplete de seleção de conta no lançamento |
| RF-02.14 | Visualização do plano de contas em árvore expansível/recolhível |
| RF-02.15 | Busca de conta por código ou nome |

---

### RF-03 — Lançamentos Contábeis

| ID | Requisito |
|---|---|
| RF-03.1 | Criar lançamento com: data, histórico (descrição), valor, conta de débito, conta de crédito, terceiro (opcional) |
| RF-03.2 | Somente contas **analíticas** aceitam lançamentos |
| RF-03.3 | O valor de débito deve sempre ser igual ao valor de crédito (partidas dobradas) |
| RF-03.4 | **Terceiro** é o nome externo envolvido na transação (cliente, fornecedor, funcionário etc.) — equivalente à coluna C-P da planilha. Campo de texto livre com autocomplete baseado em terceiros já usados |
| RF-03.5 | **Navegação por teclado**: `Tab` avança entre campos; `Enter` no último campo salva o lançamento e abre novo formulário com a data pré-preenchida (igual à do lançamento anterior) |
| RF-03.6 | **Duplicar lançamento**: botão ou atalho (`Ctrl+D`) copia todos os campos do lançamento para um novo formulário — o usuário ajusta apenas o que mudou e salva |
| RF-03.7 | O formulário de lançamento exibe os **últimos 10 lançamentos** ao lado, para referência rápida |
| RF-03.8 | Lançamentos não são deletados fisicamente — exclusão gera um **estorno automático** (lançamento inverso) com histórico "Estorno de: [histórico original]" |
| RF-03.9 | Edição de lançamento: gera estorno do original + novo lançamento com os dados corrigidos |
| RF-03.10 | **Lançamento recorrente**: periodicidade (diária, semanal, mensal, anual) + data de término ou número de repetições |
| RF-03.11 | Cancelamento de recorrência: cancela apenas as futuras (não estorna as passadas) |
| RF-03.12 | **Razão da conta**: exibir todos os lançamentos de uma conta com saldo progressivo (data, histórico, débito, crédito, D/C, saldo, terceiro) |
| RF-03.13 | Filtros no razão: período, terceiro, texto no histórico |
| RF-03.14 | **Importação de extrato** como fluxo principal de entrada de dados: upload CSV ou OFX; o LLM sugere conta contábil e histórico para cada linha; o usuário revisa e confirma linha a linha ou em lote |
| RF-03.15 | Na importação, linhas duplicadas (mesmo valor, data, histórico já lançado) são sinalizadas automaticamente |
| RF-03.16 | Listagem geral de lançamentos com filtros: período, conta, terceiro, valor |
| RF-03.17 | **Saldo inicial**: no primeiro acesso, o sistema guia o usuário por um assistente de abertura onde informa os saldos de cada conta (banco, caixa, a receber, estoque, dívidas, PL) — o sistema gera os lançamentos de abertura automaticamente garantindo que o BP feche |

---

### RF-04 — Contas a Pagar / A Receber

| ID | Requisito |
|---|---|
| RF-04.1 | Criar compromisso com: tipo (pagar/receber), valor, data de vencimento, conta contábil de destino, conta bancária de liquidação, terceiro, observação |
| RF-04.2 | Status do compromisso: **Pendente** → **Pago** / **Recebido** / **Cancelado** / **Vencido** (automático após passar a data) |
| RF-04.3 | Ao marcar como pago/recebido: confirmar (ou substituir) a conta bancária de liquidação e a data de pagamento — a conta pode ser diferente da prevista no cadastro do compromisso (ex: planejava pagar pelo banco, mas pagou pelo caixa) → o sistema **gera automaticamente o lançamento contábil** com a conta efetivamente usada |
| RF-04.4 | Suporte a **pagamento parcial**: o sistema registra o valor parcial pago e cria um novo compromisso com o saldo restante e nova data de vencimento |
| RF-04.5 | **Recorrência**: mensal, semanal, quinzenal, anual — com quantidade de repetições ou data final |
| RF-04.6 | **Calendário de vencimentos**: visão mensal com todos os compromissos do período, coloridos por status (verde=pago, amarelo=pendente, vermelho=vencido) |
| RF-04.7 | **Alertas**: notificação no sistema em D-7, D-3, D-1 e no dia do vencimento |
| RF-04.8 | Lista de compromissos filtrável por: tipo, status, período, terceiro, conta |
| RF-04.9 | **Fluxo de caixa projetado**: soma dos compromissos a pagar e a receber por dia nos próximos 30/60/90 dias, com saldo acumulado projetado |
| RF-04.10 | Cancelar compromisso não gera lançamento |

---

### RF-05 — Balanço Patrimonial (BP)

| ID | Requisito |
|---|---|
| RF-05.1 | Gerado automaticamente a partir dos saldos das contas — sem input manual |
| RF-05.2 | Seleção de ano fiscal (padrão: ano corrente) |
| RF-05.3 | Estrutura: **Ativo** (Circulante, Não Circulante, Permanente) / **Passivo** (Circulante, Exigível a Longo Prazo) / **Patrimônio Líquido** |
| RF-05.4 | Colunas por linha de conta: Saldo Anterior \| Débito \| Crédito \| Saldo Atual \| % \| Jan \| Fev \| Mar \| ... \| Dez |
| RF-05.5 | Percentual (%) calculado em relação ao Ativo Total |
| RF-05.6 | Totais calculados automaticamente para cada grupo, subgrupo e total geral |
| RF-05.7 | O BP fecha automaticamente por construção das partidas dobradas — todo lançamento garante débito = crédito. A validação **Ativo Total = Passivo + PL** serve como verificação de integridade do sistema; se houver diferença, exibir alerta destacado (indica problema na configuração do saldo inicial ou bug) |
| RF-05.8 | Clicar em uma conta abre o razão daquela conta no período |
| RF-05.9 | Exportação em PDF com layout fiel ao relatório na tela |

---

### RF-06 — Demonstração de Resultado (DRE)

| ID | Requisito |
|---|---|
| RF-06.1 | Gerado automaticamente a partir dos saldos das contas de resultado |
| RF-06.2 | Seleção de mês/ano ou intervalo de datas |
| RF-06.3 | Estrutura: **Receitas** → (–) **Custos Variáveis** → **RCM** → (–) **Custos Fixos** → **Resultado Líquido** |
| RF-06.4 | Colunas: Meta \| Previsão \| Execução \| % \| Var. Meta \| Var. Previsão \| Var. Média \| Média \| Acumulado \| Jan ... Dez |
| RF-06.5 | Configuração de **meta mensal** por conta analítica (valor numérico por mês) |
| RF-06.6 | Configuração de **previsão** por conta analítica (valor numérico por mês) |
| RF-06.7 | Percentual (%) calculado em relação à Receita Total |
| RF-06.8 | Clicar em uma conta abre o razão daquela conta no período |
| RF-06.9 | Exportação em PDF |

---

### RF-07 — Balancete de Verificação (BV)

| ID | Requisito |
|---|---|
| RF-07.1 | Exibe todas as contas analíticas com: saldo anterior devedor, saldo anterior credor, total débitos, total créditos, saldo atual devedor, saldo atual credor |
| RF-07.2 | Seleção de período |
| RF-07.3 | Rodapé com totais: soma de todos os débitos = soma de todos os créditos (validação de integridade) |
| RF-07.4 | Exportação em PDF e CSV |

---

### RF-08 — Indicadores Econômicos e Financeiros (IEF / Dashboard)

| ID | Requisito |
|---|---|
| RF-08.1 | Dashboard com cards de resumo: Receita do mês, Resultado Líquido, Saldo em Caixa/Banco, Total a Receber, Total a Pagar |
| RF-08.2 | **Rentabilidade**: Margem Bruta, Margem Líquida, Poder de Ganho |
| RF-08.3 | **Liquidez**: Liquidez Corrente, Liquidez Seca, Liquidez Geral |
| RF-08.4 | **Estrutura**: % Disponível, % A Receber, % Capital de Giro, Participação do Estoque, Grau de Endividamento, % Participação dos Proprietários |
| RF-08.5 | **ROI**: ROI da Empresa |
| RF-08.6 | Todos os indicadores exibidos por mês com evolução em gráfico de linha (Jan–Dez) |
| RF-08.7 | Gráficos de barras: Receita vs Custos por mês, Resultado Líquido por mês |
| RF-08.8 | Seleção de ano |

---

### RF-09 — Ponto de Equilíbrio (PE)

| ID | Requisito |
|---|---|
| RF-09.1 | Configuração de: margem de contribuição meta (%) e resultado desejado (R$) por mês |
| RF-09.2 | Cálculo automático da **meta de vendas necessária** = (Custos Fixos + Resultado Desejado) / Margem de Contribuição |
| RF-09.3 | Cálculo de **meta de vendas por dia** (meta / dias úteis do mês) |
| RF-09.4 | Comparativo: Meta vs Previsão vs Realizado para: vendas, RCM, resultado financeiro, resultado econômico |
| RF-09.5 | Superávit ou déficit em relação à meta |
| RF-09.6 | Exibição por mês e acumulado anual |

---

### RF-10 — Gestão de Contas Bancárias e Carteiras

| ID | Requisito |
|---|---|
| RF-10.1 | Criar conta com: nome, banco (instituição), tipo (Conta Corrente, Poupança, Aplicação, Caixa Físico, Cartão de Crédito), agência, número |
| RF-10.2 | Criação de conta bancária **cria automaticamente** a conta analítica correspondente no plano de contas (grupo 41x ou 42x para cartão) |
| RF-10.3 | Saldo em tempo real calculado a partir dos lançamentos da conta contábil vinculada |
| RF-10.4 | Visão consolidada: soma de todas as contas disponíveis (caixas + bancos) |
| RF-10.5 | Desativar conta bancária inativa também a conta contábil vinculada |
| RF-10.6 | Saldo inicial configurável no cadastro da conta |

---

### RF-11 — Relatórios e Exportação

| ID | Requisito |
|---|---|
| RF-11.1 | Exportação em PDF: BP, DRE, BV — layout fiel à tela, com cabeçalho (nome do tenant, período, data de geração) |
| RF-11.2 | Exportação de lançamentos em CSV com todos os campos (data, histórico, débito, crédito, conta, terceiro) |
| RF-11.3 | Razão analítico por conta: lista paginada com saldo progressivo, exportável em PDF e CSV |
| RF-11.4 | Relatório de Fluxo de Caixa projetado (compromissos futuros) exportável em CSV |

---

## 2. Regras de Negócio

### RN-01 — Partidas Dobradas
- Todo lançamento tem exatamente **uma conta de débito** e **uma conta de crédito** com o **mesmo valor**
- Não é possível salvar um lançamento com débito ≠ crédito

### RN-02 — Natureza das Contas e Impacto no Saldo
- **Conta devedora** (Ativo, Custos, Despesas): débito **aumenta** o saldo, crédito **diminui**
- **Conta credora** (Passivo, PL, Receitas): crédito **aumenta** o saldo, débito **diminui**

### RN-03 — Hierarquia do Plano de Contas
- Conta sintética tem saldo = soma dos saldos de todas as filhas (diretas e indiretas)
- Conta analítica aceita lançamentos; conta sintética não aceita

### RN-04 — Integridade do Balancete
- A qualquer momento: Σ saldos contas devedoras = Σ saldos contas credoras
- O sistema exibe alerta se esta condição for violada

### RN-05 — Estorno em Vez de Exclusão
- Lançamentos são imutáveis após criação
- "Editar" = estorno automático + novo lançamento
- "Excluir" = estorno automático
- O estorno cria um lançamento com débito e crédito invertidos, marcado como estorno, com referência ao original

### RN-06 — Conta Analítica como Destino de Lançamento
- Apenas contas na folha da árvore (sem filhas) aceitam lançamentos
- O sistema valida isso no momento do lançamento

### RN-07 — Geração de Lançamento por Contas a Pagar/Receber
- Ao marcar um compromisso como pago, o sistema cria o lançamento contábil automaticamente
- O lançamento gerado segue as mesmas regras de partidas dobradas
- O lançamento gerado é vinculado ao compromisso (não pode ser editado diretamente — deve editar o compromisso)

### RN-08 — Sem Ajuste de Saldo Direto
- O sistema **não possui** função de "ajuste de saldo" que force um valor em uma conta sem lançamento correspondente
- Divergências entre saldo do sistema e saldo real (ex: extrato bancário) são corrigidas com um **lançamento de ajuste** normal, com débito e crédito — mantendo o audit trail limpo
- Os problemas que exigem ajuste de saldo no Excel (contrapartida esquecida, link quebrado) são estruturalmente impossíveis neste sistema por conta da obrigatoriedade de partidas dobradas

### RN-09 — Isolamento de Tenant

- Nenhum dado de um tenant é visível ou acessível por outro tenant, em nenhuma circunstância
- Isso inclui plano de contas, lançamentos, compromissos, relatórios e configurações

### RN-10 — Plano de Contas Vinculado ao Tenant
- Cada tenant tem seu próprio plano de contas independente
- Mudanças no plano de um tenant não afetam outros

### RN-11 — Tabela de Permissões

Cada permissão tem o formato `recurso:ação`. Um role pode ter qualquer subconjunto delas.

| Permissão | Descrição |
|---|---|
| `accounts:read` | Ver plano de contas |
| `accounts:write` | Criar, editar e inativar contas contábeis |
| `entries:read` | Ver lançamentos e razão de conta |
| `entries:write` | Criar lançamentos |
| `entries:delete` | Estornar lançamentos |
| `commitments:read` | Ver contas a pagar / a receber |
| `commitments:write` | Criar e editar compromissos |
| `commitments:delete` | Cancelar compromissos |
| `reports:read` | Ver todos os relatórios (BP, DRE, BV, IEF, PE, Dashboard) |
| `bank_accounts:read` | Ver contas bancárias |
| `bank_accounts:write` | Criar e editar contas bancárias |
| `imports:run` | Fazer upload e processar extrato bancário |
| `imports:confirm` | Confirmar ou rejeitar lançamentos sugeridos pelo LLM |
| `users:manage` | Convidar, remover e reatribuir roles de usuários |
| `roles:manage` | Criar, editar e excluir roles customizados |
| `settings:manage` | Configurar metas, ponto de equilíbrio e configurações gerais do tenant |

> **Owner** tem todas as 16 permissões acima e não pode ter nenhuma removida.
> **Super User** (global) bypassa o RBAC — acessa qualquer tenant com qualquer operação.

---

## 3. Requisitos Não-Funcionais

### RNF-01 — Performance
| ID | Requisito |
|---|---|
| RNF-01.1 | BP e DRE devem carregar em menos de **3 segundos** para tenants com até 20.000 lançamentos anuais |
| RNF-01.2 | Tela de lançamentos deve suportar listagem com **scroll infinito ou paginação** — nunca carregar tudo de uma vez |
| RNF-01.3 | Dashboard com indicadores deve carregar em menos de **2 segundos** |

### RNF-02 — Segurança
| ID | Requisito |
|---|---|
| RNF-02.1 | Autenticação via JWT com access token (curto prazo) + refresh token (longo prazo) |
| RNF-02.2 | HTTPS obrigatório em todos os ambientes |
| RNF-02.3 | Isolamento de dados entre tenants garantido no nível do banco de dados (RLS ou schema separado) |
| RNF-02.4 | **Audit log** de ações sensíveis: criação/estorno de lançamento, alteração de plano de contas, convite/remoção de usuário |
| RNF-02.5 | Senhas armazenadas com hash bcrypt ou argon2 |
| RNF-02.6 | Rate limiting em endpoints de autenticação |

### RNF-03 — Usabilidade
| ID | Requisito |
|---|---|
| RNF-03.1 | Interface **desktop-first** com responsividade básica para tablet |
| RNF-03.2 | Autocomplete na seleção de conta (digitar nome ou código) — resultado em menos de 200ms |
| RNF-03.3 | Após salvar um lançamento, o foco volta para o campo data (fluxo rápido de digitação) |
| RNF-03.4 | Confirmação explícita antes de operações destrutivas (estorno, cancelamento) |
| RNF-03.5 | Feedback visual imediato em todas as ações (loading, sucesso, erro) |

### RNF-04 — Disponibilidade e Confiabilidade
| ID | Requisito |
|---|---|
| RNF-04.1 | SLA de disponibilidade: 99,5% (excluindo janelas de manutenção programada) |
| RNF-04.2 | Backup diário dos dados com retenção de 30 dias |
| RNF-04.3 | Operações críticas (salvar lançamento) devem ser atômicas — ou salva tudo ou não salva nada |

### RNF-05 — Manutenibilidade
| ID | Requisito |
|---|---|
| RNF-05.1 | Cobertura de testes automatizados: mínimo 80% nas regras de negócio (RN-01 a RN-09) |
| RNF-05.2 | API documentada com OpenAPI/Swagger |
| RNF-05.3 | Deploy via CI/CD com rollback automático em caso de falha |

---

## 4. Restrições e Premissas

| # | Restrição / Premissa |
|---|---|
| R-01 | **Moeda única**: BRL apenas. Sem suporte a multi-moeda no MVP |
| R-02 | **Ano fiscal**: Janeiro a Dezembro (ano civil). Ano fiscal personalizado fora do MVP |
| R-03 | **Sem conciliação bancária automática** (OFX sync em tempo real) no MVP — apenas importação manual de extrato |
| R-04 | O sistema não emite documentos fiscais (NF-e, NFS-e) |
| R-05 | O sistema não se integra com contabilidade externa (SPED, ECD) no MVP |
| R-06 | Usuário deve entender contabilidade básica — o sistema não é um app de finanças pessoais simplificado |
| R-07 | Lançamentos em períodos anteriores são permitidos (sem lock de período no MVP) |
| R-08 | O plano de contas padrão carregado no primeiro acesso é baseado na estrutura documentada em IDEA.md |

---

## 5. Glossário

| Termo | Definição |
|---|---|
| **Tenant** | Organização/empresa no sistema. Cada tenant tem dados completamente isolados |
| **Plano de Contas** | Estrutura hierárquica de todas as contas contábeis do tenant |
| **Conta Sintética** | Conta agrupadora — consolida saldos das filhas, não aceita lançamentos diretos |
| **Conta Analítica** | Conta folha — aceita lançamentos diretamente |
| **Partidas Dobradas** | Princípio contábil: todo lançamento tem débito e crédito de igual valor |
| **Natureza Devedora** | Conta cujo saldo aumenta com débitos (ativo, custos) |
| **Natureza Credora** | Conta cujo saldo aumenta com créditos (passivo, receitas) |
| **Terceiro** | Nome externo envolvido no lançamento (cliente, fornecedor, funcionário). Equivalente à coluna C-P da planilha. Não confundir com a conta de crédito (que é a "contrapartida contábil") |
| **Estorno** | Lançamento inverso que anula o efeito de um lançamento anterior |
| **Razão** | Extrato analítico de uma conta com todos os lançamentos e saldo progressivo |
| **Balancete** | Relatório que lista todas as contas com saldos e valida que débitos = créditos |
| **RCM** | Resultado com Mercadorias = Receitas – Custos Variáveis |
| **CMV** | Custo das Mercadorias Vendidas |
| **PE** | Ponto de Equilíbrio — volume mínimo de vendas para cobrir todos os custos |
| **IEF** | Indicadores Econômicos e Financeiros |
| **BP** | Balanço Patrimonial |
| **DRE / DR** | Demonstração do Resultado do Exercício |
| **BV** | Balancete de Verificação |
| **PL** | Patrimônio Líquido |
