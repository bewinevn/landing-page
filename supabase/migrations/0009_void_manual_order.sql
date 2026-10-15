-- Lets an admin delete a manually-entered order (channel = 'offline')
-- that was typed in wrong, restoring whatever inventory it had already
-- committed. Scoped to manual/offline orders only — a real customer
-- order should go through the existing cancel/refund status transitions
-- instead, not be deleted outright. Also refuses anything already at
-- 'processing' or later, since a fulfilled order has already deducted a
-- specific warehouse's product_stock and may have physically shipped;
-- reversing that isn't something this function attempts.
create or replace function void_manual_order(p_order_id uuid)
returns void as $$
declare
  v_order record;
  v_item record;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  if v_order.channel <> 'offline' then
    raise exception 'not_a_manual_order';
  end if;
  if v_order.status not in ('pending_payment', 'paid') then
    raise exception 'order_already_fulfilled';
  end if;

  for v_item in select * from order_items where order_id = p_order_id loop
    if v_order.status = 'pending_payment' then
      -- Stock was only reserved, never committed — release the hold
      -- (gift/override-0 lines were never reserved in the first place).
      if v_item.unit_price_vnd > 0 then
        update products
          set reserved_quantity = greatest(0, reserved_quantity - v_item.quantity), updated_at = now()
          where id = v_item.product_id;
      end if;
    else
      -- 'paid': apply_incoming_transaction already committed this
      -- against products.stock_quantity (and cleared reserved_quantity
      -- for real lines) — add it back.
      update products
        set stock_quantity = stock_quantity + v_item.quantity, updated_at = now()
        where id = v_item.product_id;
    end if;
  end loop;

  delete from transactions where payment_id in (select id from payments where order_id = p_order_id);
  delete from order_fulfillments where order_id = p_order_id;
  delete from payments where order_id = p_order_id;
  delete from orders where id = p_order_id; -- order_items cascade
end;
$$ language plpgsql;
