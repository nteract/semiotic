/**
 * Canvas paint tick for StreamNetworkFrame.
 * Extracted so the React component stays focused on wiring/state.
 */
import { getDevicePixelRatio, prepareCanvas } from "./canvasSetup"
import { paintCanvasBackground } from "./canvasBackground"
import { needsDataCanvasPaint } from "./paintNeeds"
import { networkEdgeRenderer } from "./renderers/networkEdgeRenderer"
import { networkRectRenderer } from "./renderers/networkRectRenderer"
import { networkCircleRenderer } from "./renderers/networkCircleRenderer"
import { networkArcRenderer } from "./renderers/networkArcRenderer"
import { networkSymbolRenderer } from "./renderers/symbolCanvasRenderer"
import { networkGlyphRenderer } from "./renderers/glyphCanvasRenderer"
import {
  renderNetworkParticles,
  spawnNetworkParticles
} from "./renderers/networkParticleRenderer"
import { computeNetworkAriaLabel } from "./AccessibleDataTable"
import type { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { SceneRevisionDiagnostics } from "./sceneRevisionDiagnostics"
import type {
  NetworkPipelineConfig,
  ParticleStyle,
  RealtimeEdge,
  NetworkSceneNode,
  NetworkSceneEdge
} from "./networkTypes"
import type { MarginType } from "../types/marginType"
import type { DecayConfig, PulseConfig, StalenessConfig, SceneRenderMode } from "./types"
import { paintSceneWithBackend } from "./renderBackend"

export interface NetworkFramePaintContext {
  canvas: HTMLCanvasElement
  store: NetworkPipelineStore
  sceneRevisionDiagnostics?: SceneRevisionDiagnostics
  size: [number, number]
  margin: MarginType
  adjustedWidth: number
  adjustedHeight: number
  background?: string
  /** Theme surface fallback used when `background` is unset. */
  themeBackground?: string
  maxDevicePixelRatio?: number
  renderMode?: SceneRenderMode<NetworkSceneNode | NetworkSceneEdge>
  /** Skip opaque canvas fill when an SVG backgroundGraphics layer is present. */
  hasBackgroundGraphics?: boolean
  dirtyRef: { current: boolean }
  /**
   * Browser zoom / maxDevicePixelRatio — re-rasterize only, do not rebuild
   * the network scene. Cleared by this paint function after consumption.
   */
  resolutionDirtyRef?: { current: boolean }
  lastFrameTimeRef: { current: number }
  /** FrameRuntime logical timestamp for this paint. */
  now: number
  /** FrameRuntime random source for particle placement/spawn sampling. */
  random: () => number
  reducedMotion: boolean
  showParticles: boolean
  isContinuous: boolean
  /** Truthy animate (boolean or config object) enables topology-diff pulses. */
  animate: unknown
  decay?: DecayConfig
  pulse?: PulseConfig
  thresholds?: NetworkPipelineConfig["thresholds"]
  staleness?: StalenessConfig
  particleStyle: ParticleStyle
  getParticleColor: (edge: RealtimeEdge, node?: unknown) => string
  pendingAnnotationFrameRef: { current: boolean }
  lastAnnotationFrameTimeRef: { current: number }
  setAnnotationFrame: (updater: (f: number) => number) => void
  scheduleNextFrame: () => void
  /** Resync color caches from scene fills after an invalidating rebuild. */
  syncColorMap?: () => void
  /** Refresh cursor inventory/presentation after scene mutations. */
  onSceneOrStyleChange?: (change: {
    inventoryChanged: boolean
    geometryChanged: boolean
  }) => void
}

/**
 * Run one paint tick. Returns whether another rAF should be scheduled
 * (also invoked via scheduleNextFrame for continuous modes).
 */
export function paintNetworkFrame(ctx: NetworkFramePaintContext): void {
  const {
    canvas,
    store,
    sceneRevisionDiagnostics,
    size,
    margin,
    adjustedWidth,
    adjustedHeight,
    background,
    themeBackground,
    maxDevicePixelRatio,
    renderMode,
    hasBackgroundGraphics = false,
    dirtyRef,
    resolutionDirtyRef,
    lastFrameTimeRef,
    now,
    random,
    reducedMotion,
    showParticles,
    isContinuous,
    animate,
    decay,
    pulse,
    thresholds,
    staleness,
    particleStyle,
    getParticleColor,
    pendingAnnotationFrameRef,
    lastAnnotationFrameTimeRef,
    setAnnotationFrame,
    scheduleNextFrame,
    syncColorMap,
    onSceneOrStyleChange
  } = ctx

  const c2d = canvas.getContext("2d")
  if (!c2d) return

  const deltaTime = lastFrameTimeRef.current
    ? Math.min((now - lastFrameTimeRef.current) / 1000, 0.1)
    : 0.016
  lastFrameTimeRef.current = now

  const transitionWasActive = store.transition != null
  const transitionActive = store.advanceTransition(
    reducedMotion ? now + 1e6 : now
  )
  const isTransitioning = reducedMotion ? false : transitionActive
  const transitionFinishedThisFrame =
    transitionWasActive && !transitionActive

  const animationTicked = reducedMotion
    ? false
    : store.tickAnimation([adjustedWidth, adjustedHeight], deltaTime)

  const wasDirty = dirtyRef.current
  const sceneRevisionCheck = sceneRevisionDiagnostics?.beforeCompute(
    store.getLastUpdateResult(),
    isTransitioning
  )
  // The final transition step mutates/snap-aligns geometry while returning
  // false. Rebuild once for that step too so paint and pointer geometry reach
  // the same target.
  const computedScene = transitionWasActive || wasDirty || animationTicked
  if (computedScene) {
    store.buildScene([adjustedWidth, adjustedHeight])
    // Resync particle/hover color caches from the freshly rebuilt scene fills
    // only on an invalidating rebuild (an effect / mount paint set `dirtyRef`),
    // NOT on pure transition/animation frames whose fills are unchanged. This
    // covers the mount hydration-lifecycle paint (which owns the first build);
    // post-mount ingest/layout pre-builds sync in `rebuildSceneNow` directly.
    if (wasDirty) syncColorMap?.()
  }
  if (sceneRevisionCheck) {
    // Network scene rebuilds may be consumed synchronously before paint.
    sceneRevisionDiagnostics?.afterCompute(sceneRevisionCheck, computedScene, true)
  }

  const particlesWanted =
    showParticles && !reducedMotion && !!store.particlePool
  const liveEncoding =
    !!decay ||
    !!pulse ||
    !!thresholds ||
    (animate !== false && store.hasActiveTopologyDiff) ||
    store.hasActivePulses ||
    store.hasActiveThresholds
  // A custom-layout restyle mutates scene styles in place (no rebuild, above)
  // and asks for a repaint via this flag — folded into the paint gate only.
  // resolutionDirty is the same paint-only path for browser zoom / DPR caps.
  const stylePaintPending = store.consumeStylePaintPending()
  if (computedScene || stylePaintPending) {
    onSceneOrStyleChange?.({
      // Pure force/orbit motion preserves the authored style inventory. Avoid
      // a second O(n+m) scan on every animation frame; the frame caches this
      // bit from invalidating/style rebuilds.
      inventoryChanged: wasDirty || stylePaintPending,
      geometryChanged: computedScene
    })
  }
  const needsResolutionRepaint = resolutionDirtyRef?.current === true
  const needsDataRepaint = needsDataCanvasPaint({
    // `advanceTransition` returns false on the terminal frame after snapping
    // geometry to its target. `computedScene` deliberately includes that
    // frame, so it must drive the paint gate as well as the scene rebuild.
    dirtyOrRebuilt: computedScene,
    transitioning: isTransitioning,
    animationTicked,
    continuous: particlesWanted || isContinuous,
    liveEncoding,
    forced: stylePaintPending || needsResolutionRepaint
  })
  if (resolutionDirtyRef) resolutionDirtyRef.current = false

  const staleThreshold = staleness?.threshold ?? 5000
  const currentlyStale =
    !!staleness &&
    store.lastIngestTime > 0 &&
    now - store.lastIngestTime > staleThreshold

  if (needsDataRepaint) {
    const dpr = getDevicePixelRatio(maxDevicePixelRatio, size)
    if (!prepareCanvas(canvas, size, margin, dpr)) return
    c2d.clearRect(-margin.left, -margin.top, size[0], size[1])

    paintCanvasBackground(c2d, {
      background,
      themeBackground,
      hasBackgroundGraphics,
      x: -margin.left,
      y: -margin.top,
      width: size[0],
      height: size[1]
    })

    if (decay) store.applyDecay()
    if (pulse) store.applyPulse(now)
    if (thresholds) store.applyThresholds(now)
    if (animate !== false) store.applyTopologyDiff(now)

    if (currentlyStale) {
      c2d.globalAlpha = staleness?.dimOpacity ?? 0.5
    }

    paintSceneWithBackend<NetworkSceneNode | NetworkSceneEdge>({
      context: c2d,
      nodes: store.sceneEdges,
      renderMode,
      pixelRatio: dpr,
      paintBuiltIn: (edges) => networkEdgeRenderer(c2d, edges as NetworkSceneEdge[])
    })

    paintSceneWithBackend<NetworkSceneNode | NetworkSceneEdge>({
      context: c2d,
      nodes: store.sceneNodes,
      renderMode,
      pixelRatio: dpr,
      paintBuiltIn: (nodes) => {
        const builtInNodes = nodes as NetworkSceneNode[]
        networkRectRenderer(c2d, builtInNodes)
        networkCircleRenderer(c2d, builtInNodes)
        networkArcRenderer(c2d, builtInNodes)
        networkSymbolRenderer(c2d, builtInNodes)
        networkGlyphRenderer(c2d, builtInNodes)
      }
    })

    if (particlesWanted && !currentlyStale) {
      const edges = store.edgesArray
      if (edges.length > 0) {
        spawnNetworkParticles(
          store.particlePool!,
          edges,
          deltaTime,
          particleStyle,
          random
        )
        const speed = (particleStyle.speedMultiplier ?? 1) * 0.5

        let edgeSpeedMultipliers: number[] | undefined
        if (particleStyle.proportionalSpeed) {
          const maxValue = edges.reduce(
            (max, e) => Math.max(max, e.value || 1),
            1
          )
          edgeSpeedMultipliers = edges.map((e) => {
            const ratio = (e.value || 1) / maxValue
            return 0.3 + ratio * 1.7
          })
        }

        store.particlePool!.step(deltaTime, speed, edges, edgeSpeedMultipliers)
        renderNetworkParticles(
          c2d,
          store.particlePool!,
          edges,
          particleStyle,
          getParticleColor
        )
      }
    }

    if (currentlyStale) {
      c2d.globalAlpha = 1
    }
  }

  dirtyRef.current = false

  if (computedScene) {
    canvas.setAttribute(
      "aria-label",
      computeNetworkAriaLabel(
        store.sceneNodes?.length ?? 0,
        store.sceneEdges?.length ?? 0,
        "Network chart"
      )
    )
  }

  const wantsAnnotationUpdate =
    computedScene ||
    pendingAnnotationFrameRef.current
  if (
    wantsAnnotationUpdate &&
    (transitionFinishedThisFrame ||
      now - lastAnnotationFrameTimeRef.current >= 33)
  ) {
    setAnnotationFrame((f) => f + 1)
    lastAnnotationFrameTimeRef.current = now
    pendingAnnotationFrameRef.current = false
  } else if (wantsAnnotationUpdate) {
    pendingAnnotationFrameRef.current = true
  } else {
    pendingAnnotationFrameRef.current = false
  }

  if (
    isContinuous ||
    isTransitioning ||
    store.transition != null ||
    animationTicked ||
    store.hasActivePulses ||
    store.hasActiveThresholds ||
    (animate !== false && store.hasActiveTopologyDiff) ||
    pendingAnnotationFrameRef.current
  ) {
    scheduleNextFrame()
  }
}
