insert into blocks (external_id, vineyard_name, block_name, variety, region, acres, estimated_tons, harvest_window_start, harvest_window_end)
values
  ('smith-a12', 'Smith Vineyard', 'A-12', 'Cabernet Sauvignon', 'North Bench', 42, 160, '2026-08-23', '2026-08-25'),
  ('mesa-c04', 'Mesa Ridge', 'C-04', 'Chardonnay', 'East Valley', 28, 112, '2026-08-24', '2026-08-26')
on conflict (external_id) do update set
  vineyard_name = excluded.vineyard_name,
  block_name = excluded.block_name,
  variety = excluded.variety,
  region = excluded.region,
  acres = excluded.acres,
  estimated_tons = excluded.estimated_tons,
  harvest_window_start = excluded.harvest_window_start,
  harvest_window_end = excluded.harvest_window_end,
  updated_at = now();

insert into harvest_assignments (block_id, harvest_date, planned_tons)
select id, '2026-08-23', 160 from blocks where external_id = 'smith-a12'
  and not exists (select 1 from harvest_assignments where block_id = blocks.id and harvest_date = '2026-08-23');
insert into harvest_assignments (block_id, harvest_date, planned_tons)
select id, '2026-08-24', 80 from blocks where external_id = 'mesa-c04'
  and not exists (select 1 from harvest_assignments where block_id = blocks.id and harvest_date = '2026-08-24');

insert into nightly_truck_capacity (harvest_date, scheduled_trucks, tons_per_load)
values ('2026-08-23', 9, 23.5)
on conflict (harvest_date) do update set scheduled_trucks = excluded.scheduled_trucks,
  tons_per_load = excluded.tons_per_load;
