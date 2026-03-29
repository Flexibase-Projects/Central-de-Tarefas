$ErrorActionPreference = 'Stop'

$session = 'uxaudit'
$cliArgs = @('--yes', '@playwright/cli@latest', "-s=$session")
$reportPath = Join-Path $PSScriptRoot 'ux_audit_report.json'
$baseUrl = 'http://127.0.0.1:3002'

function Invoke-PwCli {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  & npx @cliArgs @Arguments
}

function Get-ResultPayload {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RawOutput
  )

  if ($RawOutput -match "(?s)### Result\s*(?<result>.*?)(\r?\n###|\z)") {
    return $Matches['result'].Trim()
  }

  return $RawOutput.Trim()
}

function Invoke-JsonEval {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Expression
  )

  $rawOutput = (Invoke-PwCli eval $Expression | Out-String)
  $raw = Get-ResultPayload -RawOutput $rawOutput
  if (-not $raw) {
    return $null
  }

  try {
    return $raw | ConvertFrom-Json
  } catch {
    return $raw
  }
}

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url,
    [string]$Method = 'GET',
    [hashtable]$Headers,
    [object]$Body
  )

  try {
    $params = @{
      Uri = $Url
      Method = $Method
      ContentType = 'application/json'
      ErrorAction = 'Stop'
    }

    if ($Headers) {
      $params.Headers = $Headers
    }

    if ($null -ne $Body) {
      $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
    }

    $response = Invoke-RestMethod @params
    return [ordered]@{
      status = 200
      ok = $true
      body = $response
    }
  } catch {
    $http = $_.Exception.Response
    if ($null -eq $http) {
      return [ordered]@{
        status = 0
        ok = $false
        body = @{ error = $_.Exception.Message }
      }
    }

    $status = [int]$http.StatusCode
    $stream = $http.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $text = $reader.ReadToEnd()
    $reader.Dispose()
    $stream.Dispose()

    try {
      $body = $text | ConvertFrom-Json
    } catch {
      $body = @{ raw = $text }
    }

    return [ordered]@{
      status = $status
      ok = $false
      body = $body
    }
  }
}

function Wait-PageReady {
  Invoke-PwCli run-code "await page.waitForLoadState('networkidle'); await page.waitForTimeout(250)" | Out-Null
}

function Get-ArtifactText {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CliOutput
  )

  if ($CliOutput -match '\]\((?<path>[^)]+)\)') {
    $relativePath = $Matches['path']
    $fullPath = Join-Path (Get-Location) $relativePath
    if (Test-Path $fullPath) {
      return Get-Content $fullPath -Raw
    }
  }

  return $CliOutput
}

function Add-GateFailure {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Report,
    [Parameter(Mandatory = $true)]
    [string]$Code,
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [object]$Details
  )

  $Report.gate.failures += [ordered]@{
    code = $Code
    message = $Message
    details = $Details
  }
}

function Add-GateWarning {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Report,
    [Parameter(Mandatory = $true)]
    [string]$Code,
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [object]$Details
  )

  $Report.gate.warnings += [ordered]@{
    code = $Code
    message = $Message
    details = $Details
  }
}

$health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get -ErrorAction Stop
if ($health.status -ne 'ok') {
  throw "Backend em $baseUrl nao respondeu healthcheck valido."
}

$report = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  baseUrl = $baseUrl
  api = [ordered]@{}
  pages = [ordered]@{}
  firstWorkspace = $null
  artifacts = [ordered]@{}
  console = [ordered]@{
    errors = @()
    warnings = @()
  }
  network = [ordered]@{
    unexpectedResponses = @()
    allowedResponses = @()
  }
  gate = [ordered]@{
    passed = $false
    failures = @()
    warnings = @()
  }
}

$report.api.health = Invoke-JsonRequest -Url "$baseUrl/api/health"
$report.api.publicWorkspaces = Invoke-JsonRequest -Url "$baseUrl/api/auth/public-workspaces"
$report.api.ssoConfig = Invoke-JsonRequest -Url "$baseUrl/api/sso/config"

$workspaces = @($report.api.publicWorkspaces.body.workspaces)
$groups = @($report.api.publicWorkspaces.body.groups)
$firstWorkspace = if ($workspaces.Count -gt 0) { $workspaces[0] } else { $null }
$ssoEnabled = $report.api.ssoConfig.body.enabled -eq $true
$allowLegacyPasswordLogin = $report.api.ssoConfig.body.allow_legacy_password_login -ne $false

if ($firstWorkspace) {
  $report.firstWorkspace = [ordered]@{
    slug = $firstWorkspace.slug
    name = $firstWorkspace.name
  }
}

Invoke-PwCli install-browser | Out-Null
Invoke-PwCli open "$baseUrl/workspaces" | Out-Null

try {
  Wait-PageReady

  $report.pages.workspaces = Invoke-JsonEval "({ url: location.href, heading: document.querySelector('h1, h2, h3')?.textContent?.trim() ?? null, bodySample: document.body.textContent?.trim()?.slice(0, 300) ?? null, visibleWorkspaceNames: Array.from(document.querySelectorAll('h6')).map(node => node.textContent?.trim()).filter(Boolean).slice(0, 12), expectedGroupCount: $($groups.Count), expectedWorkspaceCount: $($workspaces.Count) })"

  if ($firstWorkspace) {
    $workspaceRoot = "$baseUrl/w/$($firstWorkspace.slug)"
    $workspaceLogin = "$workspaceRoot/login"

    Invoke-PwCli goto $workspaceRoot | Out-Null
    Wait-PageReady
    $report.pages.protectedRedirect = Invoke-JsonEval "({ startUrl: '$workspaceRoot', finalUrl: location.href, redirectedToLogin: location.href.startsWith('$workspaceLogin'), preservedReturnTo: location.href.includes(encodeURIComponent('/w/$($firstWorkspace.slug)')) })"

    Invoke-PwCli goto $workspaceLogin | Out-Null
    Wait-PageReady
    $report.pages.login = Invoke-JsonEval "({ url: location.href, heading: document.querySelector('h1, h2, h3')?.textContent?.trim() ?? null, bodySample: document.body.textContent?.trim()?.slice(0, 300) ?? null, hasSsoPrimary: Boolean(Array.from(document.querySelectorAll('button')).find(button => button.textContent?.match(/Entrar com SSO central/i))), hasLegacySubmit: Boolean(Array.from(document.querySelectorAll('button')).find(button => button.textContent?.match(/Entrar no workspace/i))), hasRequestAccessEntry: Boolean(Array.from(document.querySelectorAll('button')).find(button => button.textContent?.match(/Solicitar cadastro/i))) })"

    $requestModeOpened = Invoke-JsonEval "(() => { const button = Array.from(document.querySelectorAll('button')).find(node => node.textContent?.match(/Solicitar cadastro/i)); if (!button) return false; button.click(); return true; })()"
    if ($requestModeOpened -eq $true -or $requestModeOpened -eq 'true') {
      Wait-PageReady
      $report.pages.requestAccess = Invoke-JsonEval "({ requestModeVisible: Boolean(Array.from(document.querySelectorAll('label')).find(node => node.textContent?.includes('Seu nome'))), hasRequestMessageField: Boolean(Array.from(document.querySelectorAll('label')).find(node => node.textContent?.includes('Mensagem para aprovacao'))), hasBackToLogin: Boolean(Array.from(document.querySelectorAll('button')).find(node => node.textContent?.match(/Voltar ao login/i))) })"

      $backToLogin = Invoke-JsonEval "(() => { const button = Array.from(document.querySelectorAll('button')).find(node => node.textContent?.match(/Voltar ao login/i)); if (!button) return false; button.click(); return true; })()"
      if ($backToLogin -eq $true -or $backToLogin -eq 'true') {
        Wait-PageReady
      }
    }

    $report.api.ssoStart = Invoke-JsonRequest -Url "$baseUrl/api/sso/start" -Method 'POST' -Body @{
      workspace_slug = $firstWorkspace.slug
      return_to = "/w/$($firstWorkspace.slug)"
    }
  }

  Invoke-PwCli goto "$baseUrl/auth/callback" | Out-Null
  Wait-PageReady
  $report.pages.callbackMissingParams = Invoke-JsonEval "({ url: location.href, hasExpectedMessage: document.body.textContent.includes('Callback de SSO incompleto') })"

  Invoke-PwCli goto "$baseUrl/auth/callback?error=access_denied&error_description=portal%20recusou" | Out-Null
  Wait-PageReady
  $report.pages.callbackProviderError = Invoke-JsonEval "({ url: location.href, hasExpectedMessage: document.body.textContent.includes('portal recusou') })"

  Invoke-PwCli goto "$baseUrl/auth/callback?code=invalid-code-12345678&state=bad-state-12345678" | Out-Null
  Wait-PageReady
  $report.pages.callbackInvalidState = Invoke-JsonEval "({ url: location.href, hasInvalidStateMessage: document.body.textContent.includes('Invalid or expired SSO state') || document.body.textContent.includes('Central SSO is disabled') || document.body.textContent.includes('Falha ao concluir o SSO central') })"

  $consoleCliOutput = (Invoke-PwCli console | Out-String)
  $networkCliOutput = (Invoke-PwCli network | Out-String)
  $report.artifacts.console = $consoleCliOutput.Trim()
  $report.artifacts.network = $networkCliOutput.Trim()

  $consoleText = Get-ArtifactText -CliOutput $consoleCliOutput
  $networkText = Get-ArtifactText -CliOutput $networkCliOutput

  $consoleErrors = @()
  $consoleWarnings = @()
  foreach ($line in ($consoleText -split "`r?`n")) {
    if ($line -match '^\[ERROR\]\s+(?<text>.+)$') {
      $consoleErrors += $Matches['text']
    } elseif ($line -match '^\[WARNING\]\s+(?<text>.+)$') {
      $consoleWarnings += $Matches['text']
    }
  }

  $unexpectedResponses = @()
  $allowedResponses = @()
  foreach ($line in ($networkText -split "`r?`n")) {
    if ($line -match '^\[(?<method>[A-Z]+)\]\s+(?<url>\S+)\s+=>\s+\[(?<status>\d+)\]\s+(?<reason>.+)$') {
      $entry = [ordered]@{
        method = $Matches['method']
        url = $Matches['url']
        status = [int]$Matches['status']
        reason = $Matches['reason']
      }

      if ($entry.status -ge 400) {
        $allowed = $false

        if (-not $ssoEnabled -and $entry.url -like "$baseUrl/api/sso/start" -and $entry.status -eq 404) {
          $allowed = $true
        }

        if ($entry.url -like "$baseUrl/api/sso/exchange") {
          if ($ssoEnabled -and $entry.status -eq 400) {
            $allowed = $true
          }
          if (-not $ssoEnabled -and $entry.status -eq 404) {
            $allowed = $true
          }
        }

        if ($allowed) {
          $allowedResponses += $entry
        } else {
          $unexpectedResponses += $entry
        }
      }
    }
  }

  $filteredConsoleErrors = @()
  foreach ($item in $consoleErrors) {
    $allowed = $false
    if ($item -match '/api/sso/start' -and -not $ssoEnabled) {
      $allowed = $true
    }
    if ($item -match '/api/sso/exchange' -and (-not $ssoEnabled -or $true)) {
      $allowed = $true
    }

    if ($allowed) {
      $allowedResponses += [ordered]@{ method = 'BROWSER'; url = $item; status = 'allowed'; reason = 'console mirror of expected negative flow' }
    } else {
      $filteredConsoleErrors += $item
    }
  }

  $report.console.errors = @($filteredConsoleErrors)
  $report.console.warnings = @($consoleWarnings)
  $report.network.unexpectedResponses = @($unexpectedResponses)
  $report.network.allowedResponses = @($allowedResponses)

  if ($report.api.health.status -ne 200 -or -not $report.api.health.ok) {
    Add-GateFailure -Report $report -Code 'api-health' -Message 'Health check precisa responder 200.' -Details $report.api.health
  }

  if ($report.api.publicWorkspaces.status -ne 200 -or -not $report.api.publicWorkspaces.ok) {
    Add-GateFailure -Report $report -Code 'api-public-workspaces' -Message 'A listagem publica de workspaces precisa responder 200.' -Details $report.api.publicWorkspaces
  }

  if ($report.api.ssoConfig.status -ne 200 -or -not $report.api.ssoConfig.ok) {
    Add-GateFailure -Report $report -Code 'api-sso-config' -Message 'A configuracao de SSO precisa responder 200.' -Details $report.api.ssoConfig
  }

  if (-not $firstWorkspace) {
    Add-GateFailure -Report $report -Code 'workspace-seed' -Message 'A auditoria precisa de pelo menos um workspace publico.' -Details $report.api.publicWorkspaces.body
  }

  if ($report.pages.workspaces.url -ne "$baseUrl/workspaces") {
    Add-GateFailure -Report $report -Code 'page-workspaces-url' -Message 'A rota /workspaces deve permanecer em /workspaces.' -Details $report.pages.workspaces
  }

  if ($report.pages.workspaces.heading -ne 'Selecionar workspace') {
    Add-GateFailure -Report $report -Code 'page-workspaces-heading' -Message 'A rota /workspaces deve expor o heading da selecao de workspace.' -Details $report.pages.workspaces
  }

  if ($workspaces.Count -gt 0 -and @($report.pages.workspaces.visibleWorkspaceNames).Count -eq 0) {
    Add-GateFailure -Report $report -Code 'page-workspaces-cards' -Message 'A rota /workspaces precisa renderizar workspaces visiveis.' -Details $report.pages.workspaces
  }

  if ($firstWorkspace) {
    if (-not $report.pages.protectedRedirect.redirectedToLogin) {
      Add-GateFailure -Report $report -Code 'page-protected-redirect' -Message 'Raiz do workspace sem sessao deve redirecionar ao login contextualizado.' -Details $report.pages.protectedRedirect
    }

    if (-not $report.pages.protectedRedirect.preservedReturnTo) {
      Add-GateFailure -Report $report -Code 'page-protected-returnto' -Message 'O redirect deve preservar returnTo.' -Details $report.pages.protectedRedirect
    }

    if ($report.pages.login.url -ne "$baseUrl/w/$($firstWorkspace.slug)/login") {
      Add-GateFailure -Report $report -Code 'page-login-url' -Message 'A rota de login do workspace deve manter o path contextualizado.' -Details $report.pages.login
    }

    if ([bool]$report.pages.login.hasLegacySubmit -ne [bool]$allowLegacyPasswordLogin) {
      Add-GateFailure -Report $report -Code 'page-login-legacy-consistency' -Message 'A UI de login precisa refletir allow_legacy_password_login.' -Details @{ login = $report.pages.login; ssoConfig = $report.api.ssoConfig.body }
    }

    if ($ssoEnabled -and -not $report.pages.login.hasSsoPrimary) {
      Add-GateFailure -Report $report -Code 'page-login-sso-entry' -Message 'Com SSO habilitado, a tela precisa expor CTA de SSO.' -Details @{ login = $report.pages.login; ssoConfig = $report.api.ssoConfig.body }
    }

    if (-not $ssoEnabled -and $report.api.ssoStart.status -ne 404) {
      Add-GateFailure -Report $report -Code 'api-sso-start-disabled' -Message 'Com SSO desabilitado, /api/sso/start deve responder 404.' -Details $report.api.ssoStart
    }

    if ($ssoEnabled -and $report.api.ssoStart.status -ne 200) {
      Add-GateFailure -Report $report -Code 'api-sso-start-enabled' -Message 'Com SSO habilitado, /api/sso/start precisa responder 200.' -Details $report.api.ssoStart
    }

    if ($report.pages.requestAccess) {
      if (-not $report.pages.requestAccess.requestModeVisible) {
        Add-GateFailure -Report $report -Code 'page-request-access-open' -Message 'Solicitar cadastro precisa abrir o formulario.' -Details $report.pages.requestAccess
      }

      if (-not $report.pages.requestAccess.hasRequestMessageField) {
        Add-GateFailure -Report $report -Code 'page-request-access-fields' -Message 'O formulario de request access precisa expor a mensagem de aprovacao.' -Details $report.pages.requestAccess
      }
    }
  }

  if (-not $report.pages.callbackMissingParams.hasExpectedMessage) {
    Add-GateFailure -Report $report -Code 'page-callback-missing-params' -Message 'Callback sem code/state precisa renderizar erro legivel.' -Details $report.pages.callbackMissingParams
  }

  if (-not $report.pages.callbackProviderError.hasExpectedMessage) {
    Add-GateFailure -Report $report -Code 'page-callback-provider-error' -Message 'Callback com erro do provider precisa renderizar a mensagem propagada.' -Details $report.pages.callbackProviderError
  }

  if (-not $report.pages.callbackInvalidState.hasInvalidStateMessage) {
    Add-GateFailure -Report $report -Code 'page-callback-invalid-state' -Message 'Callback com state invalido precisa falhar de forma legivel.' -Details $report.pages.callbackInvalidState
  }

  if (@($report.network.unexpectedResponses).Count -gt 0) {
    Add-GateFailure -Report $report -Code 'network-unexpected-4xx5xx' -Message 'Foram detectados 4xx/5xx fora dos cenarios negativos aceitos.' -Details $report.network.unexpectedResponses
  }

  if (@($report.console.errors).Count -gt 0) {
    Add-GateFailure -Report $report -Code 'console-errors' -Message 'Foram detectados console errors nos funis auditados.' -Details $report.console.errors
  }

  if (@($report.console.warnings).Count -gt 0) {
    Add-GateWarning -Report $report -Code 'console-warnings' -Message 'Foram detectados console warnings; nao bloqueiam o gate.' -Details $report.console.warnings
  }

  $report.gate.passed = @($report.gate.failures).Count -eq 0
  $report | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8 $reportPath
  Write-Output ($report | ConvertTo-Json -Depth 20)

  if (-not $report.gate.passed) {
    $codes = @($report.gate.failures | ForEach-Object { $_.code }) -join ', '
    throw "Gate de UX/SSO/workspaces falhou: $codes"
  }
} finally {
  Invoke-PwCli close | Out-Null
}
