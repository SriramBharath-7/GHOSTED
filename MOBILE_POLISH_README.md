# GHOSTED V7.0 Mobile Polish Patch

This patch adds three fixes for the working APK build:

1. Real Android launcher app icon
2. Mobile frame aligned flush to the viewport edges
3. Hidden mobile scrollbars (scroll still works)

## Apply to your existing project

Copy this patch into your existing `GHOSTED_V7_0_PHASE2_CAPACITOR` project and replace matching files.

### 1) Copy the web source updates
- `index.html`
- `public/css/ghosted-01.css`
- `resources/GHOSTED_APP_ICON.png`
- `scripts/apply-android-icon.ps1`
- `android_icon_patch/`

### 2) Apply the Android app icon files
In PowerShell inside the project root:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\apply-android-icon.ps1
```

### 3) Rebuild the app
```powershell
npm run build
npx cap sync android
```

Then build the APK again from your existing Android setup or GitHub Actions workflow.

## Notes
- The scrollbar is only hidden on mobile widths; scrolling still works.
- The frame fix is CSS-only and does not change your gameplay, storage, rewards, or navigation.
- If you want the app to draw *behind* Android system bars later, that is a separate native status-bar pass.
