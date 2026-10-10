const REFERENCE_PREFIX = "BEW";
const REFERENCE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid ambiguity when read aloud
const REFERENCE_LENGTH = 5;

/**
 * Generates a candidate order/payment reference like BEW8F29K.
 * Uniqueness is NOT guaranteed by this function alone — callers must
 * retry against the DB's unique constraint on collision (astronomically
 * rare at this volume, but the contract is explicit).
 */
export function generateOrderReference(): string {
  let suffix = "";
  for (let i = 0; i < REFERENCE_LENGTH; i++) {
    suffix += REFERENCE_CHARS[Math.floor(Math.random() * REFERENCE_CHARS.length)];
  }
  return `${REFERENCE_PREFIX}${suffix}`;
}
