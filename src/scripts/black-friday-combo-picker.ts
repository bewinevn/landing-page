// Wires the Black Friday combo option into the /products configurator.
// The existing product-configurator.ts keeps handling single wines; this
// script only takes over while the combo is selected.
import { setCart, type CartLine } from "./cart-client";

interface ComboLine {
  productId: string;
  cans: number;
  unitPriceVnd: number;
}

function formatVnd(amount: number): string {
  return amount.toLocaleString("vi-VN");
}

function init() {
  const comboBtn = document.getElementById("bf-combo-option") as HTMLButtonElement | null;
  const comboQtySection = document.getElementById("bf-combo-qty-section");
  if (!comboBtn || !comboQtySection) return;
  // init() runs on first load and again on astro:page-load; wire up once.
  if (comboBtn.dataset.bfInit === "true") return;
  comboBtn.dataset.bfInit = "true";

  // Cached page after the campaign ended: drop the combo entirely.
  const promoEnd = comboBtn.dataset.promoEnd;
  if (promoEnd && Date.now() >= Date.parse(promoEnd)) {
    comboBtn.remove();
    comboQtySection.remove();
    return;
  }

  const wineOptions = document.querySelectorAll<HTMLButtonElement>("[data-wine-option]");
  const comboQtyOptions = document.querySelectorAll<HTMLButtonElement>("[data-bf-combo-qty]");
  const canQtySection = document.getElementById("can-qty-section");
  const imageEl = document.getElementById("configurator-image") as HTMLImageElement | null;
  const imageFrameEl = document.getElementById("configurator-image-frame");
  const imageTextureEl = document.getElementById("configurator-image-texture");
  const titleEl = document.getElementById("configurator-title");
  const unitPriceEl = document.getElementById("configurator-unit-price");
  const unitSuffixEl = document.getElementById("configurator-unit-suffix");
  const totalEl = document.getElementById("configurator-total");
  const checkoutBtn = document.getElementById("configurator-checkout") as HTMLButtonElement | null;
  if (!totalEl || !checkoutBtn) return;

  const unitPrice = parseInt(comboBtn.dataset.unitPrice ?? "0", 10);
  const maxCombos = parseInt(comboBtn.dataset.availableQty ?? "0", 10);
  const lines: ComboLine[] = JSON.parse(comboBtn.dataset.lines ?? "[]");

  let comboSelected = false;
  let selectedQty = 1;

  // Remember what the single-wine view looked like so it can be restored.
  const saved = {
    image: imageEl?.getAttribute("src") ?? "",
    title: titleEl?.textContent ?? "",
    unitPrice: unitPriceEl?.textContent ?? "",
    unitSuffix: unitSuffixEl?.textContent ?? "",
  };

  function render() {
    comboQtyOptions.forEach((btn) => {
      const qty = parseInt(btn.dataset.qty ?? "0", 10);
      btn.dataset.selected = qty === selectedQty ? "true" : "false";
      btn.disabled = qty > maxCombos;
    });
    totalEl!.textContent = `${formatVnd(unitPrice * selectedQty)} ₫`;
    checkoutBtn!.disabled = selectedQty < 1 || selectedQty > maxCombos;
  }

  function selectCombo() {
    if (comboBtn!.disabled) return;
    if (!comboSelected) {
      saved.image = imageEl?.getAttribute("src") ?? "";
      saved.title = titleEl?.textContent ?? "";
      saved.unitPrice = unitPriceEl?.textContent ?? "";
      saved.unitSuffix = unitSuffixEl?.textContent ?? "";
    }
    comboSelected = true;
    comboBtn!.dataset.selected = "true";
    wineOptions.forEach((o) => (o.dataset.selected = "false"));
    if (canQtySection) canQtySection.style.display = "none";
    comboQtySection!.hidden = false;
    if (imageEl) imageEl.src = comboBtn!.dataset.productImage ?? "";
    // The combo image is a banner, not a can photo: sit it flush in the frame.
    imageFrameEl?.classList.remove("p-6");
    imageTextureEl?.classList.add("invisible");
    if (titleEl) titleEl.textContent = comboBtn!.dataset.productName ?? "";
    if (unitPriceEl) unitPriceEl.textContent = formatVnd(unitPrice);
    if (unitSuffixEl) unitSuffixEl.textContent = comboBtn!.dataset.unitSuffix ?? "";
    render();
  }

  function leaveCombo() {
    if (!comboSelected) return;
    comboSelected = false;
    comboBtn!.dataset.selected = "false";
    if (canQtySection) canQtySection.style.display = "";
    comboQtySection!.hidden = true;
    imageFrameEl?.classList.add("p-6");
    imageTextureEl?.classList.remove("invisible");
  }

  comboBtn.addEventListener("click", selectCombo);

  // Picking a single wine hands control back to the existing configurator,
  // which re-renders image, title, price, quantity and total for that wine.
  wineOptions.forEach((btn) => {
    btn.addEventListener("click", leaveCombo, { capture: true });
  });

  comboQtyOptions.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      selectedQty = parseInt(btn.dataset.qty ?? "1", 10);
      render();
    });
  });

  // While the combo is selected, "buy now" puts the combo's cans in the cart
  // instead of a single wine.
  checkoutBtn.addEventListener(
    "click",
    (event) => {
      if (!comboSelected) return;
      event.stopImmediatePropagation();
      if (selectedQty < 1 || selectedQty > maxCombos || lines.length === 0) return;
      const cartLines: CartLine[] = lines.map((l) => ({
        productId: l.productId,
        quantity: l.cans * selectedQty,
        unitPriceOverrideVnd: l.unitPriceVnd,
      }));
      setCart(cartLines);
      window.location.href = "/checkout";
    },
    { capture: true },
  );

  // Homepage "đặt ngay" links here with ?combo=black-friday.
  // The single-wine configurator re-renders its total on astro:page-load;
  // put the combo total back if the combo is the selected option.
  document.addEventListener("astro:page-load", () => {
    if (comboSelected) setTimeout(render, 0);
  });

  // Deferred so it lands after the single-wine configurator's own first render.
  if (new URLSearchParams(window.location.search).get("combo") === "black-friday") {
    setTimeout(selectCombo, 0);
  }
}

init();
document.addEventListener("astro:page-load", init);
