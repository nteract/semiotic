import type { OrdinalSceneContext } from "./types"

/** Preserve the scale's authored domain even for integer-like category names. */
export function orderedColumns(ctx: OrdinalSceneContext) {
  const rank = new Map(ctx.scales.o.domain().map((name, index) => [name, index]))
  return Object.values(ctx.columns).sort((a, b) =>
    (rank.get(a.name) ?? Infinity) - (rank.get(b.name) ?? Infinity)
  )
}
