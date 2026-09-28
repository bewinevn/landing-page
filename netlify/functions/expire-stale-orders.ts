import type { Config } from "@netlify/functions";
import { expireStaleOrders } from "../../src/modules/orders";

/**
 * Netlify Scheduled Function: cancels pending_payment orders past
 * their expiry window and releases their reserved stock. Lives
 * outside Astro's own routing (Astro-generated Netlify functions
 * don't support the `schedule` export directly), but calls straight
 * into the `orders` module's domain logic — no duplicated logic.
 */
export default async () => {
  const { expiredCount } = await expireStaleOrders();
  console.log(`[expire-stale-orders] expired ${expiredCount} order(s)`);
  return new Response(JSON.stringify({ expiredCount }), { status: 200 });
};

export const config: Config = {
  schedule: "*/5 * * * *",
};
