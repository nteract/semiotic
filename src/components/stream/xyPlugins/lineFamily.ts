import { ensureXYPlugin } from "./registry"
import { lineXYPlugin } from "./linePlugin"
import { areaXYPlugin } from "./areaPlugin"
import { mixedXYPlugin } from "./mixedPlugin"

/**
 * LineChart can switch chartType between line / area / mixed via `fillArea`.
 * Fill missing browser plugins together so that prop still paints, preserving
 * any explicit registrations made by the embedding app.
 */
export function ensureLineFamilyXYPlugins(): void {
  ensureXYPlugin(lineXYPlugin)
  ensureXYPlugin(areaXYPlugin)
  ensureXYPlugin(mixedXYPlugin)
}
