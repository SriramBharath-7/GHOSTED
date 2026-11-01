# Operation Flawless — final release gates (do not merge yet)

## Read-only Supabase audit — November 1, 2026

- Confirmed the existing `ghosted_snapshots` table, RLS policies, revision CAS RPC and one existing snapshot row.
- Verified the existing `ghosted_put_snapshot(text,jsonb,bigint)` SQL contract matches the V8 wrapper's call.
- The existing RPC includes an operator-identity check and validates the expected public-profile storage key, schema version, `days` and `purchased`.
- V8 `ghosted_operation_receipts` and `ghosted_put_snapshot_v8` are **NOT installed** in the live database.
- Existing Supabase security advisor warnings include `rls_auto_enable()` exposed to anonymous callers as a `SECURITY DEFINER` function. Audit separately before production promotion. Avoid changing unrelated functions without authorization.
- The GitHub Actions disposable PostgreSQL migration/receipt tests passed. This verifies the SQL on isolated Postgres, not the real Supabase Auth integration.

## Non-negotiable release gates

- [x] Automated unit/regression tests and full two-device `syncCycle()` simulation.
- [x] Automated operator decision tests: keep-device, keep-cloud, stale conflict, backup first, safe merge refusal.
- [x] Disposable PostgreSQL migration contract and forged-receipt rejection.
- [x] Signed Android debug APK and web build.
- [x] Read-only inspection of actual Supabase schema and legacy CAS contract.
- [ ] Isolated real Supabase Auth/Data API smoke test with a dedicated test account/project. Do not write test profiles to the existing personal snapshot.
- [ ] Apply the V8 migration to the intended target only after reviewing a verified backup and testing user permissions.
- [ ] Opt-in enable `VITE_GHOSTED_V8_RPC_ENABLED=true` **only** after that target's migration succeeds, then build Android and web from identical settings.
- [ ] Two physical clients using the same **disposable** test profile: offline/online, changed settings, distinct habit days, disjoint same-day habits, Perfect Day, weekly quota, undo, overlapping purchases, concurrent write, late response, cold app start and restart.
- [ ] Manual Sync Control Center review: export both, keep-device, keep-cloud, safe merge and cancel. Confirm the cloud revision, histories and balances on each device.
- [ ] Confirm local Vault never appears in public snapshots or exported public journal.
- [ ] Authorize a reviewed PR merge and production deployment only after all required acceptance tests pass.

## Required test isolation

The current GHOSTED client has a fixed operator identity. The legacy RPC enforces that same identity. A separate Supabase test project needs an appropriately configured operator/test auth fixture; switching just the project URL is **not** sufficient. No production snapshot should be modified for a smoke test.

## Failure policy

When any test fails or either client cannot prove a verified common ancestor, do not force sync, clear storage, uninstall the Android app, or overwrite the only cloud snapshot. Export public profiles separately from both devices, preserve the local journal and protected conflict bundle, and keep the V8 PR in draft.
