# GHOSTED

Your real habits, run as a self-improvement RPG. Offline, private, Android-first.

**Disappear. Build. Return.**

## Run it

```bash
npm install
npx expo start          # press "a" for an Android emulator, or scan the QR with Expo Go
```

Reminders do **not** run inside Expo Go on Android (Expo Go blocks `expo-notifications`
since SDK 53). Everything else works there. For reminders, install a real build:

```bash
npx eas-cli build -p android --profile preview   # produces an installable APK
# or, with Android Studio installed:
npx expo run:android
```

Desktop preview (handy for checking UI): `npx expo start --web`. The web build is a
preview only; it has no reminders and stores the Vault PIN in the browser.

## Checks

```bash
npm run typecheck
npm run lint
npm test               # 90 logic tests on a real in-memory SQLite (node:sqlite)
npm run check          # all three
npm run check:backup   # Android backup exclusions (after `npx expo prebuild -p android --no-install`)
```

## Android APK from GitHub

Every pushed branch runs the checks and builds `GHOSTED.apk` (Actions → "Android APK" →
the run → artifact **GHOSTED-apk**). A tag like `v0.1.0` also attaches it to a GitHub
Release; a tag containing `-test` (e.g. `v0.0.0-test.1`) makes a draft only you can see.

Until the release secrets below exist, APKs are signed with the shared Android debug key:
fine for testing, not for keeping real data long term.

## Release signing (one-time setup)

1. Create the key once, in a folder **outside** this project (JDK `keytool`):

   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore ghosted-release.jks -alias ghosted -keyalg RSA -keysize 4096 -validity 10000
   ```

   It asks for one password (PKCS12 uses it for the keystore and the key) and a name for
   the certificate.
2. Keep `ghosted-release.jks` and its password in a password manager, plus one offline
   copy (e.g. a USB drive). Never put it in this repo, a synced project folder or a chat.
   Lose it and installed copies can never be updated again, only uninstalled (data lost).
3. Add the repository secrets (from this project folder, after `gh auth login`):

   ```bash
   base64 -w0 /path/to/ghosted-release.jks | gh secret set ANDROID_KEYSTORE_BASE64
   gh secret set ANDROID_KEYSTORE_PASSWORD    # paste when asked; stays out of shell history
   gh secret set ANDROID_KEY_ALIAS --body ghosted
   ```

   PowerShell alternative for the first line:
   `[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\ghosted-release.jks")) | gh secret set ANDROID_KEYSTORE_BASE64`.
   `ANDROID_KEY_PASSWORD` is only needed for a non-PKCS12 keystore with a separate key
   password. Or add all of them in GitHub → Settings → Secrets and variables → Actions.
4. Push any branch. The "Verify the APK" step must print your certificate, not
   `CN=Android Debug`. The build fails on half-set secrets or a debug-signed result.
5. Moving a phone from a debug-signed APK to the release key: export Settings → backup and
   Vault → private backup, uninstall, install the release APK, import both. Android
   refuses to update an app across signing keys.

## Where things live

| What | Where |
| --- | --- |
| XP curve, Perfect Day bonus, limits, Vault milestones | `src/config/game.ts` |
| Rank ladder (names + requirements) | `src/config/ranks.ts` |
| Seeded habits (exact names, rewards, 8:30 PM reminder) | `src/config/seed.ts` |
| Design tokens: colors, glow, fonts, spacing, chamfers, motion timings | `src/config/theme.ts` |
| HUD component kit (HudPanel, HudFrame, SystemButton, HudTabs, BottomNav, GhostAvatar, StatBlock, Ring, icons…) | `src/components/hud/` |
| Database schema + migrations | `src/db/migrations.ts` |
| Pure logic (dates, schedules, stats, levels) | `src/domain/` |
| Data access + XP/coin rules | `src/repo/` |
| Player portrait + character cues (avatar drop-in point) | `src/components/hud/GhostAvatar.tsx` |
| Sound effects registry | `src/services/sound.ts` |
| Dev-only demo history | `src/dev/demoSeed.ts` (Settings → Developer, dev builds only) |
| App icon generator | `scripts/make-icons.js` |
| Ghost portrait (red background removed, cyan duotone) | `assets/ghost.png`, rebuilt by `scripts/make-ghost.sh <source image>` |

## Data rules worth knowing

- A completion is unique per habit per local calendar day. XP/coins are an append-only
  ledger; undo writes a reversal. Toggling can never farm XP.
- Each completion stores the XP/coins it earned, so retuning rewards never rewrites history.
- Schedules are versioned: changing days applies from today; the past keeps its schedule.
- Analytics count scheduled days only. An unfinished *today* is pending, never a miss.
- The private Vault table is excluded from habits, stats, Perfect Days, reminders and the
  main backup. Its PIN hash lives in the OS keystore, not the database.

## Adding the final avatar

Ghost is drawn by `src/components/hud/GhostAvatar.tsx`. Replace its `<Image>` with your
Rive/GLB/Lottie renderer and play a clip per `CharacterState` (`idle`, `habitComplete`,
`training`, `reading`, `celebrate`, `levelUp`, `victory`) inside the existing cue
subscription. Screens only call `cueCharacter(state)`, so nothing else changes.
