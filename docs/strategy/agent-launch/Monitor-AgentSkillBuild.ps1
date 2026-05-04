param(
  [ValidateSet("dev","stage")]
  [string]$Environment = "dev",
  [switch]$Watch,
  [int]$IntervalSec = 5
)

$ErrorActionPreference = "Stop"

$base = $PSScriptRoot
$statusDir = Join-Path $base "status\\agent-skill-build\\$Environment"
$logDir = Join-Path $base "logs\\agent-skill-build\\$Environment"

function Get-LastLogLine {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return "" }
  $line = Get-Content $Path -Tail 1 -ErrorAction SilentlyContinue
  if ($null -eq $line) { return "" }
  return [string]$line
}

function Show-Snapshot {
  if (-not (Test-Path $statusDir)) {
    Write-Host "No status directory found yet: $statusDir"
    return
  }

  $rows = @()
  foreach ($file in (Get-ChildItem $statusDir -File -Filter *.json | Sort-Object Name)) {
    try {
      $obj = Get-Content $file.FullName -Raw | ConvertFrom-Json
      $logPath = Join-Path $logDir ("$($obj.task_id).log")
      $logSize = if (Test-Path $logPath) { (Get-Item $logPath).Length } else { 0 }
      $rows += [pscustomobject]@{
        task_id = $obj.task_id
        wave = $obj.wave
        state = $obj.state
        pid = $obj.pid
        exit_code = $obj.exit_code
        timestamp = $obj.timestamp
        log_bytes = $logSize
        last_log_line = (Get-LastLogLine $logPath)
      }
    } catch {
      $rows += [pscustomobject]@{
        task_id = $file.BaseName
        wave = ""
        state = "invalid-status-json"
        pid = ""
        exit_code = ""
        timestamp = ""
        log_bytes = 0
        last_log_line = ""
      }
    }
  }

  if (-not $rows.Count) {
    Write-Host "No status files yet in $statusDir"
    return
  }

  $counts = $rows | Group-Object state | Sort-Object Name
  $summary = ($counts | ForEach-Object { "$($_.Name)=$($_.Count)" }) -join " | "
  Write-Host ("[{0}] {1}" -f (Get-Date).ToString("HH:mm:ss"), $summary)
  $rows | Sort-Object task_id | Format-Table task_id,wave,state,pid,exit_code,log_bytes,timestamp -AutoSize
}

if (-not $Watch) {
  Show-Snapshot
  exit 0
}

while ($true) {
  Clear-Host
  Show-Snapshot
  Start-Sleep -Seconds $IntervalSec
}
