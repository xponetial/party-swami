param(
  [string]$Model = "gpt-5.3-codex",
  [ValidateSet("dev","stage")]
  [string]$Environment = "dev",
  [ValidateSet("core","marketplace","growth","all")]
  [string]$Wave = "all",
  [ValidateSet("token-only","any-failure")]
  [string]$Mode = "token-only",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$scriptDir = $PSScriptRoot
$runner = Join-Path $scriptDir "Start-AgentSkillBuild.ps1"
$taskFile = Join-Path $scriptDir "task-matrix\\agent-skill-build.tasks.json"
$logDir = Join-Path $scriptDir "logs\\agent-skill-build\\$Environment"

if (-not (Test-Path $runner)) {
  throw "Missing runner: $runner"
}
if (-not (Test-Path $taskFile)) {
  throw "Missing task matrix: $taskFile"
}
if (-not (Test-Path $logDir)) {
  throw "No logs found for env=$Environment at $logDir"
}

$tasks = Get-Content $taskFile -Raw | ConvertFrom-Json

switch ($Wave) {
  "core" { $scope = @($tasks | Where-Object { $_.wave -eq "core" }) }
  "marketplace" { $scope = @($tasks | Where-Object { $_.wave -eq "marketplace" }) }
  "growth" { $scope = @($tasks | Where-Object { $_.wave -eq "growth" }) }
  default { $scope = @($tasks) }
}

$tokenPatterns = @(
  "token",
  "context length",
  "maximum context",
  "max tokens",
  "too many tokens",
  "rate limit",
  "429",
  "exhausted"
)

$failurePatterns = @(
  "error",
  "failed",
  "exception",
  "timed out",
  "unable to"
)

$restartIds = New-Object System.Collections.Generic.HashSet[string]

foreach ($task in $scope) {
  $id = [string]$task.id
  $logPath = Join-Path $logDir "$id.log"

  # Missing log means task likely never ran or was interrupted; include for restart.
  if (-not (Test-Path $logPath)) {
    [void]$restartIds.Add($id)
    continue
  }

  $content = (Get-Content $logPath -Raw)
  $haystack = $content.ToLowerInvariant()

  $tokenHit = $false
  foreach ($p in $tokenPatterns) {
    if ($haystack.Contains($p)) { $tokenHit = $true; break }
  }

  $failureHit = $false
  foreach ($p in $failurePatterns) {
    if ($haystack.Contains($p)) { $failureHit = $true; break }
  }

  if ($Mode -eq "token-only" -and $tokenHit) {
    [void]$restartIds.Add($id)
  }
  if ($Mode -eq "any-failure" -and ($tokenHit -or $failureHit)) {
    [void]$restartIds.Add($id)
  }
}

$ids = @($restartIds)
if (-not $ids.Count) {
  Write-Host "No tasks matched restart criteria (mode=$Mode, env=$Environment, wave=$Wave)."
  exit 0
}

Write-Host "Restarting tasks: $($ids -join ', ')"

$args = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $runner,
  "-Model", $Model,
  "-Environment", $Environment,
  "-Wave", $Wave,
  "-TaskIdsCsv", ($ids -join ",")
)

if ($DryRun) {
  $args += "-DryRun"
}

& powershell $args
