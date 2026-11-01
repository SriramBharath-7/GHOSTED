-- Disposable PostgreSQL fixture only; never execute on personal Supabase data.
create role authenticated nologin;
create role anon nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create table public.ghosted_snapshots (
 owner_id uuid not null,
 storage_key text not null,
 revision bigint not null,
 payload jsonb not null,
 primary key(owner_id,storage_key)
);
create or replace function public.ghosted_put_snapshot(
 p_storage_key text, p_payload jsonb, p_expected_revision bigint
) returns bigint language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_rev bigint;
begin
 if v_user is null then raise exception 'not authenticated'; end if;
 insert into public.ghosted_snapshots(owner_id,storage_key,revision,payload)
 values(v_user,p_storage_key,1,p_payload)
 on conflict(owner_id,storage_key)
 do update set revision=public.ghosted_snapshots.revision+1,payload=excluded.payload
 where public.ghosted_snapshots.revision=p_expected_revision
 returning revision into v_rev;
 if v_rev is null then raise exception 'GHOSTED_REVISION_CONFLICT'; end if;
 return v_rev;
end;$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function public.ghosted_put_snapshot(text,jsonb,bigint) to authenticated;
