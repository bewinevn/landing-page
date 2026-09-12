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

## 5. Deploy

Push the `ecommerce` branch and set the same env vars in **Netlify → Site settings → Environment variables**, then either merge to `minimma` or point a Netlify branch deploy at `ecommerce` to test on a real URL first. The order-expiry sweep (`netlify/functions/expire-stale-orders.ts`) runs automatically every 5 minutes once deployed — no extra setup needed.
