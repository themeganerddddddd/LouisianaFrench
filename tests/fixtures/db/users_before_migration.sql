-- Existing accounts, loaded before the migrations run.
-- The backfill must copy display_name from these rows, not from a later call.
insert into auth.users (id, created_at, raw_user_meta_data) values
  ('10000000-0000-0000-0000-000000000099', '2019-01-01T00:00:00Z', '{"display_name":"Élise"}'),
  ('10000000-0000-0000-0000-000000000001', '2020-01-01T00:00:00Z', '{"display_name":"elise"}'),
  ('20000000-0000-0000-0000-000000000001', '2021-01-01T00:00:00Z', '{"display_name":"Logan"}'),
  ('20000000-0000-0000-0000-000000000002', '2021-01-01T00:00:00Z', '{"display_name":"logan"}'),
  ('10000000-0000-0000-0000-0000000000a1', '2020-02-01T00:00:00Z', '{"display_name":"Élise_1"}'),
  ('10000000-0000-0000-0000-0000000000a2', '2020-02-01T00:00:00Z', '{"display_name":"ab"}'),
  ('10000000-0000-0000-0000-0000000000a3', '2020-02-01T00:00:00Z', '{"display_name":"1logan"}'),
  ('10000000-0000-0000-0000-0000000000a4', '2020-02-01T00:00:00Z', '{"full_name":"Élise_2"}');
