# Especificação Técnica — Central Hall

**Base:** análise estática de `Hall_Central_App_Demo.html`  
**Versão:** 1.0 · **Data:** 03/10/2026  
**Status:** arquitetura-alvo proposta; o HTML atual é apenas demonstração local

## 1. Resumo técnico do artefato analisado

O artefato é um único documento HTML em português, com cerca de 4,86 MB, imagens embutidas em data URI, CSS inline e um bloco JavaScript inline de aproximadamente 1,7 KB. Usa elementos globais do DOM por `id`/nome, manipuladores inline (`onclick`), variáveis globais implícitas, `insertAdjacentHTML`, `setTimeout` e `alert`. Não foi identificado framework, endpoint, biblioteca, mecanismo de autenticação, persistência, testes ou pipeline no artefato.

A interface possui as áreas Morador e Central Hall; abas Dashboard, Chamados/OS, Base da IA e Configurações; modais de abertura de OS e chat. O JavaScript alterna visibilidade, acrescenta dados apenas ao DOM, gera sequência de OS local à página e responde a três perguntas com texto fixo. Atualizar a página perde os registros criados. O campo de conhecimento e várias ações são visuais, sem persistência ou processamento real. Essas características descrevem o demo e não constituem recomendação para produção.

## 2. Arquitetura-alvo

Adotar aplicação web responsiva com separação de responsabilidades:

1. **Cliente web:** apresentação acessível para morador e console operacional. Componentes reutilizáveis para formulário, lista, detalhe, dashboard, conhecimento e configurações.
2. **API de aplicação:** autenticação/autorização, validação, regras de negócio, transações, estados de OS, SLA e auditoria. API versionada; contrato OpenAPI como artefato de integração.
3. **Persistência relacional:** PostgreSQL ou serviço relacional equivalente para entidades transacionais, integridade referencial, isolamento lógico por condomínio e consultas operacionais.
4. **Armazenamento de objetos:** anexos/documentos com controles de acesso, criptografia, retenção e varredura antimalware. Metadados ficam no banco; o conteúdo não deve ser servido por URL pública permanente.
5. **Serviços assíncronos:** fila de mensagens/outbox para notificações, ingestão/indexação de conhecimento, geração de relatórios e tarefas demoradas, com retentativa limitada e idempotência.
6. **Assistente de conhecimento:** ingestão de fontes autorizadas, extração, indexação, recuperação filtrada por condomínio/versão/status, geração com referências e encaminhamento para humano. O modelo não deve ser fonte autoritativa nem executar alterações transacionais.
7. **Observabilidade e administração:** logs estruturados, métricas, tracing, auditoria, alertas, configurações externas e gestão segura de segredos.

Esta é uma proposta coerente com as funções representadas; o HTML não revela infraestrutura, stack, banco, nuvem ou fornecedor. A seleção concreta deve considerar padrões organizacionais, volume, disponibilidade, residência de dados, custo e contratos.

## 3. Componentes e contratos

### 3.1 Recursos de API sugeridos

| Recurso | Operações principais | Controles |
|---|---|---|
| `/v1/me` | identidade, papéis e contextos autorizados | baseado em token/sessão autenticada |
| `/v1/condominiums/{id}/service-requests` | listar, criar OS | autorização do condomínio/unidade; paginação; idempotency key na criação |
| `/v1/service-requests/{id}` | detalhe | escopo por condomínio e papel |
| `/v1/service-requests/{id}/events` | histórico e mensagens | leitura autorizada; escrita conforme papel |
| `/v1/service-requests/{id}/transitions` | triagem, atribuição, mudança de estado | máquina de estados no servidor; concorrência otimista |
| `/v1/condominiums/{id}/dashboard` | métricas com intervalo/filtros | definição temporal consistente e autorização |
| `/v1/condominiums/{id}/knowledge-documents` | submissão, revisão, publicação e retirada | workflow e trilha de auditoria |
| `/v1/condominiums/{id}/assistant/conversations` | iniciar conversa, enviar mensagem, transferir | filtro obrigatório de escopo e registro de referências |
| `/v1/condominiums/{id}/settings` | leitura/atualização versionada | papel gestor, validação e auditoria |

Respostas devem utilizar códigos HTTP coerentes, erros com código estável, mensagem segura e identificador de correlação. Listas paginadas devem aceitar filtros explicitamente suportados e ordenação determinística. Datas devem ser transmitidas em ISO 8601 com offset/UTC e apresentadas no fuso do condomínio. Não confiar em `condominium_id`, user id ou estado enviados pelo cliente sem verificação no servidor.

### 3.2 Eventos de domínio e integrações

Eventos candidatos: `ServiceRequestCreated`, `ServiceRequestAssigned`, `ServiceRequestStatusChanged`, `ServiceRequestResolved`, `KnowledgeDocumentPublished` e `AssistantHandoffRequested`. Publicação deve ocorrer após confirmação transacional por outbox ou mecanismo equivalente. Consumidores e envio de notificações devem tolerar entrega duplicada. Integrações com e-mail, push, WhatsApp, ERP, portaria ou prestadores são opcionais e não estão demonstradas; documentar autenticação, limites, retries, privacidade e indisponibilidade antes de habilitá-las.

## 4. Segurança, privacidade e confiabilidade

- Autenticação corporativa/identidade gerenciada e autorização RBAC com escopo por condomínio, unidade e recurso.
- Prevenção de IDOR/BOLA: validar no servidor cada leitura, mutação, documento e conversa; não considerar ocultação de abas autorização.
- Transporte TLS, criptografia em repouso, segredos em cofre e rotação; evitar dados pessoais, tokens ou conteúdo sensível em logs.
- Validar e limitar payloads, arquivos, frequência de requisições e consultas; proteger contra XSS, CSRF conforme modelo de sessão, injeção e abuso automatizado.
- Escapar conteúdo apresentado no cliente; não interpolar texto de usuário em HTML. O `insertAdjacentHTML` atual torna perigosa a inclusão futura de descrição/perfil sem sanitização.
- Tratar dados pessoais segundo LGPD: finalidade, minimização, base legal, atendimento a direitos, retenção/descarte e contratos com operadores. Definir se incidentes podem incluir dados sensíveis.
- Assistente: tratar prompt injection em documentos e mensagens, restringir ferramentas, filtrar retrieval por tenant antes da geração, redigir segredos, citar fonte/vigência, registrar decisão, limitar conteúdo e transferir casos ambíguos.
- Disponibilidade: timeouts, circuit breakers, retentativas com backoff para dependências idempotentes, estados de degradação claros e backups testados.
- Operações críticas (mudança de estado, configuração, publicação, exportação e acesso administrativo) registradas em trilha append-only com autor, horário, correlação e valores pertinentes.

## 5. Dados e consistência

O modelo lógico detalhado está em `modelagem-de-dados.md`. Identificadores internos devem ser imutáveis e independentes do número humano da OS. Banco em transações ACID para criação/mudança de estado, com chaves estrangeiras e restrições de domínio. Timestamps em UTC; política de fuso/calendário associada ao condomínio. Configurações de SLA e parâmetros operacionais devem ser versionados para reprodução do cálculo histórico. Materializações/cache do dashboard são derivadas e reconstruíveis.

## 6. Requisitos não funcionais técnicos propostos

Metas são iniciais e precisam de validação de capacidade/contrato:

| Dimensão | Alvo inicial |
|---|---|
| Desempenho | P95 de leitura operacional ≤ 2 s e criação de OS ≤ 3 s em carga nominal, excluídas integrações externas lentas |
| Disponibilidade | Meta inicial ≥ 99,5% mensal para API principal; explicitar janela de manutenção e dependências |
| Segurança | Revisão de ameaças antes de produção; testes de autorização multi-tenant e SAST/DAST conforme política |
| Acessibilidade | WCAG 2.2 AA como referência para fluxos essenciais |
| Observabilidade | Correlação ponta a ponta, métricas de erros/latência/fila e alertas acionáveis sem PII |
| Recuperação | RPO/RTO formalmente aprovados; backups criptografados e teste periódico de restauração |
| Compatibilidade | Navegadores modernos suportados pela organização; layout móvel e desktop |
| Escala | Paginação e consultas indexadas; métricas/agregações sem varrer a tabela transacional inteira |

## 7. Operação, entrega e ambientes

Separar ambientes de desenvolvimento, homologação e produção; dados reais não devem ser copiados para ambientes inferiores sem anonimização. Pipeline recomendado: lint/type-check, testes unitários e de integração, análise de dependências/segredos, testes de contrato, build imutável e implantação gradual com rollback. Migrações devem ser versionadas, reversíveis quando viável e compatíveis durante rollout. Configuração por ambiente, sem segredos em HTML, JavaScript distribuído ou repositório.

## 8. Estratégia de qualidade

- Unitários: validação de formulário e regras, matriz de transições, cálculo de SLA, autorização.
- Integração: persistência/transações, outbox, upload, busca de conhecimento e notificações.
- API/contrato: payloads, erros, paginação, concorrência e idempotência.
- E2E: login, criação, atualização, visibilidade por papel, publicação de documento e transferência da assistente.
- Segurança: tentativa de acesso cruzado a condomínio/unidade, XSS, upload malicioso, exposição de logs e controles contra prompt injection.
- Desempenho: carga representativa para fila, dashboard e consulta/indexação de documentos.

## 9. Riscos e limitações do protótipo

O demo não valida dados, não possui controle de acesso, não salva configuração/base/conversas/OS, não implementa relatório, não garante consistência de contadores, não possui tratamento de erro, paginação, acessibilidade completa, telemetria ou testes. O tamanho do documento decorre principalmente de conteúdo de imagem embutido, desfavorável a cache e manutenção. Antes de produção, substituir a lógica de demonstração por serviços reais; não promover o arquivo atual como arquitetura pronta.
