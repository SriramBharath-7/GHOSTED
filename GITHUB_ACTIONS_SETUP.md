# GHOSTED V7.0 — Phase 3: GitHub Actions APK build

This packages the same GHOSTED V7.0 Phase 2 Vite + Capacitor sources and adds ONE workflow file:

`.github/workflows/android-debug-apk.yml`

## USE WITH YOUR EXISTING WORKING PROJECT (RECOMMENDED)

You already successfully ran `scripts/setup-android.ps1` in `D:\GHOSTED_V7_0_PHASE2_CAPACITOR` and generated a local `android/` directory. DO NOT replace that working directory with this ZIP. Instead:

1. Copy `.github/workflows/android-debug-apk.yml` from this release into your EXISTING `D:\GHOSTED_V7_0_PHASE2_CAPACITOR\.github\workflows\` (create the directories).
2. In VS Code, initialize a **private** GitHub repository for the existing project. You may track the `android/` folder, including `android/gradlew`, `android/gradle/wrapper/gradle-wrapper.jar`, and project Gradle files. The `.gitignore` excludes build outputs, local.properties, and keys. The workflow ALSO handles repos where android/ hasn't been committed by running `npx cap add android` in CI.
3. Commit `package-lock.json` if npm created it; the workflow uses `npm ci` when available.
4. Push to `main` or `master` (or use Actions > GHOSTED - Android Debug APK > Run workflow).
5. Wait for the Actions run to finish. Under the run's **Artifacts**, download `GHOSTED-Android-Debug-*` and extract `app-debug.apk`.
6. Transfer that APK to your Android phone and install it as a test app. Android may warn about sideloading; only install your own trusted build.

## PowerShell commands (from the existing project folder)

    git init
    git branch -M main
    git add .
    git commit -m "GHOSTED: Android CI debug APK workflow"
    git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_PRIVATE_REPO.git
    git push -u origin main

Create the empty PRIVATE GitHub repo before the remote/push step. If your project already uses Git, SKIP `git init`, `git branch`, and `git remote add` when unnecessary; just add, commit, and push. Never commit `.env`, Vault exports, APK signing passwords, or keystores.

### Important checks

- Android Studio is NOT required on your PC for this workflow. GitHub's Linux runner sets up Java/Android SDK.
- Android app data is **independent** from Chrome/localhost storage. Back up your browser progress; do not assume it appears in the APK.
- This is a DEBUG APK for personal testing, not a Play Store production-signed build.
- This has NOT yet run on GitHub or compiled a real APK; the cloud build outcome must be observed in the Actions run.
- This release only adds CI packaging. No changes to GHOSTED visuals, XP, coins, or Vault.
- The original large V6.9.6 rollback remains in the complete ZIP; it may contain personal/demo profile text. Keep the GitHub repository private and consider storing rollback outside GitHub to reduce repo size.
- On GitHub, debug APK artifacts have a limited retention time (14 days configured).

### Troubleshooting

If the build fails, share the FIRST failed GitHub Actions step and its error lines. Typical causes include an uncached Android SDK component, Gradle compatibility, or dependency versions. Avoid running `npm audit fix --force` without reviewing changes.
