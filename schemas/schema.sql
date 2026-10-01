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
