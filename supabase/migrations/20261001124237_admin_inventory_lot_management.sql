alter table "public"."watches" add column "image_path" text;

CREATE UNIQUE INDEX watches_reference_key ON public.watches USING btree (reference);

alter table "public"."inventory_lots" add constraint "inventory_lots_fees_check" CHECK ((fees >= (0)::numeric)) not valid;

alter table "public"."inventory_lots" validate constraint "inventory_lots_fees_check";

alter table "public"."inventory_lots" add constraint "inventory_lots_quantity_check" CHECK ((quantity > 0)) not valid;

alter table "public"."inventory_lots" validate constraint "inventory_lots_quantity_check";

alter table "public"."inventory_lots" add constraint "inventory_lots_shipping_check" CHECK ((shipping >= (0)::numeric)) not valid;

alter table "public"."inventory_lots" validate constraint "inventory_lots_shipping_check";

alter table "public"."inventory_lots" add constraint "inventory_lots_watch_cost_check" CHECK ((watch_cost >= (0)::numeric)) not valid;

alter table "public"."inventory_lots" validate constraint "inventory_lots_watch_cost_check";

alter table "public"."watches" add constraint "watches_reference_key" UNIQUE using index "watches_reference_key";

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
    public.calculate_commercial_price(costs.unit_cost, (200000)::numeric) AS recommended_price,
    watches.description,
    watches.image_path
   FROM ((public.inventory_lots
     JOIN public.watches USING (watch_id))
     CROSS JOIN LATERAL ( SELECT public.calculate_unit_cost(inventory_lots.watch_cost, inventory_lots.shipping, inventory_lots.fees, inventory_lots.quantity) AS unit_cost) costs);


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
    public.calculate_commercial_price(watch_inventory.highest_unit_cost, (200000)::numeric) AS recommended_price,
    watches.description,
    watches.image_path
   FROM (public.watches
     LEFT JOIN watch_inventory USING (reference))
  WHERE (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.user_id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'marketing'::text))));


grant insert on table "public"."watches" to "authenticated";

grant update on table "public"."watches" to "authenticated";


  create policy "watches_insert_admin_only"
  on "public"."watches"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));



  create policy "watches_update_admin_only"
  on "public"."watches"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));



