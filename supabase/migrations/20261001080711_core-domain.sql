
  create table "public"."inventory_lots" (
    "lot_id" integer generated always as identity not null,
    "watch_id" integer not null,
    "quantity" integer not null,
    "purchase_date" date not null,
    "watch_cost" numeric(12,2) not null,
    "shipping" numeric(12,2) not null,
    "fees" numeric(12,2) not null
      );


alter table "public"."inventory_lots" enable row level security;


  create table "public"."profiles" (
    "user_id" uuid not null,
    "role" text not null
      );


alter table "public"."profiles" enable row level security;


  create table "public"."watches" (
    "watch_id" integer generated always as identity not null,
    "reference" character varying not null,
    "commercial_name" character varying not null,
    "movement_type" character varying not null,
    "case_diameter" numeric(5,2) not null,
    "description" text
      );


alter table "public"."watches" enable row level security;

CREATE UNIQUE INDEX inventory_lots_pkey ON public.inventory_lots USING btree (lot_id);

CREATE INDEX inventory_lots_watch_id_idx ON public.inventory_lots USING btree (watch_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX watches_pkey ON public.watches USING btree (watch_id);

CREATE INDEX watches_reference_idx ON public.watches USING btree (reference);

alter table "public"."inventory_lots" add constraint "inventory_lots_pkey" PRIMARY KEY using index "inventory_lots_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."watches" add constraint "watches_pkey" PRIMARY KEY using index "watches_pkey";

alter table "public"."inventory_lots" add constraint "inventory_lots_watch_id_fkey" FOREIGN KEY (watch_id) REFERENCES public.watches(watch_id) not valid;

alter table "public"."inventory_lots" validate constraint "inventory_lots_watch_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'marketing'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

grant delete on table "public"."inventory_lots" to "authenticated";

grant insert on table "public"."inventory_lots" to "authenticated";

grant select on table "public"."inventory_lots" to "authenticated";

grant update on table "public"."inventory_lots" to "authenticated";

grant delete on table "public"."inventory_lots" to "service_role";

grant insert on table "public"."inventory_lots" to "service_role";

grant references on table "public"."inventory_lots" to "service_role";

grant select on table "public"."inventory_lots" to "service_role";

grant trigger on table "public"."inventory_lots" to "service_role";

grant truncate on table "public"."inventory_lots" to "service_role";

grant update on table "public"."inventory_lots" to "service_role";

grant select on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant select on table "public"."watches" to "authenticated";

grant delete on table "public"."watches" to "service_role";

grant insert on table "public"."watches" to "service_role";

grant references on table "public"."watches" to "service_role";

grant select on table "public"."watches" to "service_role";

grant trigger on table "public"."watches" to "service_role";

grant truncate on table "public"."watches" to "service_role";

grant update on table "public"."watches" to "service_role";


  create policy "inventory_lots_admin_only"
  on "public"."inventory_lots"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));



  create policy "profiles_select_own"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "watches_select_authenticated"
  on "public"."watches"
  as permissive
  for select
  to authenticated
using (true);



