-- V8 receipts must be transactional, replay-safe and unforgeable.
set role authenticated;
select set_config('request.jwt.claim.sub','9c63d03e-cafd-41bb-b753-72b05daa0710',false);
do $$
declare
 id uuid := '11111111-1111-4111-8111-111111111111';
 p jsonb := '{"schemaVersion":4,"days":{},"purchased":[]}'::jsonb;
 rev bigint;
 cnt bigint;
begin
 rev:=public.ghosted_put_snapshot_v8('ghosted:web-os:personal:history:v68',p,0,id);
 if rev<>1 then raise exception 'expected first revision 1 got %',rev;end if;
 rev:=public.ghosted_put_snapshot_v8('ghosted:web-os:personal:history:v68',p,0,id);
 if rev<>1 then raise exception 'replay mutated revision';end if;
 select count(*) into cnt from public.ghosted_operation_receipts
 where owner_id=auth.uid() and operation_id=id;
 if cnt<>1 then raise exception 'expected exactly one receipt';end if;
 select revision into rev from public.ghosted_snapshots where owner_id=auth.uid();
 if rev<>1 then raise exception 'replay mutated snapshot';end if;
 begin
  perform public.ghosted_put_snapshot_v8('ghosted:web-os:personal:history:v68',
    '{"schemaVersion":4,"days":{"2026-11-01":[1]},"purchased":[]}'::jsonb,0,id);
  raise exception 'reused id with different payload was accepted';
 exception when sqlstate '22023' then null;
 end;
 begin
  perform public.ghosted_put_snapshot_v8('ghosted:web-os:private:personal:v68:encrypted:v1',p,1,
    '22222222-2222-4222-8222-222222222222'::uuid);
  raise exception 'Vault key was accepted';
 exception when sqlstate '22023' then null;
 end;
 begin
  perform public.ghosted_put_snapshot_v8('ghosted:web-os:personal:history:v68',p,0,
    '33333333-3333-4333-8333-333333333333'::uuid);
  raise exception 'stale revision was accepted';
 exception when raise_exception then
  if sqlerrm='stale revision was accepted' then raise; end if;
 end;
 begin
  insert into public.ghosted_operation_receipts(owner_id,storage_key,operation_id,payload_md5,expected_revision,committed_revision)
  values(auth.uid(),'ghosted:web-os:personal:history:v68','44444444-4444-4444-8444-444444444444','fake',0,999);
  raise exception 'direct receipt forgery accepted';
 exception when insufficient_privilege then null;
 end;
end;$$;
reset role;
-- Confirm owner has one snapshot and one receipt after all rejected writes.
do $$
declare n bigint;v bigint;
begin
 select count(*),max(committed_revision) into n,v from public.ghosted_operation_receipts;
 if n<>1 or v<>1 then raise exception 'receipt count mismatch %, %',n,v;end if;
 select max(revision) into v from public.ghosted_snapshots;
 if v<>1 then raise exception 'snapshot incorrectly changed %',v;end if;
end;$$;
