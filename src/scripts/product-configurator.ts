import { setCart, type CartLine } from "./cart-client";

// Kept in sync with COMBO_PS_UNIT_VND / COMBO_SB_UNIT_VND / COMBO_ZL_UNIT_VND
// in src/pages/products/index.astro — what the server actually prices each
// combo line at via unitPriceOverrideVnd (see order.service.ts).
const COMBO_PS_UNIT_VND = 50_000;
const COMBO_SB_UNIT_VND = 45_000;
const COMBO_ZL_UNIT_VND = 30_000;
const CANS_PER_WINE_PER_COMBO = 2;

// object-top anchors the crop to the top of the image (where the be-wine
// logo and banner are) instead of the default center, which would cut
// into it to fit the box's height.
const COMBO_IMAGE_CLASSES = ["w-full", "h-full", "object-cover", "object-top"];
const NORMAL_IMAGE_CLASSES = ["max-h-full", "w-auto", "object-contain"];

function formatVnd(amount: number): string {
  return amount.toLocaleString("vi-VN");
}

function init() {
  const wineOptions = document.querySelectorAll<HTMLButtonElement>("[data-wine-option]");
  const qtyOptions = document.querySelectorAll<HTMLButtonElement>("[data-qty-option]");
  const giftTags = document.querySelectorAll<HTMLElement>("[data-gift-tag]");
  const canQtySection = document.getElementById("can-qty-section");
  const comboQtySection = document.getElementById("combo-qty-section");
  const imageEl = document.getElementById("configurator-image") as HTMLImageElement | null;
  const titleEl = document.getElementById("configurator-title");
  const unitPriceEl = document.getElementById("configurator-unit-price");
  const unitSuffixEl = document.getElementById("configurator-unit-suffix");
  const totalEl = document.getElementById("configurator-total");
  const checkoutBtn = document.getElementById("configurator-checkout") as HTMLButtonElement | null;
  if (!totalEl || !checkoutBtn) return;

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

  // A can tier of qty N needs 2N cans in stock (N bought + N gifted, same
  // wine); a combo tier of qty N just needs N (currentAvailableQty()
  // already reflects max combos, not cans).
  function neededQtyFor(qty: number): number {
    return isCombo() ? qty : qty * 2;
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
      btn.disabled = neededQtyFor(qty) > currentAvailableQty();
    });

    if (!combo) {
      giftTags.forEach((tag) => {
        const qty = parseInt(tag.dataset.qty ?? "0", 10);
        tag.dataset.selected = qty === selectedQty ? "true" : "false";
      });
    }

    checkoutBtn!.disabled = !selectedWine || selectedQty < 1 || neededQtyFor(selectedQty) > currentAvailableQty();
  }

  function selectWine(btn: HTMLButtonElement) {
    selectedWine = btn;
    wineOptions.forEach((o) => (o.dataset.selected = o === btn ? "true" : "false"));
    if (imageEl) {
      imageEl.src = btn.dataset.productImage ?? "";
      const addClasses = btn.dataset.combo === "true" ? COMBO_IMAGE_CLASSES : NORMAL_IMAGE_CLASSES;
      const removeClasses = btn.dataset.combo === "true" ? NORMAL_IMAGE_CLASSES : COMBO_IMAGE_CLASSES;
      imageEl.classList.remove(...removeClasses);
      imageEl.classList.add(...addClasses);
    }
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
    // Mua N tặng N (same wine) — priced at 0đ via unitPriceOverrideVnd,
    // which still reserves real stock, unlike isGift.
    const lines: CartLine[] = [
      { productId, quantity: selectedQty },
      { productId, quantity: selectedQty, unitPriceOverrideVnd: 0 },
    ];

    setCart(lines);
    window.location.href = "/checkout";
  });

  render();
}

init();
document.addEventListener("astro:page-load", init);
