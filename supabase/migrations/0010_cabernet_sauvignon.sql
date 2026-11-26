-- Black Friday 2026 combo (26-28/11) includes 2 cans of Cabernet Sauvignon,
-- so it needs to exist as a real product for stock reservation at checkout.
-- Starts with 0 stock: set the real stock in /admin/inventory afterwards.
insert into products (
  slug, abbreviation, name_vn, name_en, type_vn, type_en,
  description_vn, description_en, alcohol_content, price_vnd,
  image_url, stock_quantity, is_active, is_coming_soon,
  is_promo, promo_label_vn, promo_label_en, promo_price_vnd
) values (
  'cabernet-sauvignon', 'CS', 'cabernet sauvignon', 'cabernet sauvignon',
  'vang đỏ', 'red wine',
  E'Vang đỏ, 13.5%',
  E'Red wine, 13.5%',
  13.5, 50000,
  '/images/products/cabernet-sauvignon.png', 0, true, false,
  false, null, null, null
)
on conflict (slug) do nothing;
