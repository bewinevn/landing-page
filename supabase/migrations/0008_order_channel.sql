-- Tags each order with where the sale came from, so admin-entered orders
-- (a salesperson selling outside the website) are distinguishable from
-- real online checkouts on the admin order list/detail pages.
alter table orders
  add column if not exists channel text not null default 'online' check (channel in ('online', 'offline'));
