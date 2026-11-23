// Grid layout for the Bills tab: how many images fit on each A4 page.
// Shared by the web page and the mobile app so both produce the same pages.

export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function billLayout<T>(items: T[], perPage: number, cols: number) {
  const n = clamp(perPage || 1, 1, 64);
  const c = clamp(cols >= 1 ? cols : Math.ceil(Math.sqrt(n)), 1, 12);
  const rows = Math.ceil(n / c);
  const pages = Array.from({ length: Math.ceil(items.length / n) }, (_, p) => items.slice(p * n, (p + 1) * n));
  return { n, c, rows, pages };
}
