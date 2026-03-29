[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)]
  [ValidateSet('dev', 'build')]
  [string]$Command = 'dev'
)

$ErrorActionPreference = 'Stop'

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))

Push-Location $repoRoot
try {
  $location = (Get-Location).ProviderPath
  Write-Host "Executando 'npm run $Command' em $location"

  & node .\scripts\run-project.mjs $Command
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}
finally {
  Pop-Location
}
