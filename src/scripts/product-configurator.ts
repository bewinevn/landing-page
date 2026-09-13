import { setCart } from "./cart-client";

function formatVnd(amount: number): string {
  return amount.toLocaleString("vi-VN");
}

function init() {
  const wineOptions = document.querySelectorAll<HTMLButtonElement>("[data-wine-option]");
  const packOptions = document.querySelectorAll<HTMLButtonElement>("[data-pack-option]");
  const imageEl = document.getElementById("configurator-image") as HTMLImageElement | null;
  const titleEl = document.getElementById("configurator-title");
  const unitPriceEl = document.getElementById("configurator-unit-price");
  const countEl = document.getElementById("configurator-count");
  const totalEl = document.getElementById("configurator-total");
  const decrementBtn = document.getElementById("configurator-decrement");
  const incrementBtn = document.getElementById("configurator-increment");
  const checkoutBtn = document.getElementById("configurator-checkout") as HTMLButtonElement | null;
  if (!countEl || !totalEl || !checkoutBtn) return;

  let selectedWine = Array.from(wineOptions).find((b) => b.dataset.selected === "true") ?? wineOptions[0];
  let packSize = parseInt(
    Array.from(packOptions).find((b) => b.dataset.selected === "true")?.dataset.packSize ?? "6",
    10
  );
  let count = 1;

  function currentUnitPrice(): number {
    return parseInt(selectedWine?.dataset.unitPrice ?? "0", 10);
  }

  function currentAvailableQty(): number {
    return parseInt(selectedWine?.dataset.availableQty ?? "0", 10);
  }

  function render() {
    const quantity = packSize * count;
    const total = currentUnitPrice() * quantity;
    countEl!.textContent = String(count);
    totalEl!.textContent = `${formatVnd(total)} ₫`;

    const exceedsStock = quantity > currentAvailableQty();
    checkoutBtn!.disabled = !selectedWine || exceedsStock;
    if (decrementBtn) (decrementBtn as HTMLButtonElement).disabled = count <= 1;
    if (incrementBtn) (incrementBtn as HTMLButtonElement).disabled = exceedsStock;
  }

  function selectWine(btn: HTMLButtonElement) {
    selectedWine = btn;
    wineOptions.forEach((o) => (o.dataset.selected = o === btn ? "true" : "false"));
    if (imageEl) imageEl.src = btn.dataset.productImage ?? "";
    if (titleEl) titleEl.textContent = btn.dataset.productName ?? "";
    if (unitPriceEl) unitPriceEl.textContent = formatVnd(currentUnitPrice());
    count = 1;
    render();
  }

  function selectPack(btn: HTMLButtonElement) {
    packSize = parseInt(btn.dataset.packSize ?? "6", 10);
    packOptions.forEach((o) => (o.dataset.selected = o === btn ? "true" : "false"));
    count = 1;
    render();
  }

  wineOptions.forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener("click", () => selectWine(btn));
  });

  packOptions.forEach((btn) => {
    btn.addEventListener("click", () => selectPack(btn));
  });

  decrementBtn?.addEventListener("click", () => {
    if (count > 1) count -= 1;
    render();
  });

  incrementBtn?.addEventListener("click", () => {
    if (packSize * (count + 1) <= currentAvailableQty()) count += 1;
    render();
  });

  checkoutBtn.addEventListener("click", () => {
    if (!selectedWine) return;
    setCart([{ productId: selectedWine.dataset.productId!, quantity: packSize * count }]);
    window.location.href = "/checkout";
  });

  render();
}

init();
document.addEventListener("astro:page-load", init);
