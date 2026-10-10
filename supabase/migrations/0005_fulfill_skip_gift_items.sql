-- ------------------------------------------------------------
-- fulfill_order_from_warehouse: skip 0đ (gift) order_items when
-- deducting warehouse stock. Gift cans (promo bonus items) are
-- recorded as real order_items for display/packing-slip purposes
-- but aren't tracked in product_stock, so deducting them here
-- would block fulfillment of the whole order on phantom stock.
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

  for v_item in select * from order_items where order_id = p_order_id and unit_price_vnd > 0 loop
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
