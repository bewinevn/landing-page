/**
 * Client-side cart, persisted to localStorage. Deliberately no
 * server-side cart table for this MVP (see plan) — the server never
 * trusts these quantities/prices, it always re-reads current
 * price/stock from the DB at checkout time in POST /api/orders.
 */

const STORAGE_KEY = "bewine_cart_v1";

export interface CartLine {
  productId: string;
  quantity: number;
}

function readCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(lines: CartLine[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent("bewine:cart-updated", { detail: { lines } }));
}

export function getCart(): CartLine[] {
  return readCart();
}

export function addToCart(productId: string, quantity = 1): CartLine[] {
  const lines = readCart();
  const existing = lines.find((l) => l.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    lines.push({ productId, quantity });
  }
  writeCart(lines);
  return lines;
}

export function updateQuantity(productId: string, quantity: number): CartLine[] {
  let lines = readCart();
  if (quantity <= 0) {
    lines = lines.filter((l) => l.productId !== productId);
  } else {
    const existing = lines.find((l) => l.productId === productId);
    if (existing) existing.quantity = quantity;
  }
  writeCart(lines);
  return lines;
}

export function removeFromCart(productId: string): CartLine[] {
  return updateQuantity(productId, 0);
}

export function clearCart(): void {
  writeCart([]);
}

export function getCartCount(): number {
  return readCart().reduce((sum, l) => sum + l.quantity, 0);
}
