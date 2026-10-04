# Implantação privada no Azure App Service

**Estado:** caminho de publicação sem Docker preparado; nenhum recurso Azure foi criado.  
**Acesso:** App Service com acesso público desativado e Private Endpoint em VNet acessível somente por VPN/rede autorizada.

## 1. Arquitetura de destino

- Azure App Service Linux com runtime Node.js 24 LTS serve a PWA e a API no mesmo origin HTTPS.
- Pacote de publicação ZIP, com dependências de produção e builds prontos; Docker não é necessário.
- Acesso de entrada exclusivamente por Private Endpoint; `publicNetworkAccess` deve estar `Disabled` desde a criação.
- Private DNS `privatelink.azurewebsites.net`, ligado à VNet e resolvido também pelos clientes conectados à VPN.
- Integração de saída do App Service com a VNet para alcançar o PostgreSQL privado.
- Azure Database for PostgreSQL Flexible Server em rede privada.
- Acesso de operadores/moradores ao host da aplicação exclusivamente por VPN/rota corporativa e DNS privado.
- Microsoft Entra External ID (OIDC) para autenticação; `issuer`, `audience`, cliente SPA, escopo e redirects obtidos dos registros reais.
- Segredos injetados em configurações protegidas do App Service/Key Vault, não no pacote, código, `.env` versionado ou argumentos expostos.

**Importante:** ingress interno não é publicamente acessível e tampouco acessível ao celular fora da VPN. Acesso por morador externo à rede exige outra decisão de arquitetura e revisão formal de segurança/privacidade antes de expor qualquer endpoint.

## 2. Bloqueios que exigem a responsável pela assinatura

1. Grupo de recursos autorizado, região e limite mensal de custo/alertas.
2. Tenant Entra External ID e registros SPA/API; scope de API, `issuer`, `audience`, redirects HTTPS e usuários de teste.
3. VNet privada e acesso de VPN/DNS para os dispositivos de teste.
4. Nome de domínio e certificado HTTPS se o domínio padrão privado não for adequado.
5. App Service Plan compatível com Private Endpoint e integração VNet, RBAC de implantação e aprovação de custos de App Service, endpoint privado, VNet, PostgreSQL, backups e observabilidade.

Não enviar senha, token, segredo de cliente ou credencial de banco pelo chat. Fazer o login da Azure CLI localmente e injetar segredos em mecanismo protegido.

A conta atualmente está autenticada na subscription `Azure subscription 1` (`93f5dd6f-8db4-4d1d-9cdd-c7cd86414057`). A listagem ainda não mostrou grupos de recursos. A seleção de uma subscription não aprova gastos: confirmar primeiro localização, teto de custos e topologia privada. A documentação da Microsoft indica que Private Endpoint e integração VNet dependem de App Service Plan compatível; validar tier, disponibilidade e preço na região escolhida antes de criar o plano.

## 3. Configuração de identidade

Criar um tenant Entra External ID ou usar o tenant institucional aprovado. Registrar:

- **Aplicativo SPA:** Authorization Code + PKCE, redirect `https://<host-privado>/auth/callback`, logout `https://<host-privado>/`.
- **API:** expor um scope delegado dedicado, por exemplo `api://<api-client-id>/access_as_user`; audience configurada deve corresponder ao `aud` emitido no access token.
- **Issuer:** URL `iss` idêntica ao issuer devolvido em `/.well-known/openid-configuration`, incluindo path e barra final se existir.
- **Provisionamento:** criar cadastro `users.identity_subject = <issuer>|<sub>` e vínculo/membership só após validação do usuário/unidade pelo processo administrativo aprovado.
- **Políticas:** confirmar tenant, MFA, recuperação, usuários externos/residentes, consentimento, emissão de access token para API e expiração de sessão.

Configuração pública para build do frontend:

```text
VITE_OIDC_AUTHORITY=https://<authority-oidc-aprovada>
VITE_OIDC_CLIENT_ID=<client-id-da-spa>
VITE_OIDC_API_SCOPE=api://<api-client-id>/access_as_user
```

Configuração de runtime do backend:

```text
NODE_ENV=production
OIDC_ISSUER=<issuer-exato-do-token>
OIDC_AUDIENCE=<aud-exato-do-access-token>
DATABASE_URL=<connection-string-postgresql-com-tls>
```

O frontend usa Authorization Code + PKCE e mantém o estado OIDC na `sessionStorage`; tokens são enviados ao backend em `Authorization: Bearer`. A API verifica assinatura via OIDC discovery/JWKS, issuer, audience, expiração e subject. Uma conta autenticada sem `users` ativo e membership aprovada recebe acesso negado.

## 4. Preparação do pacote sem Docker

Azure CLI precisa estar autenticada na subscription aprovada; Docker não é usado. `deploy\azure\package-appservice.ps1` executa typecheck, testes e build, instala apenas dependências de produção em staging e cria um ZIP pronto para App Service. Configure os valores públicos do OIDC antes de executar:

```powershell
$env:VITE_OIDC_AUTHORITY = "https://<authority-aprovada>"
$env:VITE_OIDC_CLIENT_ID = "<client-id-da-spa>"
$env:VITE_OIDC_API_SCOPE = "api://<api-client-id>/access_as_user"
.\deploy\azure\package-appservice.ps1
```

O ZIP contém apenas os arquivos necessários para executar a aplicação e suas dependências de produção. Não contém `.env`, tokens ou credenciais. Os valores `VITE_*` são incorporados ao bundle web e não devem ser segredos.

## 5. App Service e rede privada

- Criar o App Service Plan Linux com tier que suporte Private Endpoint e integração VNet, após aprovar o preço mensal e a quota regional.
- Criar o Web App com runtime `NODE:24-lts`, HTTPS only e `public-network-access Disabled` já na criação.
- Configurar startup como `npm start`; o manifesto raiz encaminha para `apps/api`, que serve a PWA compilada e a API pelo mesmo origin.
- Configurar o Private Endpoint, associar a Private DNS Zone `privatelink.azurewebsites.net` e validar resolução a partir da VNet/VPN.
- Habilitar integração de saída do App Service com a VNet para PostgreSQL e outros serviços privados. A sub-rede de integração é separada da sub-rede do Private Endpoint.
- Desativar e verificar explicitamente acesso público também no banco; permitir tráfego apenas pelas sub-redes necessárias.
- Configurar `NODE_ENV=production`, `OIDC_ISSUER`, `OIDC_AUDIENCE` e `DATABASE_URL` em App Settings protegidas ou Key Vault. Não usar o usuário administrador do servidor PostgreSQL como identidade permanente da API.
- Configurar `VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID` e `VITE_OIDC_API_SCOPE` antes de gerar o pacote; cadastrar como redirect URI `https://<host-privado>/auth/callback`.
- Implantar o ZIP apenas após validar que o acesso público está desabilitado:

```powershell
az webapp deploy `
  --resource-group "<grupo-aprovado>" `
  --name "<webapp-aprovado>" `
  --src-path ".\deploy\azure\central-hall-appservice.zip" `
  --type zip
```

- Se o host privado não for acessível da estação, executar deploy a partir de uma máquina conectada à VNet/VPN; não habilitar endpoint SCM público para contornar a restrição.
- Configurar `PORT` pela plataforma; `HOST=0.0.0.0` para aceitar tráfego encaminhado pelo App Service.
- Readiness: `GET /api/health/ready` (verifica PostgreSQL).
- Liveness: `GET /api/health/live` (não depende do PostgreSQL).
- Verificar `publicNetworkAccess=Disabled`, HTTPS, private DNS, conectividade VPN, health/readiness e acesso ao banco antes de considerar o deploy privado.
- Selecionar backup, autoscale, disponibilidade e sizing após aprovar RPO/RTO, carga e orçamento.

## 6. Migração e credenciais

Antes de criar um ambiente real, é necessário implementar/validar o provisionamento de usuários de aplicação PostgreSQL de privilégio mínimo e o job de migração com identidade/secret separados. **Não usar o usuário administrador do Flexible Server como credencial permanente da API.**

Executar o job de migration uma vez por release antes de mudar tráfego; não executar migração automaticamente em toda réplica ao iniciar. Nunca executar `db:seed` em homologação com dados reais ou produção. Validar backup, restauração, checksums de migração e rollback no ambiente não produtivo.

## 7. Gates de validação antes de qualquer piloto

- `npm ci`, typecheck, testes, build e geração do pacote ZIP sem Docker validados em CI.
- Integração real com PostgreSQL 16, migração idempotente e teste de restauração.
- Login real em iPhone/Safari e Android/Chrome, com URL privada/VPN e HTTPS confiável.
- Testes negativos multi-tenant, token errado/expirado, membership revogada e acesso a rota/arquivo.
- Confirmar RBAC completo: o protótipo de autorização ainda não substitui o onboarding, administração ou processo de provisionamento de identidades.
- Threat model, política de privacidade, retenção, resposta a incidentes, observabilidade e responsável on-call aprovados.
- Revisão de segurança/privacidade e aceite do condomínio piloto.

## 8. Situação deste ambiente

Azure CLI 2.90.0 está instalada e autenticada na subscription ativa. Nenhum grupo de recursos foi listado e nenhum recurso Azure foi criado; portanto, não houve gasto de nuvem. Docker Desktop está instalado e aberto, mas o engine falha com erro HTTP 500; o caminho App Service ZIP não depende de Docker. Antes de provisionar, ainda é necessário aprovar grupo de recursos, região, orçamento e plano, rede/VPN/DNS, OIDC e credenciais/privilégios do PostgreSQL.

**Limite de custo informado:** R$ 0,00/mês. Com esse limite não é possível provisionar o App Service privado, Private Endpoint, rede e PostgreSQL necessários. Não criar recursos enquanto o limite permanecer em zero; créditos de avaliação também consomem orçamento Azure e não são uma garantia de custo operacional zero.

## Referências Azure

- [Private Endpoint para Azure App Service](https://learn.microsoft.com/azure/app-service/overview-private-endpoint)
- [Integração de App Service com VNet](https://learn.microsoft.com/azure/app-service/overview-vnet-integration)
- [Implantação de pacote ZIP](https://learn.microsoft.com/azure/app-service/deploy-zip)
