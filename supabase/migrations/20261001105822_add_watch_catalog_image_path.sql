DROP VIEW "public"."admin_watches_view";

DROP VIEW "public"."marketing_watches_view";

ALTER TABLE "public"."watches"
  ADD COLUMN "image_path" text;

CREATE VIEW "public"."admin_watches_view" WITH (security_invoker=true) AS  SELECT inventory_lots.lot_id,
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

CREATE VIEW "public"."marketing_watches_view" WITH (security_barrier=true, security_invoker=false) AS  WITH lot_costs AS (
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

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_watches_view" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."admin_watches_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_watches_view" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_watches_view" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."marketing_watches_view" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."marketing_watches_view" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."marketing_watches_view" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."marketing_watches_view" TO "service_role";
