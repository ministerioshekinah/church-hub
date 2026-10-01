-- Harden the browser-writable CMS tables without changing their public behavior.
--
-- Goals:
--   * stop anonymous reads from exposing legacy attribution UUID columns;
--   * move durable attribution/history into a private append-only audit table;
--   * make public-table audit metadata server-controlled rather than browser-controlled;
--   * bound CMS content so a compromised administrator session cannot store unbounded rows.
--
-- Existing browser code may still send created_by/updated_by timestamps. The BEFORE
-- triggers below deliberately ignore those values, which lets this migration ship
-- without a flag-day frontend deployment while preventing forged attribution.

begin;

create schema if not exists private;

create table if not exists private.cms_change_audit (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default clock_timestamp(),
  actor_user_id uuid,
  relation_name text not null check (
    relation_name in ('service_settings', 'announcements', 'newsletters')
  ),
  operation text not null check (
    operation in ('baseline', 'insert', 'update', 'delete')
  ),
  row_id text not null,
  before_row jsonb,
  after_row jsonb
);

alter table private.cms_change_audit enable row level security;
revoke all on table private.cms_change_audit from public, anon, authenticated;
revoke all on sequence private.cms_change_audit_id_seq from public, anon, authenticated;

create index if not exists cms_change_audit_relation_time_idx
  on private.cms_change_audit (relation_name, occurred_at desc);
create index if not exists cms_change_audit_actor_time_idx
  on private.cms_change_audit (actor_user_id, occurred_at desc);

-- Preserve the currently stored legacy attribution once before removing it from
-- browser-readable application rows. The baseline snapshot remains private.
insert into private.cms_change_audit (
  actor_user_id, relation_name, operation, row_id, after_row
)
select
  s.updated_by,
  'service_settings',
  'baseline',
  s.id::text,
  to_jsonb(s)
from public.service_settings as s
where not exists (
  select 1
  from private.cms_change_audit as a
  where a.operation = 'baseline'
    and a.relation_name = 'service_settings'
    and a.row_id = s.id::text
);

insert into private.cms_change_audit (
  actor_user_id, relation_name, operation, row_id, after_row
)
select
  coalesce(a.updated_by, a.created_by),
  'announcements',
  'baseline',
  a.id,
  to_jsonb(a)
from public.announcements as a
where not exists (
  select 1
  from private.cms_change_audit as audit
  where audit.operation = 'baseline'
    and audit.relation_name = 'announcements'
    and audit.row_id = a.id
);

insert into private.cms_change_audit (
  actor_user_id, relation_name, operation, row_id, after_row
)
select
  coalesce(n.updated_by, n.created_by),
  'newsletters',
  'baseline',
  n.id,
  to_jsonb(n)
from public.newsletters as n
where not exists (
  select 1
  from private.cms_change_audit as audit
  where audit.operation = 'baseline'
    and audit.relation_name = 'newsletters'
    and audit.row_id = n.id
);

-- Attribution now lives in private.cms_change_audit. Keep the legacy columns for
-- schema compatibility, but make them non-sensitive and impossible to forge.
update public.service_settings
set updated_by = null
where updated_by is not null;

update public.announcements
set created_by = null,
    updated_by = null
where created_by is not null
   or updated_by is not null;

update public.newsletters
set created_by = null,
    updated_by = null
where created_by is not null
   or updated_by is not null;

-- Anonymous website visitors only need the fields the public JavaScript already
-- requests. Removing table-wide SELECT prevents direct REST queries from reading
-- timestamps or attribution metadata that are not part of the public site contract.
revoke select on table public.service_settings from anon;
grant select (
  id,
  day_en,
  day_es,
  service_label_en,
  service_label_es,
  service_time,
  time_display,
  special_message_en,
  special_message_es,
  address
) on public.service_settings to anon;

revoke select on table public.announcements from anon;
grant select (
  id,
  active,
  tag_en,
  tag_es,
  title_en,
  title_es,
  description_en,
  description_es,
  sort_order
) on public.announcements to anon;

revoke select on table public.newsletters from anon;
grant select (
  id,
  issue_date,
  status,
  title_en,
  title_es,
  gathering_en,
  gathering_es,
  scripture_en,
  scripture_es,
  community_en,
  community_es,
  optional_sections,
  published_at
) on public.newsletters to anon;

-- Reasonable hard ceilings. These are intentionally well above current production
-- content while preventing multi-megabyte rows and pathological optional-section arrays.
alter table public.service_settings
  drop constraint if exists service_settings_content_bounds;
alter table public.service_settings
  add constraint service_settings_content_bounds check (
    char_length(day_en) <= 40
    and char_length(day_es) <= 40
    and char_length(service_label_en) <= 120
    and char_length(service_label_es) <= 120
    and char_length(time_display) <= 32
    and char_length(special_message_en) <= 2000
    and char_length(special_message_es) <= 2000
    and char_length(address) <= 300
  ) not valid;
alter table public.service_settings
  validate constraint service_settings_content_bounds;

alter table public.announcements
  drop constraint if exists announcements_content_bounds;
alter table public.announcements
  add constraint announcements_content_bounds check (
    char_length(id) between 1 and 128
    and char_length(tag_en) <= 80
    and char_length(tag_es) <= 80
    and char_length(title_en) between 1 and 240
    and char_length(title_es) between 1 and 240
    and char_length(description_en) <= 4000
    and char_length(description_es) <= 4000
    and sort_order between -1000000 and 1000000
  ) not valid;
alter table public.announcements
  validate constraint announcements_content_bounds;

alter table public.newsletters
  drop constraint if exists newsletters_content_bounds;
alter table public.newsletters
  add constraint newsletters_content_bounds check (
    char_length(id) between 1 and 128
    and char_length(title_en) between 1 and 240
    and char_length(title_es) between 1 and 240
    and char_length(gathering_en) <= 12000
    and char_length(gathering_es) <= 12000
    and char_length(scripture_en) <= 12000
    and char_length(scripture_es) <= 12000
    and char_length(community_en) <= 12000
    and char_length(community_es) <= 12000
    and jsonb_typeof(optional_sections) = 'array'
    and jsonb_array_length(optional_sections) <= 12
    and octet_length(optional_sections::text) <= 65536
  ) not valid;
alter table public.newsletters
  validate constraint newsletters_content_bounds;

-- Stamp public rows from trusted server context. Legacy UUID columns remain NULL;
-- actor identity is stored only in the private durable audit table below.
create or replace function private.stamp_service_settings_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  new.updated_at := clock_timestamp();
  new.updated_by := null;
  return new;
end;
$function$;

revoke all on function private.stamp_service_settings_audit_fields()
from public, anon, authenticated;

create or replace function private.stamp_cms_content_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' then
    new.created_at := clock_timestamp();
  else
    new.created_at := old.created_at;
  end if;

  new.created_by := null;
  new.updated_at := clock_timestamp();
  new.updated_by := null;
  return new;
end;
$function$;

revoke all on function private.stamp_cms_content_audit_fields()
from public, anon, authenticated;

create or replace function private.record_cms_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_before jsonb;
  v_after jsonb;
  v_row_id text;
begin
  if tg_op = 'INSERT' then
    v_before := null;
    v_after := to_jsonb(new);
    v_row_id := v_after ->> 'id';
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_row_id := coalesce(v_after ->> 'id', v_before ->> 'id');
  else
    v_before := to_jsonb(old);
    v_after := null;
    v_row_id := v_before ->> 'id';
  end if;

  insert into private.cms_change_audit (
    actor_user_id,
    relation_name,
    operation,
    row_id,
    before_row,
    after_row
  ) values (
    auth.uid(),
    tg_table_name,
    lower(tg_op),
    v_row_id,
    v_before,
    v_after
  );

  -- This function is used only by AFTER triggers; PostgreSQL ignores their
  -- returned row value. NULL makes the intent explicit and avoids record coercion.
  return null;
end;
$function$;

revoke all on function private.record_cms_change()
from public, anon, authenticated;

drop trigger if exists stamp_service_settings_audit_fields on public.service_settings;
create trigger stamp_service_settings_audit_fields
before update on public.service_settings
for each row
execute function private.stamp_service_settings_audit_fields();

drop trigger if exists stamp_announcement_audit_fields on public.announcements;
create trigger stamp_announcement_audit_fields
before insert or update on public.announcements
for each row
execute function private.stamp_cms_content_audit_fields();

drop trigger if exists stamp_newsletter_audit_fields on public.newsletters;
create trigger stamp_newsletter_audit_fields
before insert or update on public.newsletters
for each row
execute function private.stamp_cms_content_audit_fields();

drop trigger if exists audit_service_settings_changes on public.service_settings;
create trigger audit_service_settings_changes
after update on public.service_settings
for each row
execute function private.record_cms_change();

drop trigger if exists audit_announcement_changes on public.announcements;
create trigger audit_announcement_changes
after insert or update or delete on public.announcements
for each row
execute function private.record_cms_change();

drop trigger if exists audit_newsletter_changes on public.newsletters;
create trigger audit_newsletter_changes
after insert or update or delete on public.newsletters
for each row
execute function private.record_cms_change();

commit;
