insert into public.watches (
  reference,
  commercial_name,
  movement_type,
  case_diameter,
  description
)
select
  demo.reference,
  demo.commercial_name,
  demo.movement_type,
  demo.case_diameter,
  demo.description
from (
  values
    (
      'WIM-DEMO-AUT-001',
      'Automatic Classic (demo)',
      'Automático',
      40.00,
      'Fictional sample watch for development.'
    ),
    (
      'WIM-DEMO-QUA-001',
      'Quartz Minimal (demo)',
      'Cuarzo',
      38.00,
      'Fictional sample watch for development.'
    ),
    (
      'WIM-DEMO-SOL-001',
      'Solar Field (demo)',
      'Solar',
      42.00,
      'Fictional sample watch for development.'
    )
) as demo(reference, commercial_name, movement_type, case_diameter, description)
where not exists (
  select 1
  from public.watches
  where watches.reference = demo.reference
    and watches.commercial_name = demo.commercial_name
);

insert into public.inventory_lots (
  watch_id,
  quantity,
  purchase_date,
  watch_cost,
  shipping,
  fees
)
select
  watches.watch_id,
  demo.quantity,
  demo.purchase_date,
  demo.watch_cost,
  demo.shipping,
  demo.fees
from (
  values
    ('WIM-DEMO-AUT-001', 'Automatic Classic (demo)', 5, date '2026-01-15', 1250000.00, 45000.00, 12000.00),
    ('WIM-DEMO-QUA-001', 'Quartz Minimal (demo)', 8, date '2026-02-10', 420000.00, 30000.00, 8000.00),
    ('WIM-DEMO-SOL-001', 'Solar Field (demo)', 3, date '2026-03-05', 780000.00, 35000.00, 10000.00)
) as demo(reference, commercial_name, quantity, purchase_date, watch_cost, shipping, fees)
join public.watches
  on watches.reference = demo.reference
  and watches.commercial_name = demo.commercial_name
where not exists (
  select 1
  from public.inventory_lots
  where inventory_lots.watch_id = watches.watch_id
    and inventory_lots.quantity = demo.quantity
    and inventory_lots.purchase_date = demo.purchase_date
    and inventory_lots.watch_cost = demo.watch_cost
    and inventory_lots.shipping = demo.shipping
    and inventory_lots.fees = demo.fees
);
