# GHOSTED Android local bootstrap (PowerShell 7 / Windows PowerShell 5.1)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
function Invoke-Checked([string]$Executable, [string[]]$Arguments) {
  Write-Host "`n> $Executable $($Arguments -join ' ')" -ForegroundColor Cyan
  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Executable failed (exit $LASTEXITCODE). Fix the error above and rerun." }
}
$nodeVersion = & node --version
if ($LASTEXITCODE -ne 0) { throw 'Node.js not found. Install Node.js 22+ first.' }
$major = [int]([regex]::Match($nodeVersion, '^v(\d+)').Groups[1].Value)
if ($major -lt 22) { throw "Node.js 22+ required. Found $nodeVersion" }
Write-Host "GHOSTED / Capacitor Android bootstrap - Node $nodeVersion" -ForegroundColor Green
Invoke-Checked 'npm' @('install')
Invoke-Checked 'npm' @('run','build')
if (Test-Path 'android') {
  Write-Host 'Existing android/ detected; syncing instead of overwriting.' -ForegroundColor Yellow
} else {
  Invoke-Checked 'npx' @('cap','add','android')
}
Invoke-Checked 'npx' @('cap','sync','android')
Write-Host "`nAndroid project ready under android/. Open with: npm run android:open" -ForegroundColor Green
Write-Host 'Android Studio / SDK is required to compile the APK.' -ForegroundColor Yellow
