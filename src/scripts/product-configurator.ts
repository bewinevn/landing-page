import { setCart } from "./cart-client";

function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} ₫`;
}

function init() {
  const options = document.querySelectorAll<HTMLButtonElement>("[data-product-option]");
  const qtyInput = document.getElementById("configurator-qty") as HTMLInputElement | null;
  const totalEl = document.getElementById("configurator-total");
  const checkoutBtn = document.getElementById("configurator-checkout") as HTMLButtonElement | null;
  if (!qtyInput || !checkoutBtn || !totalEl) return;

  let selected: HTMLButtonElement | null = null;

  function updateTotal() {
    if (!selected) {
      totalEl!.textContent = "";
      return;
    }
    const price = parseInt(selected.dataset.price ?? "0", 10);
    const qty = Math.max(1, parseInt(qtyInput!.value, 10) || 1);
    totalEl!.textContent = formatVnd(price * qty);
  }

  function selectProduct(btn: HTMLButtonElement) {
    selected = btn;
    options.forEach((o) => o.classList.toggle("border-[#A71E22]", o === btn));
    const maxQty = parseInt(btn.dataset.availableQty ?? "0", 10);
    qtyInput!.disabled = false;
    qtyInput!.max = String(maxQty > 0 ? maxQty : 999);
    qtyInput!.value = "1";
    checkoutBtn!.disabled = false;
    updateTotal();
  }

  options.forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener("click", () => selectProduct(btn));
  });

  qtyInput.addEventListener("input", updateTotal);

  checkoutBtn.addEventListener("click", () => {
    if (!selected) return;
    const productId = selected.dataset.productId!;
    const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
    setCart([{ productId, quantity: qty }]);
    window.location.href = "/checkout";
  });
}

init();
document.addEventListener("astro:page-load", init);
