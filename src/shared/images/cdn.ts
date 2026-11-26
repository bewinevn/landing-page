/**
 * Serve a same-site image (e.g. product photos stored as /images/products/*.png)
 * through Netlify Image CDN, resized to `height` px and converted to a modern
 * format (AVIF/WebP, negotiated per browser). Visually identical, far fewer bytes.
 *
 * Only applies in production builds (Netlify); in `astro dev` and for
 * absolute/remote URLs the original URL is returned unchanged.
 */
export function cdnImage(url: string | null | undefined, height: number): string {
  if (!url) return "";
  if (!import.meta.env.PROD || !url.startsWith("/") || url.startsWith("//")) return url;
  return `/.netlify/images?url=${encodeURIComponent(url)}&h=${height}`;
}
