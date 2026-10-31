# Run after setup-android.ps1 and Android Studio SDK installation
$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
function Check([string]$Exe,[string[]]$Args) {
  Write-Host "> $Exe $($Args -join ' ')" -ForegroundColor Cyan
  & $Exe @Args
  if($LASTEXITCODE -ne 0){throw "Command failed: $Exe $($Args -join ' ')"}
}
if(-not (Test-Path 'android/gradlew.bat')){throw 'Android project not found. Run .\\scripts\\setup-android.ps1 first.'}
Check 'npm' @('run','android:sync')
Push-Location 'android'
try{Check '.\\gradlew.bat' @('assembleDebug')}finally{Pop-Location}
Write-Host 'APK: android/app/build/outputs/apk/debug/app-debug.apk' -ForegroundColor Green
