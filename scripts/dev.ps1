[CmdletBinding()]
param()

$scriptPath = Join-Path $PSScriptRoot 'run-project.ps1'
& $scriptPath -Command dev
exit $LASTEXITCODE
