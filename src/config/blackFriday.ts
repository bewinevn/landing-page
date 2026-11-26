// Black Friday 2026 campaign window, in Vietnam time (Asia/Saigon, UTC+7).
// The popup, announcement bar and combo section show only inside this window.
// After it ends the site falls back to the regular popup and announcement.
export const BLACK_FRIDAY_START = '2026-11-26T00:00:00+07:00';
export const BLACK_FRIDAY_END = '2026-11-29T00:00:00+07:00'; // end of 28/11

export const BLACK_FRIDAY_COMBO = {
  oldPrice: '300k',
  price: '250k',
  cans: 6,
  items: [
    { name: 'Sauvignon Blanc', qty: 1 },
    { name: 'Zinfandel', qty: 1 },
    { name: 'Petite Sirah', qty: 2 },
    { name: 'Cabernet Sauvignon', qty: 2 },
  ],
};

export const ZALO_ORDER_LINK = 'https://zalo.me/3836034200863507097';

export function isBlackFridayActive(now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= Date.parse(BLACK_FRIDAY_START) && t < Date.parse(BLACK_FRIDAY_END);
}

// Copy for the Black Friday pieces, kept here so existing translations stay untouched.
export const BLACK_FRIDAY_TEXT = {
  vn: {
    bar: 'combo black friday 26-28/11 chỉ 250k/pack',
    eyebrow: 'Black Friday · 26/11 - 28/11',
    title: 'Combo Black Friday',
    tagline: 'Giảm thật sâu - uống thật say',
    subtitle: '06 lon vang đặc sắc',
    unit: '/pack',
    includes: 'Trong combo có',
    cta: 'Đặt combo qua Zalo',
    note: 'Thời gian áp dụng: 26/11 - 28/11. Số lượng có hạn.',
    popupAlt: 'be-wine Black Friday: combo 6 lon vang chỉ 250k, áp dụng 26/11 - 28/11',
    close: 'Đóng',
  },
  en: {
    bar: 'Black Friday combo 26-28/11, only 250k/pack',
    eyebrow: 'Black Friday · 26/11 - 28/11',
    title: 'Black Friday Combo',
    tagline: 'Big discounts, bigger cheers',
    subtitle: '6 signature cans of wine',
    unit: '/pack',
    includes: "What's inside",
    cta: 'Order the combo on Zalo',
    note: 'Valid 26/11 - 28/11. While supplies last.',
    popupAlt: 'be-wine Black Friday: 6-can combo for 250k, valid 26/11 - 28/11',
    close: 'Close',
  },
};

export function blackFridayText(lang: string) {
  return lang === 'en' ? BLACK_FRIDAY_TEXT.en : BLACK_FRIDAY_TEXT.vn;
}
