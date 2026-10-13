-- Live authorization checks with a database-enforced read-only transaction.
-- No records, memberships, Auth users, or invitations are created or changed.
begin read only;
set local statement_timeout = '15s';
set local lock_timeout = '2s';
do $audit$
declare
  denied boolean;
  results jsonb := '[]'::jsonb;
begin
  perform set_config('request.jwt.claims', '{}', true);
  set local role anon;
  denied := false;
  begin
    perform user_id from public.admin_users limit 1;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Anonymous membership read was not denied'; end if;
  results := results || jsonb_build_array(jsonb_build_object('name','Anonymous membership read denied','pass',true));

  if exists(select id from public.announcements where active=false) then raise exception 'Hidden announcements visible'; end if;
  results := results || jsonb_build_array(jsonb_build_object('name','Anonymous hidden announcements not visible','pass',true));
  if exists(select id from public.newsletters where status<>'published' or published_at is null) then raise exception 'Unpublished newsletters visible'; end if;
  results := results || jsonb_build_array(jsonb_build_object('name','Anonymous unpublished newsletters not visible','pass',true));

  denied := false;
  begin
    perform created_by from public.announcements limit 1;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Anonymous author-column read was not denied'; end if;
  results := results || jsonb_build_array(jsonb_build_object('name','Anonymous content author identifiers denied','pass',true));

  if not exists(select id from public.service_settings where id=1) then raise exception 'Public service row unavailable'; end if;
  results := results || jsonb_build_array(jsonb_build_object('name','Anonymous public service row remains readable','pass',true));
  reset role;

  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","user_metadata":{"role":"owner"}}', true);
  set local role authenticated;
  if exists(select user_id from public.admin_users) then raise exception 'Non-admin can see memberships'; end if;
  results := results || jsonb_build_array(jsonb_build_object('name','Non-admin cannot read memberships with a forged metadata role','pass',true));
  if exists(select id from public.announcements where active=false) then raise exception 'Non-admin can see hidden announcements'; end if;
  results := results || jsonb_build_array(jsonb_build_object('name','Non-admin hidden announcements not visible','pass',true));
  if exists(select id from public.newsletters where status<>'published' or published_at is null) then raise exception 'Non-admin can see unpublished newsletters'; end if;
  results := results || jsonb_build_array(jsonb_build_object('name','Non-admin unpublished newsletters not visible','pass',true));
  if has_table_privilege(current_user,'public.admin_users','INSERT,UPDATE,DELETE') then raise exception 'Client membership mutation privilege present'; end if;
  results := results || jsonb_build_array(jsonb_build_object('name','Authenticated role lacks direct membership mutation grants','pass',true));

  denied := false;
  begin
    perform updated_by from public.service_settings limit 1;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Client author-column read was not denied'; end if;
  results := results || jsonb_build_array(jsonb_build_object('name','Authenticated content author identifiers denied','pass',true));
  reset role;
  perform set_config('audit.readonly_results', results::text, true);
end;
$audit$;
select current_setting('audit.readonly_results')::jsonb as tests;
rollback;
