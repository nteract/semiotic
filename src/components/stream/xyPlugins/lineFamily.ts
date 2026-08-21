import { registerXYPlugin } from "./registry"
import { lineXYPlugin } from "./linePlugin"
import { areaXYPlugin } from "./areaPlugin"
import { mixedXYPlugin } from "./mixedPlugin"

/**
 * LineChart can switch chartType between line / area / mixed via `fillArea`.
 * Register the three together so that prop still paints.
 */
export function registerLineFamilyXYPlugins(): void {
  registerXYPlugin(lineXYPlugin)
  registerXYPlugin(areaXYPlugin)
  registerXYPlugin(mixedXYPlugin)
}
