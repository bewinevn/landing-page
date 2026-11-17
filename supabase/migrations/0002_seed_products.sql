-- Seed the current catalog (mirrors src/content/wines/*.json).
-- Prices are placeholders (50,000 VND promo price referenced in the
-- current announcement bar) — adjust in the Supabase dashboard once
-- real retail prices are confirmed.

insert into products (
  slug, abbreviation, name_vn, name_en, type_vn, type_en,
  description_vn, description_en, alcohol_content, price_vnd,
  image_url, stock_quantity, is_active, is_coming_soon,
  is_promo, promo_label_vn, promo_label_en, promo_price_vnd
) values
(
  'petite-sirah', 'PS', 'petite sirah', 'petite sirah',
  'vang đỏ classic', 'classic red wine',
  E'Vang đỏ, 13.5%\nQuả mọng chín, gỗ sồi, hoa violet, hạt tiêu đen',
  E'Red wine, 13.5%\nRipe berries, oak, violet, black pepper',
  13.5, 100000,
  '/images/products/petite-sirah.png', 100, true, false,
  true, 'mua 1 tặng 1*', 'buy 1 get 1*', 50000
),
(
  'sauvignon-blanc', 'SB', 'sauvignon blanc', 'sauvignon blanc',
  'vang trắng', 'white wine',
  E'Vang trắng, 11.5%\nTáo xanh, chanh dây, cỏ cắt',
  E'White wine, 11.5%\nGreen apple, passion fruit, cut grass',
  11.5, 100000,
  '/images/products/sauvignon-blanc.png', 0, true, true,
  false, null, null, null
),
(
  'zinfandel', 'ZL', 'zinfandel', 'zinfandel',
  'vang đỏ phá cách', 'disruptive red wine',
  E'Vang đỏ, 13.5%\nMứt mận, cam thảo, vanilla',
  E'Red wine, 13.5%\nPlum jam, licorice, vanilla',
  13.5, 100000,
  '/images/products/zinfandel.png', 0, true, true,
  false, null, null, null
);
