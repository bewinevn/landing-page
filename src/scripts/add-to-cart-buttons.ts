import { addToCart } from "./cart-client";

function bind() {
  document.querySelectorAll<HTMLButtonElement>("[data-add-to-cart]").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      const productId = btn.dataset.productId;
      if (!productId) return;
      addToCart(productId, 1);
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
