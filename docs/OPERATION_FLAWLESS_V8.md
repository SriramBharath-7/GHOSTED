# GHOSTED V8 — Operation Flawless (staged development)

**Status: DRAFT. Do not merge into production or replace an installed APK until the release gates below pass.**

## Invariants

1. The encrypted personal/demo Vault stays device-local. Never put Vault keys, passwords, or authentication tokens in the public-profile operation journal or cloud snapshot.
2. XP, Ghost Coins and purchases must not be awarded/spent twice. Existing rewardLedger and historical career credits remain authoritative; never repay imported history.
3. Local protocol actions are journaled before profile saves. Interrupted journals are repaired from the actual local profile on boot. The journal is diagnostic/write-ahead state, not yet an independently server-replayed event stream.
4. The Supabase snapshot compare-and-swap revision is authoritative for committing the entire public profile. No last-writer-wins overwrite.
5. Ambiguous conflicts must not be silently resolved. Save both source copies, inspect, explicitly choose a side, or attempt a verifiable safe merge.
6. Restart Sync Engine never deletes data or reboots the Android app.
7. Without a trusted common ancestor, historical concurrent edits cannot be inferred safely.

## Implemented in this branch

- Settings → Cloud & Sync → Open Sync Control Center: status, engine restart, diagnostics, profile export and conflict decisions.
- Conflict decisions: keep this device, keep cloud, try safe merge. Requires verified export acknowledgement, explicit confirmation, and unchanged server revision/local profile.
- Perfect Day merge reconciliation using the real habit engine's schedule and reward rules: grant 50 XP and 20 GC once if merged due tasks complete a Perfect Day.
- 20-second request timeouts and safe retry/restart. Offline edits remain local.
- A versioned durable local public-profile write-ahead operation journal with recovery after interrupted saves, excluding Vault and demo histories.
- Optional Supabase transactional idempotency receipts in supabase/migrations/20261101_v8_idempotent_receipts.sql.

## Activation order — do not reverse

1. Export and verify public history backups independently on Android and website. Export unresolved conflicts. Do not clear storage, overwrite Supabase, or uninstall.
2. Review the SQL migration against the existing ghosted_snapshots table and ghosted_put_snapshot RPC. Apply to a TEST Supabase project first. This pull request does not migrate any database.
3. Verify owner-only authorization, anonymous rejection, Vault storage-key rejection, duplicate operation ID returning exactly one revision, rejection of a reused ID with another payload, and compare-and-swap mismatch handling.
4. Set VITE_GHOSTED_V8_RPC_ENABLED=true ONLY in a test Vite/Vercel build and test GitHub Actions APK after the migration succeeds. The default false keeps the old guarded CAS path; it does not enable the fully idempotent V8 server path.
5. Test dual-device online/offline conflicts, same-day additions, Perfect Day, conflicting purchases, undo, a lost server response after commit, app shutdown during POST, authentication expiry and worker restart.
6. Confirm both device profiles and Supabase agree on XP, coins, purchases and histories, without unexpected reboot. Use production only after independent verification.
7. Merge the reviewed PR and release a signed APK only after all gates pass.

## Operator recovery

In Settings, open Sync Control Center, run Diagnostics, export a public backup, and use SAVE BOTH COPIES if a conflict is present. Verify the download. Choose KEEP THIS DEVICE, KEEP CLOUD or TRY SAFE MERGE. The server revision is re-read immediately before applying the decision. If either device changed since capture, the action refuses rather than overwriting.

## Remaining limitations and release blockers

- Snapshot CAS plus server receipts (when enabled) make snapshot upload IDs idempotent, but this is not a fully replayable server-side per-habit event-sourcing backend.
- Existing V7.9 conflicts without a trusted common ancestor may require manual reconciliation.
- Schedule-dependent rewards must be verified on real devices, not only unit tests.
- No realtime subscription yet: updates use polling, reconnect and foreground events. Android may suspend syncing in background.
- localStorage and SQLite mirror do not share one ACID transaction. The journal helps recover interrupted writes, not magically synchronize those stores atomically.
- Accessibility and cramped Android layouts still require device checks.
- No system can promise zero outages; this design must preserve data and offer recoverable paths when a failure occurs.

## CI

GitHub Actions tests all Node regression files, builds Vite and the Capacitor Android project, verifies signing and uploads an APK. CI passing is necessary but not sufficient to authorize production deployment.
