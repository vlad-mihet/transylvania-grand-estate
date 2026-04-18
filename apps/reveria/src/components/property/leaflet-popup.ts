// Leaflet popups take a raw HTML string via `bindPopup()`. We don't use
// react-dom/server here because it would pull the renderer into the client
// bundle for two tiny templates; instead we assemble strings with a careful
// escape helper so nothing user-controlled lands in the DOM unsanitized.

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(input: string): string {
  return escapeHtml(input);
}

export interface PropertyPopupData {
  slug: string;
  priceLabel: string;
  typeLabel: string;
  heroImageSrc?: string | null;
  detailHref: string;
  detailLabel: string;
}

/**
 * Build the HTML for a price-marker popup.
 *
 * Colors are sourced from the Tailwind theme via `var(--primary)` rather than
 * a hardcoded hex so the Reveria purple can change in one place.
 */
export function renderPropertyPopup(data: PropertyPopupData): string {
  const hero = data.heroImageSrc
    ? `<div style="width:100%;height:120px;overflow:hidden;border-radius:8px 8px 0 0;">
        <img src="${escapeAttr(data.heroImageSrc)}" style="width:100%;height:100%;object-fit:cover;" alt="" />
       </div>`
    : "";

  return `<div style="width:220px;font-family:system-ui,sans-serif;">
    ${hero}
    <div style="padding:10px;">
      <div style="font-size:16px;font-weight:700;color:var(--foreground, #111827);">
        ${escapeHtml(data.priceLabel)}
      </div>
      <div style="font-size:11px;color:var(--primary, #7C3AED);font-weight:500;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">
        ${escapeHtml(data.typeLabel)}
      </div>
      <a href="${escapeAttr(data.detailHref)}"
         style="font-size:12px;color:var(--primary, #7C3AED);margin-top:8px;display:inline-block;text-decoration:none;">
        ${escapeHtml(data.detailLabel)}
      </a>
    </div>
  </div>`;
}

/**
 * HTML for the teardrop pin used on the single-property detail map.
 */
export function renderPropertyPin(): string {
  return `<div style="position:relative;width:36px;height:44px;transform:translate(-50%,-100%);">
    <div style="position:absolute;inset:0;background:var(--primary, #7C3AED);clip-path:path('M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z');"></div>
    <div style="position:absolute;left:50%;top:14px;transform:translateX(-50%);width:10px;height:10px;border-radius:50%;background:#fff;"></div>
  </div>`;
}

/**
 * Plain-text address popup for the detail map.
 */
export function renderAddressPopup(address: string): string {
  return `<strong>${escapeHtml(address)}</strong>`;
}
