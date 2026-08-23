insert into blocks (external_id, vineyard_name, block_name, variety, region, acres, estimated_tons, harvest_window_start, harvest_window_end)
values
  ('smith-a12', 'Smith Vineyard', 'A-12', 'Cabernet Sauvignon', 'North Bench', 42, 160, '2025-09-09', '2025-09-12'),
  ('mesa-c04', 'Mesa Ridge', 'C-04', 'Chardonnay', 'East Valley', 28, 112, '2025-09-10', '2025-09-13')
on conflict (external_id) do update set estimated_tons = excluded.estimated_tons;

insert into harvest_assignments (block_id, harvest_date, planned_tons)
select id, '2025-09-09', 160 from blocks where external_id = 'smith-a12'
  and not exists (select 1 from harvest_assignments where block_id = blocks.id and harvest_date = '2025-09-09');
insert into harvest_assignments (block_id, harvest_date, planned_tons)
select id, '2025-09-09', 80 from blocks where external_id = 'mesa-c04'
  and not exists (select 1 from harvest_assignments where block_id = blocks.id and harvest_date = '2025-09-09');

insert into nightly_truck_capacity (harvest_date, scheduled_trucks, tons_per_load)
values ('2025-09-09', 9, 20)
on conflict (harvest_date) do update set scheduled_trucks = excluded.scheduled_trucks;
