# PIXEL_HANDOFF

For the agent doing the pixel-art redesign. The engine underneath is finished and tested.
Your job is the body: screens, components, assets, animation. Don't rebuild the engine.

## Ground rules

1. **Screens read state; they never compute rewards.** XP, coins, level, rank and Perfect Days come
   from `useGame((s) => s.player)`. Never add reward math to a component.
2. **Writes go through `src/repo/*` functions, then `commit()`.** Every repo write runs in the
   serialized `transaction()` queue (`src/db/db.ts`). Don't call `db.runAsync` from screens.
3. **The reminder switch is `remindersActive(state)`** (`src/state/selectors.ts`), not
   `settings.reminders`. Toggle it with `setRemindersEnabled(on)`. Never read the raw setting for UI.
4. **The Vault (Now Or Never) stays private.** It is reachable only by a 1.2 s long-press on the
   GHOSTED footer in Settings. It must never appear in tabs, Player, Daily, stats, notifications,
   the main backup, or Perfect Day math. Red (`colors.vault`) belongs to the Vault only.
5. **Icon names are stored data.** `habits.icon`, `rewards.icon`, `goals.icon` and `inventory.icon`
   hold keys like `brain`, `dumbbell`, `burger`. Swap the art behind a key in
   `src/components/hud/icons.tsx`. Never rename keys. Unknown keys render as text (old emoji data).
6. Seeded habit names are fixed: Regenesis Command, The Iron Monarch, The Kernel Strike,
   The Phoenix 65, No Junk UPF (+ Now Or Never, Vault-only, not a habit row).

## Routes (Expo Router, `src/app/`)

| Route | File | What |
| --- | --- | --- |
| Player (tab) | `(tabs)/index.tsx` | Player card, stats strip, today's panel |
| Daily (tab) | `(tabs)/daily.tsx` | Today's habits, week strip, completion |
| Missions (tab) | `(tabs)/missions.tsx` | Short/long goals, separate from Daily |
| Shop (tab) | `(tabs)/shop.tsx` | Buy rewards with Ghost Coins |
| Inventory (tab) | `(tabs)/inventory.tsx` | Owned items, use/redeem, history |
| Habit Intel | `habit/[id].tsx` | Analytics, calendar, day corrections |
| Editors | `habit-editor.tsx`, `mission-editor.tsx`, `reward-editor.tsx` | Forms (habit archive/delete live here) |
| Manage habits | `habits.tsx` | List incl. archived, reorder |
| Settings | `settings.tsx` | Toggles, backup, reset, Vault entrance |
| Vault | `vault.tsx` | PIN/biometric, private counter |
| Root | `_layout.tsx`, `(tabs)/_layout.tsx` | Boot, fonts, splash, day rollover, tab bar |

## Where things live

| Concern | Path |
| --- | --- |
| Progression numbers (level curve, Perfect Day bonus, limits) | `src/config/game.ts` |
| Ranks | `src/config/ranks.ts` |
| Seed data | `src/config/seed.ts` |
| Visual tokens (colors, fonts, spacing, motion, glow) | `src/config/theme.ts` (replace freely) |
| Level/rank math | `src/domain/progression.ts` |
| Analytics (rates, streaks, charts data) | `src/domain/stats.ts` |
| Dates (local calendar keys) and schedules | `src/domain/dates.ts`, `src/domain/schedule.ts` |
| Database, migrations, transaction queue | `src/db/` |
| Repositories (all reads/writes) | `src/repo/` (`progress.ts` = completions + XP ledger rules) |
| Game store / selectors | `src/state/game.ts`, `src/state/selectors.ts` |
| Live DB queries in screens | `src/state/useLiveQuery.ts` (refetches after each `commit()`) |
| Celebration events (level up, Perfect Day, acquired) | `src/state/fx.ts` → rendered in `src/components/fx/Overlays.tsx` |
| Sounds | `src/services/sound.ts`, files in `assets/sounds/` |
| Haptics | `src/services/haptics.ts` |
| Notifications | `src/services/notifications.ts` (OS only; policy lives in the store) |
| Backups | `src/repo/backup.ts`, `src/services/backupFiles.ts` |
| Vault auth | `src/services/vaultAuth.ts` |

## Safe to replace visually

Everything in `src/components/` (hud, ui, daily, intel, shop, inventory, missions, player, vault,
fx, nav), `src/config/theme.ts`, fonts, and app icon/splash images in `assets/`. Keep each
component's props and behavior (callbacks, guards like `purchasePending` and `consuming`, and
confirm sheets before destructive actions). Chart components may be redrawn; feed them the same
`src/domain/stats.ts` outputs.

## Must stay functionally intact

- Reward rule: only today mints XP/coins; past-day corrections only restore what that day earned
  (`src/repo/progress.ts`). Ranks count earned Perfect Days only.
- Shop purchase and inventory redeem are single transactions (`src/repo/rewards.ts`, `src/repo/inventory.ts`).
- Reminder sync and permission handling (`src/state/game.ts`, `src/services/notifications.ts`).
- Migrations are append-only (`src/db/migrations.ts`). Never edit an existing one. A new migration
  that rewrites data (not just schema) should also add that step to `DATA_STEPS`, so restored
  older backups get it too.
- Android backup exclusion (`plugins/withPrivateAndroidBackup.js`, checked by `npm run check:backup`).

## Design references

- `concept_screens/`: target look for each screen (Daily, Shop, Inventory, Missions, Vault, Intel, Player).
- `asset_sheets/`: pixel sprite/icon/UI sheets to slice.

## Checks

```bash
npm run check          # typecheck + lint + jest (all must pass)
npm run check:backup   # needs android/: npx expo prebuild --platform android --no-install
```

## Android build

- CI: `.github/workflows/android-apk.yml` runs the checks, builds `GHOSTED.apk` (artifact
  `GHOSTED-apk`), and attaches it to a GitHub Release on `v*` tags. Signing secrets are listed
  at the top of the workflow. Without them the APK uses the debug key.
- Local: `npx expo prebuild --platform android --no-install`, then in `android/`:
  `./gradlew assembleRelease` → `android/app/build/outputs/apk/release/app-release.apk`.
  `android/` is generated (gitignored). Configure native behavior in `app.json` or config plugins only.
