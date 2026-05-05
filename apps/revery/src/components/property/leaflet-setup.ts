import L from "leaflet";

let applied = false;

/**
 * Applies Leaflet's default marker icon fix so bundlers that strip asset URLs
 * don't leave the library unable to render the fallback icon. Idempotent —
 * callers can invoke it freely at module scope from any map component.
 */
export function setupLeafletDefaults() {
  if (applied) return;
  applied = true;
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
    ._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}
