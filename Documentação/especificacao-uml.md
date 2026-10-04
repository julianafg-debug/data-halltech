# Especificação UML — Central Hall

**Versão:** 1.0 · **Data:** 03/10/2026  
**Notação:** UML 2.x em PlantUML  
**Natureza:** modelo conceitual proposto a partir de protótipo; não representa classes já existentes no código.

## 1. Objetivo e fronteira

Os diagramas abaixo especificam a solução-alvo inferida: atores, casos de uso, entidades centrais, abertura de OS e ciclo de estados. O HTML implementa somente a alternância visual, abertura de modais, inserção de conteúdo em memória e respostas estáticas. Autenticação, serviços, regras, persistência e integrações nos diagramas são requisitos de sistema, não componentes observados.

## 2. Diagrama de casos de uso

```plantuml
@startuml
left to right direction
actor Morador
actor "Operador da central" as Operador
actor "Gestor do condomínio" as Gestor
actor "Administrador da plataforma" as Admin
actor "Serviço de identidade" as IdP
actor "Serviço de notificações" as Notif
actor "Serviço de IA / busca" as IA

rectangle "Central Hall" {
  usecase "Autenticar-se" as U0
  usecase "Consultar painel pessoal" as U1
  usecase "Abrir solicitação / OS" as U2
  usecase "Consultar minhas OS" as U3
  usecase "Acompanhar histórico" as U4
  usecase "Consultar conhecimento" as U5
  usecase "Solicitar atendimento humano" as U6
  usecase "Consultar fila operacional" as U7
  usecase "Triar, atribuir e priorizar OS" as U8
  usecase "Atualizar estado / responder" as U9
  usecase "Consultar indicadores" as U10
  usecase "Exportar relatório" as U11
  usecase "Administrar SLA e condomínio" as U12
  usecase "Revisar/publicar conhecimento" as U13
  usecase "Administrar usuários e clientes" as U14
  usecase "Validar autorização e escopo" as U15
  usecase "Registrar auditoria" as U16
}
Morador -- U0
Morador -- U1
Morador -- U2
Morador -- U3
Morador -- U4
Morador -- U5
Morador -- U6
Operador -- U0
Operador -- U7
Operador -- U8
Operador -- U9
Operador -- U10
Gestor -- U0
Gestor -- U10
Gestor -- U11
Gestor -- U12
Gestor -- U13
Admin -- U14
IdP -- U0
Notif -- U2
Notif -- U9
IA -- U5
U2 .> U15 : <<include>>
U3 .> U15 : <<include>>
U7 .> U15 : <<include>>
U8 .> U16 : <<include>>
U9 .> U16 : <<include>>
U12 .> U16 : <<include>>
U13 .> U16 : <<include>>
U11 .> U15 : <<include>>
U5 .> U15 : <<include>>
@enduml
```

## 3. Diagrama de domínio / classes

```plantuml
@startuml
hide methods
skinparam classAttributeIconSize 0
class Condominium {
  +id: UUID
  +name: string
  +osPrefix: string
  +timezone: string
  +status: TenantStatus
}
class User {
  +id: UUID
  +identitySubject: string
  +displayName: string
  +email: string
  +status: UserStatus
}
class Membership {
  +id: UUID
  +role: Role
  +validFrom: datetime
  +validTo: datetime?
}
class Unit {
  +id: UUID
  +label: string
  +unitType: UnitType
  +active: boolean
}
class ServiceRequest {
  +id: UUID
  +publicNumber: string
  +subject: string
  +description: text
  +status: RequestStatus
  +priority: Priority
  +createdAt: datetime
  +updatedAt: datetime
  +resolvedAt: datetime?
}
class Category {
  +id: UUID
  +name: string
  +active: boolean
}
class Assignment {
  +id: UUID
  +assignedAt: datetime
  +endedAt: datetime?
}
class StatusEvent {
  +id: UUID
  +fromStatus: RequestStatus?
  +toStatus: RequestStatus
  +reason: string?
  +createdAt: datetime
}
class SlaPolicy {
  +id: UUID
  +version: int
  +firstResponseMinutes: int
  +resolutionMinutes: int
  +calendarId: UUID
  +effectiveFrom: datetime
  +effectiveTo: datetime?
}
class RequestSla {
  +id: UUID
  +targetAt: datetime
  +pausedAt: datetime?
  +breachedAt: datetime?
  +completedAt: datetime?
}
class KnowledgeDocument {
  +id: UUID
  +title: string
  +sourceUri: string?
  +version: int
  +status: DocumentStatus
  +effectiveFrom: datetime?
  +effectiveTo: datetime?
}
class Conversation {
  +id: UUID
  +startedAt: datetime
  +endedAt: datetime?
  +handoffStatus: HandoffStatus
}
class Message {
  +id: UUID
  +speaker: Speaker
  +body: text
  +createdAt: datetime
}
class AuditEvent {
  +id: UUID
  +action: string
  +resourceType: string
  +resourceId: UUID
  +occurredAt: datetime
}

Condominium "1" -- "0..*" Membership
User "1" -- "0..*" Membership
Condominium "1" *-- "0..*" Unit
Unit "1" -- "0..*" ServiceRequest : local
User "1" -- "0..*" ServiceRequest : solicitante
Condominium "1" -- "0..*" ServiceRequest
Category "1" -- "0..*" ServiceRequest
ServiceRequest "1" *-- "1..*" StatusEvent
ServiceRequest "1" -- "0..*" Assignment
User "1" -- "0..*" Assignment : atendente
SlaPolicy "1" -- "0..*" RequestSla
ServiceRequest "1" -- "0..*" RequestSla
Condominium "1" -- "0..*" SlaPolicy
Condominium "1" -- "0..*" KnowledgeDocument
Condominium "1" -- "0..*" Conversation
User "1" -- "0..*" Conversation
Conversation "1" *-- "1..*" Message
Message "0..*" .. "0..*" KnowledgeDocument : fontes citadas
User "0..1" -- "0..*" AuditEvent : ator
Condominium "1" -- "0..*" AuditEvent
@enduml
```

**Interpretação:** `Membership` determina acesso contextual, não a presença de um seletor de interface. `ServiceRequest` mantém referência ao solicitante e condomínio; unidade pode ser nula para ocorrência em área comum sem unidade individual, mediante regra aprovada. Histórico e auditoria são registros append-only para usuários normais. As cardinalidades definitivas dependem da política de cadastro, múltiplas unidades e solicitante externo.

## 4. Atividade — abertura de OS

```plantuml
@startuml
start
:Morador escolhe categoria e local;
:Preenche assunto e descrição;
:Cliente envia pedido autenticado;
:API autentica e valida papel/escopo;
if (Entrada válida e unidade autorizada?) then (sim)
  :Verificar chave de idempotência;
  if (Pedido já processado?) then (sim)
    :Retornar OS já criada;
  else (não)
    :Criar OS e evento inicial em transação;
    :Associar política de SLA vigente;
    :Publicar evento via outbox;
    :Retornar número e estado persistidos;
    :Notificar fila e morador conforme preferências;
  endif
  :Atualizar lista do morador;
else (não)
  :Retornar erro validável sem criar OS;
endif
stop
@enduml
```

## 5. Máquina de estados da OS

```plantuml
@startuml
[*] --> Aberta : criação validada
Aberta --> EmTriagem : operador assume/triagem
EmTriagem --> EmAtendimento : classificada e atribuída
EmTriagem --> Cancelada : cancelamento autorizado / motivo
EmAtendimento --> AguardandoMorador : informação necessária
EmAtendimento --> AguardandoTerceiro : dependência externa
AguardandoMorador --> EmAtendimento : resposta recebida
AguardandoTerceiro --> EmAtendimento : dependência concluída
EmAtendimento --> Resolvida : resolução registrada
Resolvida --> Reaberta : contestação dentro da janela
Reaberta --> EmTriagem : nova triagem
Resolvida --> Encerrada : janela encerrada / confirmação
Encerrada --> [*]
Cancelada --> [*]
@enduml
```

Estados e limites temporais são proposta. O protótipo não implementa transições; apresenta “Aberto”, “Novo” e “Em atendimento” como rótulos de exemplo. Antes da implementação, aprovar se `Encerrada` exige ação explícita, se `AguardandoMorador` pausa SLA e quais atores podem cancelar/reabrir.

## 6. Sequência — consulta assistida

```plantuml
@startuml
actor Morador
participant "Web App" as Web
participant "API" as API
participant "Serviço de Assistente" as Bot
database "Banco / índice com escopo" as Store
participant "Operador" as Op
Morador -> Web: envia pergunta na conversa
Web -> API: pergunta + sessão autenticada
API -> API: valida identidade e condomínio ativo
API -> Bot: pergunta + escopo autorizado
Bot -> Store: busca documentos publicados do condomínio
Store --> Bot: trechos e versões elegíveis
Bot --> API: resposta + fontes + confiança/limitação
alt evidência suficiente
  API --> Web: resposta fundamentada e referências
  Web --> Morador: apresenta resposta
else evidência insuficiente / pedido transacional
  API --> Web: explicita limite e opção de encaminhamento
  Web --> Morador: solicita confirmação do encaminhamento
  Morador -> Web: confirma
  Web -> API: cria handoff ou OS com consentimento
  API -> Op: disponibiliza contexto autorizado na fila
end
@enduml
```

## 7. Regras UML complementares

- Restrição de escopo: toda consulta/mutação de OS e conhecimento deve incluir autorização do condomínio no servidor.
- Restrição de identificador: `publicNumber` é único por condomínio (ou globalmente, conforme decisão), nunca chave estrangeira.
- Restrição temporal: versões de SLA/documento são não sobrepostas no intervalo de vigência quando a política exigir unicidade vigente.
- Restrição de estado: toda transição corresponde a evento histórico e valida a matriz de transições.
- Restrição de assistente: referências devolvidas devem apontar para fontes elegíveis e o filtro tenant é aplicado antes da busca/generation.

## 8. Rastreabilidade dos modelos

| Modelo | Requisitos |
|---|---|
| Casos de uso | RF-001–024 |
| Classes | RF-002–024 e modelo em `modelagem-de-dados.md` |
| Atividade de abertura | RF-005–009, RF-022–024 |
| Máquina de estados | RF-011–013 |
| Sequência da assistente | RF-017–021, RNF-013 |

## 9. Elementos não observáveis

Não se inferem do template serviços, classes, endpoints, autenticação, papéis, integrações, persistência, protocolo de chat, política de estado ou tecnologia UML existente. Diagramas documentam um desenho lógico a validar com stakeholders, e não reverse engineering de uma aplicação de produção.
