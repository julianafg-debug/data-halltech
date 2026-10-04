# Análise de Lacunas Documentais — Central Hall

**Versão:** 1.0 · **Data:** 03/10/2026 · **Status:** análise e plano de completude

## 1. Inventário analisado

Foram identificados na pasta `Documentação`:

- `especificacao-funcional.md`
- `especificacao-requisitos.md`
- `especificacao-tecnica.md`
- `especificacao-uml.md`
- `modelagem-de-dados.md`
- `Hall_Central_App_Demo.html` (protótipo de interface)

Os cinco documentos cobrem domínio e requisitos iniciais de forma útil, mas alguns descrevem alternativas abertas, metas propostas ou comportamentos que o protótipo não executa. A arquitetura técnica era proposta em alto nível, sem decisão específica para acesso móvel, contratos executáveis de API ou plano operacional.

## 2. Conclusão

Para iniciar uma implementação controlada, convém complementar a documentação com arquitetura responsiva/móvel, registro de decisões, contrato de API, experiência móvel/acessibilidade, segurança/privacidade, estratégia de testes e operação/implantação. Esses artefatos foram criados junto a esta análise. São baselines revisáveis: não substituem aprovação de produto, segurança, infraestrutura, encarregado de dados ou jurídico.

Não é necessário criar agora documentação genérica sem decisão concreta (por exemplo, manual final do usuário, contrato de fornecedor ou runbook detalhado de incidente). Esses materiais passam a ser necessários quando a funcionalidade, fornecedor e operação estiverem definidos.

## 3. Artefatos criados nesta rodada

| Documento | Finalidade | Prioridade |
|---|---|---|
| `arquitetura-solucao.md` | Arquitetura de contexto/contêineres, mobile/PWA, dados, backend, segurança e rollout | P0 |
| `registro-decisoes-arquiteturais.md` | Decisões propostas e gates ainda pendentes (ADRs) | P0 |
| `especificacao-experiencia-movel.md` | Requisitos responsivos, PWA, Android/iOS, acessibilidade e matriz de dispositivos | P0 |
| `contrato-api-inicial.md` | Convenções e recursos de API para derivar OpenAPI executável | P0 |
| `seguranca-e-privacidade.md` | Ameaças, controles, LGPD, IA e critérios de revisão | P0 |
| `estrategia-de-testes.md` | Níveis, cobertura de requisitos, dados e gates de release | P0 |
| `operacao-e-implantacao.md` | Ambientes, CI/CD, backup, monitoramento e prontidão de produção | P1 |
| `INDICE-DOCUMENTACAO.md` | Navegação, status e sequência recomendada de leitura | P0 |

## 4. Artefatos recomendados para fase seguinte

| Documento/artefato | Quando elaborar | Dono sugerido |
|---|---|---|
| OpenAPI 3.x em YAML validado | Antes de desenvolver clientes e integrações; converter `contrato-api-inicial.md` em especificação executável | Arquitetura/API |
| Dicionário de dados físico, migrações e catálogo oficial | Após decisões de domínio e escolha do SGBD | Engenharia de dados/backend |
| Catálogo aprovado de estados, categorias, prioridades e SLA | Antes de implementar workflow e indicadores | Produto + Operação |
| Design system e protótipos de telas Android/iOS acessíveis | Antes da construção do cliente; protótipo HTML atual não é especificação de interação completa | UX/UI + Acessibilidade |
| Matriz de papéis e permissões (RBAC/ABAC) | Antes de fechar endpoints e testes de autorização | Segurança + Produto |
| Política de classificação, retenção e resposta a solicitações de titulares | Antes de usar dados pessoais reais | Encarregado/Privacidade + Jurídico |
| Plano de recuperação de desastre com RPO/RTO e evidências | Antes de produção | SRE/Infraestrutura + Negócio |
| Runbooks específicos por serviço/provedor | Após seleção de cloud, IdP, fila, IA e notificações | Operação |
| Plano de incidentes e comunicação | Antes de produção e exercício operacional | Segurança + Operação |
| Manual de usuário e treinamento da central | Antes do piloto e onboarding | Produto + Operação |
| Plano de migração/carga inicial e reconciliação | Se houver migração de cadastros/histórico legado | Dados + Negócio |
| Plano de rollout/piloto, métricas de adoção e suporte | Antes do primeiro condomínio em produção | Produto + Operação |
| Model card / avaliação da assistente | Antes de disponibilizar IA a moradores e após mudança de modelo/prompt | IA + Segurança + Produto |

## 5. Pendências transversais que bloqueiam decisões

1. PWA é suficiente ou lojas e app nativo são obrigatórios? Quais mínimos de iOS/Android?
2. Quem pode ver/alterar cada dado e quais vínculos unidade/morador são válidos?
3. Como estados, pausas, expediente, feriados, primeira resposta e resolução definem SLA?
4. Quais disponibilidade, volume, concorrência, RPO/RTO, residência e orçamento são esperados?
5. Quais canais, retenção de conversas/anexos e provedor de IA estão autorizados?
6. Quem aprova documentos e assume responsabilidade pelas respostas publicadas?

## 6. Limites e critérios de atualização

Os documentos foram derivados de um protótipo estático e não de entrevistas, contratos, políticas institucionais ou sistema existente. Marcar escolhas provisórias como tais e atualizar rastreabilidade quando RF, UX, stack, fornecedor ou legislação/política mudar. Antes do kickoff de desenvolvimento, resolver pendências P0, obter aceite de negócio e privacidade e gerar contratos/testes executáveis.
