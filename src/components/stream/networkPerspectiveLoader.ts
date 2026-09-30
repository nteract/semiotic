/**
 * Where the perspective code comes from.
 *
 * - The **engine** (scene projection) is installed synchronously by every
 *   network chart component and by static rendering, so `perspective` works
 *   on first paint and in SSR. Bundles that only use `StreamNetworkFrame`
 *   (for example realtime charts) load it lazily on first use.
 * - The **extras** (ground grid/plate, regions, orthogonal routing,
 *   extrusion) load on demand the first time a chart asks for them; static
 *   rendering installs them eagerly.
 */
import type { NetworkPerspectiveConfig } from "./networkPerspective"
import type { NetworkPerspectiveExtras } from "./networkPerspectiveScene"

export type NetworkPerspectiveEngine = typeof import("./networkPerspectiveRuntime").default

let engine: NetworkPerspectiveEngine | null = null
let extras: NetworkPerspectiveExtras | null = null
let engineLoading: Promise<void> | null = null
let extrasLoading: Promise<void> | null = null

export function provideNetworkPerspectiveEngine(value: NetworkPerspectiveEngine): void {
  engine = value
}

export function getNetworkPerspectiveEngine(): NetworkPerspectiveEngine | null {
  return engine
}

export function loadNetworkPerspectiveEngine(): Promise<void> {
  if (engine) return Promise.resolve()
  engineLoading ??= import("./networkPerspectiveRuntime")
    .then((mod) => {
      engine = mod.default
    })
    .catch((error) => {
      engineLoading = null
      throw error
    })
  return engineLoading
}

/** Install the extras synchronously (SSR, static SVG, tests). */
export function provideNetworkPerspectiveExtras(value: NetworkPerspectiveExtras): void {
  extras = value
}

export function getNetworkPerspectiveExtras(): NetworkPerspectiveExtras | null {
  return extras
}

/** Whether a config uses a feature implemented by the extras. */
export function wantsNetworkPerspectiveExtras(config: NetworkPerspectiveConfig): boolean {
  const route = config.edges?.route
  return Boolean(
    config.ground?.grid ||
      config.ground?.plate ||
      config.regions?.length ||
      (route && route !== "layout") ||
      config.marks === "extrude" ||
      typeof config.marks === "function"
  )
}

/**
 * Load the perspective extras chunk. Charts do this automatically; await it
 * before hydrating server-rendered charts that use grids, regions, routing
 * or extrusion so the first client render matches the server markup.
 */
export function preloadNetworkPerspectiveExtras(): Promise<void> {
  if (extras) return Promise.resolve()
  extrasLoading ??= import("./networkPerspectiveExtras")
    .then((mod) => {
      extras = mod.networkPerspectiveExtras
    })
    .catch((error) => {
      extrasLoading = null
      throw error
    })
  return extrasLoading
}
