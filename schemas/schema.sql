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
  description text
);

create table public.inventory_lots (
  lot_id integer generated always as identity primary key,
  watch_id integer not null references public.watches (watch_id),
  quantity integer not null,
  purchase_date date not null,
  watch_cost numeric(12, 2) not null,
  shipping numeric(12, 2) not null,
  fees numeric(12, 2) not null
);

create index watches_reference_idx on public.watches (reference);
create index inventory_lots_watch_id_idx on public.inventory_lots (watch_id);

alter table public.profiles enable row level security;
alter table public.watches enable row level security;
alter table public.inventory_lots enable row level security;

revoke all on table public.profiles, public.watches, public.inventory_lots
  from public, anon, authenticated;

grant select on table public.profiles, public.watches to authenticated;
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
as $$
  select ceil((p_unit_cost + p_target_profit / 0.85) / 5000) * 5000;
$$;

create view public.admin_watches_view
with (security_invoker = true)
as
select
  inventory_lots.lot_id,
  watches.watch_id,
  watches.reference,
  watches.commercial_name,
  inventory_lots.quantity,
  inventory_lots.purchase_date,
  inventory_lots.watch_cost,
  inventory_lots.shipping,
  inventory_lots.fees,
  costs.unit_cost,
  public.calculate_commercial_price(costs.unit_cost, 50000) as minimum_price,
  public.calculate_commercial_price(costs.unit_cost, 100000) as medium_price,
  public.calculate_commercial_price(costs.unit_cost, 200000) as recommended_price
from public.inventory_lots
join public.watches using (watch_id)
cross join lateral (
  select public.calculate_unit_cost(
    inventory_lots.watch_cost,
    inventory_lots.shipping,
    inventory_lots.fees,
    inventory_lots.quantity
  ) as unit_cost
) as costs;

create view public.marketing_watches_view
with (security_barrier = true, security_invoker = false)
as
with lot_costs as (
  select
    watches.reference,
    inventory_lots.quantity,
    public.calculate_unit_cost(
      inventory_lots.watch_cost,
      inventory_lots.shipping,
      inventory_lots.fees,
      inventory_lots.quantity
    ) as unit_cost
  from public.inventory_lots
  join public.watches using (watch_id)
),
watch_inventory as (
  select
    lot_costs.reference,
    sum(lot_costs.quantity)::bigint as available_quantity,
    max(lot_costs.unit_cost) as highest_unit_cost
  from lot_costs
  group by lot_costs.reference
)
select
  watches.reference,
  watches.commercial_name as name,
  coalesce(watch_inventory.available_quantity, 0) as available_quantity,
  public.calculate_commercial_price(watch_inventory.highest_unit_cost, 50000) as minimum_price,
  public.calculate_commercial_price(watch_inventory.highest_unit_cost, 100000) as medium_price,
  public.calculate_commercial_price(watch_inventory.highest_unit_cost, 200000) as recommended_price
from public.watches
left join watch_inventory using (reference)
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

revoke all on public.admin_watches_view, public.marketing_watches_view
  from public, anon;
grant select on public.admin_watches_view, public.marketing_watches_view
  to authenticated;
