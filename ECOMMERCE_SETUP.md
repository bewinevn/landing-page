# E-commerce MVP — setup

## 1. Create a Supabase project

1. Go to https://supabase.com/dashboard → New project (free tier is enough for MVP).
2. Once created, open **SQL Editor**, paste the contents of `supabase/migrations/0001_init.sql`, and run it (choose "Run and enable RLS" if prompted — the app only ever uses the service_role key, which bypasses RLS regardless, so this just closes off the anon/public key from touching these tables by accident).
3. For the seed data (`0002_seed_products.sql`), **don't paste it into the SQL Editor** — pasting Vietnamese diacritics into its code editor can silently mangle the UTF-8 encoding (seen firsthand while building this). Instead, seed via the REST API, which preserves UTF-8 correctly:
   ```bash
   curl -X POST "https://<project-ref>.supabase.co/rest/v1/products" \
     -H "apikey: <service_role_key>" \
     -H "Authorization: Bearer <service_role_key>" \
     -H "Content-Type: application/json; charset=utf-8" \
     -H "Prefer: return=representation" \
     --data-binary @supabase/seed-products.json
   ```
4. Go to **Project Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key (⚠️ secret, never expose client-side) → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Bank details for VietQR

Find your bank's BIN code at https://api.vietqr.io/v2/banks (e.g. Vietcombank = 970436, ACB = 970416, MB Bank = 970422). Fill in:

```
BEWINE_BANK_BIN=<your bank's BIN>
BEWINE_BANK_ACCOUNT_NUMBER=<BEWINE's account number>
BEWINE_BANK_ACCOUNT_HOLDER=<account holder name, no diacritics, e.g. NGUYEN VAN A>
BEWINE_BANK_NAME=<bank display name, e.g. Vietcombank>
```

## 3. Local env

Copy `.env.example` to `.env` and fill in the values from steps 1–2.

```bash
cp .env.example .env
npm run dev
```

## 4. Test the flow end-to-end (no real bank needed)

1. Visit `/products`, add an item to cart, go to `/cart` → `/checkout`, submit the form.
2. You'll land on `/orders/BEWXXXXX` showing a **real, scannable VietQR code** and the "waiting for payment" state.
3. In another terminal, simulate the bank transfer arriving:
   ```bash
   curl -X POST http://localhost:4321/api/webhooks/mock \
     -H "Content-Type: application/json" \
     -d '{"reference":"BEWXXXXX","amountVnd":100000}'
   ```
   (replace `BEWXXXXX` and the amount with your actual order's values, shown on the order page)
4. Within ~4 seconds the order page should flip to "Payment successful" on its own (no refresh) — this proves the webhook → idempotent DB update → status poll loop end to end.
5. Try posting the exact same curl command again — response should say `"result_status":"ignored_already_paid"` and nothing changes (the mock webhook generates a fresh synthetic transaction ID each call, so this exercises the "customer paid twice" guard rather than the exact-duplicate-delivery guard; both are handled by the same `apply_incoming_transaction` function and were verified directly against the RPC with a fixed transaction ID during development — see the state machine section of the plan for the distinction).

Note: `/api/webhooks/mock` only works when running `npm run dev` (it's disabled in production builds — see `src/pages/api/webhooks/mock.ts`).

## 5. Staff order notifications via Telegram (optional)

Sends a message to a Telegram group whenever a customer places an order (and when a bank transfer lands), so staff don't have to keep the admin page open.

1. Message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot` → follow the prompts. It gives you a bot token like `123456:ABC-DEF...`.
2. Create a Telegram group for staff, add the bot to it.
3. Send any message in the group, then visit `https://api.telegram.org/bot<token>/getUpdates` in a browser — find `"chat":{"id": -100..., ...}` in the JSON response. That number (including the `-`) is the chat id.
4. Add both to `.env` (and to Netlify's env vars for production):
   ```
   TELEGRAM_BOT_TOKEN=<the bot token>
   TELEGRAM_CHAT_ID=<the chat id>
   ```
5. Restart the dev server. Placing a test order should post a "🆕 Đơn hàng mới" message to the group within a second or two. Leaving either var unset simply disables this channel — nothing else is affected.

## 6. Customer payment-confirmation via Zalo ZNS (optional)

Sends the customer a ZNS message when their bank transfer is confirmed (`order.paid`). COD orders never trigger this — they aren't "paid" until cash is collected on delivery. Needs a Zalo OA with ZNS enabled and an approved message template.

1. Go to https://developers.zalo.me/ → create an App (type "Official Account"), then in the app's "Official Account" tab, link it to your OA.
2. In the app's settings, copy the **App ID** and **Secret Key**, and add a Redirect URI:
   ```
   https://<your-domain>/api/admin/zalo/callback
   ```
   (use your Netlify URL in production, or `http://localhost:4321/api/admin/zalo/callback` while testing locally).
3. Add to `.env` (and Netlify's env vars):
   ```
   ZALO_APP_ID=<the App ID>
   ZALO_APP_SECRET=<the Secret Key>
   ```
4. Apply `supabase/migrations/0006_zalo_oa_tokens.sql` via the Supabase SQL Editor (stores the OA's OAuth tokens — see step 1's approach for applying migrations).
5. Log into `/admin`, then visit `/api/admin/zalo/authorize` in the same browser tab. It redirects to Zalo's consent screen — approve as the OA's admin. On success you land on a "Đã liên kết Zalo OA thành công" page; the access/refresh tokens are now stored and auto-refresh from then on (no need to repeat this unless you revoke access on Zalo's side).
6. Create the ZNS template in the OA's own dashboard (not developers.zalo.me): oa.zalo.me → pick the OA → **Chiến dịch → Quản lý Template → Tạo Template**. A "Xác nhận thanh toán đơn hàng thành công" draft already exists there using three standard Zalo parameters — `customer_name`, `code` (order reference), `amount_vn_standard` (bare VND number) — matching what `src/modules/notifications/channels/zalo-channel.ts` sends. It still needs a logo image (400×96px, light + dark) uploaded before it can be submitted ("Gửi duyệt"); Zalo review can take some time, and separately requires the OA to be verified + on a paid plan for ZNS APIs to work at all.
7. Once approved, copy its **template_id** and add:
   ```
   ZALO_ZNS_TEMPLATE_ID=<the template id>
   ```
   If you create a different template with different parameter names instead, edit `zalo-channel.ts`'s `templateData` object to match — a mismatch makes Zalo reject the send.
8. Leaving `ZALO_APP_ID`/`ZALO_ZNS_TEMPLATE_ID` unset disables this channel entirely — nothing else is affected.

## 7. Deploy

Push the `ecommerce` branch and set the same env vars in **Netlify → Site settings → Environment variables**, then either merge to `minimma` or point a Netlify branch deploy at `ecommerce` to test on a real URL first. The order-expiry sweep (`netlify/functions/expire-stale-orders.ts`) runs automatically every 5 minutes once deployed — no extra setup needed.
