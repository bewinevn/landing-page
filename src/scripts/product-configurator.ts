import { setCart, type CartLine } from "./cart-client";

interface BonusItem {
  slug: string;
  name: string;
  qty: number;
}

// Kept in sync with COMBO_PS_UNIT_VND / COMBO_SB_UNIT_VND / COMBO_ZL_UNIT_VND
// in src/pages/products/index.astro — what the server actually prices each
// combo line at via unitPriceOverrideVnd (see order.service.ts).
const COMBO_PS_UNIT_VND = 50_000;
const COMBO_SB_UNIT_VND = 45_000;
const COMBO_ZL_UNIT_VND = 30_000;
const CANS_PER_WINE_PER_COMBO = 2;

function formatVnd(amount: number): string {
  return amount.toLocaleString("vi-VN");
}

function init() {
  const wineOptions = document.querySelectorAll<HTMLButtonElement>("[data-wine-option]");
  const qtyOptions = document.querySelectorAll<HTMLButtonElement>("[data-qty-option]");
  const giftTags = document.querySelectorAll<HTMLElement>("[data-gift-tag]");
  const bonusGiftBox = document.getElementById("bonus-gift-box");
  const bonusGiftList = document.getElementById("bonus-gift-list");
  const canQtySection = document.getElementById("can-qty-section");
  const comboQtySection = document.getElementById("combo-qty-section");
  const imageEl = document.getElementById("configurator-image") as HTMLImageElement | null;
  const titleEl = document.getElementById("configurator-title");
  const unitPriceEl = document.getElementById("configurator-unit-price");
  const unitSuffixEl = document.getElementById("configurator-unit-suffix");
  const totalEl = document.getElementById("configurator-total");
  const checkoutBtn = document.getElementById("configurator-checkout") as HTMLButtonElement | null;
  if (!totalEl || !checkoutBtn) return;

  // Bonus-wine product ids are looked up by slug so gifts work regardless
  // of which wine is currently selected as the paid item.
  const slugToProductId = new Map<string, string>();
  wineOptions.forEach((btn) => {
    if (btn.dataset.productSlug) slugToProductId.set(btn.dataset.productSlug, btn.dataset.productId!);
  });

  let selectedWine = Array.from(wineOptions).find((b) => b.dataset.selected === "true") ?? wineOptions[0];
  let selectedQty = parseInt(
    Array.from(qtyOptions).find((b) => b.dataset.selected === "true")?.dataset.qty ?? "3",
    10
  );

  function isCombo(): boolean {
    return selectedWine?.dataset.combo === "true";
  }

  function currentUnitPrice(): number {
    return parseInt(selectedWine?.dataset.unitPrice ?? "0", 10);
  }

  // For a real wine this is its can stock; for the combo option the same
  // attribute instead carries the max number of combos current stock can
  // cover — letting the rest of this file treat both uniformly.
  function currentAvailableQty(): number {
    return parseInt(selectedWine?.dataset.availableQty ?? "0", 10);
  }

  function currentBonus(): BonusItem[] {
    const btn = Array.from(qtyOptions).find((b) => parseInt(b.dataset.qty ?? "0", 10) === selectedQty);
    try {
      return JSON.parse(btn?.dataset.bonus ?? "[]");
    } catch {
      return [];
    }
  }

  function currentBonusFeasible(): boolean {
    const btn = Array.from(qtyOptions).find((b) => parseInt(b.dataset.qty ?? "0", 10) === selectedQty);
    return btn?.dataset.bonusFeasible !== "false";
  }

  function render() {
    const combo = isCombo();
    if (canQtySection) canQtySection.hidden = combo;
    if (comboQtySection) comboQtySection.hidden = !combo;

    const total = currentUnitPrice() * selectedQty;
    totalEl!.textContent = `${formatVnd(total)} ₫`;

    qtyOptions.forEach((btn) => {
      const qty = parseInt(btn.dataset.qty ?? "0", 10);
      btn.dataset.selected = qty === selectedQty ? "true" : "false";
      btn.disabled = qty > currentAvailableQty() || btn.dataset.bonusFeasible === "false";
    });

    if (!combo) {
      giftTags.forEach((tag) => {
        const qty = parseInt(tag.dataset.qty ?? "0", 10);
        tag.dataset.selected = qty === selectedQty ? "true" : "false";
      });

      const bonus = currentBonus();
      if (bonusGiftBox && bonusGiftList) {
        const canUnit = bonusGiftBox.dataset.canUnit ?? "";
        bonusGiftBox.hidden = bonus.length === 0;
        bonusGiftList.innerHTML = bonus.map((b) => `<li>${b.qty} ${canUnit} ${b.name}</li>`).join("");
      }
    } else if (bonusGiftBox) {
      bonusGiftBox.hidden = true;
    }

    checkoutBtn!.disabled = !selectedWine || selectedQty < 1 || selectedQty > currentAvailableQty();
  }

  function selectWine(btn: HTMLButtonElement) {
    selectedWine = btn;
    wineOptions.forEach((o) => (o.dataset.selected = o === btn ? "true" : "false"));
    if (imageEl) imageEl.src = btn.dataset.productImage ?? "";
    if (titleEl) titleEl.textContent = btn.dataset.productName ?? "";
    if (unitPriceEl) unitPriceEl.textContent = formatVnd(currentUnitPrice());
    if (unitSuffixEl) unitSuffixEl.textContent = btn.dataset.unitSuffix ?? "";
    // Reset to each mode's default quantity — a stale can-tier quantity
    // (e.g. 24) would otherwise carry over as an invalid combo count.
    selectedQty = btn.dataset.combo === "true" ? 1 : 3;
    render();
  }

  function selectQty(btn: HTMLButtonElement) {
    if (btn.disabled) return;
    selectedQty = parseInt(btn.dataset.qty ?? "3", 10);
    render();
  }

  wineOptions.forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener("click", () => selectWine(btn));
  });

  qtyOptions.forEach((btn) => {
    btn.addEventListener("click", () => selectQty(btn));
  });

  checkoutBtn.addEventListener("click", () => {
    if (!selectedWine) return;

    if (isCombo()) {
      const psId = selectedWine.dataset.comboPsId;
      const sbId = selectedWine.dataset.comboSbId;
      const zlId = selectedWine.dataset.comboZlId;
      if (!psId || !sbId || !zlId || selectedQty < 1) return;

      const lines: CartLine[] = [
        { productId: psId, quantity: selectedQty * CANS_PER_WINE_PER_COMBO, unitPriceOverrideVnd: COMBO_PS_UNIT_VND },
        { productId: sbId, quantity: selectedQty * CANS_PER_WINE_PER_COMBO, unitPriceOverrideVnd: COMBO_SB_UNIT_VND },
        { productId: zlId, quantity: selectedQty * CANS_PER_WINE_PER_COMBO, unitPriceOverrideVnd: COMBO_ZL_UNIT_VND },
      ];
      setCart(lines);
      window.location.href = "/checkout";
      return;
    }

    const productId = selectedWine.dataset.productId!;
    const lines: CartLine[] = [{ productId, quantity: selectedQty }];

    // The gift is Sauvignon Blanc + Zinfandel (not more of the wine being
    // bought) — priced at 0đ via unitPriceOverrideVnd, which still reserves
    // real stock, unlike isGift (these draw down actual SB/ZL inventory).
    for (const bonus of currentBonus()) {
      const bonusProductId = slugToProductId.get(bonus.slug);
      if (bonusProductId && bonus.qty > 0) {
        lines.push({ productId: bonusProductId, quantity: bonus.qty, unitPriceOverrideVnd: 0 });
      }
    }

    setCart(lines);
    window.location.href = "/checkout";
  });

  render();
}

init();
document.addEventListener("astro:page-load", init);
