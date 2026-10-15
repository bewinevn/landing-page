-- ============================================================
-- BEWINE e-commerce MVP schema
-- ============================================================

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- customers
-- ------------------------------------------------------------
create table customers (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  phone             text not null,
  email             text,
  address_line      text not null,
  city              text not null,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint customers_phone_unique unique (phone)
);

create trigger trg_customers_updated_at
  before update on customers
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- products
-- ------------------------------------------------------------
create table products (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null,
  abbreviation        text not null,
  name_vn             text not null,
  name_en             text not null,
  type_vn             text not null,
  type_en             text not null,
  description_vn      text not null,
  description_en      text not null,
  alcohol_content     numeric(4,2) not null check (alcohol_content >= 0 and alcohol_content <= 100),
  price_vnd           bigint not null check (price_vnd >= 0),
  image_url           text,
  stock_quantity      integer not null default 0 check (stock_quantity >= 0),
  reserved_quantity   integer not null default 0 check (reserved_quantity >= 0),
  is_active           boolean not null default true,
  is_coming_soon      boolean not null default false,
  is_promo            boolean not null default false,
  promo_label_vn      text,
  promo_label_en      text,
  promo_price_vnd     bigint check (promo_price_vnd is null or promo_price_vnd >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint products_slug_unique unique (slug),
  constraint products_abbreviation_unique unique (abbreviation),
  constraint products_reserved_lte_stock check (reserved_quantity <= stock_quantity)
);

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- orders
-- ------------------------------------------------------------
create table orders (
  id                     uuid primary key default gen_random_uuid(),
  reference              text not null,
  customer_id            uuid not null references customers(id),
  status                 text not null default 'pending_payment'
                           check (status in (
                             'pending_payment','paid','processing',
                             'shipped','completed','cancelled','refunded'
                           )),
  cancelled_reason       text
                           check (cancelled_reason is null or cancelled_reason in (
                             'customer_cancelled','payment_expired',
                             'payment_mismatch_unresolved','admin_cancelled'
                           )),
  subtotal_vnd           bigint not null check (subtotal_vnd >= 0),
  total_vnd              bigint not null check (total_vnd >= 0),
  currency               text not null default 'VND',
  delivery_full_name     text not null,
  delivery_phone         text not null,
  delivery_address_line  text not null,
  delivery_city          text not null,
  delivery_note          text,
  locale                 text not null default 'vn' check (locale in ('vn','en')),
  expires_at             timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint orders_reference_unique unique (reference)
);

create index idx_orders_customer_id on orders(customer_id);
create index idx_orders_status on orders(status);
create index idx_orders_status_expires_at on orders(status, expires_at);

create trigger trg_orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- order_items
-- ------------------------------------------------------------
create table order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references orders(id) on delete cascade,
  product_id            uuid not null references products(id),
  product_name_snapshot text not null,
  unit_price_vnd        bigint not null check (unit_price_vnd >= 0),
  quantity              integer not null check (quantity > 0),
  line_total_vnd        bigint not null check (line_total_vnd >= 0),
  created_at            timestamptz not null default now()
);

create index idx_order_items_order_id on order_items(order_id);
create index idx_order_items_product_id on order_items(product_id);

-- ------------------------------------------------------------
-- payments (one payment intent per order)
-- ------------------------------------------------------------
create table payments (
  id                     uuid primary key default gen_random_uuid(),
  order_id               uuid not null references orders(id),
  reference              text not null,
  provider               text not null default 'vietqr_static'
                           check (provider in ('vietqr_static','sepay','manual')),
  status                 text not null default 'pending'
                           check (status in ('pending','paid','mismatched','expired','failed','refunded')),
  amount_expected_vnd    bigint not null check (amount_expected_vnd >= 0),
  amount_received_vnd    bigint check (amount_received_vnd is null or amount_received_vnd >= 0),
  bank_account_number    text,
  bank_account_holder    text,
  bank_name              text,
  qr_code_url            text,
  qr_payload             text,
  expires_at             timestamptz,
  paid_at                timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint payments_order_id_unique unique (order_id)
);

create index idx_payments_reference on payments(reference);
create index idx_payments_status on payments(status);

create trigger trg_payments_updated_at
  before update on payments
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- transactions (raw incoming bank/provider events; idempotency lives here)
-- ------------------------------------------------------------
create table transactions (
  id                       uuid primary key default gen_random_uuid(),
  payment_id               uuid references payments(id),
  provider                 text not null,
  provider_transaction_id  text not null,
  amount_vnd               bigint not null check (amount_vnd >= 0),
  currency                 text not null default 'VND',
  raw_reference            text,
  matched_reference        text,
  direction                text not null default 'in' check (direction in ('in','out')),
  occurred_at              timestamptz not null,
  status                   text not null
                             check (status in (
                               'matched','unmatched','mismatched_amount','ignored_already_paid'
                             )),
  raw_payload              jsonb not null,
  created_at               timestamptz not null default now(),
  constraint transactions_provider_txn_unique unique (provider, provider_transaction_id)
);

create index idx_transactions_payment_id on transactions(payment_id);
create index idx_transactions_matched_reference on transactions(matched_reference);
create index idx_transactions_status on transactions(status);

-- ------------------------------------------------------------
-- apply_incoming_transaction: the atomic idempotent core of the
-- payment flow. Used by both the real webhook and the mock
-- test-webhook so both go through identical verification logic.
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
  -- Step 1: the insert itself IS the idempotency check, atomically,
  -- via the unique constraint on (provider, provider_transaction_id).
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

  -- happy path: exact match, first time seen
  update transactions set status = 'matched' where id = v_txn_id;
  update payments set status = 'paid', amount_received_vnd = p_amount_vnd, paid_at = now(), updated_at = now()
    where id = v_payment.id;

  v_order_id := v_payment.order_id;
  update orders set status = 'paid', updated_at = now() where id = v_order_id;

  for v_item in select * from order_items where order_id = v_order_id loop
    update products
      set stock_quantity = stock_quantity - v_item.quantity,
          reserved_quantity = reserved_quantity - v_item.quantity,
          updated_at = now()
      where id = v_item.product_id;
  end loop;

  return query select 'paid', p_matched_reference;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- reserve_product_stock: atomic conditional reservation used at
-- checkout. Returns true if the full quantity could be reserved.
-- ------------------------------------------------------------
create or replace function reserve_product_stock(
  p_product_id uuid,
  p_quantity integer
) returns boolean as $$
declare
  v_updated integer;
begin
  update products
    set reserved_quantity = reserved_quantity + p_quantity
    where id = p_product_id
      and is_active = true
      and stock_quantity - reserved_quantity >= p_quantity;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- release_product_stock: releases a reservation without touching
-- physical stock (used on order expiry/cancellation).
-- ------------------------------------------------------------
create or replace function release_product_stock(
  p_product_id uuid,
  p_quantity integer
) returns void as $$
begin
  update products
    set reserved_quantity = greatest(0, reserved_quantity - p_quantity)
    where id = p_product_id;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- expire_stale_orders: cancels pending_payment orders past their
-- expiry, expires the payment, and releases reserved stock.
-- Called by the Netlify Scheduled Function.
-- ------------------------------------------------------------
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
      perform release_product_stock(v_item.product_id, v_item.quantity);
    end loop;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$ language plpgsql;
