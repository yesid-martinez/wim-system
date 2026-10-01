revoke delete on table "public"."inventory_lots" from "anon";

revoke insert on table "public"."inventory_lots" from "anon";

revoke references on table "public"."inventory_lots" from "anon";

revoke select on table "public"."inventory_lots" from "anon";

revoke trigger on table "public"."inventory_lots" from "anon";

revoke truncate on table "public"."inventory_lots" from "anon";

revoke update on table "public"."inventory_lots" from "anon";

revoke references on table "public"."inventory_lots" from "authenticated";

revoke trigger on table "public"."inventory_lots" from "authenticated";

revoke truncate on table "public"."inventory_lots" from "authenticated";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke insert on table "public"."profiles" from "authenticated";

revoke references on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke delete on table "public"."watches" from "anon";

revoke insert on table "public"."watches" from "anon";

revoke references on table "public"."watches" from "anon";

revoke select on table "public"."watches" from "anon";

revoke trigger on table "public"."watches" from "anon";

revoke truncate on table "public"."watches" from "anon";

revoke update on table "public"."watches" from "anon";

revoke delete on table "public"."watches" from "authenticated";

revoke insert on table "public"."watches" from "authenticated";

revoke references on table "public"."watches" from "authenticated";

revoke trigger on table "public"."watches" from "authenticated";

revoke truncate on table "public"."watches" from "authenticated";

revoke update on table "public"."watches" from "authenticated";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_commercial_price(p_unit_cost numeric, p_target_profit numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO ''
AS $function$
  select pg_catalog.ceil((p_unit_cost + p_target_profit / 0.85) / 5000) * 5000;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_unit_cost(p_watch_cost numeric, p_shipping numeric, p_fees numeric, p_quantity integer)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE STRICT
 SET search_path TO ''
AS $function$
begin
  if p_quantity <= 0 then
    raise exception 'Inventory lot quantity must be greater than zero'
      using errcode = '22012';
  end if;

  return (p_watch_cost + p_shipping + p_fees) / p_quantity;
end;
$function$
;

create or replace view "public"."marketing_watches_view" as  WITH lot_costs AS (
         SELECT watches_1.reference,
            inventory_lots.quantity,
            public.calculate_unit_cost(inventory_lots.watch_cost, inventory_lots.shipping, inventory_lots.fees, inventory_lots.quantity) AS unit_cost
           FROM (public.inventory_lots
             JOIN public.watches watches_1 USING (watch_id))
        ), watch_inventory AS (
         SELECT lot_costs.reference,
            sum(lot_costs.quantity) AS available_quantity,
            max(lot_costs.unit_cost) AS highest_unit_cost
           FROM lot_costs
          GROUP BY lot_costs.reference
        )
 SELECT watches.reference,
    watches.commercial_name AS name,
    COALESCE(watch_inventory.available_quantity, (0)::bigint) AS available_quantity,
    public.calculate_commercial_price(watch_inventory.highest_unit_cost, (200000)::numeric) AS recommended_price
   FROM (public.watches
     LEFT JOIN watch_inventory USING (reference))
  WHERE (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.user_id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'marketing'::text))));

alter view public.marketing_watches_view
  set (security_barrier = true, security_invoker = false);

create or replace view "public"."admin_watches_view" as  SELECT inventory_lots.lot_id,
    watches.watch_id,
    watches.reference,
    watches.commercial_name,
    inventory_lots.quantity,
    inventory_lots.purchase_date,
    inventory_lots.watch_cost,
    inventory_lots.shipping,
    inventory_lots.fees,
    costs.unit_cost,
    public.calculate_commercial_price(costs.unit_cost, (50000)::numeric) AS minimum_price,
    public.calculate_commercial_price(costs.unit_cost, (100000)::numeric) AS medium_price,
    public.calculate_commercial_price(costs.unit_cost, (200000)::numeric) AS recommended_price
   FROM ((public.inventory_lots
     JOIN public.watches USING (watch_id))
     CROSS JOIN LATERAL ( SELECT public.calculate_unit_cost(inventory_lots.watch_cost, inventory_lots.shipping, inventory_lots.fees, inventory_lots.quantity) AS unit_cost) costs);

alter view public.admin_watches_view
  set (security_invoker = true);
