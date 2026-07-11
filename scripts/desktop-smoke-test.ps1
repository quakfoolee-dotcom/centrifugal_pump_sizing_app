$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$exePath = Join-Path $repoRoot "out\Centrifugal Pump Sizing-win32-x64\CentrifugalPumpSizing.exe"
$resultPath = Join-Path $repoRoot "out\desktop-smoke-result.json"

if (-not (Test-Path -LiteralPath $exePath)) {
  throw "Packaged desktop executable not found: $exePath"
}
if (Test-Path -LiteralPath $resultPath) {
  Remove-Item -LiteralPath $resultPath -Force
}

$env:PUMP_DESKTOP_SMOKE_RESULT = $resultPath
$process = Start-Process -FilePath $exePath -PassThru
try {
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  while (-not (Test-Path -LiteralPath $resultPath) -and [DateTime]::UtcNow -lt $deadline) {
    Start-Sleep -Milliseconds 250
  }
  if (-not (Test-Path -LiteralPath $resultPath)) {
    throw "Desktop smoke test timed out waiting for the packaged app result."
  }
} finally {
  Remove-Item Env:\PUMP_DESKTOP_SMOKE_RESULT -ErrorAction SilentlyContinue
  Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path -LiteralPath $resultPath)) {
  throw "Desktop app exited without producing a smoke-test result."
}

$result = Get-Content -Raw -LiteralPath $resultPath | ConvertFrom-Json
if (-not $result.ok -or -not $result.hasRoot -or -not $result.hasPrintButton -or $result.version -ne "0.11.1") {
  throw "Desktop smoke test failed: $(Get-Content -Raw -LiteralPath $resultPath)"
}

Write-Output "desktop-smoke-test: packaged offline app loaded v$($result.version), root and report controls passed"
