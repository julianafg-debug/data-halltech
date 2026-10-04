# Registro de Decisões Arquiteturais — Central Hall

**Versão:** 1.0 · **Data:** 03/10/2026 · **Status:** decisões propostas; aprovação pendente

Use este registro como fonte única para escolhas que afetam produto, arquitetura, custo ou segurança. Aprovação deve incluir responsável, data, evidência e versão. Valores inferidos do protótipo não são decisões.

## ADR-001 — Cliente inicial responsivo/PWA

- **Status:** Proposto, precisa de aprovação de Produto.
- **Contexto:** moradores precisam acessar em Android e iPhone; protótipo é HTML desktop/responsivo básico e não há requisito confirmado de publicação em loja.
- **Decisão proposta:** entregar primeiro PWA mobile-first instalável quando suportado e utilizável no navegador; manter console web para central. Prover mesma API para cliente nativo futuro.
- **Consequências:** menor barreira/custo inicial; experiência de instalação, push, background e offline varia por OS/navegador. Testar em aparelhos reais; não prometer recursos nativos sem validação.
- **Alternativa:** aplicativo React Native iOS/Android desde o MVP se lojas, push/background confiável ou recursos nativos forem mandatórios.
- **Gate:** decisão de produto antes do planejamento da experiência móvel.

## ADR-002 — Backend modular monolítico no MVP

- **Status:** Proposto.
- **Contexto:** domínio inclui OS, SLA, administração, conhecimento, relatórios e integrações; escala e tamanho de equipes não foram fornecidos.
- **Decisão proposta:** um backend modular, com limites de domínio e adaptadores para banco/fila/IdP/IA; separar workers assíncronos, não decompor inicialmente em microserviços.
- **Consequências:** implantação/observabilidade mais simples; módulos devem manter dependências explícitas para permitir extração se houver motivação mensurável.
- **Alternativa:** microserviços por domínio desde o início, com custo de rede, consistência distribuída e operação superior.

## ADR-003 — API REST versionada e contrato OpenAPI

- **Status:** Proposto.
- **Contexto:** clientes web e potencial nativo devem reutilizar backend e contratos.
- **Decisão proposta:** REST HTTPS em `/v1`, OpenAPI como contrato, paginação por cursor, erros padronizados, idempotência para escrita relevante e concorrência otimista para atualização.
- **Consequências:** contrato testável e interoperável; definir autenticação e compatibilidade antes de publicar.
- **Alternativa:** GraphQL se houver requisito confirmado de composição flexível entre clientes; não necessário para o MVP conhecido.

## ADR-004 — PostgreSQL relacional como fonte transacional

- **Status:** Proposto; confirmar padrão organizacional e serviço gerenciado aprovado.
- **Contexto:** relações e integridade entre condomínio, unidade, usuário, OS, histórico e SLA.
- **Decisão proposta:** PostgreSQL ou equivalente relacional como fonte de verdade; armazenamento de objetos para binários e outbox para publicação assíncrona.
- **Consequências:** transações e integridade fortes; política de isolamento tenant, migrações, backup e escala devem ser implementadas e testadas.
- **Alternativa:** outro SGBD relacional gerenciado se exigido pela plataforma institucional.

## ADR-005 — Isolamento lógico multi-tenant em todos os componentes

- **Status:** Obrigatório como princípio; desenho detalhado pendente.
- **Contexto:** aplicação atende condomínios distintos e dados incluem chamados, documentos, conversas e anexos.
- **Decisão proposta:** cada recurso carrega escopo do condomínio; autorização server-side em cada request; tenant aplicado em índices, arquivos, filas, caches, busca e logs; RLS pode atuar em defesa adicional.
- **Consequências:** requer testes negativos cruzados e monitoramento; não basta confiar em tenant enviado pelo cliente.

## ADR-006 — IA consultiva, isolada e com abstenção

- **Status:** Obrigatório como requisito; fornecedor/modelo pendente.
- **Contexto:** o protótipo oferece assistente, mas suas respostas são fixas. Conteúdo deve ser aprovado e específico do condomínio.
- **Decisão proposta:** Retrieval-Augmented Generation atrás de adaptador; somente fontes publicadas/vigentes e escopo verificado; referência de fonte, resposta de incerteza e encaminhamento; IA não executa operações privilegiadas.
- **Consequências:** avaliar vazamento, prompt injection, precisão, vieses, custos, retenção de prompts e residência antes de selecionar provedor.

## ADR-007 — Infraestrutura de nuvem e região

- **Status:** Pendente.
- **Decisão requerida:** provedor/região, residência e transferência internacional, serviços gerenciados permitidos, estratégia de rede, WAF/CDN, HA e chaves.
- **Responsáveis sugeridos:** arquitetura/infraestrutura, segurança, privacidade e compras.
- **Bloqueio:** não escolher serviço específico nem estimar custo/HA antes de volume, orçamento e políticas.

## ADR-008 — Requisitos móveis de notificação/lojas/offline

- **Status:** Pendente.
- **Decisão requerida:** confirmar se instalação PWA é suficiente; se há exigência de Google Play/App Store, push garantido, background sync, upload em background, biometria ou offline.
- **Consequência:** decisão pode exigir cliente nativo, planejamento de contas de loja, assinatura, QA por dispositivo e suporte à versão.

## ADR-009 — Segurança de sessão e identidade

- **Status:** Pendente de decisão institucional.
- **Decisão requerida:** IdP OIDC, MFA, políticas de login/recuperação, sessão web (cookie seguro/BFF versus tokens), integração nativa e ciclo de revogação.
- **Bloqueio:** implementar autorização sem selecionar fluxo de identidade seguro não é aceitável.

## ADR-010 — RPO/RTO, disponibilidade e retenção

- **Status:** Pendente de aprovação do negócio.
- **Decisão requerida:** SLO/SLA, janela de manutenção, RPO, RTO, backup, retenção e descarte por classe de dados.
- **Bloqueio:** dimensionamento de redundância, custo e runbook de recuperação.

## Template para novas decisões

```text
ADR-NNN — título
Status: Proposto | Aprovado | Rejeitado | Substituído
Data / responsável:
Contexto:
Decisão:
Alternativas consideradas:
Consequências (positivas, negativas e riscos):
Requisitos/documentos relacionados:
Evidência e aprovação:
```
