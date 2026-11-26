/**
 * Fetches a Google Fonts stylesheet once per server instance and caches it,
 * so the CSS can be inlined into every page without a round trip to Google on
 * each render (the previous optimizer re-fetched it twice per request).
 *
 * Requested with a modern browser User-Agent so Google returns only WOFF2
 * files split by unicode-range (Latin / Latin-ext / Vietnamese): browsers
 * download just the subsets a page actually uses.
 */
const MODERN_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const cache = new Map<string, Promise<string | null>>();

export function getGoogleFontsCss(url: string): Promise<string | null> {
  let pending = cache.get(url);
  if (!pending) {
    pending = fetch(url, { headers: { "User-Agent": MODERN_UA }, signal: AbortSignal.timeout(3000) })
      .then((res) => (res.ok ? res.text() : null))
      .then((css) => (css ? css.replace(/\/\*[^*]*\*\//g, "").replace(/\s+/g, " ").trim() : null))
      .catch(() => null)
      .then((css) => {
        // Don't keep failures around: retry on the next render.
        if (!css) cache.delete(url);
        return css;
      });
    cache.set(url, pending);
  }
  return pending;
}
