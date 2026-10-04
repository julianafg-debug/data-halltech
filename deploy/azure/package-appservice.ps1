$ErrorActionPreference = "Stop"

$requiredVariables = @(
  "VITE_OIDC_AUTHORITY",
  "VITE_OIDC_CLIENT_ID",
  "VITE_OIDC_API_SCOPE"
)

foreach ($name in $requiredVariables) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if ([string]::IsNullOrWhiteSpace($value) -or $value.Contains("<") -or $value.Contains(">")) {
    throw "Defina o valor real de $name na sessão atual do PowerShell antes de gerar o pacote."
  }
}

$authority = [Uri]::new($env:VITE_OIDC_AUTHORITY)
if ($authority.Scheme -ne "https") {
  throw "VITE_OIDC_AUTHORITY precisa usar HTTPS."
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$stagingPath = Join-Path $env:TEMP ("central-hall-appservice-" + [Guid]::NewGuid().ToString("N"))
$packagePath = Join-Path $PSScriptRoot "central-hall-appservice.zip"

try {
  & npm.cmd --prefix $projectRoot ci
  if ($LASTEXITCODE -ne 0) { throw "A instalação limpa das dependências falhou." }

  & npm.cmd --prefix $projectRoot run typecheck
  if ($LASTEXITCODE -ne 0) { throw "A verificação de tipos falhou." }

  & npm.cmd --prefix $projectRoot test
  if ($LASTEXITCODE -ne 0) { throw "Os testes falharam." }

  & npm.cmd --prefix $projectRoot run build
  if ($LASTEXITCODE -ne 0) { throw "O build falhou." }

  New-Item -ItemType Directory -Path (Join-Path $stagingPath "apps\api") -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $stagingPath "apps\web") -Force | Out-Null

  Copy-Item (Join-Path $projectRoot "package.json") $stagingPath
  Copy-Item (Join-Path $projectRoot "package-lock.json") $stagingPath
  Copy-Item (Join-Path $projectRoot "apps\api\package.json") (Join-Path $stagingPath "apps\api")
  Copy-Item (Join-Path $projectRoot "apps\api\dist") (Join-Path $stagingPath "apps\api") -Recurse
  Copy-Item (Join-Path $projectRoot "apps\api\migrations") (Join-Path $stagingPath "apps\api") -Recurse
  Copy-Item (Join-Path $projectRoot "apps\web\package.json") (Join-Path $stagingPath "apps\web")
  Copy-Item (Join-Path $projectRoot "apps\web\dist") (Join-Path $stagingPath "apps\web") -Recurse

  & npm.cmd --prefix $stagingPath ci --omit=dev
  if ($LASTEXITCODE -ne 0) { throw "A instalação das dependências de produção falhou." }

  if (Test-Path -LiteralPath $packagePath) {
    Remove-Item -LiteralPath $packagePath -Force
  }
  & tar.exe -a -c -f $packagePath -C $stagingPath package.json package-lock.json apps node_modules
  if ($LASTEXITCODE -ne 0) { throw "A criação do arquivo ZIP falhou." }
  Write-Output "Pacote ZIP de produção criado: $packagePath"
}
finally {
  if (Test-Path -LiteralPath $stagingPath) {
    Remove-Item -LiteralPath $stagingPath -Recurse -Force
  }
}
