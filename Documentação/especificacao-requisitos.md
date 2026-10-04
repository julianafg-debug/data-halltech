# Especificação de Requisitos — Central Hall

**Versão:** 1.0 · **Data:** 03/10/2026  
**Fonte primária:** protótipo `Hall_Central_App_Demo.html`  
**Convenção:** **D** = demonstrado no protótipo; **A** = requisito-alvo necessário para solução real; **P** = proposta ou decisão pendente. Prioridade: **Must**, **Should**, **Could**.

## 1. Propósito, escopo e público

Esta especificação registra requisitos verificáveis para uma plataforma de atendimento condominial com experiência do morador e console da central. Destina-se a negócio, produto, arquitetura, desenvolvimento, QA, operação e privacidade. O protótipo é evidência de intenção de UX e não evidência de persistência, segurança ou integração.

### 1.1 Escopo

Inclui identidade/contexto, solicitações e OS, acompanhamento, fila de atendimento, dashboard, base de conhecimento/assistente e configurações do condomínio. Não inclui, sem decisão adicional, pagamentos, reservas, acesso físico, aplicativo nativo, ERP, fornecedores integrados ou canais externos.

### 1.2 Premissas e restrições

- A solução real deverá servir mais de um condomínio sem cruzamento de dados.
- A organização definirá provedor de identidade, hosting, canais de notificação, política de retenção e SLAs comerciais.
- Métricas e conteúdo exibidos no demo são exemplos e não devem ser importados como dados reais.
- Campos/estados e metas de desempenho são requisitos iniciais sujeitos a validação de negócio e arquitetura.

## 2. Requisitos funcionais

| ID | Requisito | Prioridade | Origem |
|---|---|---|---|
| RF-001 | O sistema deve autenticar usuários antes de exibir informação operacional ou pessoal. | Must | A |
| RF-002 | O sistema deve determinar papéis e condomínios/unidades autorizados a partir de vínculo validado no servidor. | Must | A |
| RF-003 | O morador deve visualizar condomínio e unidade/contexto ativo, sem poder assumir vínculo arbitrário. | Must | D/A |
| RF-004 | O morador deve visualizar suas solicitações com identificador, resumo, local, criação e estado atual. | Must | D/A |
| RF-005 | O morador deve iniciar OS por categoria/atalho e preencher assunto, local e descrição. | Must | D |
| RF-006 | O sistema deve validar campos, categoria/local autorizados e tamanho/formato antes de criar a OS. | Must | A |
| RF-007 | O sistema deve persistir a OS atomicamente e devolver identificador, estado inicial e data/hora confirmados. | Must | A |
| RF-008 | Reenvio da mesma operação deve evitar criação duplicada por falha de rede ou repetição do usuário. | Should | A |
| RF-009 | O sistema deve permitir ao morador consultar detalhe, histórico e solicitações de informação de suas OS. | Must | A |
| RF-010 | Operador autorizado deve consultar fila de OS, com busca/filtros por estado, categoria, período e local. | Must | D/A |
| RF-011 | Operador autorizado deve classificar, priorizar, atribuir, responder e alterar estado conforme transições permitidas. | Must | A |
| RF-012 | Toda transição deve registrar ator, instante, estado anterior/novo e motivo quando exigido. | Must | A |
| RF-013 | O sistema deve calcular SLA conforme política e calendário vigentes e registrar violações/pausas. | Must | D/A |
| RF-014 | O dashboard deve exibir volume, resposta, SLA, satisfação e tendências com período e definições explícitas. | Should | D/A |
| RF-015 | O usuário autorizado deve gerar e baixar relatório segundo formato e filtros aprovados, com escopo autorizado. | Should | D/A |
| RF-016 | Gestor autorizado deve editar nome, prefixo e política de SLA do condomínio com validação e histórico. | Must | D/A |
| RF-017 | Gestor/editor deve cadastrar, revisar, publicar, substituir e retirar documentos de conhecimento com versão e vigência. | Must | D/A |
| RF-018 | A assistente deve limitar recuperação de conhecimento ao condomínio e a documentos publicados/vigentes. | Must | D/A |
| RF-019 | A assistente deve apresentar resposta apoiada em fontes, comunicar insuficiência e oferecer encaminhamento humano/chamado. | Must | D/A |
| RF-020 | O sistema deve registrar conversa e eventual transferência conforme política de privacidade e acesso. | Should | A |
| RF-021 | O morador deve conseguir acionar a administração sem perder o contexto necessário, sujeito a consentimento/política. | Should | D |
| RF-022 | O sistema deve apresentar carregamento, vazio, sucesso e erro de forma distinta e acessível. | Must | A |
| RF-023 | O sistema deve fornecer notificações de criação e alterações relevantes nos canais aprovados. | Should | A |
| RF-024 | A plataforma deve registrar auditoria de alterações administrativas, acesso excepcional e exportações. | Must | A |

## 3. Requisitos não funcionais

| ID | Requisito verificável | Prioridade |
|---|---|---|
| RNF-001 | Todas as operações protegidas devem aplicar autorização server-side por usuário, papel, condomínio e unidade; tentativas cruzadas devem falhar sem revelar existência de dados. | Must |
| RNF-002 | Dados em trânsito devem usar TLS; dados persistidos e backups devem usar criptografia gerenciada. | Must |
| RNF-003 | Conteúdo não confiável deve ser escapado/renderizado com segurança; não interpolar entradas em HTML executável. | Must |
| RNF-004 | O produto deve suportar teclado, leitor de tela, foco visível e contraste segundo WCAG 2.2 AA nos fluxos essenciais. | Must |
| RNF-005 | Interface deve adaptar-se a telas móveis e desktop suportadas, preservando funções essenciais. | Must |
| RNF-006 | Em carga nominal acordada, p95 de consulta operacional deve ser ≤2 s e criação de OS ≤3 s, exceto dependência externa documentada. | Should |
| RNF-007 | Meta inicial de disponibilidade da API principal: ≥99,5% mensal, sujeita a aprovação operacional. | Should |
| RNF-008 | Operações de escrita críticas devem ser transacionais e idempotentes onde aplicável; erros não podem ser apresentados como sucesso. | Must |
| RNF-009 | O sistema deve produzir logs estruturados, correlação, métricas e alertas sem registrar segredos ou PII desnecessária. | Must |
| RNF-010 | Retenção, exportação, anonimização e descarte devem obedecer política aprovada e obrigações LGPD. | Must |
| RNF-011 | Backup e recuperação devem atender RPO/RTO definidos pelo negócio e demonstrados por restauração periódica. | Should |
| RNF-012 | Dashboard e listas devem suportar paginação/agregação para volume operacional esperado sem varredura ilimitada. | Should |
| RNF-013 | O assistente deve proteger escopo multi-tenant contra vazamento por recuperação semântica e conteúdo adversarial. | Must |
| RNF-014 | Navegadores e versões suportados devem ser documentados e testados antes de cada release. | Should |

## 4. Regras, dados e validações

- Toda OS é associada a condomínio, solicitante e local autorizados.
- O número exibido da OS é único e distinto da chave técnica.
- Estados têm catálogo e transições permitidas; o servidor é autoridade para a máquina de estados.
- SLA contém objetivo, unidade de tempo, marco inicial, calendário, pausas e versão da política.
- Mudança de configuração não recalcula prazo histórico sem regra aprovada.
- Base da assistente tem proprietário, escopo, estado de publicação, vigência, origem e versão.
- Todos os timestamps são armazenados com referência inequívoca ao UTC; interface apresenta horário local do condomínio.
- Mensagens, descrições e documentos podem conter dados pessoais e exigem acesso e retenção controlados.

## 5. Casos de uso e critérios de aceite

### UC-01 — Abrir solicitação (RF-003–008)

**Ator principal:** morador autenticado. **Pré-condições:** sessão válida e unidade autorizada.  
**Fluxo principal:** selecionar categoria → preencher assunto/local/descrição → validar → confirmar → receber número e estado inicial → consultar OS na lista.  
**Alternativas:** dados inválidos: destacar erro e manter formulário; sessão expirada: solicitar autenticação sem criar OS; falha de rede: informar resultado não confirmado e permitir consulta/repetição idempotente.  
**Aceite:** uma submissão válida produz exatamente um registro persistente e acessível ao morador autorizado após recarregar a página; usuário de outra unidade não o acessa.

### UC-02 — Tratar solicitação (RF-010–013)

**Ator principal:** operador. **Pré-condições:** operador autorizado no condomínio.  
**Fluxo principal:** localizar OS → abrir detalhe → classificar/priorizar/atribuir → registrar resposta e transição → sistema valida transição e recalcula/atualiza SLA → morador vê histórico autorizado.  
**Alternativas:** estado mudou concorrentemente: rejeitar atualização obsoleta e apresentar versão atual; transição inválida: informar estados permitidos; falta de permissão: negar e auditar quando aplicável.  
**Aceite:** histórico é imutável para usuário comum e contém autor, timestamps e transição; nenhuma alteração cruza escopo.

### UC-03 — Consultar regra pela assistente (RF-017–020)

**Ator principal:** morador; **serviço secundário:** assistente.  
**Fluxo principal:** enviar pergunta → identificar condomínio autorizado → buscar apenas documentos publicados/vigentes daquele escopo → responder com referência → permitir avaliar/solicitar atendimento.  
**Alternativa:** nenhuma evidência ou conflito: declarar incerteza, não inventar regra e oferecer encaminhamento.  
**Aceite:** documento de outro condomínio nunca pode influenciar a resposta; resposta verificável inclui referência à fonte aprovada ou indica ausência de base.

### UC-04 — Administrar parâmetros e conhecimento (RF-016–017)

**Ator principal:** gestor.  
**Fluxo principal:** autenticar → editar configuração ou documento → validar → salvar rascunho → revisar/publicar quando aplicável → registrar versão/auditoria.  
**Aceite:** somente gestor autorizado altera; versão anterior permanece rastreável; publicação torna conteúdo disponível apenas no escopo correto e após indexação concluída.

## 6. Rastreabilidade

| Capacidade do protótipo | Requisitos associados | Observação de lacuna |
|---|---|---|
| Alternância Morador/Central Hall | RF-001, RF-002 | Demonstração visual, sem login/perfil |
| Resumo e lista de chamados | RF-003, RF-004, RF-014 | Conteúdo estático e dados demonstrativos |
| Atalhos e modal de abertura | RF-005–009 | Criação apenas em memória, sem validação/persistência |
| Fila de chamados | RF-010–013 | Uma linha, sem ações operacionais |
| Dashboard/relatório | RF-014–015 | Métricas fixas; exportação é apenas alerta |
| Base da IA | RF-017–020 | Campo não salva; respostas não usam documentos |
| Configurações | RF-016 | Botão não conectado; dados não persistem |
| Responsividade e modais | RNF-004–005, RF-022 | CSS responsivo simples; acessibilidade não validada |

## 7. Critérios de conclusão do produto

Considerar requisitos Must atendidos apenas após testes automatizados e evidência de execução em ambiente de homologação, incluindo testes de autorização multi-tenant, persistência após nova sessão, falhas/retries, fluxos acessíveis e segurança da assistente. Dados de demonstração devem estar identificados e isolados, sem contaminar indicadores de produção.

## 8. Questões para aprovação

1. Matriz exata de papéis e se operador pode atender múltiplos condomínios.
2. Catálogo de categorias, estados, prioridades, transições e motivo obrigatório.
3. Definição e calendário de SLA, primeira resposta versus resolução, pausa e reabertura.
4. Política de notificações, relatório/exportação e retenção de conversas/anexos.
5. Padrões de autenticação, residência, disponibilidade, RPO/RTO e metas de volume.
6. Processo de aprovação e responsabilidade pelo conteúdo publicado na base de conhecimento.
