import { clearCart, getCart } from "./cart-client";

declare global {
  interface Window {
    __BEWINE_LOCALE__?: "vn" | "en";
    __BEWINE_I18N__?: { submitting: string; submit: string; gift: string };
  }
}

interface ApiProduct {
  id: string;
  name: string;
  effectivePriceVnd: number;
  imageUrl: string | null;
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

async function renderSummary(): Promise<void> {
  const cart = getCart();
  const linesEl = document.getElementById("checkout-summary-lines")!;
  const totalEl = document.getElementById("checkout-total")!;
  const giftLabel = window.__BEWINE_I18N__?.gift ?? "gift";

  if (cart.length === 0) {
    window.location.href = "/cart";
    return;
  }

  const products = await fetchProducts();
  const byId = new Map(products.map((p) => [p.id, p]));

  linesEl.innerHTML = "";
  let total = 0;
  for (const line of cart) {
    const product = byId.get(line.productId);
    if (!product) continue;
    const lineTotal = line.isGift ? 0 : product.effectivePriceVnd * line.quantity;
    total += lineTotal;
    const row = document.createElement("div");
    row.className = "flex justify-between text-sm";
    row.innerHTML = `
      <span class="text-[#666] capitalize">${product.name} &times; ${line.quantity}${line.isGift ? ` <span class="text-xs text-[#A71E22]">(${giftLabel})</span>` : ""}</span>
      <span class="font-medium text-[#A71E22]">${formatVnd(lineTotal)}</span>
    `;
    linesEl.appendChild(row);
  }
  totalEl.textContent = formatVnd(total);
}

function bindCodNote(): void {
  const radios = document.querySelectorAll<HTMLInputElement>('input[name="paymentMethod"]');
  const codNote = document.getElementById("checkout-cod-note")!;
  function update() {
    const selected = Array.from(radios).find((r) => r.checked)?.value;
    codNote.hidden = selected !== "cod";
  }
  radios.forEach((r) => r.addEventListener("change", update));
  update();
}

function bindForm(): void {
  const form = document.getElementById("checkout-form") as HTMLFormElement;
  const submitBtn = document.getElementById("checkout-submit") as HTMLButtonElement;
  const errorEl = document.getElementById("checkout-error")!;
  const i18n = window.__BEWINE_I18N__ ?? { submitting: "...", submit: "Submit", gift: "gift" };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = i18n.submitting;

    const formData = new FormData(form);
    const cart = getCart();

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            fullName: formData.get("fullName"),
            phone: formData.get("phone"),
            addressLine: formData.get("addressLine"),
            city: formData.get("city"),
            note: formData.get("note") || undefined,
          },
          items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, isGift: l.isGift ?? false })),
          locale: window.__BEWINE_LOCALE__ ?? "vn",
          paymentMethod: formData.get("paymentMethod") || "vietqr",
        }),
      });

      if (!res.ok) {
        throw new Error("checkout_failed");
      }

      const data = await res.json();
      clearCart();
      window.location.href = `/orders/${data.orderReference}`;
    } catch {
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = i18n.submit;
    }
  });
}

renderSummary();
bindCodNote();
bindForm();
