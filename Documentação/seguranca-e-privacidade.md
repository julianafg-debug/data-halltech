# Segurança, Privacidade e Modelo de Ameaças — Central Hall

**Versão:** 1.0 · **Data:** 03/10/2026 · **Status:** baseline para revisão por Segurança e Privacidade

## 1. Objetivo e limites

Identificar riscos previsíveis para uma plataforma multi-condomínio com dados pessoais, solicitações operacionais, arquivos, notificações e assistente generativa; orientar controles e testes antes do piloto. Não é parecer jurídico nem certificação de conformidade. O controlador, encarregado e assessoria jurídica devem definir finalidades, bases legais, retenção, direitos, contratos e necessidade de relatório de impacto.

## 2. Ativos e fronteiras de confiança

Ativos: identidade, vínculos de morador/unidade, descrições e histórico de OS, notas internas, anexos, conversas, documentos de condomínio, configurações/SLA, exportações, credenciais e logs. Fronteiras: browser/app ↔ API; aplicação ↔ banco/storage/fila; worker ↔ provedor IA/notificação; usuário de um condomínio ↔ dados de outro; documento não confiável ↔ retrieval/LLM; operador ↔ informações privadas.

## 3. Modelo de ameaças (STRIDE resumido)

| Ameaça | Cenário | Controles obrigatórios | Evidência de teste |
|---|---|---|---|
| Spoofing | Conta comprometida assume usuário/operador | OIDC, MFA por risco, proteção e revogação de sessão, controles de recuperação | testes de sessão expirada/revogada e abuso de login |
| Tampering | Morador altera status, tenant, unidade ou prioridade no request | validação server-side, RBAC/ABAC, máquina de estados, versão otimista e auditoria | mutações forjadas rejeitadas |
| Repudiation | Usuário nega alteração ou publicação | audit trail append-only, ator, timestamp, correlation ID e autorização | rastreio de OS/configuração/publicação |
| Information disclosure | IDOR/BOLA cruza tenant; arquivo ou resposta IA expõe dado | checagem por objeto/tenant, storage privado, cache isolado, retrieval filtrado | suíte negativa A/B entre dois condomínios |
| Denial of service | Upload, busca, login, relatório ou IA consome recursos | rate limits, quotas, tamanho máximo, timeout, concorrência e circuit breaker | teste de carga/limites |
| Elevation of privilege | Morador chama função de gestor ou prompt manipula IA | menor privilégio, autorização por operação, escopo de ferramentas, aprovação humana | matriz papel×operação e teste adversarial |
| XSS/injeção | Descrição/conversa/documento vira HTML/script ou consulta | escape contextual, CSP, consultas parametrizadas, parser seguro e sanitização | payloads de XSS/injeção em campos/arquivos |
| SSRF/malware | URL/documento malicioso acessa rede ou executa conteúdo | upload por stream controlado, allowlist, verificação MIME/malware, isolamento de parser, sem fetch arbitrário | arquivo de teste e URLs privadas bloqueadas |
| Prompt injection/vazamento | Instrução em documento induz revelar outra unidade ou executar ação | retrieval tenant-scoped, fontes aprovadas, delimitação de dados, sem ferramenta privilegiada, abstenção | corpus adversarial e verificação de não vazamento |
| Exposição em logs/exportação | PII, tokens ou nota interna aparece em telemetria/arquivo | minimização, redaction, escopo, validade curta, auditoria e controle de acesso | revisão de logs e exportações de amostra |

## 4. Controles por camada

### Identidade e autorização

- Selecionar IdP OIDC aprovado; MFA e autenticação forte para papéis privilegiados.
- Sessões e tokens com expiração, armazenamento seguro, rotação/revogação e proteção contra CSRF conforme implementação.
- Resolver papel, tenant e membership no servidor; validar autorização em cada endpoint e ação, não apenas ao listar menu.
- Separar notas públicas/privadas, ações administrativas e exportações. Acesso excepcional deve ter justificativa/auditoria.
- Definir provisionamento/desprovisionamento rápido de morador, funcionário e fornecedor; permissões são temporais e revisáveis.

### Aplicação, API e infraestrutura

- TLS, cabeçalhos/CSP, CORS restrito, limites de payload e frequência, validação de esquema e queries parametrizadas.
- Segredos em cofre, criptografia gerenciada em repouso, rotação e segregação de ambientes/contas.
- Banco: menor privilégio, conexão cifrada, backups protegidos, tenant validation em consulta e RLS se disponível como defesa adicional.
- Objetos: bucket privado, chaves não previsíveis, URL assinada curta, varredura antes de leitura/ingestão e retenção/descarte.
- Fila: autenticação, criptografia, segregação, retries limitados, dead-letter com acesso restrito e payload minimizado.
- Dependências: revisão de vulnerabilidades/segredos, SBOM se padrão institucional, patches e pipeline protegido.

## 5. Privacidade e LGPD

Antes de dados reais, inventariar categorias (cadastro, vínculo residencial, relatos, imagem/anexo, conversas e logs), finalidade, necessidade, base legal, titulares, destinatários, operador/suboperadores, transferência internacional, retenção e descarte. Expor aviso de privacidade claro no ponto de coleta; coletar somente campos necessários; criar processo para direitos do titular e correção/eliminação/anonimização conforme obrigação aplicável. Revisar se relatos/anexos podem conter dados sensíveis e evitar solicitar tais dados sem necessidade. Definir resposta a incidentes e obrigações de notificação com responsável jurídico/encarregado.

Não copiar dados reais para ambientes inferiores sem anonimização. Logs devem omitir descrição, tokens, conteúdo de conversa e anexos por padrão. Relatórios/exportações precisam de finalidade, autorização, trilha, retenção curta e controles contra redistribuição indevida.

## 6. Requisitos especiais da IA

- Somente documentos aprovados e vigentes; versão e fonte devem ser rastreáveis.
- A autorização/tenant é determinada antes da busca e reforçada em cada fragmento devolvido.
- Documentos e mensagens são entradas não confiáveis; instruções neles contidas não podem sobrepor política do sistema.
- A assistente não acessa ferramentas que alterem OS, SLA ou configurações; handoff/criação exige fluxo explícito de API e confirmação.
- Respostas devem citar fonte quando aplicável, recusar certeza sem evidência e encaminhar ambiguidades; não revelar chain-of-thought.
- Definir retenção e uso de prompts pelo provedor, região, treinamento, suboperadores e desativação de uso de dados antes de contratar.
- Testar prompt injection, pergunta cruzada entre condomínios, documentos expirados, conflito de política, alucinação e tentativa de extrair PII.
- Medir qualidade em corpus aprovado por negócio; bloqueio/rollback do recurso se vazamento ou qualidade abaixo do limiar acordado.

## 7. Classificação inicial e tratamento

| Classe | Exemplos | Tratamento inicial proposto |
|---|---|---|
| Pública | material público aprovado | integridade, versão e fonte |
| Interna | categorias e procedimentos não pessoais | acesso por papel/tenant |
| Confidencial | cadastro, OS, unidade, notificações | acesso restrito, cifragem, minimização e retenção |
| Restrita | credenciais, anexos sensíveis, notas privadas, evidência de segurança | acesso mínimo, auditoria reforçada, armazenamento protegido e retenção definida |

A classificação deve ser aprovada e refinada pelo controlador/encarregado, não inferida pelo desenvolvedor.

## 8. Gates antes de produção

1. Threat modeling revisado por Segurança e responsáveis de produto.
2. Matriz de autorização executada, incluindo tentativas multi-tenant em API, arquivos, cache, fila e IA.
3. Revisão de dependências, configuração, secrets, CSP, TLS, storage e logs.
4. Testes DAST e, conforme risco/política, pentest independente e remediação de achados críticos/altos.
5. Política LGPD, aviso, base/finalidade, retenção, direitos e contratos de operadores aprovados.
6. Avaliação e testes da IA; processo de desligamento/handoff documentado.
7. Processo de incidente, backup/restore e contatos de escalonamento exercitados.

## 9. Pendências

IdP/MFA/sessão; dados pessoais e bases legais; classificação definitiva; retenção por entidade; região de cloud/IA; transferências/suboperadores; política de acesso de funcionários; método de upload; exigências de incidente; limiares e critérios de aprovação da assistente. Sem tais decisões, este documento é orientação e não autorização para processar dados reais.
