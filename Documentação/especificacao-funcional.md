# Especificação Funcional — Central Hall

**Base de análise:** `Hall_Central_App_Demo.html`  
**Versão do documento:** 1.0  
**Data:** 03/10/2026  
**Idioma:** Português (Brasil)  
**Status:** Especificação derivada de protótipo visual/funcional

## 1. Objetivo e escopo

Este documento descreve as funções de negócio representadas pelo protótipo Hall Central e define o comportamento esperado para uma solução implantável de atendimento condominial. O produto conecta moradores à operação do condomínio por meio de abertura e acompanhamento de ordens de serviço (OS), atendimento de solicitações e consulta a informações aprovadas do condomínio.

O HTML analisado é uma demonstração autocontida, sem serviços, persistência, autenticação ou integrações reais. As métricas, o condomínio Parque Firenze, a moradora Juliana, a OS FIR-01842, respostas da assistente e demais registros exibidos são dados demonstrativos. Onde a especificação descreve comportamento além do que o código efetivamente implementa, isso está identificado como **comportamento-alvo** ou **proposta a confirmar**.

### 1.1 Capacidades incluídas

- Área do morador: resumo de indicadores, atalhos por tipo de solicitação, lista de chamados e abertura de OS.
- Área da Central Hall: painel gerencial, fila operacional, base de conhecimento da assistente e configurações do condomínio.
- Assistente conversacional com perguntas sugeridas, respostas fundamentadas em conteúdo autorizado e encaminhamento à administração/chamado quando necessário.
- Ciclo operacional de uma OS, incluindo identificação, localização, categoria, descrição, responsável, situação, prazos e histórico.
- Administração de SLA, categorias, parâmetros do condomínio, conhecimento e indicadores.

### 1.2 Fora do escopo explícito do protótipo

Pagamento/cobrança, reservas e calendário de áreas de lazer, controle de acesso físico, comunicação em massa, aplicativo nativo, integração com ERP/portaria, anexos, autenticação, permissões, multi-condomínio operacional, exportação efetiva e treinamento de modelos. Esses itens não devem ser considerados implementados apenas por aparecerem em texto ou serem sugeridos pela interface.

## 2. Atores e responsabilidades

| Ator | Objetivo | Acesso funcional esperado |
|---|---|---|
| Morador | Registrar uma ocorrência, acompanhar suas OS e consultar regras | Apenas informações e solicitações de suas unidades autorizadas |
| Operador/atendente da central | Triar, priorizar, atribuir e atualizar OS | Fila de atendimento dos condomínios sob sua responsabilidade |
| Gestor do condomínio | Configurar operação, acompanhar indicadores e aprovar conhecimento | Configurações, relatórios e operação de seu condomínio |
| Administrador da plataforma | Administrar clientes, usuários, parâmetros globais e suporte | Acesso administrativo segregado, auditado e mínimo necessário |
| Assistente virtual | Responder dúvidas com base em conteúdo aprovado e orientar próximos passos | Leitura limitada ao escopo autorizado do condomínio; sem autonomia para alterar dados |

## 3. Conceitos de negócio

- **Condomínio:** organização atendida, como Residencial Parque Firenze.
- **Unidade:** local vinculado a um morador; pode incluir conjunto, torre, unidade, garagem ou área comum.
- **Solicitação/OS:** registro rastreável de uma necessidade ou ocorrência; possui identificador único e estado de atendimento.
- **Categoria e assunto:** classificação de negócio usada para direcionamento, relatórios e SLA.
- **SLA:** compromisso de prazo associado a uma etapa (por exemplo, primeira resposta ou resolução), medido conforme calendário e política configurados.
- **Base de conhecimento:** documentos e orientações aprovados para consulta; respostas da IA devem respeitar o escopo do condomínio e indicar incerteza/falta de informação.

## 4. Fluxos funcionais

### 4.1 Acesso e alternância de áreas

O cabeçalho permite alternar entre **Morador** e **Central Hall**. No protótipo, isso apenas oculta/mostra elementos da página; não existe autenticação ou autorização. Na solução, a área visível deve ser derivada da identidade autenticada, dos papéis e do vínculo com condomínio/unidade. A troca de contexto não pode conceder privilégios por ação de interface.

### 4.2 Consulta inicial do morador

Após autenticação, o morador visualiza o condomínio e a unidade ativa, os indicadores pessoais relevantes (chamados abertos, em atendimento, satisfação e SLA, quando aplicáveis), os atalhos de solicitação e os chamados recentes. Métricas pessoais devem ser calculadas a partir de dados persistidos, com período, denominador e regra claramente definidos; não se deve apresentar porcentagem sem amostra/critério explicável.

### 4.3 Abertura de OS

1. O morador escolhe um atalho de categoria (Manutenção, Segurança ou Áreas comuns) ou inicia uma solicitação genérica.
2. O formulário apresenta categoria, assunto, local, descrição e, na solução alvo, campos condicionais configurados pela categoria.
3. O sistema valida campos obrigatórios e verifica que o usuário pode solicitar atendimento para a unidade/local selecionado.
4. Ao confirmar, cria uma OS persistente, atribui identificador único, registra autor e data/hora, calcula prioridade/SLA inicial e inicia o estado **Aberta**.
5. O sistema confirma a criação e atualiza a lista do morador e a fila operacional sem recarregar a página.
6. A criação deve ser idempotente frente a reenvio acidental; erro de validação ou de persistência deve ser mostrado sem alegar sucesso.

No protótipo, categoria e assunto são pré-preenchidos por atalho, local oferece “Minha unidade”, “Corredor / hall”, “Garagem” e “Área comum”; a descrição é editável. A função `createOS()` gera um número sequencial somente em memória, insere HTML na página e incrementa contadores. Não envia nem persiste dados; a descrição não é apresentada na lista; o morador/unidade é fixado como Juliana/Cj.03/Torre B/1704; não há validação.

### 4.4 Acompanhamento do chamado

O morador consulta suas OS por data, identificador e estado, abre o detalhe e acompanha alterações, mensagens e eventual pedido de informação. Deve receber confirmação e atualizações por canal configurado. A lista sempre respeita a autorização da unidade e distingue estado operacional de prazo de SLA.

O protótipo mostra apenas um chamado de exemplo e, após criar, acrescenta um cartão com estado “Aberto” e horário relativo “agora”; não implementa detalhe, filtro, carregamento, atualização persistida nem notificações.

### 4.5 Triagem e atendimento pela central

Operadores consultam a fila, identificam solicitante/unidade, categoria e estado, abrem o detalhe, validam a classificação, definem prioridade e responsável e registram cada transição com autor, data/hora e motivo. A central pode solicitar dados complementares, responder ao morador, encaminhar a fornecedor/equipe e concluir ou reabrir de acordo com política. Mudanças de estado inválidas são recusadas com explicação.

A fila do protótipo contém uma linha de exemplo e as colunas OS, Morador/Local, Categoria e Status. Não existem filtros, ações por linha, atribuição, transições, paginação ou sincronização.

### 4.6 Dashboard e relatório

O painel gerencial apresenta volume de OS, primeira resposta, cumprimento de SLA, satisfação, solicitações por período, conclusão, reincidência e tendências por categoria/local. Cada indicador deve possuir definição, intervalo temporal, origem e horário de atualização. O relatório deve permitir selecionar período e escopo, apresentar filtros aplicados e exportar dados autorizados em formato suportado.

O protótipo mostra 184 OS abertas, 17 min de primeira resposta, 92% no SLA, 4,7 de satisfação e uma análise dos últimos 90 dias. O botão de relatório apenas exibe alerta de demonstração; PDF/Excel não é gerado.

### 4.7 Assistente e conhecimento

O morador abre a assistente e pode escolher sugestões sobre mudança, obra ou falar com a administração. A assistente responde somente a partir de conteúdo publicado e aplicável ao condomínio. Para resposta sem evidência suficiente, regra conflitante ou solicitação transacional, informa a limitação e oferece encaminhamento humano ou abertura de OS. Conversa encaminhada deve manter contexto e histórico autorizado.

No protótipo, as três respostas são strings fixas; uma resposta inicial também é estática. O campo de texto da base não possui fluxo de publicação e o botão somente exibe um alerta. Não há entrada livre funcional, recuperação de documentos, avaliação de resposta, transferência real ou registro da conversa.

### 4.8 Configuração do condomínio

Gestor autorizado pode editar nome, prefixo identificador e opções de SLA, validar os dados e salvar versão auditável. A configuração afeta novas OS conforme política de vigência; alterações não devem reescrever silenciosamente acordos já iniciados. Prefixo precisa ser único no escopo definido e SLA deve conter unidade, marco inicial, calendário e objetivo.

O protótipo exibe campos para nome, prefixo e SLA de 4, 8 ou 24 horas. Os campos não têm identificador/associação a backend e o botão “Salvar” não possui manipulador implementado.

## 5. Regras de negócio

| ID | Regra |
|---|---|
| RN-01 | Toda OS pertence a exatamente um condomínio e a um solicitante identificado; local/unidade deve ser validado contra o escopo de acesso do solicitante. |
| RN-02 | O identificador da OS é único, imutável e não reutilizado dentro do escopo definido. O prefixo configurável é apenas componente visual, não a chave primária. |
| RN-03 | Categoria, assunto, prioridade, origem e estado usam valores controlados e versionáveis; mudanças de classificação ficam registradas. |
| RN-04 | Cada transição válida de estado registra estado anterior/novo, autor, instante e motivo. |
| RN-05 | SLA é calculado conforme política versionada, calendário, fuso horário e eventos de pausa/reinício explicitamente definidos. |
| RN-06 | O assistente só utiliza documentos aprovados, vigentes e vinculados ao condomínio correto; informação sem evidência suficiente não deve ser inventada. |
| RN-07 | Indicadores são derivados de registros operacionais; dados de demonstração não compõem indicadores reais. |
| RN-08 | Usuários só visualizam/alteram recursos do condomínio e unidades autorizados; ações administrativas são auditadas. |

## 6. Estados e transições propostos

Fluxo básico: **Aberta → Em triagem → Em atendimento → Aguardando morador/terceiro → Resolvida → Encerrada**. A OS pode transitar de **Resolvida** para **Reaberta** dentro da janela de contestação configurada. **Cancelada** é terminal, permitido apenas com motivo e autorização definida. O protótipo usa rótulos inconsistentes (“Em atendimento”, “Aberto”, “Novo”) e não implementa máquina de estados; o vocabulário final, transições, SLAs por estado e reabertura são decisões de produto a validar.

## 7. Requisitos de interface e acessibilidade

- Interface responsiva; o protótipo alterna grade de métricas/ações abaixo de 700 px.
- Navegação e controles devem ser utilizáveis por teclado e leitor de tela, com rótulos, foco visível, estados anunciados e contraste adequado.
- Diálogos devem conter foco, fechar por botão e Escape, devolver o foco ao acionador e impedir interação com o conteúdo de fundo.
- Formulários devem associar rótulos aos controles, indicar obrigatoriedade, apresentar erro junto ao campo e preservar dados digitados após erro recuperável.
- Estado vazio, carregamento, indisponibilidade e confirmação precisam de representações distintas; não depender exclusivamente de cor.

## 8. Critérios de aceite funcionais

1. Morador autenticado só consegue listar e abrir OS em unidades a que está vinculado.
2. Uma abertura válida produz uma OS persistente, identificador único e registro de auditoria; recarregar a página mantém o registro.
3. Dados inválidos não criam OS e informam campos que precisam de correção.
4. Alteração de estado pela central registra autor, horário e histórico e atualiza a visão do morador conforme política.
5. SLA e indicadores correspondem às definições e ao período selecionado; a interface comunica indisponibilidade em vez de exibir valores simulados como reais.
6. A assistente não usa conteúdo de outro condomínio nem apresenta como fato conteúdo não respaldado; ausência de resposta oferece encaminhamento.
7. Configurações e conhecimento publicados têm controle de autorização, validação, versão e auditoria.

## 9. Decisões pendentes para refinamento

Confirmar matriz de papéis, quais categorias/assuntos e campos condicionais existem, ciclo/nomes de estados, prioridade, regras de cancelamento/reabertura, horário comercial e pausas de SLA, canais de notificação, política de retenção, conteúdo do relatório, mecanismo de publicação da base e provedor/modelo da assistente. Esses pontos não são determináveis pelo HTML e devem ser aprovados pelos responsáveis de negócio, operação e privacidade.
