# Estratégia de Testes e Qualidade — Central Hall

**Versão:** 1.0 · **Data:** 03/10/2026 · **Status:** baseline proposto

## 1. Objetivo

Definir uma estratégia baseada em risco que verifique os requisitos funcionais, a arquitetura multi-tenant, experiência Android/iPhone, acessibilidade, segurança, integrações e operação. Testes do protótipo HTML não comprovam comportamento da solução-alvo.

## 2. Pirâmide e responsabilidades

| Nível | Escopo | Responsável primário |
|---|---|---|
| Unitário | regras de domínio, validação, máquina de estados, cálculo de SLA e filtros de tenant | Desenvolvimento |
| Integração | transações, repositórios, idempotência, outbox, storage e autorização | Desenvolvimento/QA |
| Contrato | OpenAPI, schemas, erros e compatibilidade de clientes | Backend + clientes |
| E2E | fluxos de morador, operador, gestor e assistente no ambiente integrado | QA + Produto |
| Segurança | abuso de permissão, XSS, upload, IA, dependências e configuração | Segurança + Engenharia |
| Acessibilidade/usabilidade | teclado, leitor de tela, reflow e validação com usuários | UX/QA |
| Desempenho/resiliência | latência, volume, falhas de provedor e recuperação | SRE/QA |

Priorizar muitos testes rápidos de unidade/integração e um conjunto menor, estável e representativo de E2E; não usar E2E como única evidência.

## 3. Matriz requisito × teste essencial

| Requisito/risco | Testes necessários |
|---|---|
| RF-001/002, RNF-001 | sessão ausente/expirada; papel insuficiente; tentativa de ler/alterar recurso, tenant ou unidade alheia; acesso após remoção de membership |
| RF-005–009 | campos obrigatórios/limites; criação persistida; falha antes/depois do commit; mesma idempotency key; concorrência; refresh/relogin |
| RF-010–013 | filtro/paginação da fila; transições válidas/inválidas; atribuição; histórico append-only; SLA com calendário, pausa, fuso e alteração de política |
| RF-014/015 | períodos/definições de métricas, denominadores, timezone, dados vazios, exportação autorizada e expirada |
| RF-016/017 | papel gestor, validação, versões, vigência, aprovação, falha de ingestão, retirada e invalidação de índice/cache |
| RF-018/019, RNF-013 | retrieval tenant-scoped, documento expirado, nenhuma fonte, fontes conflitantes, prompt injection, abstenção, handoff |
| RF-020/023/024 | consentimento/política, envio de notificação idempotente, redaction de logs, auditoria de ação/exportação |
| RNF-004/005 | teclado, VoiceOver, TalkBack, zoom/reflow, orientação, 320 CSS px, teclado virtual, foco e mensagens de erro |
| RNF-006/007/011 | carga acordada, monitoramento SLO, falha dependência, backup/restore e simulação de recuperação |

## 4. Casos E2E prioritários

1. **Morador abre OS:** autentica, seleciona unidade autorizada, cria, recebe número, atualiza lista, recarrega e encontra histórico; repetição de request não duplica.
2. **Morador sem acesso:** tenta trocar `unit_id`, `condominium_id` e identificador por valores de outro tenant; API não revela nem modifica registro.
3. **Operador trata OS:** filtra fila, atribui, altera estado permitido, adiciona nota pública; histórico e notificação refletem a transação.
4. **Conflito concorrente:** dois operadores atualizam mesma OS; a gravação obsoleta falha com estado atual e não apaga evento.
5. **Gestor publica conhecimento:** cria documento, validação/varredura/indexação, aprova e publica; versão retirada deixa de ser elegível.
6. **Assistente se abstém:** pergunta sem cobertura e pergunta adversarial; não fabrica regra nem recupera documento de outro condomínio; permite handoff.
7. **Uso móvel/acessível:** completa abertura e acompanhamento em Safari/iPhone e Chrome/Android; leitores de tela e teclado concluem fluxos.

## 5. Ambientes e dados de teste

- Ambientes separados e configuração não produtiva; mocks/stubs para provedores externos em unit/integration.
- Fixtures sintéticas com pelo menos dois condomínios, usuários/roles, unidade compartilhada e OS privadas para provar isolamento.
- Não usar dados pessoais reais nos testes, screenshots, logs ou fixtures; se exceção aprovada, anonimização irreversível e acesso controlado.
- Dados de IA são documentos aprovados sintéticos ou sanitizados, com testes conhecidos de fonte correta, ausência e ataque.
- Reset reprodutível por seed; limpeza não pode atingir produção.

## 6. Testes móveis, browser e acessibilidade

Automatizar E2E em browsers suportados no CI e manter smoke em aparelhos físicos para Safari/iOS e Chrome/Android. Validar viewport, safe area, teclado virtual, foco, upload se houver, sessão, PWA install/update e notificações apenas se aprovadas. Complementar automação com VoiceOver/TalkBack e auditoria humana; scanners automáticos não certificam WCAG.

## 7. Testes não funcionais

- **Performance:** acordar carga (usuários simultâneos, OS, bursts, tamanho de fila e relatório); medir p50/p95/p99, erros e saturação; comparar com metas RNF.
- **Resiliência:** timeout/indisponibilidade de IA, notificação, fila e storage; verificar degradação, retry limitado, idempotência e mensagens honestas.
- **Segurança:** autorização por objeto, XSS, injeção, upload, CSRF conforme sessão, rate limits, secrets, logs e análise de dependências.
- **Recuperação:** restaurar banco/objetos e validar consistência de OS, eventos, anexos e outbox dentro de RPO/RTO aprovados.
- **Compatibilidade:** matriz de SO/browser e versões mínimas aprovadas; registrar resultados por release.

## 8. Gates de CI e release

Pull request: format/lint/type-check, unitários, integração, contratos, análise de dependências/secretos, build e smoke. Release: E2E do fluxo principal, testes de migração, autorização multi-tenant, regressão acessível e checklist operacional. Produção: rollout gradual, health checks, observabilidade, rollback conhecido e responsável disponível.

## 9. Entrada, saída e defeitos

**Entrada:** critérios de aceite rastreáveis, ambiente, contratos e massa sintética reprodutível. **Saída:** sem defeitos críticos/altos abertos; todos Must com evidência; falhas conhecidas aceitas por responsável, com risco e prazo; métricas de regressão comparadas. Registrar defeito com requisito, severidade, reprodução, versão, evidência sanitizada e impacto; retestar correção e regressão adjacente.

## 10. Pendências de qualidade

Definir browsers/versões mínimas, carga representativa, limiares do assistente, cobertura alvo, disponibilidade, RPO/RTO, ferramentas corporativas e responsabilidade de aprovação. Metas numéricas devem ser aprovadas antes de servir como gate contratual.
