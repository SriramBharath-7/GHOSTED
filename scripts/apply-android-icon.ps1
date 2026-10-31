$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$source = Join-Path $projectRoot 'android_icon_patch\app\src\main\res'
$target = Join-Path $projectRoot 'android\app\src\main\res'
if (-not (Test-Path $target)) {
  throw "Android project not found. Run .\scripts\setup-android.ps1 first so the android/ folder exists."
}
Copy-Item (Join-Path $source '*') $target -Recurse -Force
Write-Host 'GHOSTED Android launcher icon files copied into android/app/src/main/res/' -ForegroundColor Green
Write-Host 'Next run: npm run build; npx cap sync android; then rebuild the APK.' -ForegroundColor Cyan
