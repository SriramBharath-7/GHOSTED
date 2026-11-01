-- GHOSTED V8 // transactional, idempotent snapshot receipts.
-- REVIEW BEFORE RUNNING IN SUPABASE SQL EDITOR.
-- This preserves the existing ghosted_snapshots table and legacy CAS function.
-- Never stores encrypted Vault data.
begin;

create table if not exists public.ghosted_operation_receipts (
  owner_id uuid not null,
  storage_key text not null,
  operation_id uuid not null,
  payload_md5 text not null,
  expected_revision bigint,
  committed_revision bigint not null check (committed_revision > 0),
  created_at timestamptz not null default now(),
  primary key (owner_id, storage_key, operation_id),
  constraint public_profile_only check (storage_key = 'ghosted:web-os:personal:history:v68')
);
create index if not exists ghosted_operation_receipts_recent
 on public.ghosted_operation_receipts (owner_id, created_at desc);

alter table public.ghosted_operation_receipts enable row level security;
drop policy if exists ghosted_receipts_select_own on public.ghosted_operation_receipts;
create policy ghosted_receipts_select_own on public.ghosted_operation_receipts
 for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists ghosted_receipts_insert_own on public.ghosted_operation_receipts;
create policy ghosted_receipts_insert_own on public.ghosted_operation_receipts
 for insert to authenticated with check (owner_id = (select auth.uid()));
revoke all on public.ghosted_operation_receipts from anon, public;
-- Clients may inspect only their own receipts. They must NEVER INSERT a
-- receipt directly, because a forged receipt could falsely acknowledge an upload.
grant select on public.ghosted_operation_receipts to authenticated;

create or replace function public.ghosted_put_snapshot_v8(
  p_storage_key text,
  p_payload jsonb,
  p_expected_revision bigint,
  p_operation_id uuid
) returns bigint
language plpgsql
-- The authenticated RPC alone is allowed to insert immutable receipts.
-- auth.uid() and the storage-key check still enforce the user boundary.
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_digest text;
  v_prior public.ghosted_operation_receipts%rowtype;
  v_revision bigint;
begin
  if v_owner is null then
    raise exception 'GHOSTED_AUTH_REQUIRED' using errcode = '28000';
  end if;
  if p_storage_key is distinct from 'ghosted:web-os:personal:history:v68' then
    raise exception 'GHOSTED_PUBLIC_PROFILE_ONLY' using errcode = '22023';
  end if;
  if p_operation_id is null then
    raise exception 'GHOSTED_OPERATION_ID_REQUIRED' using errcode = '22023';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object'
     or p_payload->>'schemaVersion' is distinct from '4'
     or p_payload->>'isSample' is not distinct from 'true' then
    raise exception 'GHOSTED_INVALID_PROFILE' using errcode = '22023';
  end if;
  v_digest := md5(p_payload::text);
  -- Serialize receipts for the same user/profile. One ambiguous timed-out
  -- response cannot create duplicate server operations.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner::text || ':' || p_storage_key, 0)
  );
  select * into v_prior from public.ghosted_operation_receipts
   where owner_id = v_owner and storage_key = p_storage_key
     and operation_id = p_operation_id;
  if found then
    if v_prior.payload_md5 is distinct from v_digest
       or v_prior.expected_revision is distinct from p_expected_revision then
      raise exception 'GHOSTED_OPERATION_ID_REUSED_DIFFERENT_PAYLOAD' using errcode = '22023';
    end if;
    return v_prior.committed_revision;
  end if;
  -- Existing guarded CAS (and its owner checks/RLS) remains authoritative.
  -- Receipt insert occurs in the SAME transaction, not afterwards in JS.
  v_revision := public.ghosted_put_snapshot(
    p_storage_key => p_storage_key,
    p_payload => p_payload,
    p_expected_revision => p_expected_revision
  );
  if not (v_revision > 0) then
    raise exception 'GHOSTED_INVALID_CAS_REVISION' using errcode = '22000';
  end if;
  insert into public.ghosted_operation_receipts (
    owner_id, storage_key, operation_id, payload_md5,
    expected_revision, committed_revision
  ) values (
    v_owner, p_storage_key, p_operation_id, v_digest,
    p_expected_revision, v_revision
  );
  return v_revision;
end;
$$;
revoke all on function public.ghosted_put_snapshot_v8(text,jsonb,bigint,uuid) from public, anon;
grant execute on function public.ghosted_put_snapshot_v8(text,jsonb,bigint,uuid) to authenticated;
commit;
