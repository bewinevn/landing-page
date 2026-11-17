/**
 * Extracts a BEW-prefixed order reference (e.g. BEWEHRSK) from a raw
 * bank-transfer content string. Banks often prepend/append their own
 * text (customer name, a bank-generated transaction code, etc.), so
 * this scans for the pattern rather than requiring an exact match.
 */
export function extractOrderReference(rawText: string): string | null {
  const match = rawText.toUpperCase().match(/BEW[A-Z0-9]{5}/);
  return match ? match[0] : null;
}
