-- A 4th warehouse dedicated to promotional/gift stock (samples, giveaways),
-- kept separate from sellable inventory in DTM/HH/GV. No code changes are
-- needed for this — /admin/inventory, the restock/transfer forms, and the
-- order-fulfillment warehouse picker all already list whatever rows exist
-- in `warehouses` rather than assuming a fixed set.
insert into warehouses (code, name) values ('QT', 'Kho tặng')
on conflict (code) do nothing;
