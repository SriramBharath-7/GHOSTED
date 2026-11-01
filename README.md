# GHOSTED V7.1 — Vite build fix

Replace only `src/main.js` in your current project. This wraps the SQLite initialization and classic script load in an async function rather than using top-level `await`.

```powershell
npm run build
# Only after the build succeeds:
npx cap sync android
git add src/main.js
git commit -m "Fix V7.1 SQLite bootstrap build"
git push origin main
```

Do not run `npx cap sync android` after a failed Vite build, as it may reuse stale `dist/`.
