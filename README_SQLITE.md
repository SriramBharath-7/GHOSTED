# GHOSTED V7.1 — SQLite Foundation (Android)

A **targeted patch** for your current GitHub project. Keeps all approved UI, CSS, frame, launcher icon, rank art, animations, and reward code untouched.

## What this first checkpoint actually does
- On **native Android**, opens a SQLite database using `@capacitor-community/sqlite` v8.
- Stores snapshots of the existing GHOSTED profile and encrypted Vault values in a `snapshots` table.
- At startup, **never overwrites existing WebView localStorage**. If a supported value is missing there, restores it from SQLite before the original app starts.
- Preserves existing synchronous localStorage saves, so actions feel identical. Mirrors writes asynchronously to native SQLite in order.
- On browser Vite preview, uses the original localStorage without requiring `jeep-sqlite` or browser SQLite setup.
- Includes a developer status probe: `window.GHOSTED_NATIVE_DB.status()` in remote debugging.

**This is a SQLite foundation/mirror, not yet a fully transactional SQLite-primary data layer or cloud sync.** Abrupt termination immediately after a write may prevent the mirror from finishing. The next checkpoint will harden durability and test on your actual device.

## Apply to your CURRENT WORKING GitHub project

1. Extract ZIP. Merge **only** `index.html`, `public/js/ghosted-05.js`, and `src/main.js` into your working project. This patch contains NO older CSS or embedded images.
2. In the project root run:

```powershell
npm install @capacitor-community/sqlite@8.1.1
npm run build
npx cap sync android
```

3. Commit the changes, **including `package.json` and updated `package-lock.json`**:

```powershell
git add index.html public/js/ghosted-05.js src/main.js package.json package-lock.json android
git commit -m "GHOSTED V7.1 SQLite foundation"
git push origin main
```

4. Download the GitHub Actions APK and **install it over the existing app** (same app ID and compatible signing key); do not uninstall or clear storage.
5. Check on phone: open GHOSTED, mark/undo a protocol, close and reopen, confirm history, XP and coins. Vault should still unlock with its original password.
6. For stronger SQLite verification, use Android WebView remote debugging and inspect `GHOSTED_NATIVE_DB.status()`; expected `state: 'sqlite-ready'`. Without this inspection, the UI working alone doesn't prove SQLite is active.

## Important details
- Browser-local data on `localhost` does not transfer automatically to an installed Android app.
- The Vault values mirrored to SQLite are **already encrypted ciphertext**; public profile snapshots are not encrypted. This plugin uses SQLCipher internally but the database is configured `no-encryption` here. Avoid storing private information in public profile fields.
- If SQLite init fails, GHOSTED continues using existing WebView storage, with an error logged in the console.
- Plugin Android minimums, Gradle compatibility, and the full APK have **not been device-tested in this environment**. Review GitHub Actions logs.
- Do not merge older GHOSTED mobile polish ZIPs over this code; keep your latest approved native frame and icon files.
