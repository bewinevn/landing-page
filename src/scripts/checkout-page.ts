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

// Kept in sync with COD_FEE_VND in src/modules/orders/domain/order.service.ts —
// the server is the source of truth for what's actually charged, this is
// only used to preview the total before submitting.
const COD_FEE_VND = 5000;

let subtotalVnd = 0;

const DELIVERY_INFO_KEY = "bewine_delivery_info_v1";

interface SavedDeliveryInfo {
  fullName: string;
  phone: string;
  addressLine: string;
  note: string;
}

// Per-browser convenience only (no login/membership system): remembers the
// last delivery info so returning customers on the same device don't have
// to retype it. Never sent anywhere but this device's own checkout form.
function prefillDeliveryInfo(): void {
  const form = document.getElementById("checkout-form") as HTMLFormElement | null;
  if (!form) return;
  try {
    const raw = localStorage.getItem(DELIVERY_INFO_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<SavedDeliveryInfo>;
    if (saved.fullName) (form.elements.namedItem("fullName") as HTMLInputElement).value = saved.fullName;
    if (saved.phone) (form.elements.namedItem("phone") as HTMLInputElement).value = saved.phone;
    if (saved.addressLine) (form.elements.namedItem("addressLine") as HTMLInputElement).value = saved.addressLine;
    if (saved.note) (form.elements.namedItem("note") as HTMLTextAreaElement).value = saved.note;
  } catch {
    // corrupt/blocked storage — just skip prefill
  }
}

function saveDeliveryInfo(info: SavedDeliveryInfo): void {
  try {
    localStorage.setItem(DELIVERY_INFO_KEY, JSON.stringify(info));
  } catch {
    // private-browsing/blocked storage — prefill just won't work next time
  }
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
  const giftLabel = window.__BEWINE_I18N__?.gift ?? "gift";

  if (cart.length === 0) {
    window.location.href = "/cart";
    return;
  }

  const products = await fetchProducts();
  const byId = new Map(products.map((p) => [p.id, p]));

  linesEl.innerHTML = "";
  subtotalVnd = 0;
  for (const line of cart) {
    const product = byId.get(line.productId);
    if (!product) continue;
    const unitPrice = line.isGift ? 0 : (line.unitPriceOverrideVnd ?? product.effectivePriceVnd);
    const isFreeLine = line.isGift || unitPrice === 0;
    const lineTotal = unitPrice * line.quantity;
    subtotalVnd += lineTotal;
    const row = document.createElement("div");
    row.className = "flex justify-between text-sm";
    row.innerHTML = `
      <span class="text-[#666] capitalize">${product.name} &times; ${line.quantity}${isFreeLine ? ` <span class="text-xs text-[#A71E22]">(${giftLabel})</span>` : ""}</span>
      <span class="font-medium text-[#A71E22]">${formatVnd(lineTotal)}</span>
    `;
    linesEl.appendChild(row);
  }
  updateTotal();
}

function updateTotal(): void {
  const totalEl = document.getElementById("checkout-total")!;
  const codFeeRow = document.getElementById("checkout-cod-fee-row")!;
  const codFeeEl = document.getElementById("checkout-cod-fee")!;
  const isCod = document.querySelector<HTMLInputElement>('input[name="paymentMethod"]:checked')?.value === "cod";

  const codFee = isCod ? COD_FEE_VND : 0;
  // Tailwind's `flex` utility on this element would otherwise beat the
  // `hidden` attribute's `display: none` in the cascade, so toggle the
  // computed display directly instead of relying on `.hidden`.
  codFeeRow.style.display = isCod ? "flex" : "none";
  codFeeEl.textContent = formatVnd(codFee);
  totalEl.textContent = formatVnd(subtotalVnd + codFee);
}

function bindPaymentMethod(): void {
  const radios = document.querySelectorAll<HTMLInputElement>('input[name="paymentMethod"]');
  const codNote = document.getElementById("checkout-cod-note")!;
  function update() {
    const isCod = Array.from(radios).find((r) => r.checked)?.value === "cod";
    codNote.style.gridTemplateRows = isCod ? "1fr" : "0fr";
    updateTotal();
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
    const fullName = String(formData.get("fullName") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const addressLine = String(formData.get("addressLine") ?? "");
    const note = String(formData.get("note") ?? "");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            fullName,
            phone,
            addressLine,
            city: formData.get("city"),
            note: note || undefined,
          },
          items: cart.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            isGift: l.isGift ?? false,
            unitPriceOverrideVnd: l.unitPriceOverrideVnd,
          })),
          locale: window.__BEWINE_LOCALE__ ?? "vn",
          paymentMethod: formData.get("paymentMethod") || "vietqr",
        }),
      });

      if (!res.ok) {
        throw new Error("checkout_failed");
      }

      const data = await res.json();
      saveDeliveryInfo({ fullName, phone, addressLine, note });
      clearCart();
      window.location.href = `/orders/${data.orderReference}`;
    } catch {
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = i18n.submit;
    }
  });
}

prefillDeliveryInfo();
renderSummary();
bindPaymentMethod();
bindForm();
