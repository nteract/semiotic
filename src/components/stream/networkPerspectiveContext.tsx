"use client"
import * as React from "react"
import type { NetworkPerspective, NetworkPerspectiveFrame } from "./networkPerspective"
import { networkPerspectiveKey } from "./networkPerspectiveKey"

/** Identity projection for flat charts (kept local so flat bundles skip the engine). */
const FLAT: NetworkPerspectiveFrame = {
  type: "flat",
  matrix: [1, 0, 0, 1, 0, 0],
  lift: 0,
  scale: 1,
  bounds: null,
  project: (x, y) => [x, y],
  unproject: (x, y) => [x, y],
  depth: (_x, y) => y,
  groundTransform: "matrix(1 0 0 1 0 0)",
  billboardTransform: (x, y) => `translate(${x},${y})`
}

// One context per JS realm, created on first use. Lazy, because React's Server
// Component condition omits createContext and recipe layouts that import these
// helpers must stay importable from `semiotic/recipes/core`. Global, because
// CommonJS entries (`semiotic/network`, `semiotic/recipes`, `semiotic/server`)
// each bundle their own copy of this module and must still share the provider.
const CONTEXT_KEY = Symbol.for("semiotic.networkPerspectiveContext")

/** The fitted projection of the enclosing network chart (flat by default). */
function perspectiveContext(): React.Context<NetworkPerspectiveFrame> {
  const realm = globalThis as unknown as Record<symbol, React.Context<NetworkPerspectiveFrame> | undefined>
  return (realm[CONTEXT_KEY] ??= React.createContext<NetworkPerspectiveFrame>(FLAT))
}

/**
 * Read the active network projection inside custom-layout `overlays`,
 * `backgrounds`, or `foregroundGraphics`. Use `frame.project(x, y, z)` to
 * place upright content over a layout point, or `frame.groundTransform` to
 * lay SVG content on the projected ground. Returns an identity frame when the
 * chart is flat.
 */
export function useNetworkPerspective(): NetworkPerspectiveFrame {
  return React.useContext(perspectiveContext())
}

/** Repaint a frame when lazily loaded perspective extras arrive. */
export function useNetworkPerspectiveExtrasReady(
  store: { perspective: { onExtrasReady: (() => void) | null } } | null,
  repaint: () => void
): void {
  React.useEffect(() => {
    if (!store) return
    store.perspective.onExtrasReady = repaint
    return () => {
      store.perspective.onExtrasReady = null
    }
  }, [store, repaint])
}

/**
 * Keep a `perspective` prop's identity stable while its value (including
 * callback identities) is unchanged, so inline config objects do not
 * rebuild the scene on every parent render.
 */
export function useStableNetworkPerspective<T extends NetworkPerspective | undefined>(
  perspective: T
): T {
  const ref = React.useRef<{ key: string; value: T } | null>(null)
  const key = networkPerspectiveKey(perspective)
  if (!ref.current || ref.current.key !== key) ref.current = { key, value: perspective }
  return ref.current.value
}

/**
 * Wrap decoration content in the projection context (and, for `"ground"`,
 * the ground transform). Returns `content` untouched when flat or empty so
 * flat charts render exactly as before.
 */
export function withNetworkPerspective(
  content: React.ReactNode,
  frame: NetworkPerspectiveFrame | null | undefined,
  mode?: "ground" | "manual"
): React.ReactNode {
  if (!frame || content == null || content === false) return content
  return (
    <NetworkPerspectiveLayer frame={frame} mode={mode}>
      {content}
    </NetworkPerspectiveLayer>
  )
}

/**
 * Provide the projection to layout decorations and, for `"ground"` layers,
 * map them onto the projected ground plane.
 */
export function NetworkPerspectiveLayer({
  frame,
  mode,
  children
}: {
  frame: NetworkPerspectiveFrame | null | undefined
  mode?: "ground" | "manual"
  children: React.ReactNode
}): React.ReactElement {
  if (!frame) return <>{children}</>
  const Context = perspectiveContext()
  return (
    <Context.Provider value={frame}>
      {mode === "ground" ? <g transform={frame.groundTransform}>{children}</g> : children}
    </Context.Provider>
  )
}
