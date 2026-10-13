# GHOSTED Audit

| | |
| --- | --- |
| Audit date | 2026-10-10 |
| Audited by | Claude Code (Opus 5.5), read-only inspection |
| Purpose | Handoff to the next coding agent (Astra) |
| Source changes made | **None.** No file in the project was edited, moved, committed or pushed. |

> ## UPDATE 2026-10-13: core hardening (overrides the findings below where they differ)
> - **Folder split resolved.** Everything is in `D:\New folder\GHOSTED`, committed as `3b66e8a Baseline working GHOSTED app`, remote `origin` = `github.com/SriramBharath-7/GHOSTED`. Hardening is on branch `core-hardening` (uncommitted at time of writing). "READ THIS FIRST" below is history.
> - **P1 #3 fixed (reminders on fresh install).** The store owns reminder policy: asks once at boot, re-checks on resume, turns the switch off when permission is denied/revoked, and the UI shows `remindersActive` (switch ON *and* permission granted). Sync calls are queued so a later "off" always wins. `src/state/game.ts`, `src/services/notifications.ts`, tests in `reminders.test.ts`, `notifications.test.ts`.
> - **P1 #8 fixed (Android backup).** `android.allowBackup: false` plus `plugins/withPrivateAndroidBackup.js` (full-backup + data-extraction rules excluding every domain). `npm run check:backup` validates the generated manifest; CI runs it after prebuild.
> - **Historical XP/coin exploit closed.** Only today mints XP/coins/Perfect Day bonus. A past day can only regain what it earned on its own day, so toggling history always ends where it started. Ranks count only Perfect Days that kept their earned bonus (`getEarnedPerfectDayCount`).
> - **Writes serialized.** Every repository write (settings, rewards, missions, vault start date) goes through the `transaction()` queue. `openDatabase` is single-flight and retryable.
> - **Player score** is computed once per commit and keeps archived habits' real history.
> - **Tests:** 52 → 88 (13 suites), passing in IST, UTC and US Pacific time zones. **CI:** `.github/workflows/android-apk.yml` builds `GHOSTED.apk`.
> - Current architecture map for the visual redesign: `PIXEL_HANDOFF.md`.

**Evidence labels used below**

- **[run]**: a check executed during this audit.
- **[code]**: read directly from source.
- **[shot]**: screenshot. Either captured this session from a web export of the current code (`n01`–`n09`), or taken by the previous session on 2026-10-04 19:31–19:46 (`r01`–`r41`). Web rendering is not identical to Android.
- **UNCERTAIN**: could not be confirmed.

> ## READ THIS FIRST
> **The project is split across two folders, and neither folder runs on its own (P0).**
> - `D:\New folder\GHOSTED` holds `.git`, `package.json`, `app.json`, all config, `assets/` and the first half of `node_modules` (`@babel` … `lucide-react-native`).
> - `C:\Users\WELCOME\Downloads\GHOSTED` (where this file lives) holds `src/`, `scripts/` and the second half of `node_modules` (`lucide-react-native` … `zustand`).
>
> **All GHOSTED work is uncommitted.** Git has only the create-expo-app template commit, and there is no remote.
> Reunite the folders and commit (with the user's approval) before doing anything else. See §2 and §22.

---

## 1. Executive Summary

**What it is.** GHOSTED is an offline, Android-first habit tracker presented as a "System" RPG HUD. It has:
- the user's five seeded habits;
- XP, levels and ranks;
- Ghost Coins, spent in a Shop of self-defined real-life rewards, with an Inventory of bought items;
- short- and long-term Missions;
- per-habit analytics ("Habit Intel");
- a PIN-protected private Vault that holds the **Now Or Never** day counter.

**Tech stack** (from `package.json`):

| Layer | What is used |
| --- | --- |
| Framework | Expo SDK 57 (`expo ~57.0.26`), React Native 0.86.3, React 19.2.3 |
| Language | TypeScript 6.0.3, strict mode, `noUnusedLocals` |
| Routing | Expo Router 57, file routes in `src/app` |
| Storage and state | `expo-sqlite` 57 (local SQLite), Zustand 5 |
| Animation and graphics | Reanimated 4.5.1, react-native-worklets 0.10.1, react-native-svg 15.15.4, lucide-react-native 1.51 |
| Expo modules | expo-notifications, -secure-store, -local-authentication, -screen-capture, -haptics, -audio, -linear-gradient, -document-picker, -sharing, -file-system, -crypto |
| Fonts | @expo-google-fonts: Orbitron (display) and Exo 2 (body) |
| Tests | Jest 29 + `jest-expo`; repository tests run on Node's built-in `node:sqlite` |
| Builds | EAS config with a `preview` APK profile |

**Completeness.** Every area in the brief exists and works in code: Player, Daily, Habit Intel, Missions, Shop, Inventory, Vault, Settings, reminders, backup/import, haptics and FX. Remaining gaps are listed in §19 and §21.

**Stability.** The logic layer is strong. **[run]** on a merged scratch copy of both halves:

| Check | Result |
| --- | --- |
| Typecheck | PASS |
| Lint (`src/`) | PASS, 0 problems |
| Unit tests | **52/52 PASS** |
| Android JS bundle export | PASS |
| Web export | PASS |

**Does it run?**
- **Not in its current location.** The split described above blocks it (§2).
- The merged copy compiled and ran as a web preview, with no runtime errors. **[run]**
- Not run on an Android device or emulator this session. On-device behaviour is UNCERTAIN.

**Main flows.** These worked in this session's headless-Chrome run of the current code **[run][shot]**:
- complete a habit (XP and coins update);
- open Daily, Manage Habits, Missions and Settings;
- create a reward from the Shop quick-start;
- Shop/Inventory states.

Purchase, the dissolve animation, Intel, the Vault and a restart were exercised by the previous session on 2026-10-04 **[shot]**.

---

## 2. Git / Working Tree State

### 2.1 The folder split (interrupted move)

| Location | Contains | Missing |
| --- | --- | --- |
| `D:\New folder\GHOSTED` | `.git`, `.claude/settings.json`, `.expo/`, `.gitignore`, `.npmrc`, `AGENTS.md`, `LICENSE`, `README.md`, `app.json`, `eas.json`, `eslint.config.js`, `metro.config.js`, `package.json`, `package-lock.json`, `tsconfig.json`, `GHOSTED_concept_images.zip`, `assets/` (6 files), `node_modules/` (399 entries `@babel` … `lucide-react-native` partial, plus `.bin` and `.package-lock.json`) | `src/`, `scripts/`, second half of `node_modules` |
| `C:\Users\WELCOME\Downloads\GHOSTED` | `src/` (111 files), `scripts/` (2 files), `node_modules/` (285 entries: `lucide-react-native` partial … `zustand`; no `.bin`), this audit file | everything else |

**Facts**
- Both folders' contents are stamped 2026-10-09 20:45–20:54.
- `node_modules` is cut alphabetically inside `lucide-react-native`. Its `package.json` is on D:; part of its `dist/` is on C:.
- No GHOSTED items are in the Recycle Bin.

**Interpretation (UNCERTAIN):** this pattern matches a Windows Explorer cross-drive move from C: to D: that was interrupted.

**The two halves are complete together.**
- Copying both halves into one scratch folder gave a dependency tree where `npm ls --depth=0` reports every `package.json` dependency at the expected version, with nothing missing or invalid. **[run]**
- The scratch copy then passed typecheck, tests and the Android/web bundle builds.

**`npm start` will fail in either real folder:**
- C: has no `package.json`.
- D: has no `src/` and only half of `node_modules`.

### 2.2 Git (repo at `D:\New folder\GHOSTED\.git`)

- Branch `master`. **1 commit:** `94b3608 Initial commit` (2026-10-04 11:20 +0530), the create-expo-app template.
- **No remote** (`git remote -v` is empty). **Staged:** none. **Stash:** none.
- **Modified (unstaged):**
  - `app.json`, `package.json`, `tsconfig.json`
  - `assets/android-icon-foreground.png`, `android-icon-monochrome.png`, `favicon.png`, `icon.png`, `splash-icon.png`
- **Deleted (unstaged):** `App.tsx`, `index.ts`, `assets/android-icon-background.png`.
- **Untracked:** `.npmrc`, `GHOSTED_concept_images.zip` (14.3 MB), `README.md`, `assets/ghost.png`, `eas.json`, `eslint.config.js`, `metro.config.js`, `package-lock.json`.
- **Invisible to git right now:** `src/` and `scripts/`. They are physically on C:. Once reunited they will appear as untracked.

**What the uncommitted changes do:**
- replace the template with GHOSTED (`"main": "expo-router/entry"`, SDK 57 dependencies);
- configure the app: name GHOSTED, dark UI, package `com.ghosted.app`, plugins, blocked audio/storage permissions;
- add the `@/*` path alias and the Jest config;
- add generated HUD icons and the processed Ghost portrait.

**Suspicious or temporary files**
- None inside `src/`: no TODO/FIXME/HACK markers, no `console.*` calls.
- `.expo/` is a local cache and is gitignored.
- `GHOSTED_concept_images.zip` is **not** gitignored. `git add .` would commit 14 MB.
- An identical copy of the ZIP exists at `C:\Users\WELCOME\Downloads\GHOSTED_concept_images.zip` (created 2026-10-10 17:53). It is **not** inside the C: project folder.

**Interrupted work**
1. The folder move (above).
2. No GHOSTED work has ever been committed.
3. Code-level leftovers (§21).

**Last edit.** The last source edit was 2026-10-04 19:50. Today's Android export produced bundle `entry-afaef37ea6dc6c21361fc18ef7749e72.hbc`, the **same hash** as the export the previous session made at 2026-10-04 19:54. So the source has not changed since then. **[run]**

---

## 3. Current Architecture

```
src/app/            Expo Router routes (screens)
  └─ src/components/  HUD kit (hud/) + feature components (daily, player, intel, missions, shop, inventory, vault, fx, ui)
       └─ src/state/   Zustand store (game.ts), FX queue (fx.ts), selectors, useLiveQuery
            └─ src/repo/    SQL + XP/coin rules (progress, ledger, habits, rewards, inventory, goals, vault, backup, settings, order)
                 └─ src/db/   expo-sqlite open/migrate/seed, Db interface, serialized transaction queue
src/domain/         pure logic: dates, schedules, stats, progression (no I/O, fully unit-tested)
src/services/       notifications, haptics, sound, vaultAuth (SecureStore PIN), backupFiles
src/config/         game numbers, ranks, seeded habits, theme tokens
src/dev/demoSeed.ts DEV-only sample history
```

**App entry**
- `package.json` `main` = `expo-router/entry`.
- `src/app/_layout.tsx` does the rest:
  - loads 9 fonts;
  - holds the splash screen until ready;
  - boots the DB through `useGame.boot()`;
  - registers day rollover (AppState resume + a midnight timer);
  - renders the root `Stack`, `FxHost` (big-moment overlays), `ToastHost`, and `BootSequence` (once per cold start).
- If the DB fails to open, it shows an error screen with "Try again".

**Routing**
- `src/app/(tabs)/_layout.tsx`: Tabs with a custom `TabBar` (`components/nav/TabBar.tsx`) that renders `components/hud/BottomNav.tsx`. Tabs are Player, Daily, Missions, Shop and Inventory.
- Stack screens:
  - `habit-editor`, `reward-editor`, `mission-editor` (slide up);
  - `vault` (fade);
  - `settings`, `habits`, `habit/[id]` (default fade).

**Player/Home:** `(tabs)/index.tsx` renders `PlayerCard`, `StatsStrip` and `DailyPanel`.

**Daily Discipline:** `(tabs)/daily.tsx` renders a hero (Ghost + copy), `WeekStrip`, `DailyPanel` with streak notes, and Add/Manage buttons.

**Habit Intel:** `habit/[id].tsx` renders `IntelHero`, a 5-tab `HudTabs` and the charts in `components/intel/*`. A `DaySheet` corrects any past day. It shows its own `BottomNav` as a footer.

**Missions:** `(tabs)/missions.tsx`, `mission-editor.tsx`, `components/missions/MissionRow.tsx`, `repo/goals.ts`.

**Shop:** `(tabs)/shop.tsx`, `reward-editor.tsx`, `components/shop/RewardCard.tsx`, `repo/rewards.ts`.

**Inventory:** `(tabs)/inventory.tsx`, `components/inventory/{ItemRow,ItemFace,Disintegrate}.tsx`, `repo/inventory.ts`.

**Vault:** `vault.tsx`, `components/vault/{PinPad,VaultHome,VaultGauge}.tsx`, `repo/vault.ts`, `services/vaultAuth.ts`.

**Settings:** `settings.tsx` holds:
- player name, haptics, sound and reminders switches;
- links to manage habits and rewards;
- export, import and reset;
- a DEV-only demo seed;
- the hidden Vault entrance.

**Database and storage**
- `db/database.ts` opens `ghosted.db` with WAL and foreign keys on, runs migrations, and seeds once.
- `db/db.ts` defines the `Db` interface and `transaction()`, a promise queue so writes never interleave.
- `db/migrations.ts`: v1 is the base schema; v2 is the HUD redesign (line icons, mission fields).

**State management** (`state/game.ts`, Zustand)
- Holds `ready`, `today`, `settings`, the player snapshot (XP, coins, perfect days, streak, today's earnings), visible habits, per-habit completion sets for the last 366 days, and a `version` counter.
- `commit()` reloads everything after each write and optionally resyncs reminders.
- `setHabitDone()` runs completion, haptics, sound, the character cue and level/rank/perfect-day detection.
- `state/useLiveQuery.ts` re-runs a screen's query whenever `version` changes.
- `state/fx.ts` holds the overlay queue and character cues.

**Notifications:** `services/notifications.ts` (§12).

**Game progression:** `config/game.ts`, `config/ranks.ts`, `domain/progression.ts`, `repo/progress.ts`, `repo/ledger.ts` (§6–7).

**Design system:** tokens live in `config/theme.ts`. The HUD kit lives in `components/hud/`:
- `HudFrame` (SVG chamfered frame), `HudPanel`, `HudPressable`;
- `SystemButton`, `HudTabs`, `BottomNav`, `AppHeader`;
- `GhostAvatar`, `StatBlock`/`CoinRing`, `Ring`, `IconBox`, `IconPicker`;
- `icons` (`LineIcon`, `HoloArt`), `HudBackground`.

`components/ui/*` keeps the older component names (`Button`, `Card`, `Segmented`, `Header`…) but re-implements them on top of the HUD kit.

**What one habit tap does**

```
HabitRow → DailyPanel.onToggle → useGame.setHabitDone
  → repo/progress.setCompletion (queued transaction: completion row + ledger row + perfect-day resync)
  → haptics / sound / cueCharacter
  → commit() (reload store, resync that habit's reminders)
  → level / rank / perfect-day check → useFx.push → FxHost overlay
```

---

## 4. Navigation / Screen Map

| Screen | Route / file | Purpose | Functional | Visually finished | Key dependencies | Known problems |
| --- | --- | --- | --- | --- | --- | --- |
| Root / boot | `src/app/_layout.tsx` | Fonts, DB boot, Stack, overlays, boot ident | Yes [run] | Yes | `state/game`, `fx/*` | Boot ident plays on every cold start (1.25 s) |
| **Player** | `(tabs)/index.tsx` | Player card, stats strip, today's habits | Yes [run] | Yes, close to concept | `PlayerCard`, `StatsStrip`, `DailyPanel` | "Overall score" shows 100% on day one after 2 of 5 done (an unfinished today is excluded by design). Labels wrap at 412 px web width. |
| **Daily** | `(tabs)/daily.tsx` | Daily hero, 7-day strip, editable day list, Add/Manage | Yes [run] | Yes | `WeekStrip`, `DailyPanel` | Week strip is a rolling last 7 days, not the concept's Mon–Sun week |
| **Habit Intel** | `habit/[id].tsx` | Per-habit analytics and day corrections | Yes [shot r29–r33] | Yes | `intel/*`, `domain/stats` | Footer nav always marks **Daily** active, and tapping Daily there does nothing (`BottomNav` ignores taps on the active tab) |
| Manage Habits | `habits.tsx` | Reorder, edit, see archived | Yes [run] | **No** | `ReorderRow` | **Shows raw icon keys ("brain", "dumbbell", "laptop", "chart", "no-junk") as text** (`habits.tsx:88`) [shot n04] |
| Habit editor | `habit-editor.tsx` | Create/edit/archive/delete habit, schedule, rewards, reminder | Yes [shot r40] | Mostly (no concept) | `IconPicker`, `Stepper`, `TimeField` | Seeded habits' accent colors are not in the picker palette, so no swatch shows as selected |
| **Missions** | `(tabs)/missions.tsx` | Short/long-term goals | Yes [run][shot r17] | Yes | `MissionRow`, `repo/goals` | No reorder UI for goals; writes have no error handling |
| Mission editor | `mission-editor.tsx` | Create/edit/complete/drop/delete missions | Yes [shot r16] | Mostly (no concept) | `DateField`, `Stepper` | None found |
| **Shop** | `(tabs)/shop.tsx` | Wallet, reward grid, buy, manage/reorder | Yes [run][shot r19–r22] | Partly | `RewardCard`, `repo/rewards` | Reward art is a line icon, not the concept's illustrated art |
| Reward editor | `reward-editor.tsx` | Create/edit/delete reward, price, stock | Yes [run] | Mostly (no concept) | `IconPicker` (20 icons) | None found |
| **Inventory** | `(tabs)/inventory.tsx` | Owned items, use/redeem, history | Yes [shot r23–r25] | Yes | `ItemRow`, `Disintegrate` | The dissolve `Modal` has no `onRequestClose` (Android back during the ~2 s animation; UNCERTAIN behaviour) |
| **Vault** | `vault.tsx` (+ `components/vault/*`) | PIN/biometric gate, counter, history, private settings | Yes [shot r34–r37] | Gauge area yes. Lower settings plainer. | `vaultAuth`, `repo/vault` | See §11 |
| **Now Or Never** | Inside the Vault (`VaultHome.tsx`), not a route | Private day counter | Yes | Yes | `vault_runs` table | — |
| **Settings** | `settings.tsx` | Name, feel, reminders, manage, backup, reset, dev, Vault entrance | Yes [run][shot n09] | Partly (no concept) | `Row`, `ToggleRow`, backup services | Sound toggle has no effect (no sound files). Reminder notice missing for the "undetermined" permission state (§12). |

**Navigation notes**
- Settings: gear button in `AppHeader`.
- The bell opens a "System · Today" sheet that lists today's open habits.
- Vault entrance: a 1.2 s long-press on the "GHOSTED" footer at the bottom of Settings.
- There are no unused routes. There is no custom `+not-found` route, so Expo Router's default unmatched screen applies.

---

## 5. Habit System

**Data model** (`db/migrations.ts`, `repo/habits.ts`)

- `habits` columns:
  - id, title, icon (line-icon key), description, question, accent;
  - `days_mask` (configured weekdays), `xp_reward`, `coin_reward`;
  - `reminder_time` (`HH:MM`), `reminder_enabled`;
  - `sort_order`, `start_date`, `archived`, `created_at`.
- `habit_schedules (habit_id, effective_from, days_mask)`: versioned schedule history. Past days keep the schedule they had. Mask 0 means paused (archived).
- `completions (habit_id, date, xp_awarded, coins_awarded)` with **`UNIQUE(habit_id, date)`**.

**Schedules.** A 7-bit weekday mask, bit 0 = Sunday. Presets are Every day and Weekdays; any weekday combination works. A change applies from today by adding a version row. There are no "N times per week" or interval schedules. Habits are yes/no only (no numeric or measurable habits).

**Completion** (`repo/progress.ts` `setCompletion`, inside a queued transaction)
- Rejects future days and unscheduled days.
- A day before the habit's start date is a **backfill**: the start date moves back to that day (it must fall on the first schedule's weekdays).
- Writes the completion row and a `ledger` row, then resyncs Perfect Day.

**Undo.** Tap the circle again; this works for today or any past day, from the Daily week strip or the Intel calendar. It deletes the completion and writes a reversing ledger row using the **stored** amounts. Perfect Day is removed with an exact reversal.

**History**
- The `completions` table holds all history.
- Daily shows a 7-day strip; tapping a past day lets you edit it ("Editing <day>").
- Intel shows History (12 months), Calendar (month grid, tap to correct) and Streaks.

**Archived habits**
- Hidden from Player, Daily, reminders and Perfect Day from the archive date onward. History is kept.
- Listed under "Archived" in Manage Habits; tapping one opens its Intel.
- Restored from the editor.

**Delete.** Removes completions, schedules and the habit. Writes a `habit_deleted` ledger reversal. Resyncs Perfect Days from the habit's start date (side effect in §6).

**Reorder.** Up/down arrows in Manage Habits set `sort_order`.

**Recurring days and reminders.** Per-habit days mask, reminder time and enabled flag, plus a master switch in Settings (§12).

**Local dates** (`domain/dates.ts`)
- `DateKey` = `YYYY-MM-DD` in the device's local time, created once.
- All date arithmetic runs in UTC on the key, so it is DST-safe.
- Rollover: a midnight timer plus a check on app resume (`_layout.tsx:64-83`).
- Timestamps (`created_at`) are UTC ISO strings, converted back to local only for display.

**Persistence.** SQLite file `ghosted.db`.

**Seeded habits: confirmed correct** [code, test, shot]. Exact titles and order:

| # | Title | Icon key | Days | XP / coins | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Regenesis Command | brain | Every day | 15 / 5 | Question "Did you complete the Hair protocol (Minoxidil and Finasteride)?"; reminder 20:30, enabled; description "Daily hair protocol." |
| 2 | The Iron Monarch | dumbbell | Every day | 50 / 15 | "Gym / training." |
| 3 | The Kernel Strike | laptop | Every day | 30 / 10 | Description empty on purpose |
| 4 | The Phoenix 65 | chart | Every day | 30 / 10 | Description empty on purpose |
| 5 | No Junk UPF | no-junk (custom burger-in-ban icon) | Every day | 35 / 10 | "No junk or ultra-processed food." |

**Now Or Never**
- Deliberately **not** a habit row. It is the Vault's day counter (`vault_runs`).
- The string appears only in `src/components/vault/VaultHome.tsx` (`VAULT_TITLE`) and in a test regex.
- `vault.test.ts` asserts it is never seeded or listed as a habit.

**Leak check:** none found (details in §11).

**Seed accent colors are left over from before the redesign:** `#3CCFB4`, `#EF6351` (red), `#A08BFF`, `#FF8A3D` (orange), `#8BD45A` (green) in `config/seed.ts`. They show as thin colored ticks on Daily rows and colored bars in Manage Habits. The theme's `ACCENTS` palette is cyan-family.

---

## 6. XP / Level / Rank System

**XP award**
- Each completion copies the habit's current `xp_reward` into `completions.xp_awarded` and appends a `ledger` row (`kind='habit'`).
- **Perfect Day** gives +50 XP / +20 coins once per date, when every habit scheduled that day is complete (`perfect_days` table + `ledger kind='perfect_day'`).

**Persistence.** XP = `SUM(ledger.xp)`, recomputed on every `commit()` (`repo/ledger.ts getBalances`). No cached total.

**Level formula** (`config/game.ts LEVEL_CURVE`, `domain/progression.ts levelInfo`)
- XP to go from level L to L+1 = **200 + 50 × (L − 1)**.
- Cumulative XP for level L = 200(L−1) + 25(L−1)(L−2):

| Level | Total XP needed |
| --- | --- |
| 2 | 200 |
| 3 | 450 |
| 5 | 1,100 |
| 10 | 3,600 |
| 20 | 12,350 |

- Seed habits give at most 160 XP + 50 Perfect Day = 210 XP per day, and 70 coins per day.

**Ranks** (`config/ranks.ts`). Rank needs **both** a level and a count of Perfect Days:

| Rank | Min level | Min Perfect Days |
| --- | --- | --- |
| Unseen | 1 | 0 |
| Shade | 4 | 3 |
| Phantom | 8 | 10 |
| Specter | 14 | 25 |
| Wraith | 22 | 50 |
| Revenant | 32 | 90 |
| Ascendant | 45 | 150 |

The rank shows as "Title" on the Player card. The concept image shows "The Builder"; the implementation shows the rank name.

**Duplicate prevention: solid**
- `UNIQUE(habit_id, date)`, `INSERT … ON CONFLICT DO NOTHING`, and a `changes === 0` check.
- The serialized `transaction()` queue prevents interleaved writes.
- A test covers repeated toggling and concurrent taps.

**Undo:** reverses the stored amounts exactly, even after the habit's rewards are retuned (tested).

**Consistency.** Ledger habit rows always equal the completions total, and Perfect Day bonuses equal count × bonus. Tests check this invariant after every command. One `levelInfo`/`rankFor` implementation is used everywhere (`PlayerCard`, `StatsStrip`, `game.ts`, `Overlays`).

**Configuration**
- `config/game.ts`: curve, Perfect Day bonus, editor limits (max 500 XP / 200 coins per habit, max reward cost 100,000), history window, reminder horizon, Vault milestones.
- `config/ranks.ts`: the rank ladder.

**Issues found**

1. **Unlimited backfill.** The Intel calendar can go back any number of months. Completing an old day:
   - awards full XP/coins;
   - moves the habit's start date back, so every day in between counts as "missed" in analytics;
   - turns days when no other habit was tracked yet into Perfect Days (+50 XP / +20 coins each). A unit test expects this.

   For a single-user app this is a self-cheating route and an analytics distortion, not a crash. It needs a product decision.
2. **Deleting a habit can grant Perfect Day bonuses retroactively.** It resyncs from the deleted habit's start date (`progress.ts:236-255`). Days where that habit was the only incomplete one become Perfect Days. [code; not runtime-verified]
3. XP can go down (undo/delete), so level and rank can drop silently. There is no "level down" message.
4. There is no UI for XP/coin history, although the `ledger` has every movement.

---

## 7. Ghost Coins

**How they are earned:** `habits.coin_reward` per completion (stored per completion), plus +20 per Perfect Day.

**Where they are stored:** `ledger.coins`. Balance = `SUM(ledger.coins)`.

**Completion/undo:** exact, tested.

**Shop spending is persisted.** `purchaseReward` runs as one transaction:
1. balance check;
2. `purchases` row;
3. `ledger` row `kind='purchase'` (−cost);
4. stock − 1, if stock is limited;
5. inventory upsert (+1).

This is tested.

**Transaction history.** The data exists in `ledger` (all movements), `purchases` and `redemptions`. **The UI shows only redemptions** (Inventory → History). There is no coin log and no purchase history screen.

**Inconsistencies**
- The balance can go **negative**: spend coins, then undo completions or delete a habit. The Player card shows a negative number in red, and Shop "Buy" turns into "Need N".
- This is internally consistent, but there is no copy explaining it.
- The Player card and Shop wallet use `AnimatedNumber` to count to the new value.

---

## 8. Shop / Inventory

### Shop

- **Creating rewards:** `reward-editor.tsx` has name, description, category, icon (20 line icons), cost (1–100,000, step 10) and optional limited stock.
  - The Shop starts empty; no rewards are seeded.
  - Four quick-start chips only prefill the editor: Cheat Meal 150, Movie Night 200, Gaming Session 120, Buy a T-Shirt 600. [run]
- **Editing:** long-press a card (450 ms), or use **Manage** mode (tap a row; up/down arrows reorder). Deleting a reward keeps copies already owned (`reward_id` becomes NULL).
- **Pricing:** whole coins, validated to be ≥ 1.
- **Buying:** two taps. "Buy" arms the button as "Confirm N" for 3 s; a second tap buys (`RewardCard.tsx:25-36`). A busy spinner shows. Errors appear as toasts: not enough coins (with the shortfall), sold out, reward missing.
- **Coin deduction:** immediate and persisted. The wallet number animates down.

### Inventory

- **Quantities:** one stack per reward (`inventory.reward_id UNIQUE`); quantity +1 per purchase. Rows track `first_acquired_at` and `last_acquired_at`.
- **Acquisition history:** only the last-acquired date shows on each row. `purchases` is not shown anywhere.
- **Redeeming:** "Use item" opens a confirm sheet ("One copy is consumed. This can't be undone."). Then `redeemItem` runs a transaction (quantity −1, `redemptions` row), the dissolve animation plays, and the list refreshes when the animation ends.
- **History tab:** the last 20 redemptions, with dates.

### Microinteractions that actually exist

| Planned | Status | What exists |
| --- | --- | --- |
| Purchase feedback | IMPLEMENTED | Success haptic; "Item acquired" System window with particle burst; auto-dismiss 1.9 s or tap (`fx/Overlays.tsx`) |
| Coin count animation | IMPLEMENTED | `AnimatedNumber` (650 ms ease-out, JS-driven) |
| Item moving into Inventory | PARTIAL | Art in the overlay shrinks and flies toward the bottom-right (a fixed vector roughly at the Inventory tab) and fades. No landing effect or badge on the tab. |
| Use Item confirmation | IMPLEMENTED | `ConfirmSheet` |
| Digital dissolve / particle consume | IMPLEMENTED | `inventory/Disintegrate.tsx`: card split into 6×7 tiles that drift, rotate and fade left→right; 28 particles; "Item used" caption; heavy + success haptics; ~2 s; reduced-motion fallback [shot r24] |
| Purchase / redeem sounds | MISSING | Hooks are called, but `services/sound.ts` has no sound files |

---

## 9. Missions / Goals

**Horizons:** short-term and long-term (`goals.horizon`), switched with HUD tabs.

**Fields**
- title, description;
- tags (`category`, split on "·" or ",");
- icon (16 line icons);
- start date (in the future = listed as Upcoming);
- target date (shows "Nd left", "Due today" or "Nd overdue");
- progress mode: none, steps or percent;
- notes.

**Progress**
- Steps (`steps_done / steps_total`) or a manual percent.
- The ring button on a row adds +1 step or +10%. Editor steppers set values directly.

**Status:** active, done or dropped.
- "Mark complete" plays a particle burst and a toast.
- Drop, Reopen and Delete (with confirmation) are available.

**Persistence:** `goals` table. The v2 migration added icon, category, steps and start date.

**UI state.** HUD-styled and close to the concept [shot r17]:
- Active, Upcoming and Closed panels;
- an empty state with explanatory copy [shot n05];
- the Ghost thumbnail in the header, as in the concept.

**Separate from Daily Discipline: confirmed.** No shared tables, no XP/coins/ledger, and not part of Perfect Day or reminders.

**Gaps**
- No reorder UI (`saveOrder` supports `goals`, but nothing calls it).
- No mission reminders or deadline notifications.
- Mission writes have no try/catch (a DB failure would be an unhandled promise rejection).

---

## 10. Habit Intel / Analytics

All numbers come from real stored data: `completions` + `habit_schedules`, computed by the pure functions in `src/domain/stats.ts` (17 unit tests in `stats.test.ts`).

**Rules**
- Only scheduled days count.
- Past scheduled days without a completion are misses.
- An unfinished *today* is "pending", never a miss.

| Feature | Status | How it is computed / notes |
| --- | --- | --- |
| Completion score | IMPLEMENTED | 30-day completion rate (`habitOverview.score30`) |
| Current streak | IMPLEMENTED | Consecutive completed scheduled days. Rest days and a pending today don't break it. |
| Best streak | IMPLEMENTED | Longest run (`streakRuns`) |
| Total completions | IMPLEMENTED | Count of completion rows |
| Month change | IMPLEMENTED (label caveat) | **Rolling** last 30 days vs the 30 before (`stats.ts:284`), labelled "This month" (`Overview.tsx:74`). Shows "—" until the habit has >30 days of history. Sparkline = rolling 7-day rate over 30 days. |
| Year change | IMPLEMENTED (label caveat) | **Rolling** 365 vs previous 365 (`stats.ts:285`), labelled "This year". Shows "—" for the whole first year. |
| Score trend | IMPLEMENTED | `LineChart`, 4 ranges: 30 days (rolling 7-day), 13 weeks, 12 months, all time. Gaps break the line instead of faking zeros. Draw-in animation. |
| Monthly history | IMPLEMENTED | `MonthBars`: 6 months (Overview) / 12 months + table (History tab). Faint "possible" column behind each bar. Grow-in animation. The concept's "Last 6 months ▾" is a static label. |
| Calendar / heatmap | PARTIAL | Month grid (Monday first) with done/missed/rest/today/untracked states, month navigation, tap-to-correct sheet. **No multi-month heatmap.** |
| Frequency by weekday | IMPLEMENTED | All-time rate per weekday, best one highlighted. Static (no animation). |
| Streak list | IMPLEMENTED | Top 6 runs; the live run is highlighted |
| Player-level stats | IMPLEMENTED | Today's progress, Perfect Day streak ("Day streak"), 30-day overall score across habits, level |

**Fake/demo data: none in production UI.**
- The concept's sample values (266, 264, "The Builder", the sample missions and rewards) do not appear in source.
- The only synthetic-data path is `src/dev/demoSeed.ts`. It is reachable from Settings → Developer **only when `__DEV__` is true**.
- It writes **real, permanent** rows: 120 days of completions + ledger entries.
- **Risk:** if the user's daily driver is a dev build or Expo Go, one tap pollutes real history. Only "Reset all data" undoes it.

**Missing:** a cross-habit analytics view (analytics are per habit only), XP/coin history, and a year heatmap.

---

## 11. Vault / Now Or Never Privacy Audit

| Surface | Now Or Never present? | Evidence |
| --- | --- | --- |
| Player | No | [code] [shot n01/n02] |
| Daily | No | [code] [shot n03] |
| Normal analytics / Perfect Day / XP / coins | No | `vault.test.ts` asserts no effect |
| Notifications | No | Only `habits` rows are scheduled (`notifications.ts`) |
| Widgets | N/A | No widgets exist |
| Navigation labels | No | Not a tab; no visible label anywhere |
| Summaries (bell "System · Today" sheet) | No | Lists habits only |
| Search | N/A | No search exists |
| Public history / main backup | No | Main backup excludes `vault_runs`; a test asserts the export JSON has no "vault" text and that a forged `vault_runs` table is rejected |
| Settings page text | No | Runtime text check this session: `false` [run] |

**No privacy leak found in the UI.**

**How it works**
- **Entrance:** the only way in is a 1.2 s long-press on the Settings footer wordmark (`settings.tsx:214-232`). The route is `/vault`.
- **PIN:**
  - 4–8 digits, hashed as salted SHA-256 (`expo-crypto`, 16-byte random salt);
  - hash and salt live in **SecureStore** only (`vault.pin.hash`, `vault.pin.salt`), never in the DB or backups;
  - 5 wrong attempts trigger a 60 s lockout, which repeats with no escalation (`vaultAuth.ts:29-31`);
  - "Change PIN" is available inside the open Vault.
- **Biometrics:**
  - `expo-local-authentication`;
  - the toggle appears only when hardware exists and a fingerprint is enrolled;
  - the prompt offers "Use PIN"; device-passcode fallback is disabled;
  - if enabled, it prompts automatically on open.
- **Screen protection:** `expo-screen-capture` blocks screenshots and the recents thumbnail while the Vault is mounted (native only, `vault.tsx:41-45`).
- **Auto-lock:** leaving the app locks the Vault (`vault.tsx:83-90`). The Lock button exits.
- **Reset history:** "Reset vault" ends the current run (kept in history) and starts a new one today.
- **Run history:** past runs list, best and total days, start-date correction, quiet milestones (1/3/7/14/30/60/90/180/365/730 days).
- **Separation:**
  - own table `vault_runs`;
  - only `VaultHome.tsx` imports `repo/vault` (enforced by a comment, not lint);
  - own backup file `ghosted-<date>-p.json`, exported and imported inside the Vault;
  - importing a main backup cannot touch it (tested).

**Risks (none of them are UI leaks)**
1. `vault_runs` sits **unencrypted** in the same `ghosted.db` as everything else. The PIN gates the screen, not the data.
2. **Android Auto Backup:** `app.json` doesn't set `android.allowBackup`, and Expo's default is `true` (checked in `@expo/config-plugins` `AllowBackup.js`). The SecureStore plugin excludes its own data by default, but `ghosted.db` (including the Vault table) is eligible for Google backup. Whether the user's device backs up is UNCERTAIN.
3. On first visit there is no PIN. Anyone who knows the gesture can create one.
4. The deep link `ghosted://vault` opens the PIN screen (still protected).
5. On the web preview only, the PIN hash is stored in `localStorage` (`vaultAuth.ts:12-19`). This is documented as preview-only.
6. The private backup JSON is unencrypted.

---

## 12. Notifications

- **Package:** `expo-notifications ~57.0.21`, config plugin in `app.json` with color `#4FD8FF`. No custom small-icon asset.
- **Architecture** (`src/services/notifications.ts`):
  - `remindersSupported = Platform.OS !== 'web' && !(Android && isRunningInExpoGo())` (lines 24-25);
  - the module loads **lazily** with `import('expo-notifications')`, only when supported, and then sets the foreground handler (banner + list + sound).
- **Permission handling:**
  - `requestPermission()` creates the channel, then asks, respecting `canAskAgain`;
  - **it is called only when the user switches reminders ON**, either the Settings master switch (`settings.tsx:58-65`) or the habit editor's "Remind me" switch.
- **Channel:** `reminders`, "Habit reminders", importance HIGH. Created on request and on every sync.
- **Scheduling:** one-off DATE triggers for each enabled habit, for the next **14 days** (`REMINDER_HORIZON_DAYS`).
  - Skips past times, unscheduled days, and today if already done.
  - IDs: `habit-<id>-<YYYY-MM-DD>`.
  - Content: title = habit title; body = check-in question, or "Still open today."
- **Cancellation:** every sync cancels `habit-*` (or one habit's `habit-<id>-*`) IDs before rescheduling. Syncs run on:
  - boot and day change;
  - completing or undoing a habit for today;
  - habit save, archive or delete;
  - settings change, import and reset.

**The Expo Go workaround is still in place, and it is the intended design.** The comment explains that Expo Go on Android throws when `expo-notifications` is imported (SDK 53+). The UI tells the user that reminders need the installed app: bell sheet, Settings and habit editor all carry that copy.

**Can notifications crash startup?**
- In Expo Go Android and on web: **no**. The module is never imported.
- In dev/prod builds: `syncReminders` is wrapped in try/catch, and boot doesn't await it.
- `getPermission()` in Settings has no `.catch` (worst case: an unhandled-rejection warning, not a crash).
- On-device behaviour is **UNCERTAIN**. There is no evidence reminders were ever tested on a development or EAS build; the earlier plan was to test them later on one.

**Development-build only?** Yes on Android: they need an EAS preview APK or `expo run:android`. On iOS, Expo Go would load the module.

**Problems**
1. **P1: on a fresh install (Android 13+), reminders silently never schedule.**
   - The master switch defaults ON, and Regenesis Command's 20:30 reminder is enabled.
   - But permission is never requested at boot, so `syncReminders` sees `undetermined` and returns (`notifications.ts:90`).
   - Settings shows warnings only for `denied` and `unsupported`, not `undetermined`.
   - The user would have to switch it off and on again. [code-derived; not device-verified]
2. If the app isn't opened for 14 days, reminders stop (horizon).
3. DATE triggers may be inexact on Android 12+ (no exact-alarm permission). UNCERTAIN.
4. No small notification icon; Android may render a white square. UNCERTAIN.
5. Tapping a notification just opens the app (no deep link to the habit).

---

## 13. Visual / Design Audit

**Method**
- Compared all 7 concept images (`GHOSTED_concept_images.zip`, 941×1672 each: Player, Daily, Habit Intel, Missions, Shop, Inventory, Vault) with:
  - fresh screenshots of the current code (web export, headless Chrome, 412×892) [run];
  - the previous session's post-redesign screenshots [shot];
  - the theme and component code.
- **Android rendering may differ.** Fonts, SVG strokes and text wrapping all vary. Verify on device.

### Global elements

| Element | Fidelity | GOOD | BAD / differs |
| --- | --- | --- | --- |
| Background | HIGH | Deep navy `#03070D`, faint 32 px cyan grid, soft top cyan and bottom blue light pools, edge traces, vignette, thin chamfered screen frame (`HudBackground.tsx`). Restrained, as requested. | The concept's outer frame glow is heavier and more electric. The implementation is calmer, which matches the "restrained glow" brief. |
| Translucency | MEDIUM | Panels are rgba fills (alpha 0.45–0.9) over the backdrop; the grid shows through faintly | No blur (`expo-blur` not installed). Over a near-black backdrop the panels read as "dark panels" more than "glass". |
| Panel style | HIGH | Chamfered SVG frames, brighter corner brackets, double inset hairline on primary panels; sharp geometry, no rounded cards | — |
| Border style | HIGH | 1 px cyan stroke plus two faint glow strokes; brighter on active/pressed (`HudFrame.tsx`) | — |
| Cyan/blue treatment | HIGH | Palette is consistently cyan/blue; red is reserved for danger and Vault reset | **Per-habit accent ticks/bars in red, orange, green and purple** (pre-redesign seed colors, §5) |
| Typography | HIGH | Orbitron for the wordmark and wide letter-spaced titles; Exo 2 for body and numbers; matches the concept's techno look | Small caps labels wrap at narrow widths ("TODAY'S PROGRESS", "OVERALL SCORE") |
| Ghost profile image | MEDIUM | **Red background fully removed:** `assets/ghost.png` is 736×736 RGBA, transparent background, **0 red pixels** [run]. Sits on a dark grid plate with a bottom fade. No red dominates anywhere. | The navy/ice duotone is **darker and lower-contrast** than the concept's bright white figure with cyan rim light. It reads muddy, especially in small thumbnails (Missions/Vault header, Shop, Inventory, Intel). |
| Player card | HIGH | Same fields in the same order: Name, Level, Title box, Ghost Coins ring, XP bar + numbers | Level is zero-padded ("01"). Title shows rank names (Unseen…) instead of "The Builder". |
| Daily cards (habit rows) | HIGH | Framed rows, line icons matching the concept set, circle checks, completed rows lit | Extras not in the concept: colored accent tick, streak/missed note line |
| Bottom navigation | HIGH | Five framed slots with matching icons (person, calendar, crossed swords, cart, backpack); lit frame slides to the active tab | — |

### Per screen

| Screen | Fidelity | Why |
| --- | --- | --- |
| Player | **HIGH** | Layout matches the concept block for block [shot n01]. Gaps: Ghost portrait contrast and colored ticks. |
| Daily | **HIGH** | Hero with Ghost + concept copy, framed week strip, list. Differs: the strip is the last 7 days ending in "TODAY", and days before tracking show "—"; the concept shows a fixed Mon–Sun week [shot n03]. |
| Habit Intel | **HIGH** | Header card with Ghost, habit icon box, schedule/reminder facts; 5-tab bar; stat strip with sparklines; score trend with range selector; monthly bars; streak tiles [shot r29]. Differs: sparklines lack the filled area; the 6-month label isn't a dropdown; dense tab labels are tiny (8.5 px). |
| Missions | **HIGH** | Horizon tabs, Active/Upcoming panels with counts, rows with icon box, title, tags, progress bar, count/%, ring, chevron; Ghost thumbnail in header [shot r17, n05]. |
| Shop | **MEDIUM** | Wallet panel, banner, 2-column cards, category tag, price ring and BUY match. **BAD: reward art is a single line icon "hologram", not the concept's illustrated holographic product art**; cards look emptier. Buy is two-tap ("CONFIRM N" / "NEED N") [shot n07]. |
| Inventory | **HIGH** (art MEDIUM) | Hero ("Inventory / Tools for a better you."), Items/History tabs, framed art box, name, description, "x N" and date, Use Item button [shot r23]. Art is a clean line icon instead of the concept's textured icon art. Hero subtitle truncates at narrow width. |
| Vault | **HIGH** | Header with Ghost thumb and no bell/settings (as in the concept); "PRIVATE VAULT / Now Or Never"; segmented gauge with red flank arcs and crosshair ticks; best/total/start-date strip; red Reset button [shot r36]. Below the concept area: run history, "Correct the start", and "Private settings", which use plainer Card/Row styling. |
| Settings | MEDIUM (no concept) | HUD header, framed cards, rows; native `Switch` [shot n09] |
| Editors (habit/mission/reward) | MEDIUM (no concept) | Consistent HUD inputs, icon pickers, steppers, date/time fields [shot r40] |
| Manage Habits | **LOW** | **Raw icon key words printed as large text** next to each title; colored accent bars; older list layout [shot n04] |
| Overlays (level up / day complete / item acquired) | HIGH vs brief | Solo-Leveling-style "! NOTIFICATION" System window (no concept image) |

---

## 14. Animation / Microinteraction Audit

| Interaction | Status | Notes |
| --- | --- | --- |
| Card press feedback | IMPLEMENTED | `PressableScale` sinks to 0.97–0.98; `HudPressable` lights its border on press; haptic tick on buttons |
| Tab transitions | IMPLEMENTED | Tabs use `animation: 'fade'`. `BottomNav` and `HudTabs` slide the lit frame (240 ms). |
| Habit completion | IMPLEMENTED | Circle fills (back-ease), row frame pulses, cyan light sweep across the row (460 ms), "+XP" and "+coins" float up, Confirm haptic, Ghost portrait glow pulse; Clock_Tick haptic on undo (`HabitRow.tsx`) |
| Checkmark animation | IMPLEMENTED | Scale/opacity pop of the check dot (not a stroke-draw) |
| XP bar animation | PARTIAL | Eases to the new value (700 ms). On level-up the card's bar animates **backward** to the new level's small value; the overlay shows fill-then-reset. |
| Coin count animation | IMPLEMENTED | `AnimatedNumber` (JS `requestAnimationFrame`, `setState` per frame) |
| Level-up animation | IMPLEMENTED | System window pop, frame glow flash, 26-particle burst, bar refill, rank-up reveal with motto, heavy haptic, Ghost scan line; 3 s or tap |
| Perfect Day | IMPLEMENTED | "Day complete N/N +XP +coins", once per day (`lastCelebratedDay`) |
| Shop purchase animation | IMPLEMENTED | See §8 (fly-to-Inventory is PARTIAL) |
| Inventory use animation | IMPLEMENTED | Digital dissolve (§8) |
| Chart animations | PARTIAL | LineChart draws in, MonthBars grow in, Ring and Vault gauge arcs animate. Frequency bars, sparklines and calendar are static. |
| Vault transitions | PARTIAL | Stack fade, staggered panel reveal, PIN dots shake on error, gauge arc animates. No unlock reveal transition. |
| Screen enter | IMPLEMENTED | `Reveal` stagger (fade + 10 px rise). Intel hero grows out of the tapped row. |
| Boot ident | IMPLEMENTED | 1.25 s letter lock-in + scan line + particles on each cold start |
| Mission complete | PARTIAL | Particle burst + toast in the editor only |
| Haptics | IMPLEMENTED | `services/haptics.ts`: Android uses `performAndroidHapticsAsync` (Virtual_Key, Confirm, Clock_Tick, Reject); iOS uses impact/notification. Off on web; respects the setting. |
| Sound effects | MISSING | `playSound()` is called everywhere, but `SOURCES = {}` (`services/sound.ts:17`) and no audio files exist |
| Reduced motion | IMPLEMENTED | `useReducedMotion` respected by the FX components |

**Blocking or expensive animations**
- `FxHost` overlays cover the screen for 1.9–3 s each (tap dismisses). Level-up + Day complete can chain to about 6 s.
- The dissolve runs in a 2 s `Modal` with no dismiss and no `onRequestClose`.
- `Disintegrate` mounts **42 copies** of the item card (each with an SVG frame, icon and texts). Expect a mount spike on low-end Android.
- No looping animations exist (no `withRepeat`, no `setInterval`).

---

## 15. Performance Audit

*Not profiled on Android hardware this session. Findings come from code.*

### Critical
- **None confirmed.**

### Important
1. **SVG frame on everything.**
   - Every panel, row, button, input, tab, icon box, picker cell and keypad key draws its own `react-native-svg` frame (3–5 paths, `HudFrame.tsx`).
   - Each frame needs a second render after `onLayout` → `setState` (`useBox`), plus two Reanimated animated props even when static (`HudFrame.tsx:77-82`).
   - Editors render about 30–40 frames; main screens 15–25.
2. **Every write re-renders and re-queries everything.**
   - `commit()` (`state/game.ts:62-99`) replaces habits, recent, player and settings.
   - As a result, every mounted tab screen and every `AppHeader` re-renders (nothing is memoized), and per-row streak loops are recomputed.
   - Every `useLiveQuery` re-runs its SQL on each version bump: Missions, Shop, Inventory (×2), Intel, editors.
   - So one habit tap means about 7 store queries plus N screen queries plus a broad re-render.
3. **Full-screen `HudBackground` SVG per mounted screen.** Grid pattern + 3 radial gradients + vignette. Tabs stay mounted, so there are 5+ instances. It is static and memoized; the cost is first render and memory.
4. **`Disintegrate` with 42 face copies** (see §14).
5. `commit()` re-reads 366 days of completions on every write. Fine at current sizes; it grows with habits.

### Minor
- `AnimatedNumber` runs on the JS thread.
- `ProgressBar` animates `width` (layout) instead of a transform.
- Each habit row keeps a mounted `LinearGradient` sweep layer.
- `getHabit()` loads all habits and schedules to return one.
- Many labels use text-shadow glow.
- Lists are `.map` inside `ScrollView`, which is fine for current sizes. Redemption history is capped at 20.
- **Bundle:**
  - Hermes bytecode is 6.7 MB unminified;
  - `MaterialSymbols_400Regular.ttf` (967 KB) is bundled via `expo-symbols` (an Expo Router dependency, unused by app code);
  - `ghost.png` is 453 KB (736 px) but displayed at ≤ ~200 px.

**Good, and absent:** no blur layers, no Android elevation shadows (glow is SVG strokes and text shadows), no continuously running animations, no large images apart from `ghost.png`.

---

## 16. Data / Storage Audit

**SQLite schema** (`db/migrations.ts`)

| Table | Holds |
| --- | --- |
| `settings` | Key/JSON value: playerName, haptics, sound, reminders, lastCelebratedDay, seeded |
| `habits` | Habits |
| `habit_schedules` | Versioned weekday masks |
| `completions` | One row per habit per day, with stored XP/coins |
| `ledger` | Append-only XP/coin movements (habit, habit_undo, habit_deleted, perfect_day, perfect_day_undo, purchase) |
| `perfect_days` | Dates where every scheduled habit was complete |
| `rewards`, `purchases`, `inventory`, `redemptions` | Shop and Inventory |
| `goals` | Missions (v2 columns added) |
| `vault_runs` | Private counter |

**Migrations.**
- Driven by `PRAGMA user_version`.
- v1 = base schema.
- v2 = emoji → line-icon keys, plus the mission fields.
- Each migration runs in a transaction and the list is append-only. Tested.

**Repositories.** `src/repo/*.ts` depend on the `Db` interface (`db/db.ts`). Tests run them against real SQLite (`node:sqlite`).

**Persistence across restarts**

| Data | Persists? | Where |
| --- | --- | --- |
| Habits | Yes | `habits`, `habit_schedules` |
| Completions | Yes | `completions` |
| XP | Yes | `ledger` |
| Coins | Yes | `ledger` |
| Missions | Yes | `goals` |
| Shop purchases | Yes | `purchases` + `ledger` + `inventory` |
| Inventory | Yes | `inventory`, `redemptions` |
| Vault history | Yes | `vault_runs` |
| Vault PIN/biometrics | Yes | SecureStore |
| Settings | Yes | `settings` |

Evidence: [code], plus a previous-session web screenshot named `35-player-after-restart.png` (taken before the redesign). **Not re-verified on Android this session.**

**Backup, export, import**
- Export: JSON via the share sheet (`services/backupFiles.ts`).
- Import:
  - document picker;
  - `parseBackup` validates app, kind, schema version, table whitelist and value types;
  - `importBackup` replaces tables all-or-nothing (tested rollback).
- The Vault has its own backup and import.
- "Reset all data" requires typing RESET; it wipes all tables plus Vault credentials and re-seeds the habits.
- There is no automatic or scheduled backup.
- A v1-era backup imports emoji icons as-is (they render as text).

**Timezones.** Correct by design: local DateKeys with UTC arithmetic (§5).

**Transaction integrity**
- XP/coin, purchase, redeem, Vault, order, import and reset operations all run inside the serialized `transaction()` queue.
- Some writes run **outside** the queue: goals CRUD, reward create/update, settings, Vault `setCurrentStart`.
- `expo-sqlite`'s `withTransactionAsync` is not exclusive. An unqueued write that lands during a queued transaction joins it, and would roll back with it.
- Low risk. Practical impact UNCERTAIN.

**Risks**
- Unencrypted DB.
- Android Auto Backup default (§11).
- The DEV demo seed writes permanent data in dev builds (§10).
- Backups are manual only.

---

## 17. Tests / Validation

The real folders cannot run anything (§2). Checks ran on a **scratch copy that merges both halves**, in the session temp folder; the user's folders were not modified.

| Check | Result | Detail |
| --- | --- | --- |
| Typecheck (`tsc --noEmit`) | **PASS** | 34 s, 0 errors |
| Lint (`npm run lint` → `expo lint`) | **PASS** | No output |
| Lint (direct `eslint src scripts`) | `src/`: PASS (0 errors, 0 warnings, 111 files). `scripts/make-icons.js`: **FAIL** | 12 `no-undef` errors (`Buffer`, `__dirname`); a Node-globals config issue that `expo lint` doesn't cover |
| Unit tests (`jest`, `jest-expo` preset) | **PASS: 52/52, 8 suites** | ~25 s. Suites: completion, stats, shop, backup, vault, migration, dates, progression. Node prints an `ExperimentalWarning` for SQLite (harmless). |
| Dependency tree (`npm ls --depth=0`, merged copy) | **PASS** | Every dependency present at the expected version |
| Android JS export (`expo export -p android --no-minify`) | **PASS** | 3,838 modules, 212 s, 6.7 MB HBC, 37 assets. Hash identical to the 2026-10-04 19:54 build. |
| Web export (`expo export -p web`) | **PASS** | Served locally with COOP/COEP headers |
| Web smoke run (headless Chrome, current code) | **PASS** | Boot, Player, complete 2 habits, Daily, Manage Habits, Missions, Shop empty → create reward, Inventory, Settings. No page errors; one a11y `aria-hidden` warning (web only). |
| `npm start` in either real folder | **FAIL (not runnable)** | C: has no `package.json`; D: has no `src/` and half the deps. Not attempted. |
| `expo-doctor` | NOT RUN | Needs network; skipped |
| Android device / emulator run | NOT RUN | No device attached. The Android emulator is unusable on this PC (7.9 GB RAM, ~1 GB free; System UI froze in earlier sessions). |
| Native build (EAS / Gradle) | NOT RUN | — |

**Custom scripts**
- `scripts/make-icons.js` regenerates the icons with Node + zlib.
- `scripts/make-ghost.sh` rebuilds `ghost.png` with ffmpeg from the original red-background image.
- Neither was run.

`npm run check` = typecheck + lint + test.

---

## 18. Assets

| Asset | Location | Size | Used by | Status |
| --- | --- | --- | --- | --- |
| `ghost.png` | `D:\…\assets` | 453 KB, 736×736 RGBA | `GhostAvatar` (7 places) | Red removed (0 red px), transparent, cyan/navy duotone. Contrast lower than concept. Could be downscaled. |
| Original Ghost source (red background) | **Not in repo** | — | `make-ghost.sh` input | A copy exists only in an old session temp folder (`…\Temp\claude\…\235e31ec…\scratchpad\ghost_src.jpg`), which may be auto-cleaned. Ask the user for the original if reprocessing is needed. |
| `icon.png`, `android-icon-foreground.png`, `android-icon-monochrome.png`, `splash-icon.png`, `favicon.png` | `D:\…\assets` | 48 / 10 / 9 / 6 / 2 KB | `app.json` | Generated geometric "G" mark, cyan on navy |
| `android-icon-background.png` | — | — | — | Deleted (adaptive icon uses `backgroundColor`) |
| Fonts | `node_modules/@expo-google-fonts/*` | Orbitron 4 weights (~25 KB each), Exo 2 5 weights (~151 KB each) | `_layout.tsx` | OK |
| `MaterialSymbols_400Regular.ttf` | via `expo-symbols` | 967 KB | Not used by app code | Bundled anyway (Expo Router dependency) |
| Icons | `lucide-react-native` | — | `components/hud/icons.tsx` | Keys stored in DB. Custom "no-junk" composite. |
| Sounds | — | — | `services/sound.ts` | **None exist** |
| Notification icon | — | — | `expo-notifications` plugin | **None** (color only) |
| Concept ZIP | `D:\New folder\GHOSTED\` (untracked, not gitignored) + identical copy at `C:\Users\WELCOME\Downloads\` | 14.3 MB, 7 PNGs | Reference only | Not bundled. Duplicate copy. |

**Red-background problem:** solved at the asset level, with no red visible anywhere. The remaining issue is contrast and brightness, not red.

---

## 19. Known Problems / Risks

### P0: blocks normal use
1. **Project split across `C:\Users\WELCOME\Downloads\GHOSTED` and `D:\New folder\GHOSTED`.** Neither runs. `node_modules` is split mid-package (§2).
2. **No GHOSTED work is in git** (template commit only, no remote). Everything exists as uncommitted files spread over two drives. One more file-system accident loses the project.

### P1: major issue
3. **Reminders never schedule on a fresh install on Android 13+.** Permission is requested only when a switch is turned ON, but the switch already defaults ON (`notifications.ts:90`, `settings.tsx:58-65,137-151`). [code-derived]
4. **No evidence reminders have been tested on a real dev/EAS build** (Expo Go on Android can't run them). UNCERTAIN.

### P2: polish / functional gap
5. **Manage Habits shows raw icon keys as text** (`habits.tsx:88`) [shot n04].
6. **Unlimited backfill** awards full XP/coins plus retroactive Perfect Day bonuses, and moves start dates (distorts analytics) (`progress.ts:162-172,192`).
7. **Deleting a habit can grant retroactive Perfect Day bonuses** (`progress.ts:236-255`).
8. **Vault data can leave the device through Android Auto Backup:** `allowBackup` is not configured, and the default is true. UNCERTAIN on the device.
9. **Shop/Inventory art is line icons**, not the concept's illustrated hologram art.
10. **Ghost portrait is darker and lower-contrast than the concept** (asset `ghost.png`).
11. **Pre-redesign accent colors on the seeded habits:** red, orange, green and purple ticks and bars (`config/seed.ts`).
12. **Daily week strip is a rolling 7 days**, not the concept's Mon–Sun week (`WeekStrip.tsx:20`).
13. **No coin/XP or purchase history UI**, though the data exists.
14. **Sound setting does nothing** (no sound files).
15. **"This month" / "This year" are rolling 30/365-day windows** labelled as calendar periods (`Overview.tsx:74,78`; `stats.ts:284-285`).
16. **Performance risks** not yet measured on device: the SVG-frame count, store-wide re-render plus re-query per write, and the 42-tile dissolve.
17. **Negative coin balance is possible** after undo/delete. Consistent, but unexplained to the user.

### P3: optional improvement
18. Intel's footer nav always marks Daily active; tapping Daily there is a no-op.
19. The inventory dissolve `Modal` lacks `onRequestClose`.
20. No Android notification small icon (UNCERTAIN rendering). No tap-to-habit deep link. 14-day reminder horizon.
21. `scripts/make-icons.js` fails a direct ESLint run (Node globals).
22. Stale comments and dead options:
    - `state/fx.ts:5` mentions a "CharacterStage" that doesn't exist;
    - `Screen.tsx:22-23` says "the Vault passes red", but nothing passes `tint`;
    - `GlowText` (`Text.tsx:36`) is unused;
    - `Screen` `scroll` and `tint` props are never used;
    - `CharacterState` values `training` and `reading` are never cued.
23. Concept ZIP (14 MB) isn't gitignored, and a duplicate copy sits in Downloads.
24. The original Ghost source image is not in the repo.
25. The Vault table is unencrypted at rest. The PIN uses a fast hash (SHA-256), mitigated by SecureStore.
26. The DEV-only "Load demo history" writes permanent rows in dev builds.
27. v1-era backups import emoji icons unconverted.
28. Mission writes and Settings `getPermission()` lack error handling.
29. "Overall score" reads 100% on day one after any completion (an unfinished today is excluded by design).
30. Web-preview-only quirks:
    - an `Invalid DOM property transform…` dev warning from `react-native-svg`, seen in the earlier session's Vault screenshot;
    - the RN-web `Switch` thumb color;
    - an `aria-hidden` focus warning.

---

## 20. Things That Should NOT Be Rebuilt

These are solid, tested or verified, and should be preserved:

- **Database layer:**
  - the `Db` interface;
  - the serialized `transaction()` queue;
  - `migrations.ts` (append-only, `user_version`);
  - the `node:sqlite` test harness (`__tests__/helpers/testDb.ts`).
- **XP/coin engine:**
  - append-only `ledger`, with rewards stored per completion;
  - `setCompletion` with UNIQUE-based duplicate prevention;
  - exact undo;
  - `resyncPerfectDays` with exact reversal;
  - the invariant tests.
- **Dates and schedules:** `domain/dates.ts` (local DateKey, UTC math) and versioned schedules (`domain/schedule.ts`, `habit_schedules`).
- **Analytics engine:** `domain/stats.ts`. Pure, deterministic, 17 tests, real data only.
- **Progression config:** `config/game.ts`, `config/ranks.ts`, `domain/progression.ts`.
- **Shop and Inventory transactions:** `repo/rewards.ts` (`purchaseReward`), `repo/inventory.ts` (`redeemItem`). Tested.
- **Backup / import / reset:** `repo/backup.ts` (validation, all-or-nothing, separate Vault backup). Tested.
- **Vault:**
  - `services/vaultAuth.ts` (SecureStore salted hash, lockout, biometrics);
  - `repo/vault.ts`;
  - `PinPad`, `VaultHome`, `VaultGauge`;
  - separation rules (tested).
- **Notification architecture:** lazy import, Expo Go gate, per-habit ID scheme, resync points. **Only fix the permission flow** (§12).
- **HUD design system:**
  - `config/theme.ts` tokens;
  - `HudFrame`, `HudPanel`, `HudPressable`, `SystemButton`, `HudTabs`, `BottomNav`, `AppHeader`, `StatBlock`, `Ring`, `ProgressBar`, `icons.tsx`, `HudBackground`, `GhostAvatar`.
- **Screens:** Player, Daily, Habit Intel, Missions, Shop, Inventory and Vault are functional and close to the concepts. Polish them; don't rewrite them.
- **FX:** `Overlays`/`FxHost`, `ParticleBurst`, `Disintegrate`, `FloatUp`, `BootSequence`, and the `HabitRow` completion sequence.
- **Navigation:** Expo Router file routes with the custom HUD tab bar.
- **The 52-test suite and `npm run check`.**

---

## 21. Incomplete / Interrupted Work

1. **Folder move interrupted** on 2026-10-09, between 20:45 and 20:54 (§2). Highest priority.
2. **Nothing committed.** The repo still has only the template commit.
3. **The redesign was not applied to `src/app/habits.tsx` (Manage Habits).**
   - Its file date (2026-10-04 12:33) is before the v2 icon migration (18:39).
   - It still renders `habit.icon` as text, which shows the icon key words [shot n04].
4. **Seed accent colors were never moved to the cyan palette.** `config/seed.ts` still holds the old red/orange/green/purple values, so the seeded habits keep them in the DB.
5. **Ghost portrait.**
   - Red removal is done.
   - Matching the concept's bright, high-contrast look is not.
   - The source image isn't in the repo.
6. **Shop/Inventory concept art is not implemented.** Line-icon "HoloArt" stands in for illustrated hologram art; no image assets exist.
7. **Sound effects:** the registry and call sites exist, but there are no files.
8. **Final avatar:** `GhostAvatar` is the drop-in point for a Rive/GLB character (documented in the README). Currently a static image with glow/scan cues; the `training` and `reading` cues are unused.
9. **Notifications:** no evidence they were tested on a development build. The permission-flow gap is open (§12).
10. **Analytics gaps:** no multi-month heatmap; "Last 6 months" is not a selector; no cross-habit analytics; no coin/XP/purchase history screens.
11. **Animation gaps:** no fly-to-Inventory landing; no unlock transition in the Vault; frequency bars and sparklines are static (§14).
12. **Settings and the Vault's lower "Private settings" block** use older Card/Row list styling. No concept image exists for them.
13. **The DEV demo seed** (`src/dev/demoSeed.ts` + the Settings "Developer" block) is meant to be removed or kept dev-only. The file comment says how to remove it.
14. **No placeholder components or fake production data were found.** No TODO/FIXME markers exist.

---

## 22. Recommended Next Steps for Astra

*Do not rebuild working systems (§20). Ask the user before any destructive or location-changing step.*

1. **Reunite the project (blocks everything), about 20–40 min.** Ask the user which location to keep. D: has `.git` and 38 GB free; C: has about 5 GB free.
   - **Option A, no download:**
     1. Move `src/`, `scripts/` and this `GHOSTED_AUDIT.md` from `C:\Users\WELCOME\Downloads\GHOSTED` into `D:\New folder\GHOSTED`.
     2. Move every entry of the C: `node_modules` into the D: `node_modules`, merging `lucide-react-native/dist`. Keep C:'s version of any duplicate file.
     3. This exact merge was verified complete this session (`npm ls` clean; tests and bundles pass).
   - **Option B, clean reinstall:**
     1. Move `src/` and `scripts/`.
     2. Delete both `node_modules` folders.
     3. Run `npm ci` (about 600 MB). `.npmrc` already sets long fetch timeouts.
   - Then run `npm run check`. Expect typecheck, lint and 52 tests to pass.
2. **Protect the work, about 10 min.**
   - With the user's approval, commit the current state on a branch.
   - Add `GHOSTED_concept_images.zip` to `.gitignore`, or ask the user whether to commit it.
   - Suggest a private remote.
3. **Run on the user's Android phone.**
   - Expo Go covers the core loop.
   - Use an EAS `preview` APK (`npx eas-cli build -p android --profile preview`) for reminders, biometrics and screen-capture blocking.
4. **Fix broken core logic (P1), about 1–2 h.**
   - Request notification permission when reminders are ON but the status is `undetermined`, for example on first boot or first Daily visit.
   - Show a Settings notice for `undetermined`.
   - Verify that the 20:30 Regenesis Command reminder fires.
5. **Quick visible bug fix, about 15 min.** Render `LineIcon` in `habits.tsx` instead of `habit.icon` text.
6. **Data integrity and privacy: product decisions for the user. Ask; don't assume.**
   - (a) Limit the backfill window, or stop backfill from granting Perfect Day bonuses.
   - (b) Decide whether deleting a habit should grant past Perfect Days.
   - (c) Exclude `ghosted.db` from Android Auto Backup (`android.allowBackup: false`, or backup rules) to keep Vault data on the device.
   - (d) Explain or clamp negative coin balances.
7. **Finish the visual conversion to the concepts** (polish, not a redesign):
   - Ghost portrait contrast: reprocess with a brighter curve; needs the original image from the user.
   - Move seed accents to the cyan family (the DB needs an update/migration for existing installs).
   - Optional Mon–Sun week strip.
   - Shop/Inventory art.
   - Narrow-width label wrapping.
   - Styling of the Settings and Vault "Private settings" blocks.
8. **Animations and microinteractions:**
   - add sound files to `services/sound.ts`;
   - sparkline and frequency-bar animation;
   - fly-to-Inventory landing pulse;
   - Vault unlock transition;
   - `onRequestClose` for the dissolve `Modal`.
9. **Performance, after measuring on the phone:**
   - memoize `HudFrame`/`HudPanel` and skip animated props when there is no `highlight`;
   - narrow Zustand selectors / memoize rows;
   - limit `useLiveQuery` refetches to relevant writes;
   - reduce the dissolve tile count (or use a snapshot);
   - downscale `ghost.png`.

---

## 23. Important File Map

| File | Purpose | Stability | Notes |
| --- | --- | --- | --- |
| `package.json`, `app.json`, `tsconfig.json`, `eas.json`, `metro.config.js` (on D:) | Deps, Expo config, TS paths, EAS profiles, web-SQLite headers | Stable | No `android.allowBackup`; no notification icon |
| `src/app/_layout.tsx` | Root: fonts, boot, day rollover, overlays | Stable | — |
| `src/app/(tabs)/_layout.tsx` + `src/components/hud/BottomNav.tsx` | Tabs + HUD nav | Stable | — |
| `src/app/(tabs)/index.tsx`, `daily.tsx` | Player, Daily | Stable | Week strip is rolling 7 days |
| `src/app/habit/[id].tsx` + `src/components/intel/*` | Habit Intel | Stable | Footer nav quirk |
| `src/app/habits.tsx` | Manage habits | **Needs fix** | Raw icon text (line 88) |
| `src/app/habit-editor.tsx` | Habit CRUD | Stable | Seed accents not in palette |
| `src/app/(tabs)/missions.tsx`, `mission-editor.tsx`, `components/missions/MissionRow.tsx` | Missions | Stable | No reorder UI |
| `src/app/(tabs)/shop.tsx`, `reward-editor.tsx`, `components/shop/RewardCard.tsx` | Shop | Stable | Art gap |
| `src/app/(tabs)/inventory.tsx`, `components/inventory/*` | Inventory + dissolve | Stable | 42-tile dissolve cost |
| `src/app/vault.tsx`, `components/vault/*` | Vault | Stable | Keep privacy rules |
| `src/app/settings.tsx` | Settings, backup, Vault entrance | Stable | Reminder permission notice gap |
| `src/state/game.ts` | Store, completion flow, FX triggers | Stable | Broad re-render on `commit()` |
| `src/state/useLiveQuery.ts` | Re-query on write | Stable | Re-runs on every write |
| `src/repo/progress.ts` | Completion, undo, Perfect Day, habit CRUD | Stable, tested | Backfill/delete bonus decisions |
| `src/repo/ledger.ts` | Balances, streaks | Stable, tested | — |
| `src/repo/rewards.ts`, `inventory.ts` | Purchase, redeem | Stable, tested | — |
| `src/repo/vault.ts`, `src/services/vaultAuth.ts` | Vault data, PIN | Stable, tested | Unencrypted table |
| `src/repo/backup.ts`, `src/services/backupFiles.ts` | Backup/import/reset | Stable, tested | — |
| `src/db/*` | SQLite open, migrations, transactions | Stable, tested | Add new migrations at the end only |
| `src/domain/*` | Dates, schedules, stats, progression | Stable, tested | — |
| `src/config/game.ts`, `ranks.ts`, `seed.ts`, `theme.ts` | Tunables, seeds, design tokens | Stable | `seed.ts` accents are old palette |
| `src/services/notifications.ts` | Reminders | Works in code; **no evidence of a device test** | Permission flow P1 |
| `src/services/sound.ts` | Sound registry | Incomplete | No files |
| `src/components/hud/HudFrame.tsx`, `HudPanel.tsx` | Core HUD frame | Stable | Main performance lever |
| `src/components/hud/GhostAvatar.tsx`, `assets/ghost.png`, `scripts/make-ghost.sh` | Player portrait | Stable | Contrast; source image missing |
| `src/components/fx/Overlays.tsx` | Level up / Day complete / Item acquired | Stable | Blocks for 1.9–3 s (tap to skip) |
| `src/dev/demoSeed.ts` | DEV sample data | DEV only | Writes permanent rows |
| `src/__tests__/*` | 52 logic tests | Passing | Run with `npm test` |

---

## 24. Final Handoff Summary

**Current health**
- Code health: **good**. Strict TypeScript is clean, lint is clean, 52/52 tests pass, and the Android and web bundles build.
- Project health: **critical**, until the split folders are reunited and the work is committed.

**Already solid**
- Data layer: SQLite, migrations, serialized transactions.
- Ledger-based XP/coin economy with duplicate prevention and exact undo.
- Versioned schedules and local-date handling.
- Analytics engine (real data only).
- Shop and Inventory transactions, backup/import/reset.
- Vault privacy separation, with no UI leaks found.
- The HUD design system and the main screens, which match the concepts closely: Player, Daily, Intel, Missions and Vault are HIGH; Shop is MEDIUM.

**Unfinished**
- Manage Habits icon bug.
- Reminder permission flow, and no on-device reminder test.
- Shop/Inventory illustrated art.
- Ghost portrait contrast.
- Leftover seed accent colors.
- Sounds.
- History screens for coins and purchases.
- A few animation gaps (§14).

**Highest-risk areas**
1. The folder split, and the uncommitted, un-backed-up work.
2. Reminders on real Android builds.
3. Vault data exposure via Android Auto Backup.
4. Retroactive XP/Perfect Day grants via backfill or delete.
5. Unmeasured performance on a mid-range Android phone (SVG frames, re-renders, dissolve).

**What Astra should do first:** reunite the folders (§22 step 1), get the user's approval to commit, then run `npm run check`.

**What the user should check visually on the phone**
1. Ghost portrait on the Player card: is it bright enough compared with the concept?
2. Colored ticks on the Daily rows: keep them, or make them cyan?
3. Manage Habits screen (Daily → Manage): the icon words bug.
4. Shop cards: is line-icon art acceptable, or should it be illustrated art?
5. Inventory "Use item" dissolve: smooth on the phone?
6. Level-up / Day complete overlays: do they feel too long?
7. Vault PIN screen and gauge.
8. Whether the 8:30 PM Regenesis Command reminder actually arrives on an installed (EAS) build.
