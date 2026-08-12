import type { ChartMode } from "../shared/types"

/** Physics fills its box; only compact ChartModes get non-zero chrome padding. */
export function physicsMarginForMode(
  compactMode: boolean,
  mode?: ChartMode
): { top: number; right: number; bottom: number; left: number } {
  if (!compactMode) return { top: 0, right: 0, bottom: 0, left: 0 }
  if (mode === "sparkline") return { top: 2, right: 2, bottom: 2, left: 2 }
  return { top: 8, right: 8, bottom: 8, left: 8 }
}
