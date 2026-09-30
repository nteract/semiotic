/**
 * The perspective engine's store-facing runtime: detects prop changes,
 * resolves settings, runs the optional tween between perspectives (including
 * flat), and projects each built scene. Registered by network chart
 * components via {@link registerNetworkPerspective}.
 */
import type { NetworkPipelineConfig } from "./networkTypes"
import {
  blendNetworkPerspectiveFrames,
  FLAT_NETWORK_PERSPECTIVE_FRAME,
  resolveNetworkPerspective,
  type NetworkPerspectiveFrame,
  type ResolvedNetworkPerspective
} from "./networkPerspective"
import { networkPerspectiveKey } from "./networkPerspectiveKey"
import {
  prepareNetworkPerspectiveScene,
  type NetworkPerspectiveScene
} from "./networkPerspectiveScene"
import {
  getNetworkPerspectiveExtras,
  preloadNetworkPerspectiveExtras,
  provideNetworkPerspectiveEngine,
  wantsNetworkPerspectiveExtras
} from "./networkPerspectiveLoader"
import type { NetworkPerspectiveState, NetworkSceneParts } from "./networkPerspectiveState"

interface Tween {
  from: NetworkPerspectiveFrame
  /** Modes/chrome come from here while tweening toward flat. */
  modes: ResolvedNetworkPerspective
  toFlat: boolean
  start: number | null
  duration: number
  progress: number
}

interface Internal {
  key: string
  resolved: ResolvedNetworkPerspective | null
  tween?: Tween | null
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function transitionDuration(resolved: ResolvedNetworkPerspective | null): number {
  const transition = resolved?.config.transition
  if (!transition) return 0
  const duration = typeof transition === "object" ? transition.duration : undefined
  return typeof duration === "number" && Number.isFinite(duration) ? Math.max(0, duration) : 600
}

function advance(state: NetworkPerspectiveState, now: number, instant: boolean): boolean {
  const internal = state.internal as Internal | null
  const tween = internal?.tween
  if (!internal || !tween) return false
  if (instant) {
    internal.tween = null
    return true
  }
  if (tween.start == null) tween.start = now
  const t = tween.duration > 0 ? Math.min(1, (now - tween.start) / tween.duration) : 1
  tween.progress = easeInOutCubic(t)
  if (t >= 1) internal.tween = null
  return true
}

function project(
  state: NetworkPerspectiveState,
  config: NetworkPipelineConfig,
  size: [number, number],
  parts: NetworkSceneParts,
  first: boolean
): NetworkPerspectiveScene | null {
  const previous = state.internal as Internal | null
  const key = networkPerspectiveKey(config.perspective)
  let internal = previous
  if (!previous || previous.key !== key) {
    const next = resolveNetworkPerspective(config.perspective)
    // Tweens are opt-in on either end; the first build never animates.
    const duration = first ? 0 : transitionDuration(next) || transitionDuration(previous?.resolved ?? null)
    const tween: Tween | null =
      duration > 0 && (next || previous?.resolved)
        ? {
            from: state.frame ?? FLAT_NETWORK_PERSPECTIVE_FRAME,
            modes: (next ?? previous!.resolved)!,
            toFlat: !next,
            start: null,
            duration,
            progress: 0
          }
        : null
    internal = { key, resolved: next, tween }
    state.internal = internal
  }
  const tween = internal!.tween
  const modes = tween ? tween.modes : internal!.resolved
  if (!modes) {
    state.frame = null
    state.underlay = []
    state.edgeLift = 0
    state.projectParticle = undefined
    // Nothing left to animate: flat charts skip the engine from now on.
    state.internal = null
    return null
  }
  if (wantsNetworkPerspectiveExtras(modes.config) && !getNetworkPerspectiveExtras()) {
    preloadNetworkPerspectiveExtras().then(() => state.extrasReady(), () => {})
  }
  const prepared = prepareNetworkPerspectiveScene({
    ...parts,
    size,
    perspective: modes,
    chartType: config.chartType,
    theme: config.themeSemantic
  })
  const target = tween?.toFlat ? FLAT_NETWORK_PERSPECTIVE_FRAME : prepared.frame
  const frame = tween ? blendNetworkPerspectiveFrames(tween.from, target, tween.progress) : target
  const scene = prepared.emit(frame)
  state.frame = scene.frame
  state.underlay = scene.underlay
  state.edgeLift = scene.edgeLift
  state.projectParticle = scene.projectParticle
  return scene
}

const engine = { project, advance }

/**
 * Install the projection engine synchronously. Network chart components call
 * this at module load (like layout plugin registration) so `perspective`
 * renders on first paint and during SSR.
 */
export function registerNetworkPerspective(): void {
  provideNetworkPerspectiveEngine(engine)
}

export default engine
