create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'marketing'))
);

create table public.watches (
  watch_id integer generated always as identity primary key,
  reference varchar not null,
  commercial_name varchar not null,
  movement_type varchar not null,
  case_diameter numeric(5, 2) not null,
  description text,
  image_path text,
  constraint watches_reference_key unique (reference)
);

create table public.inventory_lots (
  lot_id integer generated always as identity primary key,
  watch_id integer not null references public.watches (watch_id),
  quantity integer not null check (quantity > 0),
  purchase_date date not null,
  watch_cost numeric(12, 2) not null check (watch_cost >= 0),
  shipping numeric(12, 2) not null check (shipping >= 0),
  fees numeric(12, 2) not null check (fees >= 0)
);

create index watches_reference_idx on public.watches (reference);
create index inventory_lots_watch_id_idx on public.inventory_lots (watch_id);

alter table public.profiles enable row level security;
alter table public.watches enable row level security;
alter table public.inventory_lots enable row level security;

revoke all on table public.profiles, public.watches, public.inventory_lots
  from public, anon, authenticated;

grant select on table public.profiles, public.watches to authenticated;
grant insert on table public.watches to authenticated;
grant update on table public.watches to authenticated;
grant select, insert, update, delete on table public.inventory_lots to authenticated;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy watches_select_authenticated
  on public.watches
  for select
  to authenticated
  using (true);

create policy watches_insert_admin_only
  on public.watches
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create policy watches_update_admin_only
  on public.watches
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = (select auth.uid())
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create policy inventory_lots_admin_only
  on public.inventory_lots
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = (select auth.uid())
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create function public.calculate_unit_cost(
  p_watch_cost numeric,
  p_shipping numeric,
  p_fees numeric,
  p_quantity integer
)
returns numeric
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  if p_quantity <= 0 then
    raise exception 'Inventory lot quantity must be greater than zero'
      using errcode = '22012';
  end if;

  return (p_watch_cost + p_shipping + p_fees) / p_quantity;
end;
$$;

create function public.calculate_commercial_price(
  p_unit_cost numeric,
  p_target_profit numeric
)
returns numeric
language sql
immutable
strict
set search_path = ''
as $$
  select pg_catalog.ceil((p_unit_cost + p_target_profit / 0.85) / 5000) * 5000;
$$;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create function private.get_watches_metrics()
returns table (
  watch_id integer,
  lot_id integer,
  available_quantity bigint,
  quantity integer,
  purchase_date date,
  unit_cost numeric,
  minimum_price numeric,
  medium_price numeric,
  recommended_price numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_role text;
begin
  select profiles.role
  into caller_role
  from public.profiles
  where profiles.user_id = (select auth.uid());

  if caller_role is null or caller_role not in ('admin', 'marketing') then
    raise exception 'Not authorized to read watch metrics'
      using errcode = '42501';
  end if;

  if caller_role = 'marketing' then
    return query
    with lot_costs as (
      select
        inventory_lots.watch_id,
        inventory_lots.quantity,
        public.calculate_unit_cost(
          inventory_lots.watch_cost,
          inventory_lots.shipping,
          inventory_lots.fees,
          inventory_lots.quantity
        ) as unit_cost
      from public.inventory_lots
    ),
    watch_inventory as (
      select
        lot_costs.watch_id,
        sum(lot_costs.quantity)::bigint as available_quantity,
        max(lot_costs.unit_cost) as highest_unit_cost
      from lot_costs
      group by lot_costs.watch_id
    )
    select
      watches.watch_id,
      null::integer as lot_id,
      coalesce(watch_inventory.available_quantity, 0)::bigint as available_quantity,
      null::integer as quantity,
      null::date as purchase_date,
      null::numeric as unit_cost,
      null::numeric as minimum_price,
      null::numeric as medium_price,
      public.calculate_commercial_price(watch_inventory.highest_unit_cost, 200000) as recommended_price
    from public.watches
    left join watch_inventory using (watch_id);
  else
    return query
    select
      inventory_lots.watch_id,
      inventory_lots.lot_id,
      null::bigint as available_quantity,
      inventory_lots.quantity,
      inventory_lots.purchase_date,
      costs.unit_cost,
      public.calculate_commercial_price(costs.unit_cost, 50000) as minimum_price,
      public.calculate_commercial_price(costs.unit_cost, 100000) as medium_price,
      public.calculate_commercial_price(costs.unit_cost, 200000) as recommended_price
    from public.inventory_lots
    cross join lateral (
      select public.calculate_unit_cost(
        inventory_lots.watch_cost,
        inventory_lots.shipping,
        inventory_lots.fees,
        inventory_lots.quantity
      ) as unit_cost
    ) as costs;
  end if;
end;
$$;

revoke all on function private.get_watches_metrics() from public, anon;
grant execute on function private.get_watches_metrics() to authenticated;

drop view if exists public.admin_watches_view;
drop view if exists public.marketing_watches_view;

create view public.shared_watches_metrics_view
with (security_invoker = true)
as
select
  metrics.watch_id,
  metrics.lot_id,
  metrics.available_quantity,
  metrics.quantity,
  metrics.purchase_date,
  metrics.unit_cost,
  metrics.minimum_price,
  metrics.medium_price,
  metrics.recommended_price
from private.get_watches_metrics() as metrics;

create view public.marketing_watches_view
with (security_barrier = true, security_invoker = true)
as
select
  watches.reference,
  watches.commercial_name as name,
  metrics.available_quantity,
  metrics.recommended_price,
  watches.description,
  watches.image_path
from public.watches
join public.shared_watches_metrics_view as metrics using (watch_id)
where exists (
  select 1
  from public.profiles
  where profiles.user_id = (select auth.uid())
    and profiles.role = 'marketing'
);

revoke all on function public.calculate_unit_cost(numeric, numeric, numeric, integer)
  from public, anon;
revoke all on function public.calculate_commercial_price(numeric, numeric)
  from public, anon;
grant execute on function public.calculate_unit_cost(numeric, numeric, numeric, integer)
  to authenticated;
grant execute on function public.calculate_commercial_price(numeric, numeric)
  to authenticated;

revoke all on public.shared_watches_metrics_view, public.marketing_watches_view
  from public, anon;
grant select on public.shared_watches_metrics_view to authenticated;
grant select on public.marketing_watches_view to authenticated;
