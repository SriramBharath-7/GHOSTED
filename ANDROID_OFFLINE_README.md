# GHOSTED Android — Offline-only edition

This is a **separate Android build** of the GHOSTED terminal experience. The website is unchanged and still builds with `npm run build`. Android builds with `npm run build:mobile` into `dist-mobile/`. Capacitor packages **only** that Android output. This keeps the Android app's JavaScript entrypoint independent of the website's cloud/sync code.

## What is stored where?

- **While installed:** GHOSTED keeps its usual local WebView state and mirrors public history and *encrypted* Vault records into a native SQLite database. Nothing is sent to Supabase by this Android entrypoint.
- **After uninstall:** Android deletes app-private WebView and SQLite storage. This is an operating-system rule. Keeping the same app ID or using SQLite cannot prevent it.
- **Surviving uninstall:** Choose a folder under **Internal storage > Documents > GHOSTED** using Android's system folder picker. The app saves alternating `GHOSTED_BACKUP_A.json` and `GHOSTED_BACKUP_B.json` into that user-owned folder. These files are **outside app-private storage** and should remain on the device when the app is uninstalled.
- **Restoring after reinstall:** Open GHOSTED > Settings > **Choose Backup Folder**, pick the SAME folder, then confirm the restore from the latest valid backup. The app protects its current local profile with a safety copy before replacing data. It restarts once to load the imported history.
- **Auto backup:** After choosing a new empty folder, automatic backup starts. If existing backups are found, automatic writing remains OFF until you restore or explicitly choose to replace the saved copies. This prevents a freshly reinstalled empty app from erasing your only surviving backup.

**No cloud guarantee:** The picker only accepts Android's local external-storage provider, not Drive or other cloud-backed providers. The APK requests no Internet permission. The Android CI no longer needs Supabase build variables; the website keeps its own build and cloud contract workflow.

## Important limitations

- You must **select the Documents folder once** in the app, and select it again after reinstall. Android revokes the app's folder permission on uninstall.
- A backup only protects data written **up to its latest successful readback-verified save**. A sudden uninstall immediately after recording a habit can still lose the final unsaved external backup. Use **Settings > Backup Now** before uninstalling or moving phones.
- Android's Documents provider or the phone's storage can fail or be removed. Keep an extra copy in a second physical location for true disaster recovery. No remote transfer is performed automatically.
- **Public profile is readable JSON**, including habit history and notes. Vault fields are copied as AES-GCM ciphertext only, and still require your original Vault password. Protect the folder.
- The new offline Android build is not automatically synchronized with the existing website. Their device data will diverge. Android's current local data is preserved when updating the existing installation with the same package name and compatible signing key.
- **Do not uninstall the current GHOSTED APK before verifying the external backups** on the device.

## Build / test

```bash
npm ci
npm run test:mobile
npm run build:mobile
npx cap sync android
cd android
./gradlew assembleDebug
```

The Android workflow runs these steps and uploads the signed debug APK as an Actions artifact if they pass. The existing persistent debug keystore secret must be present. An ordinary web deploy on Vercel continues to use `npm run build`, not `build:mobile`.

## Recovery drill (do this once before trusting uninstall persistence)

1. Install the new APK **over** the existing one, don't clear storage.
2. Confirm history/XP/coins and Vault are intact, offline.
3. Open Settings > Choose Backup Folder and select a locally stored `Documents/GHOSTED` folder.
4. Mark a protocol complete, use **Backup Now**, and verify backup status.
5. **Without uninstalling**, make a copy of the folder or perform a restore test on a separate test device using the folder files.
6. Only after the physical backup and restore have been independently verified should you consider uninstall/reinstall testing.

This update does not claim to have completed physical Android uninstall/reinstall tests until tested on a real device.
