param(
  [string]$Model = "gpt-5.3-codex",
  [ValidateSet("dev","stage")]
  [string]$Environment = "dev",
  [ValidateSet("core","marketplace","growth","all")]
  [string]$Wave = "all",
  [string[]]$TaskIds = @(),
  [string]$TaskIdsCsv = "",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..\\..")).Path
$taskFile = Join-Path $PSScriptRoot "task-matrix\\agent-skill-build.tasks.json"
$logsDir = Join-Path $PSScriptRoot "logs\\agent-skill-build\\$Environment"
$statusDir = Join-Path $PSScriptRoot "status\\agent-skill-build\\$Environment"
$outputsDir = Join-Path $repoRoot "docs\\strategy\\outputs\\agent-build"
$tempPromptDir = Join-Path $PSScriptRoot "tmp-prompts\\$Environment"
$runnerScript = Join-Path $PSScriptRoot "Run-AgentSkillTask.ps1"

New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
New-Item -ItemType Directory -Path $statusDir -Force | Out-Null
New-Item -ItemType Directory -Path $outputsDir -Force | Out-Null
New-Item -ItemType Directory -Path $tempPromptDir -Force | Out-Null

if (-not (Test-Path $runnerScript)) {
  throw "Missing task runner: $runnerScript"
}

if (-not (Test-Path $taskFile)) {
  throw "Missing task matrix: $taskFile"
}

$tasks = Get-Content $taskFile -Raw | ConvertFrom-Json
if (-not $tasks) {
  throw "No tasks found in $taskFile"
}

switch ($Wave) {
  "core" { $selected = @($tasks | Where-Object { $_.wave -eq "core" }) }
  "marketplace" { $selected = @($tasks | Where-Object { $_.wave -eq "marketplace" }) }
  "growth" { $selected = @($tasks | Where-Object { $_.wave -eq "growth" }) }
  default { $selected = @($tasks) }
}

if ($TaskIds.Count -gt 0) {
  $selected = @($selected | Where-Object { $TaskIds -contains [string]$_.id })
}

if ($TaskIdsCsv.Trim().Length -gt 0) {
  $csvIds = @($TaskIdsCsv.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  $selected = @($selected | Where-Object { $csvIds -contains [string]$_.id })
}

if (-not $selected.Count) {
  throw "No tasks selected for wave '$Wave' with TaskIds filter."
}

foreach ($task in $selected) {
  $promptPath = Join-Path $repoRoot $task.prompt
  if (-not (Test-Path $promptPath)) {
    throw "Missing prompt file: $promptPath"
  }
}

foreach ($task in $selected) {
  $name = [string]$task.id
  $promptPath = Join-Path $repoRoot $task.prompt
  $logPath = Join-Path $logsDir ("$name.log")
  $statusPath = Join-Path $statusDir ("$name.json")
  $tempPromptPath = Join-Path $tempPromptDir ("$name.md")
  $prefix = @(
    "Environment Target: $Environment"
    ""
    "Rules:"
    "- Work for $Environment only."
    "- Do not do production deploys, production aliases, or production config changes."
    "- Keep behavior safe for dev/stage validation first."
    ""
  ) -join [Environment]::NewLine
  $body = Get-Content $promptPath -Raw
  Set-Content -Path $tempPromptPath -Value ($prefix + [Environment]::NewLine + $body) -Encoding UTF8

  if ($DryRun) {
    $argsPreview = @(
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", $runnerScript,
      "-TaskId", $name,
      "-Wave", [string]$task.wave,
      "-Environment", $Environment,
      "-Model", $Model,
      "-RepoRoot", $repoRoot,
      "-PromptPath", $tempPromptPath,
      "-LogPath", $logPath,
      "-StatusPath", $statusPath
    ) -join " "
    Write-Host "[dry-run] $name => powershell $argsPreview"
    continue
  }

  # Clear stale status before launching.
  if (Test-Path $statusPath) { Remove-Item -LiteralPath $statusPath -Force }

  $proc = Start-Process -FilePath "powershell" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $runnerScript,
    "-TaskId", $name,
    "-Wave", [string]$task.wave,
    "-Environment", $Environment,
    "-Model", $Model,
    "-RepoRoot", $repoRoot,
    "-PromptPath", $tempPromptPath,
    "-LogPath", $logPath,
    "-StatusPath", $statusPath
  ) -WindowStyle Hidden -PassThru

  Write-Host "Started $name ($($task.wave), env=$Environment, pid=$($proc.Id))"
}

Write-Host "Launched $($selected.Count) agent/skill build tasks in parallel for env=$Environment."
Write-Host "Logs: $logsDir"
Write-Host "Status: $statusDir"
