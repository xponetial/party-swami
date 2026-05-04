param(
  [Parameter(Mandatory = $true)][string]$TaskId,
  [Parameter(Mandatory = $true)][string]$Wave,
  [Parameter(Mandatory = $true)][string]$Environment,
  [Parameter(Mandatory = $true)][string]$Model,
  [Parameter(Mandatory = $true)][string]$RepoRoot,
  [Parameter(Mandatory = $true)][string]$PromptPath,
  [Parameter(Mandatory = $true)][string]$LogPath,
  [Parameter(Mandatory = $true)][string]$StatusPath
)

$ErrorActionPreference = "Stop"

function Write-TaskStatus {
  param(
    [string]$State,
    [int]$ExitCode = 0,
    [string]$Message = ""
  )

  $payload = [ordered]@{
    task_id = $TaskId
    wave = $Wave
    environment = $Environment
    model = $Model
    state = $State
    pid = $PID
    exit_code = $ExitCode
    message = $Message
    timestamp = (Get-Date).ToString("o")
  }

  $payload | ConvertTo-Json -Depth 4 | Set-Content -Path $StatusPath -Encoding UTF8
}

New-Item -ItemType Directory -Path (Split-Path $LogPath -Parent) -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path $StatusPath -Parent) -Force | Out-Null

Write-TaskStatus -State "starting" -Message "Worker booted"

if (-not (Test-Path $PromptPath)) {
  Write-TaskStatus -State "failed" -ExitCode 2 -Message "Prompt file missing"
  throw "Prompt file missing: $PromptPath"
}

"" | Set-Content -Path $LogPath -Encoding UTF8
$prompt = Get-Content $PromptPath -Raw

Write-TaskStatus -State "running" -Message "Launching codex exec"

try {
  $codexCmd = Get-Command codex -ErrorAction Stop
  Add-Content -Path $LogPath -Value ("Using codex at: " + $codexCmd.Source)

  # Stream stdout+stderr to log while preserving the process exit code.
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $prompt | & codex exec --model $Model --cd $RepoRoot - 2>&1 | Tee-Object -FilePath $LogPath -Append | Out-Null
  $ErrorActionPreference = $prevEap
  $exitCode = $LASTEXITCODE
} catch {
  $msg = $_.Exception.Message
  Add-Content -Path $LogPath -Value ("Worker exception: " + $msg)
  Write-TaskStatus -State "failed" -ExitCode 3 -Message $msg
  exit 3
}

if ($exitCode -eq 0) {
  Write-TaskStatus -State "completed" -ExitCode 0 -Message "Run completed successfully"
  exit 0
}

Write-TaskStatus -State "failed" -ExitCode $exitCode -Message "Run failed"
exit $exitCode
