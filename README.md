# Central Hall

Primeira fatia executável da aplicação, baseada nos documentos de `Documentação/`.

## Stack inicial

- TypeScript
- PWA web com React e Vite
- API REST modular em Node.js/Express
- PostgreSQL para dados transacionais
- Docker Compose para desenvolvimento local

O escopo implementado é intencionalmente inicial: visualização do contexto e dos chamados, listagem de categorias e abertura persistente de OS com histórico e idempotência. Consulte `Documentação/` para requisitos, arquitetura e decisões ainda pendentes.

## Executar localmente

Requisitos: Node.js 20+, npm e Docker Desktop com Docker Compose.

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Abra `http://localhost:5173`. O Vite encaminha `/api` para a API em `http://localhost:4000`.

Os dados de Parque Firenze e a identidade local são fixtures exclusivamente de desenvolvimento. Em produção, a API exige configuração OIDC e PostgreSQL com TLS; o vínculo de identidade precisa ter sido provisionado e aprovado. Os servidores locais vinculam-se ao loopback; não remova esse limite nem use dados pessoais reais.

Para preparar publicação privada sem Docker no Azure App Service, consulte [`deploy/azure/README.md`](deploy/azure/README.md). O pacote ZIP serve a web e API sob o mesmo origin. O guia não cria recursos nem habilita acesso público.

## Comandos

| Comando | Finalidade |
|---|---|
| `npm run dev` | API e PWA com recarga automática |
| `npm start` | Inicia a API e serve a PWA compilada |
| `npm run build` | Build de API e web |
| `npm run typecheck` | Verificação TypeScript |
| `npm test` | Testes automatizados da API |
| `npm run db:migrate` | Aplicar o esquema inicial |
| `npm run db:seed` | Inserir fixtures demonstrativas |

## Estrutura

```text
apps/
  api/
    migrations/
    src/
  web/
    public/
    src/
Documentação/
```

## Estado do produto

Autenticação OIDC agora possui integração configurável, mas depende de registros reais e provisionamento de memberships. Fluxo operacional da central, políticas de SLA, notificações, assistente conectada à base de conhecimento, exportação, upload e implantação em nuvem ainda não estão implementados. As decisões pendentes estão documentadas em `Documentação/registro-decisoes-arquiteturais.md`; esta versão não está pronta para produção.
