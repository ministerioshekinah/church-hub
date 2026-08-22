-- Harden the privileged administrator-management boundary.
--
-- This migration is deliberately additive. It does not relax existing RLS or
-- browser grants. The public RPC functions below are SECURITY DEFINER only so
-- the Edge Function can perform narrowly scoped checks/actions with service_role;
-- every function is explicitly revoked from PUBLIC/anon/authenticated.

begin;

create schema if not exists private;

create table if not exists private.admin_action_audit (
  id bigint generated always as identity primary key,
  request_id uuid not null unique,
  occurred_at timestamptz not null default clock_timestamp(),
  actor_user_id uuid not null,
  actor_session_id uuid not null,
  action text not null check (action in ('invite', 'set-role', 'remove')),
  target_user_id uuid,
  target_email text,
  before_role text,
  after_role text,
  result jsonb not null
);

alter table private.admin_action_audit enable row level security;
revoke all on table private.admin_action_audit from public, anon, authenticated;
revoke all on sequence private.admin_action_audit_id_seq from public, anon, authenticated;

create index if not exists admin_action_audit_actor_time_idx
  on private.admin_action_audit (actor_user_id, occurred_at desc);

create table if not exists private.admin_action_rate_limits (
  actor_user_id uuid not null,
  action text not null,
  bucket_start timestamptz not null,
  hits integer not null check (hits > 0),
  primary key (actor_user_id, action, bucket_start)
);

alter table private.admin_action_rate_limits enable row level security;
revoke all on table private.admin_action_rate_limits from public, anon, authenticated;

-- Return true only when the presented JWT session still exists and the caller is
-- still an Owner. This closes the gap where a cryptographically valid access JWT
-- can outlive a signed-out/revoked Supabase session until its exp claim.
create or replace function public.admin_assert_active_owner_session(
  p_user_id uuid,
  p_session_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from auth.sessions as s
    join public.admin_users as a
      on a.user_id = s.user_id
    where s.id = p_session_id
      and s.user_id = p_user_id
      and a.role = 'owner'
  );
$function$;

revoke all on function public.admin_assert_active_owner_session(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.admin_assert_active_owner_session(uuid, uuid)
to service_role;

-- Small, atomic per-owner/per-action minute bucket. The Edge Function uses a
-- conservative limit; the database makes parallel requests count consistently.
create or replace function public.admin_consume_action_rate_limit(
  p_user_id uuid,
  p_action text,
  p_limit integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_bucket timestamptz := date_trunc('minute', clock_timestamp());
  v_hits integer;
begin
  if p_action not in ('list', 'invite', 'set-role', 'remove') then
    raise exception 'invalid_admin_action' using errcode = '22023';
  end if;

  if p_limit < 1 or p_limit > 200 then
    raise exception 'invalid_rate_limit' using errcode = '22023';
  end if;

  insert into private.admin_action_rate_limits (
    actor_user_id,
    action,
    bucket_start,
    hits
  ) values (
    p_user_id,
    p_action,
    v_bucket,
    1
  )
  on conflict (actor_user_id, action, bucket_start)
  do update set hits = private.admin_action_rate_limits.hits + 1
  returning hits into v_hits;

  delete from private.admin_action_rate_limits
  where bucket_start < clock_timestamp() - interval '1 day';

  return v_hits <= p_limit;
end;
$function$;

revoke all on function public.admin_consume_action_rate_limit(uuid, text, integer)
from public, anon, authenticated;
grant execute on function public.admin_consume_action_rate_limit(uuid, text, integer)
to service_role;

-- Administrator listing scales with admin_users, not with the entire Auth
-- directory. No Auth Admin listUsers pagination is necessary in the Edge code.
create or replace function public.admin_list_directory()
returns table (
  id uuid,
  email text,
  role text,
  created_at timestamptz,
  confirmed_at timestamptz,
  last_sign_in_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    a.user_id,
    u.email::text,
    a.role,
    a.created_at,
    u.confirmed_at,
    u.last_sign_in_at
  from public.admin_users as a
  left join auth.users as u
    on u.id = a.user_id
  order by a.created_at asc;
$function$;

revoke all on function public.admin_list_directory()
from public, anon, authenticated;
grant execute on function public.admin_list_directory()
to service_role;

-- Exact email lookup avoids materializing the complete Auth directory for an
-- invitation. This is service-role-only and is never exposed to browser roles.
create or replace function public.admin_find_auth_user_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select u.id
  from auth.users as u
  where lower(u.email) = lower(btrim(p_email))
  limit 1;
$function$;

revoke all on function public.admin_find_auth_user_by_email(text)
from public, anon, authenticated;
grant execute on function public.admin_find_auth_user_by_email(text)
to service_role;

-- Mutations, fresh session/Owner authorization, and durable audit insertion are
-- performed in one database transaction. A request that passed the Edge check
-- but was revoked before this function runs fails closed here.
create or replace function public.admin_apply_membership_change(
  p_request_id uuid,
  p_actor_user_id uuid,
  p_actor_session_id uuid,
  p_action text,
  p_target_user_id uuid,
  p_role text default null,
  p_target_email text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_cached jsonb;
  v_before_role text;
  v_after_role text;
  v_result jsonb;
begin
  if p_action not in ('invite', 'set-role', 'remove') then
    raise exception 'invalid_admin_action' using errcode = '22023';
  end if;

  -- Establish a linearization point for privileged authority. FOR SHARE locks
  -- prevent concurrent session deletion or Owner-role update/removal from racing
  -- past this check. If revocation/demotion wins first, these checks fail; if this
  -- transaction locks first, the already-authorized mutation completes before
  -- the revocation/demotion can commit.
  perform 1
  from auth.sessions as s
  where s.id = p_actor_session_id
    and s.user_id = p_actor_user_id
  for share;

  if not found then
    raise exception 'owner_session_not_active' using errcode = '42501';
  end if;

  perform 1
  from public.admin_users as a
  where a.user_id = p_actor_user_id
    and a.role = 'owner'
  for share;

  if not found then
    raise exception 'owner_session_not_active' using errcode = '42501';
  end if;

  -- Idempotent replay: the same active actor/action/request ID returns its first result.
  select a.result
    into v_cached
  from private.admin_action_audit as a
  where a.request_id = p_request_id
    and a.actor_user_id = p_actor_user_id
    and a.action = p_action;

  if found then
    return v_cached;
  end if;

  -- A request ID may not be reused across a different actor/action.
  if exists (
    select 1
    from private.admin_action_audit as a
    where a.request_id = p_request_id
  ) then
    raise exception 'request_id_conflict' using errcode = '23505';
  end if;

  if p_action = 'invite' then
    if p_target_user_id is null then
      raise exception 'target_user_required' using errcode = '22023';
    end if;

    select a.role
      into v_before_role
    from public.admin_users as a
    where a.user_id = p_target_user_id;

    if found then
      v_after_role := v_before_role;
      v_result := jsonb_build_object(
        'ok', true,
        'alreadyAuthorized', true,
        'userId', p_target_user_id,
        'role', v_after_role,
        'requestId', p_request_id
      );
    else
      insert into public.admin_users (user_id, role)
      values (p_target_user_id, 'admin');

      v_after_role := 'admin';
      v_result := jsonb_build_object(
        'ok', true,
        'alreadyAuthorized', false,
        'userId', p_target_user_id,
        'role', v_after_role,
        'requestId', p_request_id
      );
    end if;

  elsif p_action = 'set-role' then
    if p_target_user_id is null or p_role not in ('owner', 'admin') then
      raise exception 'invalid_role_change' using errcode = '22023';
    end if;

    if p_target_user_id = p_actor_user_id and p_role <> 'owner' then
      raise exception 'self_owner_demotion_blocked' using errcode = '23514';
    end if;

    select a.role
      into v_before_role
    from public.admin_users as a
    where a.user_id = p_target_user_id;

    if not found then
      raise exception 'administrator_not_found' using errcode = 'P0002';
    end if;

    update public.admin_users
    set role = p_role
    where user_id = p_target_user_id;

    -- The existing protect_last_owner trigger remains authoritative for the
    -- final-Owner invariant and serializes competing demotion/removal attempts.
    v_after_role := p_role;
    v_result := jsonb_build_object(
      'ok', true,
      'admin', jsonb_build_object(
        'user_id', p_target_user_id,
        'role', v_after_role
      ),
      'requestId', p_request_id
    );

  else
    if p_target_user_id is null then
      raise exception 'target_user_required' using errcode = '22023';
    end if;

    if p_target_user_id = p_actor_user_id then
      raise exception 'self_owner_removal_blocked' using errcode = '23514';
    end if;

    select a.role
      into v_before_role
    from public.admin_users as a
    where a.user_id = p_target_user_id;

    if not found then
      raise exception 'administrator_not_found' using errcode = 'P0002';
    end if;

    delete from public.admin_users
    where user_id = p_target_user_id;

    v_after_role := null;
    v_result := jsonb_build_object(
      'ok', true,
      'requestId', p_request_id
    );
  end if;

  insert into private.admin_action_audit (
    request_id,
    actor_user_id,
    actor_session_id,
    action,
    target_user_id,
    target_email,
    before_role,
    after_role,
    result
  ) values (
    p_request_id,
    p_actor_user_id,
    p_actor_session_id,
    p_action,
    p_target_user_id,
    nullif(left(btrim(coalesce(p_target_email, '')), 320), ''),
    v_before_role,
    v_after_role,
    v_result
  );

  return v_result;
end;
$function$;

revoke all on function public.admin_apply_membership_change(
  uuid, uuid, uuid, text, uuid, text, text
) from public, anon, authenticated;
grant execute on function public.admin_apply_membership_change(
  uuid, uuid, uuid, text, uuid, text, text
) to service_role;

commit;
