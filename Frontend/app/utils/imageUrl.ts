export function getFullImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const fallback = "https://omni-commerce-website.onrender.com";
  const rawBase = String(import.meta.env.VITE_API_BASE_URL ?? "").trim() || fallback;
  const base = rawBase.replace(/\/+$/, "").replace(/\/api$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}
