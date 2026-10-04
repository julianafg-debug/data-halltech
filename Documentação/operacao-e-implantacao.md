# Operação e Implantação — Central Hall

**Versão:** 1.0 · **Data:** 03/10/2026 · **Status:** orientação de prontidão; adaptar ao provedor escolhido

## 1. Escopo e princípio

Descrever como preparar ambientes, publicar versões, observar serviços e recuperar dados. O provedor de nuvem, região, IdP, fila, IA e observabilidade ainda não estão escolhidos; não se incluem comandos ou configurações específicos que poderiam induzir uma implantação insegura.

## 2. Ambientes e segregação

Manter desenvolvimento, homologação e produção separados em credenciais, rede, identidade, banco, storage, filas, chaves e provedor IA quando possível. Dados de produção não são copiados para ambientes inferiores sem anonimização aprovada. Homologação usa identidades/documentos de teste e integrações sandbox. Acesso a produção é individual, de menor privilégio, temporário quando possível e auditado.

## 3. Pipeline de entrega

1. Pull request executa lint, verificação de tipos, unitários, integração, contrato, análise de dependência/segredo e build.
2. Artefato imutável é versionado por commit; configuração e segredos são injetados em runtime via mecanismo aprovado.
3. Migrações têm revisão, backup quando necessário, compatibilidade backward/forward durante rollout e plano de recuperação.
4. Deploy em homologação executa smoke, E2E, autorização multi-tenant e revisão de acessibilidade; negócio aprova fluxo.
5. Produção usa rollout gradual/canário se suportado, health checks e monitoramento; migrações aditivas precedem remoções.
6. Rollback deve ser exercitado; mudanças irreversíveis de dados exigem plano de correção/restauração, não apenas rollback de binário.

## 4. Observabilidade e alertas

Monitorar por serviço e tenant sem expor PII: disponibilidade, latência p50/p95/p99, erros, saturação de DB/pool, backlog/idade de fila, falhas de notificação, ingestão/indexação, taxa de abstenção/erro da assistente e custo de provedores. Correlacionar browser → API → banco/fila/worker por correlation/trace ID. Alertar por impacto e runbook; evitar alerta baseado em conteúdo de mensagem.

Logs: estruturados, acesso restrito, redaction por padrão, retenção aprovada, relógios sincronizados e sem tokens, descrições, prompt/conversa ou anexos. Auditoria de domínio fica separada de logs operacionais, com integridade e acesso controlados.

## 5. Backup e recuperação

- Aprovar formalmente RPO, RTO, retenção e escopo (banco, objetos, configuração, chaves e metadados de índice).
- Backups cifrados, segregados da conta de produção, com controle de acesso e teste periódico de restauração.
- Definir se índice semântico é reconstruível e como verificar versão/checksum dos documentos após recuperação.
- Restaurar banco e objetos em ambiente isolado; conferir contagens, referências, eventos e funcionamento da aplicação antes de reabrir tráfego.
- Documentar decisões de failover, perda de região, dependência de IdP/IA e comunicação aos usuários.

## 6. Incidentes e suporte

Criar runbooks específicos após escolha do provedor para: indisponibilidade da API, fila parada, storage/DB, vazamento potencial, acesso indevido, provedor IA, notificação, documento malicioso e degradação mobile. Cada runbook precisa de sinais, triagem, contenção, comunicação/escalonamento, recuperação, evidência/auditoria e retrospectiva. Definir papéis on-call, contatos, janela de suporte, gravidade e obrigação de notificação com Segurança/Privacidade/Jurídico.

## 7. SLO e capacidade

Usar inicialmente disponibilidade ≥99,5% mensal e p95 consulta ≤2 s/criação ≤3 s como hipóteses existentes, não compromisso comercial. Definir janela, período de medição, amostra, exclusões, componentes cobertos e error budget. Perfil de carga deve incluir picos de abertura, fila por condomínio, exportações e indexação. Recalibrar custos e capacidade com medição em homologação/piloto.

## 8. Mudanças de esquema e conteúdo

Migrações DB versionadas e revisadas; preferir expand/contract para compatibilidade. Conteúdo de conhecimento tem workflow/versionamento separado de deploy da aplicação. Atualização de prompt/modelo, índice ou política da assistente exige registro de versão, avaliação de regressão, aprovação e plano de rollback. Alteração de SLA deve respeitar vigência e registros históricos.

## 9. Checklist antes de produção

- Aprovação das decisões pendentes P0 e responsáveis de suporte.
- Domínio/DNS/TLS/WAF, proteção de origem e headers validados.
- IdP, MFA para papéis privilegiados, sessão e revogação testados.
- Banco/objetos/fila privados, criptografia e políticas de acesso mínimos.
- Migrações, backup, restauração, RPO/RTO e rollback comprovados.
- Testes multi-tenant, acessibilidade, mobile e segurança aprovados.
- Alertas, dashboards, auditoria, redaction e runbooks ativos.
- Política de privacidade, retenção, canais de suporte e comunicação aprovados.
- Piloto e critérios para interromper/expandir definidos.

## 10. Decisões operacionais pendentes

Provedor/região; topologia HA; RPO/RTO; SLO/SLA final; horários/on-call; retenção de logs e backup; ferramentas; contatos; política de incidentes; limites de carga e procedimento de manutenção. Completar runbooks específicos após decisão de plataforma.
