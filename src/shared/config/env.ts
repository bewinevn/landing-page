import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PAYMENT_PROVIDER: z.enum(["vietqr_static", "sepay"]).default("vietqr_static"),
  BEWINE_BANK_BIN: z.string().min(1),
  BEWINE_BANK_ACCOUNT_NUMBER: z.string().min(1),
  BEWINE_BANK_ACCOUNT_HOLDER: z.string().min(1),
  BEWINE_BANK_NAME: z.string().min(1),
  VIETQR_TEMPLATE: z.string().default("compact2"),
  ORDER_PAYMENT_WINDOW_MINUTES: z.coerce.number().int().positive().default(30),
  ADMIN_PASSWORD: z.string().min(1),
  ADMIN_SESSION_SECRET: z.string().min(1),
  // Optional: staff order notifications via a Telegram bot. Both must be
  // set for the channel to activate — see ECOMMERCE_SETUP.md for setup.
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Validated, typed access to server-side env vars via `process.env`
 * (not `import.meta.env`) so this works identically whether called
 * from an Astro API route or from the standalone Netlify Scheduled
 * Function (which runs outside Astro/Vite's build pipeline and
 * wouldn't have `import.meta.env` substitution applied).
 */
export function getEnv(): Env {
  if (cached) return cached;
  cached = envSchema.parse(process.env);
  return cached;
}
