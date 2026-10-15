-- ------------------------------------------------------------
-- zalo_oa_tokens: single-row storage for the Zalo OA's current
-- OAuth access/refresh token pair (ZNS customer notifications).
-- Zalo rotates the refresh_token on every refresh, so this can't
-- live in a static env var — it must be read/written at runtime.
-- Row id is always 1: there is exactly one OA for this shop.
-- ------------------------------------------------------------
create table if not exists zalo_oa_tokens (
  id int primary key default 1 check (id = 1),
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
