import { setCart, type CartLine } from "./cart-client";

// Kept in sync with COMBO_PS_UNIT_VND / COMBO_SB_UNIT_VND / COMBO_ZL_UNIT_VND
// in src/pages/products/index.astro — these are what the server actually
// prices each line at via unitPriceOverrideVnd (see order.service.ts), this
// copy is only used to render the running total before submitting.
const PS_UNIT_OVERRIDE_VND = 50_000;
const SB_UNIT_OVERRIDE_VND = 45_000;
const ZL_UNIT_OVERRIDE_VND = 30_000;
const CANS_PER_WINE = 2;

function formatVnd(amount: number): string {
  return amount.toLocaleString("vi-VN");
}

function init() {
  const checkoutBtn = document.getElementById("combo-checkout") as HTMLButtonElement | null;
  const qtyValueEl = document.getElementById("combo-qty-value");
  const minusBtn = document.getElementById("combo-qty-minus") as HTMLButtonElement | null;
  const plusBtn = document.getElementById("combo-qty-plus") as HTMLButtonElement | null;
  const totalEl = document.getElementById("combo-total");
  // Absent when maxCombos is 0 server-side (sold out) — nothing to wire up.
  if (!checkoutBtn || !qtyValueEl || !minusBtn || !plusBtn || !totalEl) return;

  const psId = checkoutBtn.dataset.psId;
  const sbId = checkoutBtn.dataset.sbId;
  const zlId = checkoutBtn.dataset.zlId;
  const maxCombo = parseInt(checkoutBtn.dataset.maxCombo ?? "0", 10);
  const comboPrice = parseInt(checkoutBtn.dataset.comboPrice ?? "0", 10);

  let quantity = maxCombo > 0 ? 1 : 0;

  function render() {
    qtyValueEl!.textContent = String(quantity);
    totalEl!.textContent = `${formatVnd(comboPrice * quantity)} ₫`;
    minusBtn!.disabled = quantity <= 1;
    plusBtn!.disabled = quantity >= maxCombo;
    checkoutBtn!.disabled = !psId || !sbId || !zlId || quantity < 1 || quantity > maxCombo;
  }

  minusBtn.addEventListener("click", () => {
    if (quantity <= 1) return;
    quantity -= 1;
    render();
  });

  plusBtn.addEventListener("click", () => {
    if (quantity >= maxCombo) return;
    quantity += 1;
    render();
  });

  checkoutBtn.addEventListener("click", () => {
    if (!psId || !sbId || !zlId || quantity < 1 || quantity > maxCombo) return;

    const lines: CartLine[] = [
      { productId: psId, quantity: quantity * CANS_PER_WINE, unitPriceOverrideVnd: PS_UNIT_OVERRIDE_VND },
      { productId: sbId, quantity: quantity * CANS_PER_WINE, unitPriceOverrideVnd: SB_UNIT_OVERRIDE_VND },
      { productId: zlId, quantity: quantity * CANS_PER_WINE, unitPriceOverrideVnd: ZL_UNIT_OVERRIDE_VND },
    ];

    setCart(lines);
    window.location.href = "/checkout";
  });

  render();
}

init();
document.addEventListener("astro:page-load", init);
