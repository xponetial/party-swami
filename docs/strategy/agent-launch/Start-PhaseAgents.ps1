param(
  [string]$Model = "gpt-5.3-codex",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\\..\\..")).Path
$promptsDir = Join-Path $PSScriptRoot "phase-prompts"
$logsDir = Join-Path $PSScriptRoot "logs"
$outputsDir = Join-Path $repoRoot "docs\\strategy\\outputs"

New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
New-Item -ItemType Directory -Path $outputsDir -Force | Out-Null

$phases = @(
  "phase-00-foundation.md",
  "phase-01-revenue-mvp.md",
  "phase-02-core-experience.md",
  "phase-03-marketplace.md",
  "phase-04-growth-intel.md",
  "phase-05-software-factory.md"
)

foreach ($phase in $phases) {
  $promptPath = Join-Path $promptsDir $phase
  if (-not (Test-Path $promptPath)) {
    throw "Missing prompt file: $promptPath"
  }
}

foreach ($phase in $phases) {
  $promptPath = Join-Path $promptsDir $phase
  $logPath = Join-Path $logsDir ($phase -replace "\.md$", ".log")
  $name = $phase -replace "\.md$", ""
  $cmd = "codex exec --model $Model --cd `"$repoRoot`" - < `"$promptPath`" > `"$logPath`" 2>&1"

  if ($DryRun) {
    Write-Host "[dry-run] $cmd"
    continue
  }

  Start-Process -FilePath "powershell" -ArgumentList "-NoProfile", "-Command", $cmd -WindowStyle Hidden | Out-Null
  Write-Host "Started $name"
}

Write-Host "All phase agents launched in parallel."
Write-Host "Logs: $logsDir"
