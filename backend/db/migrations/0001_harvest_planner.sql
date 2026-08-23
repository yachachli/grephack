create extension if not exists pgcrypto;

-- Engineer 1 owns normalization and writes/upserts these canonical block records.
create table blocks (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  vineyard_name text not null,
  block_name text not null,
  variety text not null,
  region text not null,
  acres numeric(10,2) not null check (acres >= 0),
  estimated_tons numeric(10,2) not null check (estimated_tons >= 0),
  harvest_window_start date not null,
  harvest_window_end date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (harvest_window_end >= harvest_window_start)
);

-- Engineer 2 owns assignments, nightly truck inputs, and capacity calculations.
create table harvest_assignments (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references blocks(id) on delete cascade,
  harvest_date date not null,
  planned_tons numeric(10,2) not null check (planned_tons > 0),
  created_at timestamptz not null default now()
);

create index harvest_assignments_date_idx on harvest_assignments (harvest_date);

create table nightly_truck_capacity (
  harvest_date date primary key,
  scheduled_trucks integer not null check (scheduled_trucks >= 0),
  tons_per_load numeric(8,2) not null default 20 check (tons_per_load > 0),
  updated_at timestamptz not null default now()
);

-- Engineer 3 and the frontend can consume this stable read model without duplicating math.
create view nightly_capacity as
select a.harvest_date,
       round(sum(a.planned_tons), 2) as expected_tons,
       ceil(sum(a.planned_tons) / coalesce(c.tons_per_load, 20))::integer as required_loads,
       coalesce(c.scheduled_trucks, 0) as scheduled_trucks,
       coalesce(c.scheduled_trucks, 0) - ceil(sum(a.planned_tons) / coalesce(c.tons_per_load, 20))::integer as truck_delta,
       case
         when coalesce(c.scheduled_trucks, 0) < ceil(sum(a.planned_tons) / coalesce(c.tons_per_load, 20)) then 'short'
         when coalesce(c.scheduled_trucks, 0) > ceil(sum(a.planned_tons) / coalesce(c.tons_per_load, 20)) then 'over'
         else 'covered'
       end as capacity_status
  from harvest_assignments a
  left join nightly_truck_capacity c on c.harvest_date = a.harvest_date
 group by a.harvest_date, c.scheduled_trucks, c.tons_per_load;
