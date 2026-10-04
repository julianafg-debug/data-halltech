# Contrato Inicial de API — Central Hall

**Versão:** 1.0 · **Data:** 03/10/2026 · **Status:** rascunho não normativo; converter em OpenAPI 3.x antes da implementação

## 1. Propósito

Definir convenções que permitam PWA, console e eventual app nativo compartilhar serviços sem confiar em autorização implementada apenas no cliente. Este documento não substitui o contrato OpenAPI gerado/revisado e não fixa provedor de identidade, hospedagem ou formato de token.

## 2. Convenções comuns

- Base proposta: `/api/v1`; somente HTTPS.
- JSON UTF-8; datas ISO 8601/RFC 3339 em UTC; enumerações estáveis em `snake_case` ou `lower_snake_case` (aprovar uma convenção única antes do contrato OpenAPI).
- Identificador interno UUID; `public_number` humano não é chave técnica.
- Autenticação via OIDC segundo política aprovada; API deriva user/roles/tenant de identidade validada.
- Recurso de tenant deve ser autorizado no servidor para toda leitura e mutação; IDs fornecidos por cliente são seletor, nunca prova de permissão.
- Listas usam cursor, `limit` máximo documentado, ordem estável e filtros allowlist; não aceitar consultas arbitrárias.
- Escritas de criação aceitam `Idempotency-Key`; atualização concorrente usa `If-Match`/`ETag` ou campo `version`.
- Resposta de erro contém `type`, `code`, `message`, `correlation_id`, `field_errors` opcional; mensagem não expõe existência de recurso de outro tenant, stack trace ou dado sensível.
- `429` inclui política de retry quando aplicável; `401` para identidade ausente/inválida; `403`/`404` conforme política para acesso negado, evitando enumeração.

## 3. Recursos propostos

| Método e caminho | Finalidade | Acesso esperado |
|---|---|---|
| `GET /v1/me` | identidade, papéis e contextos disponíveis | usuário autenticado |
| `GET /v1/condominiums/{condominiumId}/units` | unidades que o usuário pode selecionar | membership válida |
| `GET /v1/condominiums/{condominiumId}/categories` | categorias ativas e permitidas | membership e contexto |
| `GET /v1/condominiums/{condominiumId}/service-requests` | lista paginada | morador: escopo próprio; operador: fila autorizada |
| `POST /v1/condominiums/{condominiumId}/service-requests` | criar OS | morador autorizado |
| `GET /v1/service-requests/{requestId}` | detalhe autorizado | solicitante autorizado ou papel operacional |
| `GET /v1/service-requests/{requestId}/events` | histórico/mensagens | autorização por recurso; separar notas públicas/privadas |
| `POST /v1/service-requests/{requestId}/transitions` | mudança de estado/atribuição | operador/gestor conforme transição |
| `GET /v1/condominiums/{condominiumId}/dashboard` | métricas com filtros definidos | papel operacional/gestor |
| `GET/PUT /v1/condominiums/{condominiumId}/settings` | parâmetros versionados | gestor autorizado |
| `POST /v1/condominiums/{condominiumId}/knowledge-documents` | registrar submissão/documento | editor autorizado |
| `POST /v1/knowledge-documents/{documentId}/publish` | publicação após revisão/indexação | aprovador autorizado |
| `POST /v1/condominiums/{condominiumId}/assistant/conversations` | iniciar conversa | morador autenticado |
| `POST /v1/conversations/{conversationId}/messages` | enviar mensagem e obter resposta/handoff | dono/contexto autorizado |

## 4. Esquemas de exemplo (conceituais)

### Criar solicitação

```json
{
  "unit_id": "uuid",
  "location_label": "Corredor / hall",
  "category_id": "uuid",
  "subject": "Vazamento / infiltração",
  "description": "Descrição fornecida pelo morador"
}
```

O servidor obtém `requester_user_id`, tenant autorizado, origem, identificador público, estado e timestamps. Cliente não escolhe status, SLA aplicado nem identidade do solicitante.

Resposta `201 Created` após commit:

```json
{
  "id": "uuid",
  "public_number": "FIR-01843",
  "status": "open",
  "created_at": "2026-10-03T20:00:00Z",
  "version": 1
}
```

### Erro de validação

```json
{
  "type": "validation_error",
  "code": "invalid_request",
  "message": "Revise os campos informados.",
  "correlation_id": "uuid",
  "field_errors": [
    {"field": "description", "code": "required", "message": "Informe a descrição."}
  ]
}
```

Exemplos são ilustrativos; estados, status HTTP finais, nomeação e campos devem coincidir com o domínio aprovado.

## 5. Requisitos de semântica

- A criação é transacional com evento inicial, instâncias de SLA e outbox. Timeout após commit é resolvido repetindo idempotency key ou consultando a OS.
- Transição inclui destino, motivo requerido, nota pública opcional e versão esperada; a API recusa mudanças fora da máquina de estados.
- Notas públicas e privadas são recursos/representações separadas e nunca dependem apenas de filtragem visual.
- Filtros de período especificam timezone/semântica e limite máximo. Métricas devolvem `period`, `generated_at` e definição ou identificador documentado.
- Upload usa fluxo de arquivo privado, limites explícitos e confirmação de varredura; não aceitar URL arbitrária para ingestão sem proteção contra SSRF.
- Assistente devolve referências elegíveis, estado de abstenção e encaminhamento; não devolver raciocínio interno ou documentos não autorizados.
- Exportação é assíncrona se grande, auditada, com escopo/filtros congelados, validade de download e expiração definida.

## 6. Segurança e versionamento

Aplicar limites de payload/frequência, proteção contra abuso e autorização por objeto. Não aceitar tenant derivado de body/header sem conferir membership. Versões compatíveis devem ser aditivas quando possível; mudanças breaking exigem nova versão e período de migração. Nunca logar corpo integral por padrão. Manter OpenAPI validado, exemplos, esquemas de erro e testes de contrato no pipeline.

## 7. Próxima etapa

Resolver ADR de identidade, papéis, estados, campos, SLA e paginação; gerar `openapi.yaml`; validar com lint OpenAPI e testes consumidor/provedor; publicar contrato para frontend, mobile e QA. Nenhum endpoint deve ser considerado implementável apenas pela tabela acima.
