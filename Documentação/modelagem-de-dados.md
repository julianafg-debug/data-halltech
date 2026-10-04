# Modelagem de Dados — Central Hall

**Versão:** 1.0 · **Data:** 03/10/2026  
**Abordagem:** modelo relacional lógico proposto para produção  
**Fonte:** entidades e fluxos visíveis em `Hall_Central_App_Demo.html`

## 1. Contexto e premissas

O demo apresenta condomínio, usuário/unidade, categorias, chamados, estados, SLAs, indicadores, conhecimento, conversas e parâmetros, mas mantém tudo em texto estático/DOM. Não existe esquema persistente no arquivo. Este modelo estabelece uma base normalizada para uma aplicação multi-condomínio; é proposta a validar, não descrição de um banco existente.

Princípios:

- UUID ou chave substituta interna para relações; identificador humano da OS separado.
- Isolamento multi-tenant obrigatório por `condominium_id`, com validação na aplicação e defesa no banco quando suportado.
- Integridade relacional, domínios controlados, histórico append-only e política de retenção explícita.
- Armazenar instantes em UTC; manter fuso horário IANA do condomínio para apresentação e cálculo.
- Minimizar PII. Conteúdo de descrição, mensagem, anexos e conversas pode conter dados pessoais.
- Métricas são consultas/agregações sobre eventos e OS, não valores digitados como os do protótipo.

## 2. Modelo conceitual

```text
Condominium 1 ── * Unit
Condominium 1 ── * Membership * ── 1 User
Condominium 1 ── * ServiceRequest * ── 1 User (solicitante)
Unit 0..1 ── * ServiceRequest
Category 1 ── * ServiceRequest
ServiceRequest 1 ── * RequestEvent / Assignment / Attachment / SLA instance
Condominium 1 ── * SlaPolicy (versões)
Condominium 1 ── * KnowledgeDocument 1 ── * KnowledgeChunk
Condominium 1 ── * Conversation 1 ── * Message * ── * KnowledgeDocument (citações)
User 0..1 ── * AuditEvent; Condominium 1 ── * AuditEvent
```

## 3. Entidades e atributos

Tipos são lógicos, ajustáveis ao SGBD. `UUID`, `TEXT`, `VARCHAR(n)`, `BOOLEAN`, `INTEGER`, `TIMESTAMPTZ`, `JSONB`, `NUMERIC(p,s)` e `BYTEA` são notação SQL genérica/PostgreSQL.

### 3.1 Organização e identidade

**`condominiums`**

| Campo | Tipo | Restrições / finalidade |
|---|---|---|
| `id` | UUID | PK |
| `name` | VARCHAR(200) | NOT NULL |
| `os_prefix` | VARCHAR(12) | NOT NULL; alfanumérico validado |
| `timezone` | VARCHAR(64) | NOT NULL; identificador IANA |
| `status` | VARCHAR(20) | NOT NULL; `active`, `suspended`, `closed` |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL |

**`users`**

| Campo | Tipo | Restrições / finalidade |
|---|---|---|
| `id` | UUID | PK |
| `identity_subject` | VARCHAR(255) | NOT NULL UNIQUE; subject do provedor de identidade, sem armazenar segredo |
| `display_name` | VARCHAR(200) | NOT NULL |
| `email` | VARCHAR(320) | NULLABLE conforme política; proteção de acesso |
| `status` | VARCHAR(20) | NOT NULL; ativo/inativo/bloqueado |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL |

**`memberships`** — vínculo de usuário ao condomínio e papel.

`id UUID PK`; `condominium_id UUID FK`; `user_id UUID FK`; `role VARCHAR(30)` (morador, operador, gestor, administrador); `valid_from TIMESTAMPTZ`; `valid_to TIMESTAMPTZ NULL`; `created_at TIMESTAMPTZ`. `UNIQUE(condominium_id,user_id,role,valid_from)`. Índice por `(user_id, condominium_id, valid_to)`. Administrador global deve ser tratado por privilégio explícito, não implicado em todo condomínio.

**`units`**

`id UUID PK`; `condominium_id UUID FK`; `label VARCHAR(120)`; `unit_type VARCHAR(30)` (residencial, garagem, área comum, outro); `active BOOLEAN`; `created_at`, `updated_at TIMESTAMPTZ`. `UNIQUE(condominium_id,label)` enquanto ativo conforme política. Localizações físicas mais detalhadas podem ser normalizadas posteriormente em `locations`, sem assumir que todo chamado pertence a uma unidade.

**`membership_units`** (quando o morador pode ter múltiplas unidades)

`membership_id UUID FK`; `unit_id UUID FK`; `valid_from TIMESTAMPTZ`; `valid_to TIMESTAMPTZ NULL`; PK composta `(membership_id,unit_id,valid_from)`. Restrição/serviço deve assegurar que membership e unidade pertencem ao mesmo condomínio.

### 3.2 Solicitações, classificação e operação

**`categories`**

`id UUID PK`; `condominium_id UUID FK NULL` (NULL indica catálogo global se adotado); `code VARCHAR(40)`; `name VARCHAR(100)`; `active BOOLEAN`; `sort_order INTEGER`; `created_at`, `updated_at TIMESTAMPTZ`. Unicidade por escopo e código. Exemplos demonstrativos: manutenção, segurança e áreas comuns. Catálogo versionável se desativação não puder alterar relatórios antigos.

**`service_requests`**

| Campo | Tipo | Restrições / finalidade |
|---|---|---|
| `id` | UUID | PK técnica |
| `condominium_id` | UUID | FK NOT NULL; chave de escopo |
| `public_number` | VARCHAR(32) | NOT NULL; identificador apresentado |
| `requester_user_id` | UUID | FK `users`, NOT NULL |
| `unit_id` | UUID | FK `units`, NULL para local compartilhado se permitido |
| `location_label` | VARCHAR(200) | NULL; cópia/descrição do local no momento do pedido |
| `category_id` | UUID | FK `categories`, NOT NULL |
| `subject` | VARCHAR(200) | NOT NULL |
| `description` | TEXT | NOT NULL; limite máximo definido na API |
| `status` | VARCHAR(30) | NOT NULL; estado corrente controlado |
| `priority` | VARCHAR(20) | NOT NULL; valor controlado |
| `source` | VARCHAR(20) | NOT NULL; portal, central, assistente, integração |
| `created_at`, `updated_at` | TIMESTAMPTZ | NOT NULL |
| `first_response_at` | TIMESTAMPTZ | NULL; marco usado em métricas |
| `resolved_at`, `closed_at` | TIMESTAMPTZ | NULL |
| `version` | INTEGER | NOT NULL; concorrência otimista |
| `deleted_at` | TIMESTAMPTZ | NULL; somente se política exigir soft-delete |

Chaves/constraints: `PK(id)`; `UNIQUE(condominium_id, public_number)`; FK composta ou validação transacional garante categoria e unidade no mesmo condomínio; `CHECK` para estado/prioridade/source. Não apagar registro operacional em cascata de usuário/unidade. PII deve ser anonimizada conforme política, mantendo dados mínimos para auditoria legal.

**`request_events`** — log de negócio append-only.

`id UUID PK`; `condominium_id UUID FK`; `service_request_id UUID FK`; `actor_user_id UUID FK NULL` (NULL para serviço); `event_type VARCHAR(40)`; `from_status VARCHAR(30) NULL`; `to_status VARCHAR(30) NULL`; `reason TEXT NULL`; `public_note TEXT NULL`; `private_note TEXT NULL` (acesso restrito); `occurred_at TIMESTAMPTZ`; `correlation_id UUID NULL`. Cada evento pertence ao mesmo condomínio que a OS. Índice `(service_request_id, occurred_at, id)`. Não editar eventos depois de confirmados; correção é evento compensatório.

**`assignments`**

`id UUID PK`; `condominium_id UUID FK`; `service_request_id UUID FK`; `assignee_user_id UUID FK NULL`; `team_code VARCHAR(80) NULL`; `assigned_by_user_id UUID FK`; `assigned_at TIMESTAMPTZ`; `ended_at TIMESTAMPTZ NULL`; `reason TEXT NULL`. Índices por OS e por responsável/status temporal. Apenas uma atribuição corrente por OS, caso essa seja a regra operacional aprovada.

### 3.3 SLA e configurações

**`sla_policies`**

`id UUID PK`; `condominium_id UUID FK`; `version INTEGER`; `name VARCHAR(100)`; `first_response_minutes INTEGER`; `resolution_minutes INTEGER`; `calendar_id UUID NULL`; `effective_from TIMESTAMPTZ`; `effective_to TIMESTAMPTZ NULL`; `active BOOLEAN`; `created_by_user_id UUID FK`; `created_at TIMESTAMPTZ`. `UNIQUE(condominium_id,version)`; valores positivos; vigências não sobrepostas por condomínio conforme política. A opção visual “4/8/24 horas” não especifica se hora corrido/útil, qual etapa mede ou se são alvos alternativos.

**`request_sla_instances`**

`id UUID PK`; `condominium_id UUID FK`; `service_request_id UUID FK`; `sla_policy_id UUID FK`; `metric_type VARCHAR(30)` (first_response, resolution); `started_at TIMESTAMPTZ`; `due_at TIMESTAMPTZ`; `paused_at TIMESTAMPTZ NULL`; `completed_at TIMESTAMPTZ NULL`; `breached_at TIMESTAMPTZ NULL`; `elapsed_business_minutes INTEGER NULL`. Um registro por OS e métrica/política aplicável. Política é snapshot/referência versionada para reproduzir medição histórica.

**`condominium_settings`** (alternativa enxuta a colunas de configuração)

`id UUID PK`; `condominium_id UUID FK`; `key VARCHAR(100)`; `value JSONB`; `version INTEGER`; `effective_from TIMESTAMPTZ`; `effective_to TIMESTAMPTZ NULL`; `updated_by_user_id UUID FK`; `updated_at TIMESTAMPTZ`. Usar apenas para parâmetros realmente dinâmicos, com schema/validação por chave; dados relacionais essenciais não devem ser escondidos em JSON. Configuração atual do demo: nome, prefixo e seleção de SLA.

### 3.4 Conhecimento e assistente

**`knowledge_documents`**

`id UUID PK`; `condominium_id UUID FK`; `title VARCHAR(300)`; `source_uri TEXT NULL`; `storage_object_key TEXT NULL`; `version INTEGER`; `status VARCHAR(20)` (draft, review, published, retired, failed); `effective_from TIMESTAMPTZ NULL`; `effective_to TIMESTAMPTZ NULL`; `checksum VARCHAR(128) NULL`; `created_by_user_id UUID FK`; `approved_by_user_id UUID FK NULL`; `created_at`, `published_at`, `updated_at TIMESTAMPTZ`. Índices por condomínio/status/vigência. `UNIQUE(condominium_id,title,version)` ou ID externo de fonte. Segredos/URLs assinadas não persistir em claro.

**`knowledge_chunks`**

`id UUID PK`; `document_id UUID FK`; `condominium_id UUID FK`; `chunk_index INTEGER`; `content TEXT`; `embedding VECTOR` ou referência ao índice externo; `metadata JSONB`; `created_at TIMESTAMPTZ`. `UNIQUE(document_id,chunk_index)`. Filtro de tenant/status/vigência aplicado antes da recuperação. Se embeddings estiverem em serviço externo, replicar controle de escopo e processo de exclusão/retirada.

**`conversations`**

`id UUID PK`; `condominium_id UUID FK`; `user_id UUID FK`; `unit_id UUID FK NULL`; `status VARCHAR(20)` (active, handed_off, closed); `started_at TIMESTAMPTZ`; `ended_at TIMESTAMPTZ NULL`; `consent_recorded_at TIMESTAMPTZ NULL`; `retention_until TIMESTAMPTZ NULL`; `service_request_id UUID FK NULL`. Definir política de minimização e retenção para conversa.

**`messages`**

`id UUID PK`; `conversation_id UUID FK`; `speaker VARCHAR(20)` (user, assistant, operator, system); `body TEXT`; `created_at TIMESTAMPTZ`; `model_id VARCHAR(120) NULL`; `safety_status VARCHAR(30) NULL`; `correlation_id UUID NULL`. Índice `(conversation_id,created_at,id)`. Não incluir chain-of-thought; registrar somente evidências e metadados aprovados.

**`message_sources`**

`message_id UUID FK`; `knowledge_document_id UUID FK`; `document_version INTEGER`; `chunk_id UUID FK NULL`; `relevance_score NUMERIC(6,5) NULL`; PK composta `(message_id,knowledge_document_id,document_version,chunk_id)`. Preserva referências usadas na resposta; acesso filtrado por condomínio.

### 3.5 Arquivos, notificações e auditoria

**`attachments`**

`id UUID PK`; `condominium_id UUID FK`; `service_request_id UUID FK NULL`; `knowledge_document_id UUID FK NULL`; `uploaded_by_user_id UUID FK`; `object_key TEXT`; `original_filename VARCHAR(255)` (sanitizado); `media_type VARCHAR(120)`; `size_bytes BIGINT`; `checksum VARCHAR(128)`; `scan_status VARCHAR(20)`; `created_at TIMESTAMPTZ`; `retention_until TIMESTAMPTZ NULL`. Exatamente um alvo principal ou relação de junção explícita; validar tamanho, MIME real, malware e acesso.

**`notifications`**

`id UUID PK`; `condominium_id UUID FK`; `user_id UUID FK`; `service_request_id UUID FK NULL`; `channel VARCHAR(20)`; `template_code VARCHAR(80)`; `status VARCHAR(20)`; `created_at TIMESTAMPTZ`; `sent_at TIMESTAMPTZ NULL`; `provider_reference VARCHAR(200) NULL`; `attempt_count INTEGER`. Conteúdo sensível mínimo e políticas contra duplicidade.

**`audit_events`**

`id UUID PK`; `condominium_id UUID FK NULL`; `actor_user_id UUID FK NULL`; `action VARCHAR(100)`; `resource_type VARCHAR(80)`; `resource_id UUID NULL`; `occurred_at TIMESTAMPTZ`; `correlation_id UUID NULL`; `ip_hash VARCHAR(128) NULL` (se aprovado); `changes JSONB NULL` com allowlist de campos e sem segredo; `outcome VARCHAR(20)`. Retenção e acesso restritos; append-only.

## 4. Relacionamentos e cardinalidades

- Um condomínio possui zero ou muitas unidades, memberships, OS, políticas, documentos e conversas.
- Um usuário pode ter memberships em vários condomínios e uma membership pode conceder acesso a uma ou várias unidades via `membership_units`.
- Cada OS tem um solicitante, condomínio, categoria e histórico; pode não ter unidade física para ocorrência em área comum.
- Cada OS possui um ou mais eventos (criação e transições); pode ter zero ou várias atribuições, SLA instances e anexos.
- Cada documento possui uma ou várias partes indexadas após ingestão; uma resposta pode citar zero ou várias fontes aprovadas.
- Uma conversa contém mensagens ordenadas e pode originar uma OS, sem tornar a conversa substituta do registro operacional.

## 5. Índices e consultas

Índices mínimos:

- `service_requests(condominium_id, status, created_at DESC, id)` para fila e paginação.
- `service_requests(requester_user_id, created_at DESC, id)` para visão do morador, sempre combinada com autorização.
- `service_requests(condominium_id, public_number)` UNIQUE.
- `request_events(service_request_id, occurred_at, id)` para histórico.
- `assignments(condominium_id, assignee_user_id, ended_at)` para fila atribuída.
- `knowledge_documents(condominium_id, status, effective_from, effective_to)` e índices compatíveis com busca semântica filtrada.
- `memberships(user_id, condominium_id, valid_to)` e `membership_units(unit_id, membership_id)`.

Use paginação por cursor para fila volumosa. Evite índice indiscriminado em texto livre/PII. Agregações de dashboards podem usar materialized views ou tabelas de métricas reconstruíveis; cada métrica deve registrar período e regra de cálculo.

## 6. Integridade, concorrência e exclusão

- Criar OS, evento inicial, SLA e outbox na mesma transação lógica.
- Implementar `version`/ETag ou `updated_at` para evitar sobrescrita concorrente; recusar versão antiga com conflito explícito.
- Imposição de chaves únicas no banco para identificador de OS e idempotência; tratar colisão com retry seguro.
- FKs não devem apagar cascata OS/histórico/auditoria quando usuário, categoria ou unidade for desativado.
- Retirada de documento invalida indexação e cache no mesmo escopo; registrar conclusão/erro do reindexador.
- Aplicar anonimização/expurgo conforme finalidade e retenção aprovada; manter apenas registros legalmente necessários e não reidentificáveis quando possível.
- Se SGBD suportar row-level security, utilizá-la como defesa em profundidade, sem substituir autorização da aplicação.

## 7. Segurança e privacidade dos dados

Classificação sugerida: dados cadastrais e chamados como confidenciais; conteúdo de anexos/conversas potencialmente sensível. Restringir acesso a descrições privadas, documentos, logs e exportações. Criptografia, gestão de chaves, expurgo de índices, backup, auditabilidade e atendimento a titulares são requisitos de desenho. Não armazenar tokens de autenticação, senhas em texto claro, prompts internos secretos ou credenciais em campos genéricos.

## 8. Mapeamento do protótipo ao modelo

| Elemento observado | Destino lógico |
|---|---|
| “Residencial Parque Firenze”, prefixo FIR | `condominiums` |
| Juliana e localização Cj.03/Torre B/1704 | `users`, `memberships`, `units` |
| OS FIR-01842, assunto, status e local | `service_requests` |
| Manutenção, Segurança, Áreas comuns | `categories` |
| Chamados abertos, primeira resposta, SLA, satisfação | projeções de `service_requests`, `request_events`, `request_sla_instances` e feedback a definir |
| Texto “mudanças”/“obra” | `knowledge_documents` e `knowledge_chunks` |
| Mensagens da assistente | `conversations`, `messages`, `message_sources` |
| Nome, prefixo e SLA configurável | `condominiums`, `sla_policies` e/ou `condominium_settings` |
| Linha de fila e transições futuras | `service_requests`, `assignments`, `request_events` |

## 9. Questões de implementação

Confirmar se catálogo é global ou por condomínio; cardinalidade de usuários/unidades; locais de área comum; escopo global de número público; papéis, calendário e estado de SLA; necessidade de feedback explícito para satisfação; origem/ciclo de revisão de documentos; política de retenção e anexos; banco vetorial e estratégia de isolamento. A decisão pelo modelo vetorial, SGBD e estratégia de particionamento depende de volume e arquitetura escolhida.
