-- "Hàng đã tặng" (formerly "Kho tặng") isn't a place stock sits waiting to
-- be sold or shipped — it's a write-off record of stock that has already
-- left the business as gifts/samples. is_gift_bucket lets pages exclude it
-- from restock/transfer/fulfillment warehouse pickers without hardcoding
-- its code everywhere.
alter table warehouses add column if not exists is_gift_bucket boolean not null default false;

update warehouses set name = 'Hàng đã tặng', is_gift_bucket = true where code = 'QT';

-- ------------------------------------------------------------
-- write_off_gift_stock: moves stock from a real warehouse into the gift
-- write-off bucket AND reduces products.stock_quantity by the same
-- amount, since gifted units are no longer sellable. Unlike
-- transfer_stock (a same-total move between warehouses), this actually
-- shrinks the grand total the site uses for availability/checkout.
-- ------------------------------------------------------------
create or replace function write_off_gift_stock(
  p_product_id uuid,
  p_from_warehouse_id uuid,
  p_quantity integer
) returns void as $$
declare
  v_updated integer;
  v_gift_warehouse_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'quantity_must_be_positive';
  end if;

  select id into v_gift_warehouse_id from warehouses where is_gift_bucket = true limit 1;
  if v_gift_warehouse_id is null then
    raise exception 'gift_warehouse_not_found';
  end if;
  if p_from_warehouse_id = v_gift_warehouse_id then
    raise exception 'cannot_write_off_from_gift_warehouse';
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
    values (p_product_id, v_gift_warehouse_id, p_quantity)
    on conflict (product_id, warehouse_id)
    do update set stock_quantity = product_stock.stock_quantity + excluded.stock_quantity, updated_at = now();

  update products set stock_quantity = stock_quantity - p_quantity, updated_at = now()
    where id = p_product_id;

  insert into stock_transfers (product_id, from_warehouse_id, to_warehouse_id, quantity, note)
    values (p_product_id, p_from_warehouse_id, v_gift_warehouse_id, p_quantity, 'gift_writeoff');
end;
$$ language plpgsql;
