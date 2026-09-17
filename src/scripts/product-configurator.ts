import { setCart, type CartLine } from "./cart-client";

interface BonusItem {
  slug: string;
  name: string;
  qty: number;
}

function formatVnd(amount: number): string {
  return amount.toLocaleString("vi-VN");
}

function init() {
  const wineOptions = document.querySelectorAll<HTMLButtonElement>("[data-wine-option]");
  const qtyOptions = document.querySelectorAll<HTMLButtonElement>("[data-qty-option]");
  const giftTags = document.querySelectorAll<HTMLElement>("[data-gift-tag]");
  const bonusGiftBox = document.getElementById("bonus-gift-box");
  const bonusGiftList = document.getElementById("bonus-gift-list");
  const imageEl = document.getElementById("configurator-image") as HTMLImageElement | null;
  const titleEl = document.getElementById("configurator-title");
  const unitPriceEl = document.getElementById("configurator-unit-price");
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

  function currentUnitPrice(): number {
    return parseInt(selectedWine?.dataset.unitPrice ?? "0", 10);
  }

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

  function render() {
    const total = currentUnitPrice() * selectedQty;
    totalEl!.textContent = `${formatVnd(total)} ₫`;

    qtyOptions.forEach((btn) => {
      const qty = parseInt(btn.dataset.qty ?? "0", 10);
      btn.dataset.selected = qty === selectedQty ? "true" : "false";
      btn.disabled = qty > currentAvailableQty();
    });
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

    checkoutBtn!.disabled = !selectedWine || selectedQty > currentAvailableQty();
  }

  function selectWine(btn: HTMLButtonElement) {
    selectedWine = btn;
    wineOptions.forEach((o) => (o.dataset.selected = o === btn ? "true" : "false"));
    if (imageEl) imageEl.src = btn.dataset.productImage ?? "";
    if (titleEl) titleEl.textContent = btn.dataset.productName ?? "";
    if (unitPriceEl) unitPriceEl.textContent = formatVnd(currentUnitPrice());
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
    const productId = selectedWine.dataset.productId!;

    const lines: CartLine[] = [
      { productId, quantity: selectedQty },
      { productId, quantity: selectedQty, isGift: true },
    ];

    for (const bonus of currentBonus()) {
      const bonusProductId = slugToProductId.get(bonus.slug);
      if (bonusProductId) lines.push({ productId: bonusProductId, quantity: bonus.qty, isGift: true });
    }

    setCart(lines);
    window.location.href = "/checkout";
  });

  render();
}

init();
document.addEventListener("astro:page-load", init);
