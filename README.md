# GHOSTED V7.0 — Phase 2: Capacitor Android integration

**Status: Capacitor-configured Vite project. Native `android/` folder and APK must be generated on your development PC.**

This is the unchanged Phase 1 web experience plus Capacitor 8 package/configuration and Windows setup scripts. No SQLite, Supabase, notifications or native data migration is implemented yet. The original V6.9.6 single-file rollback is included. All 5 JS and 2 CSS modules are intentionally unchanged.

## Requirements (Windows)

- Node.js **22+** (run `node -v`)
- Android Studio **2025.2.1+** with Android SDK (Capacitor 8 requirement)
- Internet access for first `npm install` and Gradle dependencies
- Unzip to a regular development folder, preferably without spaces or cloud-sync paths

## 1 — First Android setup

In VS Code PowerShell terminal at the **project root**:

```powershell
.\scripts\setup-android.ps1
```

Or perform manually:

```powershell
npm install
npm run build
npx cap add android
npx cap sync android
```

The command generates the `android/` directory **on your PC**. Do not run `npx cap add android` again after it exists; use `npm run android:sync` for every web change.

If PowerShell execution policy blocks the script, run the four manual commands shown above; don't change machine-wide security settings just for this script.

## 2 — Open Android Studio and build

```powershell
npm run android:open
```

Allow Gradle to sync/install SDK components, select a physical device or emulator and press Run.

To generate a *debug* APK via CLI once Android SDK is configured:

```powershell
.\scripts\build-debug-apk.ps1
```

The file should appear at `android/app/build/outputs/apk/debug/app-debug.apk`. Debug APKs are for testing only, not production release signing. You can also generate it from Android Studio > Build.

## 3 — Subsequent changes

```powershell
npm run android:sync
npm run android:open
```

`npm run dev` still starts the browser site.

## App identity

- Display name: **GHOSTED**
- Development package ID: **com.ghosted.operator**. Treat as provisional until ownership/name finalized: changing it after app publication is disruptive.
- Capacitor loads the app from bundled `dist` files, **not** from a Vercel URL. No `server.url` is configured.
- `webDir` is `dist`, built by Vite. `vite.config.js` retains relative base `./`.

## Critical: data and security

**Do not uninstall or clear your original Chrome/standalone GHOSTED storage.** Capacitor's WebView uses a separate origin/storage container: browser `localStorage` does not migrate automatically. Current test installation will initialize its own profile. Export/back up existing data before migration; Phase 3 will implement a verified import and local persistence approach.

Your personal encrypted Vault and browser profile require separate migration checks. Never delete original profiles or assume the four-digit Vault password is sufficient security for sensitive data.

This release does not add live cloud sync, SQLite, GitHub Actions, native notifications or signed release APKs.

## Verification performed in this environment

- The Phase 1 `index.html`, both CSS files and all five JS files copied byte-for-byte (SHA-256 parity).
- JS syntax validated with `node --check`.
- Capacitor configuration and package JSON syntax validated.
- ZIP integrity tested.

**Not verified:** npm dependency installation, `cap add android`, Gradle build, native device startup, storage behavior or Android app appearance. npm registry networking is unavailable in this runtime. Those checks must be performed on your machine. Initial Phase 1 screenshot confirmed browser Vite rendering only.
