# GHOSTED V7.0 — Asset Organization

This is a drop-in patch for your existing **Phase 2 Capacitor project with generated android/**, not a new Android app. It preserves all code except converting 144 embedded `data:image` references into static image URLs and updating the GitHub Actions SDK action to v4. Images are copied byte-for-byte from their encoded payloads; no recompression or artistic changes.

## Install (recommended)

1. Make a backup or a Git commit of your current project.
2. Extract `GHOSTED_V7_0_ASSET_PATCH.zip` and copy its contents over the files in `D:\GHOSTED_V7_0_PHASE2_CAPACITOR\`, preserving the folder layout.
3. Do **not** delete your existing `android/` folder, `package-lock.json`, or local private data.
4. In the project folder run `npm run dev` and visually check SYSTEM, ranks, divisions, all concept/protocol screens, the Vault, mobile layout, and animations.
5. Run `npm run build` then `npx cap sync android` after you have verified the visuals.
6. Commit and push; GitHub Actions will assemble the debug APK.

## Files and URLs

The original images are in `public/assets/{branding,ranks,divisions,concepts,protocols,screens,vault,frames}`. JavaScript and HTML use paths relative to the app root; CSS uses `../assets/` relative to `public/css/`. All paths work with the configured Vite `base: './'` and with Capacitor's embedded local web app.

## Warnings

* Current Chrome `localStorage` and the Android WebView storage are different origins; do not delete the old profile or Vault backup.
* The original `GHOSTED_V6_9_6_ROLLBACK.html` is intentionally untouched.
* Asset extraction does not solve npm audit warnings or independently confirm a successful Gradle build.
* This does not relocate other artwork that may be referenced by non-data URIs, nor convert any script architecture beyond the asset references.
