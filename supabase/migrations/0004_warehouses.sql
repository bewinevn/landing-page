-- ------------------------------------------------------------
-- Multi-warehouse inventory. products.stock_quantity remains the
-- grand-total source of truth used by checkout/payment (unchanged);
-- product_stock tracks how that same total is currently distributed
-- across physical warehouses. The invariant this schema maintains:
-- sum(product_stock.stock_quantity) for a product == that product's
-- products.stock_quantity, at all times.
-- ------------------------------------------------------------

create table warehouses (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  name        text not null,
  created_at  timestamptz not null default now(),
  constraint warehouses_code_unique unique (code)
);

create table product_stock (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references products(id),
  warehouse_id      uuid not null references warehouses(id),
  stock_quantity    integer not null default 0 check (stock_quantity >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint product_stock_product_warehouse_unique unique (product_id, warehouse_id)
);
create index idx_product_stock_product_id on product_stock(product_id);
create trigger trg_product_stock_updated_at before update on product_stock
  for each row execute function set_updated_at();

-- Pure audit log of warehouse-to-warehouse moves (not restocks).
create table stock_transfers (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references products(id),
  from_warehouse_id   uuid not null references warehouses(id),
  to_warehouse_id     uuid not null references warehouses(id),
  quantity            integer not null check (quantity > 0),
  note                text,
  created_at          timestamptz not null default now()
);
create index idx_stock_transfers_product_id on stock_transfers(product_id);

-- Which single warehouse serviced an order, recorded when it's packed.
create table order_fulfillments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id),
  warehouse_id  uuid not null references warehouses(id),
  created_at    timestamptz not null default now(),
  constraint order_fulfillments_order_id_unique unique (order_id)
);

-- Seed the 3 warehouses.
insert into warehouses (code, name) values
  ('DTM', 'DTM'),
  ('HH', 'HH'),
  ('GV', 'GV');

-- Seed product_stock: put each product's current total into DTM, so the
-- sum invariant holds from the start. Admins redistribute via transfers.
insert into product_stock (product_id, warehouse_id, stock_quantity)
select p.id, w.id, p.stock_quantity
from products p
cross join (select id from warehouses where code = 'DTM') w;

-- ------------------------------------------------------------
-- transfer_stock: atomic move of stock between two warehouses for one
-- product. Does not touch products.stock_quantity (the grand total is
-- unaffected by internal transfers).
-- ------------------------------------------------------------
create or replace function transfer_stock(
  p_product_id uuid,
  p_from_warehouse_id uuid,
  p_to_warehouse_id uuid,
  p_quantity integer
) returns void as $$
declare
  v_updated integer;
begin
  if p_from_warehouse_id = p_to_warehouse_id then
    raise exception 'from_and_to_warehouse_must_differ';
  end if;
  if p_quantity <= 0 then
    raise exception 'quantity_must_be_positive';
  end if;

  update product_stock
    set stock_quantity = stock_quantity - p_quantity, updated_at = now()
    where product_id = p_product_id and warehouse_id = p_from_warehouse_id
      and stock_quantity >= p_quantity;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'insufficient_stock_at_source';
  end if;

  insert into product_stock (product_id, warehouse_id, stock_quantity)
    values (p_product_id, p_to_warehouse_id, p_quantity)
    on conflict (product_id, warehouse_id)
    do update set stock_quantity = product_stock.stock_quantity + excluded.stock_quantity, updated_at = now();

  insert into stock_transfers (product_id, from_warehouse_id, to_warehouse_id, quantity)
    values (p_product_id, p_from_warehouse_id, p_to_warehouse_id, p_quantity);
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- restock_product: the only place new inventory enters the system.
-- Increases a warehouse's stock and the product's grand total together.
-- ------------------------------------------------------------
create or replace function restock_product(
  p_product_id uuid,
  p_warehouse_id uuid,
  p_quantity integer
) returns void as $$
begin
  if p_quantity <= 0 then
    raise exception 'quantity_must_be_positive';
  end if;

  insert into product_stock (product_id, warehouse_id, stock_quantity)
    values (p_product_id, p_warehouse_id, p_quantity)
    on conflict (product_id, warehouse_id)
    do update set stock_quantity = product_stock.stock_quantity + excluded.stock_quantity, updated_at = now();

  update products set stock_quantity = stock_quantity + p_quantity, updated_at = now()
    where id = p_product_id;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- fulfill_order_from_warehouse: packing-time warehouse allocation.
-- Deducts the chosen warehouse's physical stock for every line item
-- (all-or-nothing) and moves the order to 'processing'. Does not touch
-- products.stock_quantity — that was already committed at payment time
-- by apply_incoming_transaction.
-- ------------------------------------------------------------
create or replace function fulfill_order_from_warehouse(
  p_order_id uuid,
  p_warehouse_id uuid
) returns void as $$
declare
  v_order record;
  v_item record;
  v_updated integer;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  if v_order.status <> 'paid' then
    raise exception 'order_not_paid';
  end if;

  for v_item in select * from order_items where order_id = p_order_id loop
    update product_stock
      set stock_quantity = stock_quantity - v_item.quantity, updated_at = now()
      where product_id = v_item.product_id and warehouse_id = p_warehouse_id
        and stock_quantity >= v_item.quantity;
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'insufficient_warehouse_stock';
    end if;
  end loop;

  insert into order_fulfillments (order_id, warehouse_id) values (p_order_id, p_warehouse_id)
    on conflict (order_id) do update set warehouse_id = excluded.warehouse_id, created_at = now();

  update orders set status = 'processing', updated_at = now() where id = p_order_id;
end;
$$ language plpgsql;
