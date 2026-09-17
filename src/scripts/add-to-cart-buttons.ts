import { addToCart } from "./cart-client";

function readQuantity(productId: string): number {
  const input = document.querySelector<HTMLInputElement>(
    `[data-qty-input][data-product-id="${productId}"]`
  );
  const value = input ? parseInt(input.value, 10) : 1;
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function bind() {
  document.querySelectorAll<HTMLButtonElement>("[data-add-to-cart]").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      const productId = btn.dataset.productId;
      if (!productId) return;
      addToCart(productId, readQuantity(productId));
      const original = btn.textContent;
      btn.textContent = "✓";
      setTimeout(() => {
        btn.textContent = original;
      }, 900);
    });
  });
}

bind();
document.addEventListener("astro:page-load", bind); // re-bind after Astro view transitions, if any
