-- Second stage: apply after the explicit-column frontend queries are deployed.
-- Keep author identifiers private; RLS continues to control visible rows.
begin;
revoke select on public.service_settings, public.announcements, public.newsletters from public, anon, authenticated;
grant select (id, day_en, day_es, service_label_en, service_label_es, service_time,
  time_display, special_message_en, special_message_es, address, updated_at)
  on public.service_settings to anon, authenticated;
grant select (id, active, tag_en, tag_es, title_en, title_es, description_en,
  description_es, sort_order, created_at, updated_at)
  on public.announcements to anon, authenticated;
grant select (id, issue_date, status, title_en, title_es, gathering_en, gathering_es,
  scripture_en, scripture_es, community_en, community_es, optional_sections,
  published_at, created_at, updated_at)
  on public.newsletters to anon, authenticated;
commit;
