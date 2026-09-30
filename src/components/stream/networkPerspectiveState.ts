/**
 * Store-owned perspective state. A thin shell: flat charts never touch the
 * projection engine, and the engine (registered by network chart components
 * or loaded on first use) owns keying, projection and tweens.
 */
import type { NetworkHtmlMark } from "./networkCustomLayout"
import type {
  NetworkLabel,
  NetworkPipelineConfig,
  NetworkSceneEdge,
  NetworkSceneNode
} from "./networkTypes"
import type { NetworkPerspectiveFrame } from "./networkPerspective"
import type { NetworkPerspectiveScene } from "./networkPerspectiveScene"
import {
  getNetworkPerspectiveEngine,
  loadNetworkPerspectiveEngine
} from "./networkPerspectiveLoader"

export interface NetworkSceneParts {
  sceneNodes: NetworkSceneNode[]
  sceneEdges: NetworkSceneEdge[]
  labels: NetworkLabel[]
  htmlMarks?: NetworkHtmlMark[]
  bounds?: readonly import("./networkPerspective").NetworkPerspectiveBound[]
}

export class NetworkPerspectiveState {
  /** Frame used for the current scene; null when flat. */
  frame: NetworkPerspectiveFrame | null = null
  /** Ground chrome for the current scene (grid, plates, regions, guides). */
  underlay: NetworkSceneEdge[] = []
  /** Height edges ride above their surface (piece thickness), layout px. */
  edgeLift = 0
  /** Called when lazily loaded perspective code arrives so the host repaints. */
  onExtrasReady: (() => void) | null = null
  /** Projection changed since the last build, even if its tween has ended. */
  needsRebuild = false
  /** Engine-owned bookkeeping (applied key, resolved settings, tween). */
  internal: { tween?: unknown } | null = null
  /** Scene builds since reset; the first build never animates. */
  private builds = 0
  private warnedFlatDecorations = false

  /**
   * Dev-only: a custom layout returned `backgrounds`/`overlays` under an
   * active projection without saying how they follow it, so they stay in
   * flat plot coordinates and drift from the projected marks.
   */
  warnFlatDecorations(result: { backgrounds?: unknown; overlays?: unknown; perspective?: string }): void {
    if (process.env.NODE_ENV === "production" || this.warnedFlatDecorations || result.perspective) return
    const drawn = (n: unknown): boolean =>
      Array.isArray(n) ? n.some(drawn) : n != null && n !== false && n !== ""
    if (!drawn(result.backgrounds) && !drawn(result.overlays)) return
    this.warnedFlatDecorations = true
    console.warn(
      "[semiotic] customNetworkLayout returned backgrounds/overlays under `perspective`; they stay flat. " +
        'Return perspective: "ground", or place them with NetworkPerspectiveGround/Billboard and ' +
        'return perspective: "manual".'
    )
  }

  /** Accessible chart-type phrase, noting an active projection. */
  label(base: string): string {
    const type = this.frame?.type
    return type && type !== "flat" ? `${base} (${type} perspective)` : base
  }

  get transitioning(): boolean {
    return this.internal?.tween != null
  }

  /** Advance a tween; true while it needs another scene build. */
  advance(now: number, instant = false): boolean {
    const changed = this.internal?.tween != null
      ? getNetworkPerspectiveEngine()?.advance(this, now, instant) ?? false
      : false
    if (changed) this.needsRebuild = true
    return changed
  }

  /** Invalidate retained projected scenes before asking the host to repaint. */
  extrasReady(): void {
    this.needsRebuild = true
    this.onExtrasReady?.()
  }

  reset(): void {
    this.frame = null
    this.underlay = []
    this.edgeLift = 0
    this.internal = null
    this.builds = 0
    this.needsRebuild = false
  }

  /** Project one scene; null keeps the caller's flat arrays untouched. */
  project(
    config: NetworkPipelineConfig,
    size: [number, number],
    parts: NetworkSceneParts
  ): NetworkPerspectiveScene | null {
    this.needsRebuild = false
    const first = this.builds++ === 0
    const flat = !config.perspective || config.perspective === "flat"
    if (flat && !this.internal) return null
    const engine = getNetworkPerspectiveEngine()
    if (!engine) {
      loadNetworkPerspectiveEngine().then(() => this.extrasReady(), () => {})
      return null
    }
    return engine.project(this, config, size, parts, first)
  }
}
