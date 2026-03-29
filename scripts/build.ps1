[CmdletBinding()]
param()

$scriptPath = Join-Path $PSScriptRoot 'run-project.ps1'
& $scriptPath -Command build
exit $LASTEXITCODE
