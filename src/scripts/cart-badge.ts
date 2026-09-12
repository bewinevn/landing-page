import { getCartCount } from "./cart-client";

function render() {
  const badge = document.querySelector<HTMLElement>("[data-cart-count]");
  if (!badge) return;
  const count = getCartCount();
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

render();
window.addEventListener("bewine:cart-updated", render);
window.addEventListener("storage", render);
document.addEventListener("astro:page-load", render);
