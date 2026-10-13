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
npm test               # 52 logic tests on a real in-memory SQLite (node:sqlite)
npm run check          # all three
```

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
