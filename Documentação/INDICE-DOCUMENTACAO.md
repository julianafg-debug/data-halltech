# Documentação — Central Hall

**Atualizado em:** 03/10/2026  
**Status geral:** especificações iniciais e arquitetura propostas com base em protótipo; decisões P0 pendentes de aprovação.

## Leitura recomendada

1. `lacunas-documentais-plano.md` — inventário, conclusão e pendências de documentação.
2. `especificacao-funcional.md` e `especificacao-requisitos.md` — comportamento e requisitos.
3. `arquitetura-solucao.md` e `registro-decisoes-arquiteturais.md` — desenho-alvo e decisões pendentes.
4. `especificacao-experiencia-movel.md` — PWA, Android/iPhone, responsividade e acessibilidade.
5. `contrato-api-inicial.md` e `modelagem-de-dados.md` — interfaces e persistência propostas.
6. `seguranca-e-privacidade.md`, `estrategia-de-testes.md` e `operacao-e-implantacao.md` — controles e prontidão.
7. `especificacao-tecnica.md` e `especificacao-uml.md` — visão técnica complementar e modelos de fluxo/domínio.

## Inventário e finalidade

| Documento | Finalidade | Estado |
|---|---|---|
| `Hall_Central_App_Demo.html` | Protótipo visual/funcional de referência | Demonstração; não é sistema de produção |
| `especificacao-funcional.md` | Atores, fluxos e regras de negócio | Baseline derivada; validar regras pendentes |
| `especificacao-requisitos.md` | Requisitos funcionais/não funcionais, casos de uso e aceite | Baseline; metas precisam de aprovação |
| `especificacao-tecnica.md` | Componentes, serviços, segurança e qualidade | Proposta; sem provedor/stack definitivo |
| `especificacao-uml.md` | Casos de uso, classes, atividade, estados e sequência | Modelo conceitual proposto |
| `modelagem-de-dados.md` | Entidades, atributos, relações, índices e integridade | Modelo lógico proposto, sem DDL físico |
| `arquitetura-solucao.md` | Arquitetura web/PWA/mobile/backend e evolução | Proposta PWA-first; decisão de nativo pendente |
| `registro-decisoes-arquiteturais.md` | ADRs e decisões que exigem aprovação | Propostas/pendências registradas |
| `especificacao-experiencia-movel.md` | Layout móvel, instalação, compatibilidade e acessibilidade | Baseline; matriz de versões pendente |
| `contrato-api-inicial.md` | Recursos e convenções de API | Rascunho; converter em OpenAPI executável |
| `seguranca-e-privacidade.md` | Ameaças, LGPD, controles e gates | Baseline; requer revisão responsável |
| `estrategia-de-testes.md` | Cobertura, pirâmide, testes móveis e gates de release | Baseline; limiares finais pendentes |
| `operacao-e-implantacao.md` | Ambientes, pipeline, observabilidade e recuperação | Genérico até decisão de provedor/RPO/RTO |
| `lacunas-documentais-plano.md` | Lacunas, artefatos futuros e responsáveis sugeridos | Plano de evolução documental |

## Próximas ações recomendadas

- **Antes de implementação:** aprovar ADRs de mobile, identidade, stack/cloud, papéis, workflow/SLA, privacidade e metas.
- **Antes de integração entre clientes/backend:** produzir e validar `openapi.yaml`, matriz de autorização e esquema físico/migrações.
- **Antes do piloto:** validar PWA em aparelhos reais, WCAG, threat model, recuperação, suporte e procedimento de incidentes.
- **Antes de habilitar assistente:** revisar documentos, retenção/provedor, corpus de avaliação, ataques adversariais e critérios de desligamento.

Documentos derivados do HTML devem ser tratados como proposta informada, não como requisito contratual ou decisão de arquitetura aprovada.
