# Especificação de Experiência Responsiva e Móvel — Central Hall

**Versão:** 1.0 · **Data:** 03/10/2026 · **Status:** baseline proposto

## 1. Objetivo

Complementar a especificação funcional com requisitos de uso em navegadores desktop, Android e iPhone. O produto deve oferecer fluxo completo ao morador em telas pequenas. Acesso por navegador é requisito independente de instalação; PWA e aplicativo nativo são decisões distintas.

## 2. Abordagem

- **MVP proposto:** aplicação web responsiva mobile-first, com PWA opcional.
- **Morador:** priorizar abertura/acompanhamento de OS, consulta de unidade/contexto, assistente e notificações de estado.
- **Central/gestor:** otimizar para desktop/tablet; funções essenciais devem continuar operáveis em viewport estreito, sem exigir app nativo.
- **Futuro:** app Android/iOS nativo somente se aprovado por necessidade de loja, push/background confiável, integração de dispositivo ou offline avançado.

## 3. Requisitos de layout e comportamento

| ID | Requisito |
|---|---|
| UXM-001 | Layout deve adaptar conteúdo entre 320 CSS px e desktop sem rolagem horizontal de página nos fluxos essenciais. |
| UXM-002 | Formulários devem usar controles touch-friendly, labels persistentes e teclado correto por tipo de dado; erros devem permanecer visíveis e associados. |
| UXM-003 | Navegação móvel deve expor claramente contexto/condomínio e unidade autorizados, identidade e saída da sessão. |
| UXM-004 | Fila/dados tabulares devem mudar para cartões ou colunas priorizadas em telas estreitas; informação não pode desaparecer sem acesso alternativo. |
| UXM-005 | Dialogs devem caber em viewport móvel, considerar teclado virtual/safe areas, permitir fechar por controle acessível e manter estado do formulário. |
| UXM-006 | Estados de carregamento, vazio, erro, offline e confirmação devem ser distintos; não se pode confirmar mutação não persistida. |
| UXM-007 | Conteúdo pessoal não deve ser mantido em cache compartilhado; logout limpa estado local sensível e tokens conforme estratégia de sessão. |
| UXM-008 | Upload (quando aprovado) deve validar tamanho/tipo, mostrar progresso e permitir recuperação de falha sem expor URL permanente. |
| UXM-009 | A PWA deve informar estado de instalação e atualização; atualização não pode descartar uma submissão em andamento sem aviso. |
| UXM-010 | Não exigir permissão de câmera, localização ou notificação até que uma função justifique; explicar benefício e permitir continuar sem consentimento quando possível. |

## 4. Acessibilidade

Adotar WCAG 2.2 AA como meta para fluxos essenciais. Garantir semântica HTML, hierarquia de títulos, nome acessível de controles, contraste, zoom/reflow, foco visível, ordem lógica de teclado, anúncio de atualização de lista, identificação de erro sem depender de cor e suporte a VoiceOver/TalkBack. Testar modais, navegação, filtros, upload, chat e mensagens de erro com leitor de tela.

## 5. PWA, cache e capacidades móveis

- HTTPS, manifest válido, ícones, nome/short name e escopo de instalação definidos.
- Service worker cacheia somente shell e assets estáticos versionados; estratégia explícita de invalidação/atualização.
- Não cachear respostas autenticadas, mensagens, descrições de OS, documentos ou relatórios, exceto após avaliação de risco e criptografia/expiração apropriadas.
- Não permitir gravação offline de OS no MVP, a menos que exista fila local cifrada, idempotência, expiração, política de conflito e UX de sincronização aprovadas.
- Push web é opcional e depende de navegador, versão de SO, instalação/permissão e configuração de provedores; não constituir único canal para aviso crítico.
- A lista de compatibilidade deve ser definida e testada em aparelho real. Recursos PWA variam; não assumir paridade entre Safari iOS e Chrome Android.

## 6. Matriz de teste de compatibilidade

Preencher e aprovar versões suportadas antes de desenvolvimento. Executar smoke tests em aparelhos físicos além de emuladores.

| Plataforma | Navegador | Cenários mínimos |
|---|---|---|
| iPhone / iOS suportado | Safari | login, viewport/teclado, abrir OS, upload se incluído, VoiceOver, sessão, instalar PWA se alvo |
| iPhone / iOS suportado | PWA instalada | abertura a partir do ícone, autenticação, atualização, navegação, deep link/push se aprovado |
| Android suportado | Chrome | login, formulários, câmera/upload se incluído, TalkBack, instalar PWA, push se aprovado |
| Android suportado | PWA instalada | atualização, persistência de sessão conforme política, voltar/retomar e navegação |
| Desktop suportado | Chrome/Edge/Safari conforme política | console, fila, filtros, dashboard, dialogs e teclado |
| Tablet suportado | navegadores aprovados | console, navegação responsiva, formulários e orientação portrait/landscape |

Versões mínimas, aparelhos e frequência de regressão são pendências de produto/QA, não devem ser inventadas pela implementação.

## 7. Gate para aplicativo nativo

Reavaliar PWA versus cliente nativo se uma ou mais condições se tornarem obrigatórias: publicação em lojas, push/background confiável em versões-alvo, captura/upload em background, acesso a recursos nativos não atendidos por browser, offline robusto, login biométrico gerenciado ou requisito institucional de aplicativo instalado. A decisão deve considerar custo de dois clientes, QA, acessibilidade, atualização e suporte.
