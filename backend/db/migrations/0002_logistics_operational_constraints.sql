-- Safe upgrade for databases where 0001_harvest_planner.sql is already applied.
drop view if exists nightly_capacity;

alter table blocks alter column estimated_tons drop not null;
alter table blocks alter column harvest_window_start drop not null;
alter table blocks alter column harvest_window_end drop not null;

alter table nightly_truck_capacity alter column tons_per_load set default 23.5;
update nightly_truck_capacity set tons_per_load = 23.5 where tons_per_load = 20;
alter table nightly_truck_capacity
  add column if not exists truck_ordered_at timestamptz;

alter table harvest_assignments
  add column if not exists scheduled_loads integer check (scheduled_loads >= 0),
  add column if not exists winery_appointment_status text not null default 'not_requested'
    check (winery_appointment_status in ('not_requested', 'requested', 'confirmed', 'hold')),
  add column if not exists winery_appointment_at timestamptz;

create view nightly_capacity as
select a.harvest_date,
       round(sum(a.planned_tons), 2) as expected_tons,
       ceil(sum(a.planned_tons) / coalesce(c.tons_per_load, 23.5))::integer as tonnage_required_loads,
       sum(coalesce(a.scheduled_loads, ceil(a.planned_tons / coalesce(c.tons_per_load, 23.5))::integer))::integer as required_loads,
       coalesce(c.scheduled_trucks, 0) as scheduled_trucks,
       coalesce(c.scheduled_trucks, 0) -
         sum(coalesce(a.scheduled_loads, ceil(a.planned_tons / coalesce(c.tons_per_load, 23.5))::integer))::integer as truck_delta,
       case
         when coalesce(c.scheduled_trucks, 0) < sum(coalesce(a.scheduled_loads, ceil(a.planned_tons / coalesce(c.tons_per_load, 23.5))::integer)) then 'short'
         when coalesce(c.scheduled_trucks, 0) > sum(coalesce(a.scheduled_loads, ceil(a.planned_tons / coalesce(c.tons_per_load, 23.5))::integer)) then 'over'
         else 'covered'
       end as capacity_status,
       count(*) filter (where a.winery_appointment_status <> 'confirmed')::integer as unconfirmed_appointments,
       c.truck_ordered_at,
       case
         when c.truck_ordered_at is not null then 'ordered'
         when (a.harvest_date::timestamp + interval '18 hours') - now() <= interval '12 hours' then 'minimum_window'
         when (a.harvest_date::timestamp + interval '18 hours') - now() <= interval '24 hours' then 'preferred_window'
         else 'lead_time_ok'
       end as truck_order_status
  from harvest_assignments a
  left join nightly_truck_capacity c on c.harvest_date = a.harvest_date
 group by a.harvest_date, c.scheduled_trucks, c.tons_per_load, c.truck_ordered_at;
