-- ------------------------------------------------------------
-- Fix: gift order_items (unit_price_vnd = 0) are never reserved at
-- checkout (see createOrder in order.service.ts — they're excluded
-- from reserveAll on purpose, since some gift SKUs have zero tracked
-- stock). But apply_incoming_transaction and expire_stale_orders both
-- looped over ALL order_items unconditionally when touching
-- reserved_quantity, so a gift line would:
--   - in apply_incoming_transaction: subtract quantity never reserved,
--     risking a negative reserved_quantity (no floor there at all —
--     this can throw and abort the whole payment confirmation).
--   - in expire_stale_orders: over-release reserved_quantity that
--     belongs to OTHER pending orders for the same product, since
--     release_product_stock's greatest(0, ...) floor silently masks
--     the over-release instead of surfacing it.
-- Gift lines still deduct stock_quantity on payment (the can leaves
-- the warehouse either way) — only the reserved_quantity side is
-- gated on unit_price_vnd > 0.
-- ------------------------------------------------------------

create or replace function apply_incoming_transaction(
  p_provider text,
  p_provider_transaction_id text,
  p_amount_vnd bigint,
  p_currency text,
  p_raw_reference text,
  p_matched_reference text,
  p_occurred_at timestamptz,
  p_direction text,
  p_raw_payload jsonb
) returns table (result_status text, order_reference text) as $$
declare
  v_txn_id uuid;
  v_payment payments%rowtype;
  v_order_id uuid;
  v_item record;
begin
  insert into transactions (
    provider, provider_transaction_id, amount_vnd, currency,
    raw_reference, matched_reference, occurred_at, direction,
    status, raw_payload
  ) values (
    p_provider, p_provider_transaction_id, p_amount_vnd, p_currency,
    p_raw_reference, p_matched_reference, p_occurred_at, p_direction,
    'unmatched', p_raw_payload
  )
  on conflict (provider, provider_transaction_id) do nothing
  returning id into v_txn_id;

  if v_txn_id is null then
    return query select 'duplicate_ignored', null::text;
    return;
  end if;

  if p_matched_reference is null then
    return query select 'unmatched_no_reference', null::text;
    return;
  end if;

  select * into v_payment from payments where reference = p_matched_reference for update;

  if not found then
    return query select 'unmatched_unknown_order', p_matched_reference;
    return;
  end if;

  update transactions set payment_id = v_payment.id where id = v_txn_id;

  if v_payment.status = 'paid' then
    update transactions set status = 'ignored_already_paid' where id = v_txn_id;
    return query select 'ignored_already_paid', p_matched_reference;
    return;
  end if;

  if v_payment.status <> 'pending' then
    update transactions set status = 'unmatched' where id = v_txn_id;
    return query select 'ignored_payment_not_pending', p_matched_reference;
    return;
  end if;

  if p_amount_vnd <> v_payment.amount_expected_vnd then
    update transactions set status = 'mismatched_amount' where id = v_txn_id;
    update payments set status = 'mismatched', amount_received_vnd = p_amount_vnd, updated_at = now()
      where id = v_payment.id;
    return query select 'amount_mismatch', p_matched_reference;
    return;
  end if;

  update transactions set status = 'matched' where id = v_txn_id;
  update payments set status = 'paid', amount_received_vnd = p_amount_vnd, paid_at = now(), updated_at = now()
    where id = v_payment.id;

  v_order_id := v_payment.order_id;
  update orders set status = 'paid', updated_at = now() where id = v_order_id;

  for v_item in select * from order_items where order_id = v_order_id loop
    if v_item.unit_price_vnd > 0 then
      update products
        set stock_quantity = stock_quantity - v_item.quantity,
            reserved_quantity = reserved_quantity - v_item.quantity,
            updated_at = now()
        where id = v_item.product_id;
    else
      update products
        set stock_quantity = stock_quantity - v_item.quantity,
            updated_at = now()
        where id = v_item.product_id;
    end if;
  end loop;

  return query select 'paid', p_matched_reference;
end;
$$ language plpgsql;

create or replace function expire_stale_orders()
returns integer as $$
declare
  v_order record;
  v_item record;
  v_count integer := 0;
begin
  for v_order in
    select id from orders
    where status = 'pending_payment' and expires_at is not null and expires_at < now()
    for update skip locked
  loop
    update orders set status = 'cancelled', cancelled_reason = 'payment_expired', updated_at = now()
      where id = v_order.id;

    update payments set status = 'expired', updated_at = now()
      where order_id = v_order.id and status = 'pending';

    for v_item in select * from order_items where order_id = v_order.id loop
      if v_item.unit_price_vnd > 0 then
        perform release_product_stock(v_item.product_id, v_item.quantity);
      end if;
    end loop;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$ language plpgsql;
