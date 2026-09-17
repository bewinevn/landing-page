/** Formats a whole-VND integer as "100.000 ₫" (vn) or "100,000 VND" (en). */
export function formatVnd(amount: number, locale: "vn" | "en" = "vn"): string {
  if (locale === "vn") {
    return `${amount.toLocaleString("vi-VN")} ₫`;
  }
  return `${amount.toLocaleString("en-US")} VND`;
}
