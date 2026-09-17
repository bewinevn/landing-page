import { setCart } from "./cart-client";

function readQuantity(productId: string): number {
  const input = document.querySelector<HTMLInputElement>(
    `[data-qty-input][data-product-id="${productId}"]`
  );
  const value = input ? parseInt(input.value, 10) : 1;
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function bind() {
  document.querySelectorAll<HTMLButtonElement>("[data-buy-now]").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      const productId = btn.dataset.productId;
      if (!productId) return;
      setCart([{ productId, quantity: readQuantity(productId) }]);
      window.location.href = "/checkout";
    });
  });
}

bind();
document.addEventListener("astro:page-load", bind);
