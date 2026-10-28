import type { OrdinalSceneContext } from "./types"

/** Preserve the scale's authored domain even for integer-like category names. */
export function orderedColumns(ctx: OrdinalSceneContext) {
  return ctx.orderedColumns ?? Object.values(ctx.columns)
}
