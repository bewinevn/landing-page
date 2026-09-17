import { getCart, updateQuantity, removeFromCart, type CartLine } from "./cart-client";

declare global {
  interface Window {
    __BEWINE_LOCALE__?: "vn" | "en";
    __BEWINE_I18N__?: { remove: string };
  }
}

interface ApiProduct {
  id: string;
  name: string;
  effectivePriceVnd: number;
  imageUrl: string | null;
  availableQty: number;
}

function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} ₫`;
}

async function fetchProducts(): Promise<ApiProduct[]> {
  const locale = window.__BEWINE_LOCALE__ ?? "vn";
  const res = await fetch(`/api/products?locale=${locale}`);
  const data = await res.json();
  return data.products as ApiProduct[];
}

function renderLine(line: CartLine, product: ApiProduct | undefined): HTMLElement {
  const row = document.createElement("div");
  row.className = "flex items-center gap-4 p-4 rounded-lg bg-[#EFEDE9]";

  if (!product) {
    row.innerHTML = `<p class="text-sm text-[#666] m-0">Product unavailable</p>`;
    return row;
  }

  const removeLabel = window.__BEWINE_I18N__?.remove ?? "remove";

  row.innerHTML = `
    <img src="${product.imageUrl ?? ""}" alt="${product.name}" class="w-16 h-16 object-contain shrink-0" />
    <div class="flex-1 min-w-0">
      <p class="font-bold text-[#A71E22] m-0 capitalize truncate">${product.name}</p>
      <p class="text-sm text-[#666] m-0">${formatVnd(product.effectivePriceVnd)}</p>
    </div>
    <input type="number" min="1" max="${product.availableQty}" value="${line.quantity}"
      data-qty-input data-product-id="${product.id}"
      class="w-16 text-center border border-[#d1d5db] rounded py-1" />
    <p class="font-bold text-[#A71E22] w-24 text-right m-0">${formatVnd(product.effectivePriceVnd * line.quantity)}</p>
    <button type="button" data-remove-btn data-product-id="${product.id}"
      class="text-sm text-[#666] underline hover:text-[#A71E22]">${removeLabel}</button>
  `;
  return row;
}

async function render() {
  const linesContainer = document.getElementById("cart-lines")!;
  const emptyEl = document.getElementById("cart-empty")!;
  const summaryEl = document.getElementById("cart-summary")!;
  const subtotalEl = document.getElementById("cart-subtotal")!;

  const cart = getCart();
  if (cart.length === 0) {
    linesContainer.innerHTML = "";
    emptyEl.hidden = false;
    summaryEl.hidden = true;
    return;
  }

  const products = await fetchProducts();
  const byId = new Map(products.map((p) => [p.id, p]));

  linesContainer.innerHTML = "";
  let subtotal = 0;
  for (const line of cart) {
    const product = byId.get(line.productId);
    if (product) subtotal += product.effectivePriceVnd * line.quantity;
    linesContainer.appendChild(renderLine(line, product));
  }

  emptyEl.hidden = true;
  summaryEl.hidden = false;
  subtotalEl.textContent = formatVnd(subtotal);

  linesContainer.querySelectorAll<HTMLInputElement>("[data-qty-input]").forEach((input) => {
    input.addEventListener("change", () => {
      const productId = input.dataset.productId!;
      const qty = Math.max(1, Math.min(Number(input.value) || 1, Number(input.max) || 99));
      updateQuantity(productId, qty);
    });
  });

  linesContainer.querySelectorAll<HTMLButtonElement>("[data-remove-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromCart(btn.dataset.productId!);
    });
  });
}

render();
window.addEventListener("bewine:cart-updated", render);
