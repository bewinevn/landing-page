declare global {
  interface Window {
    __BEWINE_ORDER_REFERENCE__?: string;
    __BEWINE_I18N__?: { paidTitle: string; paidDesc: string };
  }
}

const PAID_STATUSES = new Set(["paid", "processing", "shipped", "completed"]);
const POLL_INTERVAL_MS = 4000;

async function poll(): Promise<void> {
  const reference = window.__BEWINE_ORDER_REFERENCE__;
  const waitingBlock = document.getElementById("order-waiting-block");
  if (!reference || !waitingBlock || waitingBlock.hidden) return; // already showing paid state, nothing to do

  try {
    const res = await fetch(`/api/orders/${reference}/status`);
    if (!res.ok) return;
    const data = await res.json();

    if (PAID_STATUSES.has(data.orderStatus)) {
      const paidBlock = document.getElementById("order-paid-block")!;
      waitingBlock.hidden = true;
      paidBlock.hidden = false;
      return; // stop polling
    }
  } catch {
    // network hiccup — just try again next tick
  }

  setTimeout(poll, POLL_INTERVAL_MS);
}

setTimeout(poll, POLL_INTERVAL_MS);
