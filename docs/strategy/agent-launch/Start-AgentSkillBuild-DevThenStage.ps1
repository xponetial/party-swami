param(
  [string]$Model = "gpt-5.3-codex",
  [ValidateSet("core","marketplace","growth","all")]
  [string]$Wave = "all",
  [switch]$RetryTokenFailures,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$runner = Join-Path $PSScriptRoot "Start-AgentSkillBuild.ps1"
$restart = Join-Path $PSScriptRoot "Restart-AgentSkillBuildFailed.ps1"
if (-not (Test-Path $runner)) {
  throw "Missing runner script: $runner"
}
if ($RetryTokenFailures -and -not (Test-Path $restart)) {
  throw "Missing restart script: $restart"
}

$common = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $runner,
  "-Model", $Model,
  "-Wave", $Wave
)

if ($DryRun) {
  Write-Host "[dry-run] dev"
  & powershell @($common + @("-Environment", "dev", "-DryRun"))
  Write-Host "[dry-run] stage"
  & powershell @($common + @("-Environment", "stage", "-DryRun"))
  exit 0
}

Write-Host "Launching dev wave..."
& powershell @($common + @("-Environment", "dev"))

if ($RetryTokenFailures) {
  Write-Host "Retrying token-limited dev runs..."
  & powershell -NoProfile -ExecutionPolicy Bypass -File $restart -Model $Model -Environment dev -Wave $Wave -Mode token-only
}

Write-Host "Launching stage wave..."
& powershell @($common + @("-Environment", "stage"))

if ($RetryTokenFailures) {
  Write-Host "Retrying token-limited stage runs..."
  & powershell -NoProfile -ExecutionPolicy Bypass -File $restart -Model $Model -Environment stage -Wave $Wave -Mode token-only
}

Write-Host "Dev + stage launches complete."
