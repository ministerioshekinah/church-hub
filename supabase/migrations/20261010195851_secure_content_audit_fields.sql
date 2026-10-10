-- Backward-compatible first stage: protect attribution before updating clients.
-- Existing content is preserved; old clients' metadata is replaced on future writes.
begin;
create or replace function private.stamp_content_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  actor uuid := auth.uid();
begin
  new.updated_at := pg_catalog.now();
  if actor is not null then
    new.updated_by := actor;
  end if;
  if tg_table_name <> 'service_settings' then
    if tg_op = 'INSERT' then
      new.created_at := pg_catalog.now();
      if actor is not null then new.created_by := actor; end if;
    elsif actor is not null then
      new.created_at := old.created_at;
      new.created_by := old.created_by;
    end if;
  end if;
  -- Trusted maintenance without a user JWT may perform FK cleanup/repair.
  return new;
end;
$function$;
revoke all on function private.stamp_content_audit_fields() from public, anon, authenticated;
create trigger stamp_service_audit before insert or update on public.service_settings
for each row execute function private.stamp_content_audit_fields();
create trigger stamp_announcement_audit before insert or update on public.announcements
for each row execute function private.stamp_content_audit_fields();
create trigger stamp_newsletter_audit before insert or update on public.newsletters
for each row execute function private.stamp_content_audit_fields();
commit;
