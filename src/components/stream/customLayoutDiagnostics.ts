import type { ReactNode } from "react"

export interface CustomLayoutDiagnosticNode {
  datum?: unknown
}

export interface CustomLayoutDiagnosticsOptions {
  label: string
  nodes: readonly CustomLayoutDiagnosticNode[]
  overlays?: ReactNode
  warned: Set<string>
}

export function warnCustomLayoutDiagnostics(options: CustomLayoutDiagnosticsOptions): void {
  if (process.env.NODE_ENV === "production") return

  const { label, nodes, overlays, warned } = options
  if (hasRenderableOverlay(overlays) && nodes.length === 0) {
    warnOnce(
      warned,
      "overlay-only",
      `[semiotic] ${label} returned overlays but no data-bearing scene nodes. ` +
        "Overlays do not participate in hover, selection, transitions, SSR evidence, or accessibility tables. " +
        "Emit at least one scene node with a datum, or mark the overlay-only chart as intentionally decorative."
    )
  }

  if (nodes.length > 0 && nodes.every((node) => node.datum == null)) {
    warnOnce(
      warned,
      "null-datums",
      `[semiotic] ${label} returned scene nodes, but every scene-node datum is null. ` +
        "Hover, callbacks, selection, and tooltip helpers need data-bearing nodes. " +
        "Attach a user-facing datum to each interactive node, or set interactive overlays outside the chart."
    )
  }
}

function hasRenderableOverlay(overlays: ReactNode): boolean {
  if (overlays == null || overlays === false || overlays === "") return false
  if (Array.isArray(overlays)) return overlays.some(hasRenderableOverlay)
  return true
}

function warnOnce(warned: Set<string>, key: string, message: string): void {
  if (warned.has(key)) return
  warned.add(key)
  console.warn(message)
}
