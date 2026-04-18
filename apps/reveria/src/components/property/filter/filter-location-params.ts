import type { LocationSelection } from "../location-picker";

/**
 * Apply the first `LocationSelection` to a URLSearchParams bag, mirroring the
 * behavior the filter-bar and filter-panel both need. Address selections flip
 * the view into map mode with a radius; slug selections set the scoped param
 * (`city` or `county`). Pre-existing geo params are cleared first so a new
 * selection can't leave stale values behind.
 */
export function applyLocationToParams(
  params: URLSearchParams,
  selections: LocationSelection[],
  opts: { defaultRadius?: string; defaultZoom?: string } = {},
) {
  params.delete("city");
  params.delete("county");
  params.delete("lat");
  params.delete("lng");
  params.delete("zoom");

  if (selections.length === 0) return;
  const sel = selections[0];

  if (sel.type === "address" && sel.lat && sel.lng) {
    params.set("lat", sel.lat.toString());
    params.set("lng", sel.lng.toString());
    params.set("radius", opts.defaultRadius ?? "10");
    params.set("zoom", opts.defaultZoom ?? "14");
    params.set("view", "map");
  } else if (sel.param && sel.slug) {
    params.set(sel.param, sel.slug);
  }
}
