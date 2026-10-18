-- Proposed repair only: apply through the reviewed database release process.
-- Preserve the existing Owner guard, transaction lock, trigger and privileges.
begin;

create or replace function private.prevent_last_owner_loss()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'DELETE' and old.role = 'owner' then
    perform pg_catalog.pg_advisory_xact_lock(20260809, 9003);
    if not exists (
      select 1
      from public.admin_users
      where role = 'owner'
        and user_id <> old.user_id
    ) then
      raise exception 'At least one Owner must remain.' using errcode = '23514';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner' then
    perform pg_catalog.pg_advisory_xact_lock(20260809, 9003);
    if not exists (
      select 1
      from public.admin_users
      where role = 'owner'
        and user_id <> old.user_id
    ) then
      raise exception 'At least one Owner must remain.' using errcode = '23514';
    end if;
  end if;

  -- NEW is null on DELETE. Returning it would silently retain an Admin row.
  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

revoke all on function private.prevent_last_owner_loss() from public, anon, authenticated;

commit;
