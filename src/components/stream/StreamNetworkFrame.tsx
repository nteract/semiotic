"use client"
import { buildNetworkSSRStore } from "./networkSSRStore"
import { networkFrameContainerProps } from "./networkFrameContainerProps"
import { HIERARCHICAL_NETWORK_LAYOUTS } from "./networkLayoutCapabilities"
import type { Datum } from "../charts/shared/datumTypes"
import * as React from "react"
import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useImperativeHandle,
  forwardRef,
  memo
} from "react"
import type {
  StreamNetworkFrameProps,
  StreamNetworkFrameHandle,
  NetworkPipelineConfig,
  RealtimeNode,
  RealtimeEdge,
  EdgePush
} from "./networkTypes"
import type { HoverData } from "../realtime/types"
import type { HoverPointerCoords } from "./hoverUtils"
import { DEFAULT_TENSION_CONFIG, DEFAULT_PARTICLE_STYLE } from "./networkTypes"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import {
  SceneRevisionDiagnosticsObserver,
  runSceneBuild,
  useSceneRevisionDiagnostics
} from "./sceneRevisionDiagnostics"
import { composeOverlays } from "./composeOverlays"
import { wrapWithCustomLayoutSelection } from "./customLayoutSelection"
import { useLayoutSelectionSync } from "./streamStoreSync"
import { useNetworkKeyboardNavigation } from "./networkFrameKeyboardNavigation"
import { NetworkFrameHover, NetworkFrameLiveHover } from "./NetworkFrameHover"
import { createNetworkHoverStore } from "./networkHoverStore"
import { useFrame } from "./useFrame"
import { useStalenessCheck } from "./useStalenessCheck"
import { StalenessBadge } from "./StalenessBadge"
import { NetworkSVGOverlay } from "./NetworkSVGOverlay"
import { NetworkViewGroup } from "./networkViewTransform"
import { useNetworkCameraPaint } from "./useNetworkCamera"
import { useNetworkLayoutCommit } from "./useNetworkLayoutCommit"
import { NetworkHtmlMarksLayer } from "./NetworkHtmlMarksLayer"
import { isServerEnvironment } from "./isServerEnvironment"
import { NetworkSSRFrame } from "./NetworkSSRFrame"
import {
  useHydration,
  useWasHydratingFromSSR
} from "./useHydration"
import { CanvasFrameBackground, useFrameCanvasHost } from "./useCanvasFrameHost"
import { useStableShallow } from "./useStableShallow"
import { networkFrameAccessibility } from "./networkFrameAccessibility"
import { filterSparseArray } from "../charts/shared/sparseArray"
import { renderLoadingState } from "../charts/shared/withChartWrapper"
import {
  canUseForceWorker,
  createFrameForceWorkerRequest,
  shouldUseForceWorker
} from "./layouts/forceLayoutWorkerPolicy"

// Canvas setup

// Canvas renderers
import { buildNetworkPipelineConfig } from "./networkPipelineConfig"

import { networkFrameAriaLabel, paintNetworkFrame } from "./networkFramePaint"
import {
  networkEdgeFallbackColor,
  resolveNetworkEdgeColor,
  resolveNetworkEdgeEndpoint,
  resolveNetworkNodeColor,
  resolveNetworkParticleColor,
  syncNetworkNodeColorMap
} from "./networkColorAccessors"
import { resolveNetworkPointerHit } from "./networkFrameInteraction"
import { observationInputType
} from "../charts/shared/semanticInteractions"
import { isAnnotationActivationTarget } from "../charts/shared/annotationActivation"
import { useNetworkObservationBehaviors } from "./networkFrameObservations"
import { shouldContinueNetworkAnimation } from "./networkFrameAnimation"
import { resolveFrameLayers } from "./frameGraphics"
import {
  sceneMarkCursor,
  setCanvasMarkCursor,
  useCanvasMarkCursorCleanup
} from "./sceneCursor"
import { shouldHandleFramePointer } from "./frameCursorInteraction"
import {
  prepareNetworkCustomHits,
  preparedNetworkCustomHits,
  refreshNetworkCursorInventory,
  rehitNetworkFrameCursor,
  type NetworkCursorInventory
} from "./networkFrameCursorInteraction"
import { networkFrameDefaultMargin } from "./frameDefaultMargins"
import { useLegendCategoryEmission } from "./useLegendCategoryEmission"
import { useNetworkPerspectiveExtrasReady, useStableNetworkPerspective, withNetworkPerspective } from "./networkPerspectiveContext"
import { useEnsureNetworkLayouts } from "./useEnsureNetworkLayouts"
import { withDisplayName } from "../charts/shared/withDisplayName"

// ── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_SIZE: [number, number] = [800, 600]

// ── StreamNetworkFrame ─────────────────────────────────────────────────

const StreamNetworkFrame = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ memo(/* @__PURE__ */ forwardRef<
  StreamNetworkFrameHandle,
  StreamNetworkFrameProps
>(function StreamNetworkFrame(props, ref) {
  const {
    chartType,
    nodes: nodesProp,
    edges: edgesProp,
    data: dataProp,
    initialEdges,
    nodeIDAccessor = "id",
    sourceAccessor = "source",
    targetAccessor = "target",
    valueAccessor = "value",
    edgeIdAccessor, edgeIdentity,
    childrenAccessor,
    hierarchySum,
    orientation = "horizontal",
    nodeAlign = "justify",
    nodePaddingRatio = 0.05,
    nodeWidth = 15,
    iterations = 300,
    forceStrength = 0.1,
    layoutExecution = "auto",
    layoutLoadingContent,
    onLayoutStateChange,
    padAngle = 0.01,
    groupWidth = 20,
    sortGroups,
    edgeSort,
    treeOrientation = "vertical",
    edgeType = "curve",
    padding,
    paddingTop,
    tensionConfig: tensionConfigProp,
    showParticles = false,
    particleStyle: particleStyleProp,
    renderMode,
    perspective: perspectiveProp,
    nodeStyle,
    edgeStyle,
    colorBy,
    colorScheme = "category10",
    edgeColorBy = "source",
    edgeOpacity = 0.5,
    colorByDepth = false,
    nodeSize = 8,
    nodeSizeRange = [5, 20],
    nodeLabel,
    showLabels = true,
    labelMode,
    size: sizeProp = DEFAULT_SIZE,
    responsiveWidth,
    responsiveHeight,
    margin: marginProp,
    background,
    maxDevicePixelRatio,
    enableHover = true,
    tooltipContent,
    customHoverBehavior: customHoverBehaviorProp,
    customClickBehavior: customClickBehaviorProp,
    onObservation,
    annotationObservationCallback,
    chartId,
    onTopologyChange,
    annotations,
    onAnnotationActivate,
    autoPlaceAnnotations,
    svgAnnotationRules,
    legend,
    legendPosition,
    legendLayout,
    legendHoverBehavior,
    legendClickBehavior,
    legendHighlightedCategory,
    legendIsolatedCategories,
    legendCategoryAccessor,
    onCategoriesChange,
    title,
    foregroundGraphics,
    backgroundGraphics,
    decay,
    pulse,
    transition: transitionProp,
    animate,
    staleness,
    frameScheduler,
    clock: clockProp,
    random: randomProp,
    seed,
    paused = false,
    suspendWhenHidden = true,
    thresholds,
    description,
    orbitMode,
    orbitSize,
    orbitSpeed,
    orbitRevolution,
    orbitRevolutionStyle,
    orbitEccentricity,
    orbitShowRings,
    orbitAnimated,
    customNetworkLayout,
    onLayoutError,
    layoutConfig,
    layoutSelection
  } = props

  // ── Frame composition (Tier A concerns; see useFrame.ts) ─────────────
  // Network has a compact centered default for radial chart types and a wider
  // label-safe default for directional layouts. Static rendering resolves the
  // exact same family default through networkFrameDefaultMargin.
  const baseMargin = networkFrameDefaultMargin(chartType)
  // dirtyRef declared before useFrame so it can be threaded in for the
  // theme-change effect. Network inits to true (required).
  const dirtyRef = useRef(true)
  const frame = useFrame({
    sizeProp,
    responsiveWidth,
    responsiveHeight,
    userMargin: marginProp,
    marginDefault: baseMargin,
    title,
    legend,
    legendPosition,
    legendLayout,
    legendMarginReserved: (props as { __legendMarginReservedFor?: unknown }).__legendMarginReservedFor === legend,
    animate,
    transitionProp,
    frameScheduler,
    clock: clockProp,
    random: randomProp,
    seed,
    paused,
    suspendWhenHidden,
    themeDirtyRef: dirtyRef
  })
  const {
    reducedMotionRef,
    responsiveRef,
    size,
    margin,
    adjustedWidth,
    adjustedHeight,
    transition,
    introEnabled,
    tableId,
    rafRef, renderFnRef, scheduleRender, frameRuntime,
    currentTheme
  } = frame
  const { resolvedForeground, resolvedBackground, themeBackground, surfaceBackground } = resolveFrameLayers({ foregroundGraphics, backgroundGraphics, size, margin, scales: null, background, themeBackgroundColor: currentTheme.colors.background })

  // ── Hydration boundary ─────────────────────────────────────────────────
  // SSR and initial hydration show SVG. Retain the server subtree while
  // client layout is pending, then commit geometry and canvas together.
  // Fresh client mounts start with canvas. See `HYDRATION.md`.
  const hydrated = useHydration()
  const wasHydratingFromSSR = useWasHydratingFromSSR()
  const frameId = `${tableId}-frame`
  // Server markup becomes a numeric scene revision when client geometry commits.
  const [sceneState, setSceneState] = useState<string | number>(() =>
    !isServerEnvironment && wasHydratingFromSSR
      ? (document.getElementById(frameId)?.innerHTML ?? 0)
      : 0
  )
  const hydrationMarkup = typeof sceneState === "string" ? sceneState : null
  const isHierarchical = HIERARCHICAL_NETWORK_LAYOUTS.has(chartType)
  const hierarchyRoot = isHierarchical
    ? dataProp || (!Array.isArray(edgesProp) ? edgesProp : undefined)
    : undefined
  const hasControlledGraph = nodesProp != null || edgesProp != null

  const animationsDisabled = animate === false
  const tensionConfig = useMemo(
    () => ({
      ...DEFAULT_TENSION_CONFIG,
      ...tensionConfigProp,
      // The store falls back to tensionConfig when transition is absent.
      // Honor the explicit opt-out for resize/data-change transitions too.
      ...(animationsDisabled ? { transitionDuration: 0 } : {})
    }),
    [tensionConfigProp, animationsDisabled]
  )

  const particleStyle = useMemo(
    () => ({ ...DEFAULT_PARTICLE_STYLE, ...particleStyleProp }),
    [particleStyleProp]
  )

  // ── Pipeline config ──────────────────────────────────────────────────
  const perspective = useStableNetworkPerspective(perspectiveProp)

  const pipelineConfig = useMemo(
    (): NetworkPipelineConfig =>
      buildNetworkPipelineConfig({
        chartType,
        clock: frameRuntime.now,
      activityClock: frameRuntime.wallNow,
        // Omit an implicit FrameRuntime random source here so force layouts
        // retain d3-force's deterministic default LCG. `frameRuntime.random`
        // remains the source for particles; force layout changes it only when
        // a caller explicitly provides `random` or `seed`.
        random: randomProp,
        seed,
        nodeIDAccessor,
        sourceAccessor,
        targetAccessor,
        valueAccessor,
        edgeIdAccessor, edgeIdentity,
        childrenAccessor,
        hierarchySum,
        orientation,
        nodeAlign,
        nodePaddingRatio,
        nodeWidth,
        iterations,
        forceStrength,
        padAngle,
        groupWidth,
        sortGroups,
        edgeSort,
        treeOrientation,
        edgeType,
        padding,
        paddingTop,
        tensionConfig,
        showParticles,
        particleStyle,
        nodeStyle,
        edgeStyle,
        nodeLabel,
        showLabels,
        labelMode,
        colorBy,
        colorScheme,
        edgeColorBy,
        edgeOpacity,
        colorByDepth,
        nodeSize,
        nodeSizeRange,
        decay,
        pulse,
        transition,
        introAnimation: introEnabled,
        staleness,
        thresholds,
        orbitMode,
        orbitSize,
        orbitSpeed,
        orbitRevolution,
        orbitRevolutionStyle,
        orbitEccentricity,
        orbitShowRings,
        orbitAnimated,
        customNetworkLayout,
        onLayoutError,
        layoutConfig,
        perspective,
        currentTheme
      }),
    [perspective, chartType, frameRuntime.now, frameRuntime.wallNow, randomProp, seed, nodeIDAccessor, sourceAccessor, targetAccessor, valueAccessor, edgeIdAccessor, edgeIdentity, childrenAccessor, hierarchySum, orientation, nodeAlign, nodePaddingRatio, nodeWidth, iterations, forceStrength, padAngle, groupWidth, sortGroups, edgeSort, treeOrientation, edgeType, padding, paddingTop, tensionConfig, showParticles, particleStyle, nodeStyle, edgeStyle, nodeLabel, showLabels, labelMode, colorBy, colorScheme, edgeColorBy, edgeOpacity, colorByDepth, nodeSize, nodeSizeRange, decay, pulse, transition, introEnabled, staleness, thresholds, orbitMode, orbitSize, orbitSpeed, orbitRevolution, orbitRevolutionStyle, orbitEccentricity, orbitShowRings, orbitAnimated, customNetworkLayout, onLayoutError, layoutConfig, currentTheme]
  )

  // Stabilize the config reference so inline-object / inline-array
  // props (e.g. `pulse={{ duration: 600, ... }}`, `staleness={{ ... }}`,
  // `frameProps={{ pulse: ..., staleness: ... }}`) don't shed a fresh
  // identity on every parent render. Without this stabilization, the
  // `updateConfig` effect would depend on raw `pipelineConfig` and
  // re-fire on every render, dirtying the scene; the rAF render loop's
  // `setAnnotationFrame((f) => f + 1)` would then trigger another
  // re-render with yet another fresh inline ref, which React 19
  // catches as "Maximum update depth exceeded" after ~50 cycles. The
  // hook returns the previous reference whenever the value is
  // shallow-equal at one level deep — which covers the typical config
  // shape (primitives, sub-objects of primitives, primitive arrays).
  const stablePipelineConfig = useStableShallow(pipelineConfig)

  // Stable signature of only the *layout/ingest-affecting* config — the
  // fields that change node positions (so a change must re-ingest and
  // re-run the layout plugin): data accessors, hierarchy/sankey/force/orbit
  // layout parameters, and the custom layout. Render-only props (nodeStyle,
  // edgeStyle, orbitRevolution, labels, colors, realtime encoding,
  // animation) are excluded — those are applied by the
  // `updateConfig` effect + the next `buildScene` without a re-ingest. The
  // hierarchy-ingest effect below depends on this instead of the full
  // pipeline config so a parent passing fresh inline-arrow *style* callbacks
  // on every render can't re-ingest + setState in a loop (which compounds
  // with a continuous animation's frame loop into React's max-update-depth
  // crash), while genuine layout-parameter changes still take effect.
  //
  // `layoutConfig` is EXCLUDED: it's threaded to a custom layout
  // as `ctx.config` and read only during `buildScene` (the custom layout) —
  // never during ingest, which rebuilds the node/edge maps the config doesn't
  // touch. So a `layoutConfig` change re-runs the layout via the
  // `updateConfig` effect → render-loop `buildScene` (an in-place re-layout),
  // with no topology re-ingest. That makes config-driven custom-layout updates
  // — interaction state, styling, animation progress — cheap to drive per frame.
  const stableLayoutConfig = useStableShallow({
    chartType,
    nodeIDAccessor,
    sourceAccessor,
    targetAccessor,
    valueAccessor,
    edgeIdAccessor, edgeIdentity,
    childrenAccessor,
    hierarchySum,
    orientation,
    nodeAlign,
    nodePaddingRatio,
    nodeWidth,
    iterations,
    forceStrength,
    // Force charge, collision and link clearance all depend on node radius.
    nodeSize: chartType === "force" ? nodeSize : undefined,
    nodeSizeRange: chartType === "force" ? nodeSizeRange : undefined,
    padAngle,
    groupWidth,
    sortGroups,
    edgeSort,
    treeOrientation,
    edgeType,
    padding,
    paddingTop,
    random: randomProp,
    seed,
    tensionConfig,
    customNetworkLayout,
    orbitMode,
    orbitSize,
    orbitEccentricity
  })

  const lastFrameTimeRef = useRef(0)
  const lastAnnotationFrameTimeRef = useRef(0)
  const pendingAnnotationFrameRef = useRef(false)

  const storeRef = useRef<NetworkPipelineStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = new NetworkPipelineStore(stablePipelineConfig)
  }
  const renderSVG =
    isServerEnvironment ||
    (!hydrated && wasHydratingFromSSR) ||
    hydrationMarkup !== null
  const ssrStore =
    renderSVG && hydrationMarkup === null
      ? buildNetworkSSRStore(
          stablePipelineConfig,
          {
            nodes: nodesProp,
            edges: Array.isArray(edgesProp) ? edgesProp : undefined,
            hierarchy: hierarchyRoot
          },
          [adjustedWidth, adjustedHeight]
        )
      : null
  const emitLegendCategories = useLegendCategoryEmission(
    storeRef,
    legendCategoryAccessor,
    onCategoriesChange,
    (store) => Array.from(store.nodes.values()).map((node) =>
      node.data ? { id: node.id, ...node.data } : node as unknown as Datum,
    ),
  )
  const sceneRevisionDiagnosticsRef = useSceneRevisionDiagnostics("StreamNetworkFrame")
  const buildSceneWithDiagnostics = useCallback((store: NetworkPipelineStore, sceneSize: [number, number], isTransitioning = false) => runSceneBuild(sceneRevisionDiagnosticsRef.current, store, () => store.buildScene(sceneSize), isTransitioning), [sceneRevisionDiagnosticsRef])

  const [hoverStore] = useState(createNetworkHoverStore)
  const setHoverData = hoverStore.set
  const [annotationFrame, setAnnotationFrame] = useState(0)
  const [isStale, setIsStale] = useState(false)
  const [layoutPending, setLayoutPending] = useState(false)
  const layoutRequestRef = useRef(0)
  const layoutAbortRef = useRef<AbortController | null>(null)
  const onLayoutStateChangeRef = useRef(onLayoutStateChange)
  onLayoutStateChangeRef.current = onLayoutStateChange
  const publishLayoutState = useCallback(
    (store: NetworkPipelineStore, state: "ready" | "error" = "ready") => {
      setSceneState(store.layoutVersion)
      setLayoutPending(false)
      onLayoutStateChangeRef.current?.(state)
    },
    []
  )
  const pipelineConfigRef = useRef(stablePipelineConfig)
  pipelineConfigRef.current = stablePipelineConfig

  const hoverRef = useRef<HoverData | null>(null)
  // ── Observation wrappers ─────────────────────────────────────────────

  const { customHoverBehavior, customClickBehavior } =
    useNetworkObservationBehaviors({
      customHoverBehavior: customHoverBehaviorProp,
      customClickBehavior: customClickBehaviorProp,
      onObservation,
      chartId
    })

  // ── Hover handlers ───────────────────────────────────────────────────
  // hoverHandlerRef + hoverLeaveRef + onPointerMove/Leave + cleanup all
  // come from useFrame above; frame still owns the closure bodies.
  const {
    hoverHandlerRef,
    hoverLeaveRef,
    onPointerMove,
    onPointerLeave,
    pointerStateRef
  } = frame

  const {
    kbFocusIndexRef,
    focusedNavPointRef,
    neighborIndexRef,
    onKeyDown,
    onBlur,
    refreshKeyboardFocus
  } = useNetworkKeyboardNavigation({
    storeRef,
    hoverRef,
    setHoverPoint: setHoverData,
    customHoverBehavior,
    customClickBehavior,
    scheduleRender,
    clearPointerHover: onPointerLeave
  })
  const sceneCursorInventoryRef = useRef<NetworkCursorInventory>({
    nodes: false,
    edges: false
  })

  // ── Color functions ──────────────────────────────────────────────────

  const nodeColorMap = useRef(new Map<string, string>())
  const colorIndexRef = useRef(0)
  const colorSchemeRef = useRef(colorScheme)
  colorSchemeRef.current = colorScheme

  const getNodeColor = useCallback(
    (node: RealtimeNode): string =>
      resolveNetworkNodeColor({
        node,
        colorBy,
        colorScheme,
        nodeColorMap: nodeColorMap.current,
        colorIndexRef
      }),
    [colorBy, colorScheme]
  )

  // Resync the particle/hover color caches from the scene fills (authoritative:
  // they include nodeStyle, colorBy, and theme resolution). Called after any
  // scene rebuild — the paint loop invokes it after the mount build; the
  // post-mount pre-build (`rebuildSceneNow`) invokes it directly.
  const syncColorMap = useCallback(
    (store: NetworkPipelineStore) => {
      colorIndexRef.current = syncNetworkNodeColorMap({
        sceneNodes: store.sceneNodes,
        nodes: store.nodes.values(),
        nodeColorMap: nodeColorMap.current,
        colorScheme: colorSchemeRef.current
      })
    },
    []
  )

  // Ingest/layout/theme changes rebuild the scene **synchronously** so
  // `store.sceneNodes` (and the derived `customLayoutHtmlMarks`) are current
  // for the consumers that read them between paints — keyboard nav,
  // hit-testing, `getData`, and the React-rendered htmlMarks layer. The async
  // rAF paint is too late for those. Then hand the paint loop a *repaint-only*
  // signal (`markStylePaintPending` + clearing `dirtyRef`) so it paints this
  // freshly-built scene instead of rebuilding the same revision a second time
  // (the duplicate `SceneRevisionDiagnostics` flagged). Fresh mounts leave
  // painting to this ingestion scheduler; the hydration lifecycle only forces
  // a synchronous paint when handing off server SVG to canvas. See the
  // `skipInitialCanvasPaintInvalidation` note below and `useHydration.ts`.
  // Transition/animation frames still rebuild via the paint loop's own gates.
  const lastSceneSizeRef = useRef<[number, number] | null>(null)
  const rebuildSceneNow = useCallback(
    (store: NetworkPipelineStore, sceneSize: [number, number]) => {
      buildSceneWithDiagnostics(store, sceneSize)
      prepareNetworkCustomHits(store)
      refreshKeyboardFocus()
      lastSceneSizeRef.current = sceneSize
      emitLegendCategories()
      syncColorMap(store)
      refreshNetworkCursorInventory(
        sceneCursorInventoryRef.current,
        store.sceneNodes,
        store.sceneEdges
      )
      dirtyRef.current = false
      store.markStylePaintPending()
    },
    [buildSceneWithDiagnostics, emitLegendCategories, syncColorMap, refreshKeyboardFocus]
  )
  const invalidateCanvasPaint = useCallback(() => {
    storeRef.current?.markStylePaintPending()
  }, [])
  const { canvasRef, resolutionDirtyRef } = useFrameCanvasHost(frame, {
    hydrated: hydrated && hydrationMarkup === null,
    wasHydratingFromSSR,
    storeRef,
    dirtyRef,
    // The ingest/layout/theme effects build the scene synchronously and hand
    // the paint loop a repaint-only signal (`rebuildSceneNow`). The default
    // mount-time canvas invalidation would re-set `dirtyRef`, forcing the
    // paint loop to rebuild the identical scene a second time (the duplicate
    // `SceneRevisionDiagnostics` flagged). Later dependency changes still
    // repaint, but geometry/dimensions have already rebuilt synchronously.
    skipInitialCanvasPaintInvalidation: true,
    canvasPaintInvalidator: invalidateCanvasPaint,
    maxDevicePixelRatio,
    canvasPaintDependencies: [chartType, adjustedWidth, adjustedHeight, background, backgroundGraphics, renderMode, scheduleRender]
  })

  // Fallback color for edges/particles when no source or target is resolvable.
  // Chain mirrors the secondary→primary fallback used when building
  // themeSemantic: chart border > secondary > primary > hardcoded #999.
  // A custom theme that omits border+secondary still falls back to the
  // theme's accent rather than the hardcoded gray.
  const edgeFallbackColor = networkEdgeFallbackColor(currentTheme)

  // Resolve a source/target field to a RealtimeNode. For built-in
  // sankey layouts, d3-sankey replaces string ids with node references
  // during `computeLayout`. For customNetworkLayout charts (e.g.
  // ProcessSankey), `ingestBounded` keeps the ids as strings — the
  // customLayout path doesn't run plugin dispatch. Look up by id when
  // we get a string so both paths converge on a RealtimeNode.
  const resolveEdgeEndpoint = useCallback(
    (endpoint: RealtimeNode | string | undefined): RealtimeNode | null =>
      resolveNetworkEdgeEndpoint(endpoint, storeRef.current?.nodes),
    []
  )

  const getEdgeColor = useCallback(
    (edge: RealtimeEdge): string =>
      resolveNetworkEdgeColor({
        edge,
        edgeColorBy,
        getNodeColor,
        resolveEndpoint: resolveEdgeEndpoint,
        fallback: edgeFallbackColor
      }),
    [edgeColorBy, getNodeColor, edgeFallbackColor, resolveEdgeEndpoint]
  )

  const getParticleColor = useCallback(
    (edge: RealtimeEdge): string =>
      resolveNetworkParticleColor({
        edge,
        particleStyleColor: particleStyle.color,
        particleColorBy: particleStyle.colorBy,
        hasExplicitParticleColorBy: !!particleStyleProp?.colorBy,
        getEdgeColor,
        getNodeColor,
        resolveEndpoint: resolveEdgeEndpoint,
        fallback: edgeFallbackColor
      }),
    [
      particleStyleProp?.colorBy,
      particleStyle.color,
      particleStyle.colorBy,
      getNodeColor,
      getEdgeColor,
      edgeFallbackColor,
      resolveEdgeEndpoint
    ]
  )

  const isContinuous = shouldContinueNetworkAnimation(
    chartType,
    !!customNetworkLayout,
    showParticles,
    !!pulse,
    storeRef.current?.isAnimating ?? false
  )

  // customLayout backgrounds/overlays are read straight from the store at
  // render time (see the layer composition below) — the same pattern as
  // StreamXYFrame. Every decoration-changing path (config/data/theme/
  // hover) already sets `dirtyRef` + `scheduleRender`, and the render loop's
  // throttled `setAnnotationFrame` re-renders to pick up the fresh overlays.
  // So no separate React state / per-change setState is needed (and can't
  // compound with a per-frame morph into a "Maximum update depth" storm).

  // A render-only config change (e.g. the resolved selection predicate driving
  // dim/highlight) flows through here too: updateConfig → dirty → render-loop
  // buildScene re-emits the overlays → setAnnotationFrame re-render reads them.
  // Identity changes on controlled data belong to its replacement transaction.
  // Rekeying the previous records here could reject valid new IDs/accessors.
  const pendingControlledConfigRef = useRef<NetworkPipelineConfig | undefined>(undefined)
  useEffect(() => {
    const store = storeRef.current
    if (!store) return
    const replacing = hasControlledGraph || (isHierarchical && !!hierarchyRoot)
    if (replacing && store.hasEdgeIdentityChange(stablePipelineConfig)) {
      pendingControlledConfigRef.current = stablePipelineConfig
    } else {
      store.updateConfig(stablePipelineConfig)
      pendingControlledConfigRef.current = undefined
    }
    dirtyRef.current = true
    scheduleRender()
  }, [stablePipelineConfig, hasControlledGraph, isHierarchical, hierarchyRoot, scheduleRender])
  useNetworkPerspectiveExtrasReady(storeRef.current, useCallback(() => { dirtyRef.current = true; scheduleRender() }, [scheduleRender]))

  // Bridge the resolved custom-layout selection into the scene store +
  // repaint. See useLayoutSelectionSync for why this is a legitimate
  // React→canvas sync (selection is React-assembled), not a store relay.
  useLayoutSelectionSync(storeRef, layoutSelection, dirtyRef, scheduleRender)

  // ── Layout execution ─────────────────────────────────────────────────

  const runLayout = useCallback(() => {
    const store = storeRef.current
    if (!store) return
    const requestId = ++layoutRequestRef.current
    layoutAbortRef.current?.abort()
    layoutAbortRef.current = null
    const size: [number, number] = [adjustedWidth, adjustedHeight]
    const finish = (state: "ready" | "error", repaint = false) => {
      rebuildSceneNow(store, size)
      publishLayoutState(store, state)
      if (onTopologyChange) {
        const { nodes, edges } = store.getLayoutData()
        onTopologyChange(nodes, edges)
      }
      if (repaint) scheduleRender()
    }
    if (chartType === "force" && !customNetworkLayout && !randomProp && canUseForceWorker() &&
        shouldUseForceWorker(layoutExecution, store.nodes.size, store.edges.size, iterations)) {
      const controller = new AbortController()
      layoutAbortRef.current = controller
      const data = store.getLayoutData()
      const request = createFrameForceWorkerRequest(data.nodes, data.edges, pipelineConfigRef.current, size, store._lastPositionSnapshot)
      setLayoutPending(true)
      onLayoutStateChangeRef.current?.("pending")
      import("./layouts/forceLayoutWorkerClient")
        .then(({ runForceLayoutWorker }) => runForceLayoutWorker(request, controller.signal))
        .then(({ positions }) => {
          if (controller.signal.aborted || requestId !== layoutRequestRef.current) return
          layoutAbortRef.current = null
          store.applyForceLayoutPositions(positions, size)
          finish("ready", true)
        })
        .catch((error: Error) => {
          if (controller.signal.aborted || requestId !== layoutRequestRef.current || error.name === "AbortError") return
          layoutAbortRef.current = null
          store.runLayout(size)
          finish("error", true)
        })
      return controller
    }
    store.runLayout(size)
    finish("ready")
  }, [adjustedWidth, adjustedHeight, rebuildSceneNow, publishLayoutState, onTopologyChange, scheduleRender,
    chartType, customNetworkLayout, randomProp, layoutExecution, iterations])

  // Controlled ingestion uses current callbacks without making callback identity
  // an input to topology replacement.
  const runLayoutRef = useRef(runLayout)
  runLayoutRef.current = runLayout

  useEnsureNetworkLayouts(chartType, Boolean(customNetworkLayout), () => {
    runLayoutRef.current()
    scheduleRender()
  })

  useEffect(() => () => {
    ++layoutRequestRef.current
    layoutAbortRef.current?.abort()
  }, [])

  // ── Push API ─────────────────────────────────────────────────────────

  // Ingest each edge synchronously so push ordering, mutable caller objects,
  // and read-after-write data semantics stay identical to the original API.
  // Only the expensive Sankey/force solve is deferred: a burst of N push()
  // calls commits one net topology layout at the next animation frame.
  const pendingLayoutRef = useRef(false)

  // Clear before running: onTopologyChange can call a getter (which must not
  // recurse) or push another edge (which must remain pending for a new frame).
  const commitLayout = useCallback(
    (force = false): boolean => {
      if (!force && !pendingLayoutRef.current) return false
      pendingLayoutRef.current = false
      runLayout()
      return true
    },
    [runLayout]
  )

  const flushPendingLayout = useCallback(
    (): boolean => commitLayout(false),
    [commitLayout]
  )

  // Drop sparse entries before they reach `NetworkPipelineStore` — mirrors
  // the bounded-ingest hardening. `ref.push(null)` or
  // `ref.pushMany([null, valid])` would otherwise crash node/edge accessor
  // reads inside `ingestEdge`.
  const applyEdgeBatch = useCallback(
    (edges: EdgePush[]): boolean => {
      const store = storeRef.current
      if (!store) return false

      let ingested = false
      let needsRelayout = pendingLayoutRef.current
      for (const edge of edges) {
        if (edge == null || typeof edge !== "object") continue
        ingested = true
        if (store.ingestEdge(edge)) needsRelayout = true
      }
      const committed = commitLayout(needsRelayout)
      return ingested || committed
    },
    [commitLayout]
  )

  const pushEdge = useCallback(
    (edge: EdgePush) => {
      if (edge == null || typeof edge !== "object") return
      const store = storeRef.current
      if (!store) return
      if (store.ingestEdge(edge)) pendingLayoutRef.current = true
      if (layoutAbortRef.current) {
        ++layoutRequestRef.current
        layoutAbortRef.current.abort()
        layoutAbortRef.current = null
        pendingLayoutRef.current = true
      }
      if (!frameRuntime.isActive) {
        flushPendingLayout()
        return
      }
      scheduleRender()
    },
    [flushPendingLayout, frameRuntime, scheduleRender]
  )

  const pushManyEdges = useCallback(
    (edges: EdgePush[]) => {
      if (applyEdgeBatch(edges)) scheduleRender()
    },
    [applyEdgeBatch, scheduleRender]
  )

  // Canvas-host pause/visibility policy cancels paint rAFs. Commit the data
  // transaction first so an active burst cannot be stranded by that cancel.
  useEffect(
    () =>
      frameRuntime.subscribe(() => {
        if (!frameRuntime.isActive) flushPendingLayout()
      }),
    [flushPendingLayout, frameRuntime]
  )

  const clearAll = useCallback(() => {
    // A clear is a barrier, not a commit: the scheduled frame must not rebuild
    // geometry for topology that was explicitly discarded.
    pendingLayoutRef.current = false
    ++layoutRequestRef.current
    layoutAbortRef.current?.abort()
    layoutAbortRef.current = null
    setLayoutPending(false)
    onLayoutStateChangeRef.current?.("ready")
    storeRef.current?.clear()
    emitLegendCategories()
    nodeColorMap.current.clear()
    colorIndexRef.current = 0
    // clear() bumps layoutVersion monotonically; sync React state to the new
    // value so the render fires (never force 0 — that can equal the last-seen
    // value and skip the post-clear repaint).
    setSceneState(storeRef.current?.layoutVersion ?? 0)
    setHoverData(null)
    hoverRef.current = null
    kbFocusIndexRef.current = -1
    focusedNavPointRef.current = null
    neighborIndexRef.current = -1
    dirtyRef.current = true
    scheduleRender()
  }, [emitLegendCategories, scheduleRender, kbFocusIndexRef, focusedNavPointRef, neighborIndexRef, setHoverData])

  const forceRelayout = useCallback(() => {
    const store = storeRef.current
    if (!store) return
    commitLayout(true)
    scheduleRender()
  }, [commitLayout, scheduleRender])

  const removeNodes = useCallback((ids: string[]): Datum[] => {
    const store = storeRef.current
    if (!store) return []
    const removed: Datum[] = []
    for (const id of ids) {
      const node = store.nodes.get(id)
      if (!node) continue
      removed.push({ ...(node.data ?? {}), id })
      store.removeNode(id)
      nodeColorMap.current.delete(id)
    }
    if (removed.length && hoverRef.current) {
      const ids = new Set(removed.map((datum) => datum.id))
      const hover = hoverRef.current
      const data = hover.data
      const endpoint = (value: unknown): unknown => value && typeof value === "object" ? (value as { id?: unknown }).id : value
      const invalid = hover.nodeOrEdge === "node"
        ? ids.has(typeof nodeIDAccessor === "function" ? nodeIDAccessor(data ?? {}) : data?.[nodeIDAccessor])
        : ids.has(endpoint(data?.source)) || ids.has(endpoint(data?.target))
      if (invalid) {
        hoverRef.current = null
        setHoverData(null)
      }
    }
    if (commitLayout(removed.length > 0)) scheduleRender()
    return removed
  }, [commitLayout, scheduleRender, nodeIDAccessor, setHoverData])
  const updateNodes = useCallback((ids: string[], updater: (data: Datum) => Datum): Datum[] => {
    const previous: Datum[] = []
    try {
      for (const id of ids) {
        const data = storeRef.current?.updateNode(id, updater)
        if (data != null) previous.push({ ...data, id })
      }
    } finally {
      // Preserve successful earlier mutations if an author updater throws.
      if (commitLayout(previous.length > 0)) scheduleRender()
    }
    return previous
  }, [commitLayout, scheduleRender])

  useImperativeHandle(
    ref,
    () => ({
      push: pushEdge,
      pushMany: pushManyEdges,
      removeNode: (id: string) => removeNodes([id]).length > 0,
      removeNodes,
      updateNodes,
      removeEdge: (sourceIdOrEdgeId: string, targetId?: string) => {
        const removed =
          storeRef.current?.removeEdge(sourceIdOrEdgeId, targetId) ?? false
        if (removed) {
          // Clear hover if the removed edge was being hovered
          if (hoverRef.current && hoverRef.current.nodeOrEdge === "edge") {
            const hoveredEdge = hoverRef.current.data
            const hSrc =
              typeof hoveredEdge?.source === "object"
                ? hoveredEdge.source.id
                : hoveredEdge?.source
            const hTgt =
              typeof hoveredEdge?.target === "object"
                ? hoveredEdge.target.id
                : hoveredEdge?.target
            let matches: boolean
            if (targetId !== undefined) {
              matches = hSrc === sourceIdOrEdgeId && hTgt === targetId
            } else if ((edgeIdAccessor || edgeIdentity === "id") && hoveredEdge) {
              const getEid =
                typeof edgeIdAccessor === "function"
                  ? edgeIdAccessor
                  : (d: Datum) => d?.[edgeIdAccessor ?? "id"]
              matches = getEid(hoveredEdge.data ?? hoveredEdge) === sourceIdOrEdgeId
            } else {
              matches = true // no accessor to compare — conservatively clear
            }
            if (matches) {
              hoverRef.current = null
              setHoverData(null)
            }
          }
        }
        if (commitLayout(removed)) {
          scheduleRender()
        }
        return removed
      },
      updateNode: (id: string, updater: (data: Datum) => Datum) => {
        const previous = storeRef.current?.updateNode(id, updater) ?? null
        // Match updateEdge/remove: node field updates (size, force weights)
        // can change geometry; style-only paints are insufficient.
        if (commitLayout(previous !== null)) {
          scheduleRender()
        }
        return previous
      },
      updateEdge: (
        sourceId: string,
        targetId: string,
        updater: (data: Datum) => Datum
      ) => {
        const previous =
          storeRef.current?.updateEdge(sourceId, targetId, updater) ?? []
        if (commitLayout(previous.length > 0)) {
          scheduleRender()
        }
        return previous
      },
      updateEdgeById: (id: string, updater: (data: Datum) => Datum) => {
        const previous = storeRef.current?.updateEdgeById(id, updater) ?? null
        if (commitLayout(previous !== null)) scheduleRender()
        return previous
      },
      clear: clearAll,
      getTopology: () => {
        flushPendingLayout()
        return storeRef.current?.getLayoutData() ?? { nodes: [], edges: [] }
      },
      getCustomLayout: () => {
        flushPendingLayout()
        return storeRef.current?.lastCustomLayoutResult ?? null
      },
      getLayoutFailure: () => {
        flushPendingLayout()
        return storeRef.current?.lastCustomLayoutFailure ?? null
      },
      getTopologyDiff: () => {
        flushPendingLayout()
        const store = storeRef.current
        if (!store)
          return {
            addedNodes: [],
            removedNodes: [],
            addedEdges: [],
            removedEdges: []
          }
        return {
          addedNodes: Array.from(store.addedNodes),
          removedNodes: Array.from(store.removedNodes),
          addedEdges: Array.from(store.addedEdges),
          removedEdges: Array.from(store.removedEdges)
        }
      },
      relayout: forceRelayout,
      getTension: () => {
        flushPendingLayout()
        return storeRef.current?.tension ?? 0
      }
    }),
    [pushEdge, pushManyEdges, clearAll, forceRelayout, flushPendingLayout, commitLayout, removeNodes, updateNodes, scheduleRender, edgeIdAccessor, edgeIdentity, setHoverData]
  )

  // ── Bounded data ingestion ───────────────────────────────────────────

  useEffect(() => {
    const store = storeRef.current
    if (!store) return
    ++layoutRequestRef.current
    layoutAbortRef.current?.abort()
    layoutAbortRef.current = null

    const replacementConfig = pendingControlledConfigRef.current
    if (isHierarchical && hierarchyRoot) {
      // A controlled hierarchy replacement supersedes any uncommitted push
      // layout from the same frame transaction.
      pendingLayoutRef.current = false
      // Hierarchy data: single root object. Emit "ready" like the other
      // synchronous paths — a chart-type/data switch away from a pending
      // worker layout must not leave consumers stuck on "pending".
      store.ingestHierarchy(hierarchyRoot, [adjustedWidth, adjustedHeight], replacementConfig)
      pendingControlledConfigRef.current = undefined
      rebuildSceneNow(store, [adjustedWidth, adjustedHeight])
      publishLayoutState(store)
      scheduleRender()
    } else {
      // Graph data: nodes + edges arrays
      const rawNodes = filterSparseArray(nodesProp)
      const rawEdges = Array.isArray(edgesProp) ? filterSparseArray(edgesProp) : []
      if (hasControlledGraph) {
        // Controlled arrays are the newer source of truth. Eager push data may
        // exist in the store, but ingestBounded below replaces it atomically.
        pendingLayoutRef.current = false
      }

      if (rawNodes.length === 0 && rawEdges.length === 0) {
        // Controlled data went non-empty → empty: tear down the previous
        // scene (topology, hover, color caches) so the frame renders empty
        // instead of retaining stale marks. Gated on the props actually
        // being provided — push mode omits them, and its store contents
        // must survive this effect re-running on resize/palette changes.
        if (
          hasControlledGraph &&
          (store.nodes.size > 0 || store.edges.size > 0)
        ) {
          clearAll()
        }
        if (replacementConfig) {
          store.updateConfig(replacementConfig)
          pendingControlledConfigRef.current = undefined
        }
        // Push-mode graphs have no controlled arrays to re-ingest, but force
        // parameter changes still need to re-solve their retained topology.
        if (chartType === "force" && !hasControlledGraph && store.nodes.size > 0) {
          pendingLayoutRef.current = false
          const controller = runLayoutRef.current()
          return () => controller?.abort()
        }
        // Nothing to lay out — the frame is no longer busy, so a consumer
        // watching a previously-pending worker layout gets released.
        publishLayoutState(store)
        return
      }

      const size: [number, number] = [adjustedWidth, adjustedHeight]
      const useWorker =
        chartType === "force" &&
        !customNetworkLayout &&
        canUseForceWorker() &&
        // A callback cannot cross the worker boundary. A serializable seed
        // does, so seeded layouts retain worker execution while injected
        // randomness uses the synchronous plugin path.
        !randomProp &&
        shouldUseForceWorker(
          layoutExecution,
          rawNodes.length,
          rawEdges.length,
          iterations
        )

      if (useWorker) {
        store.ingestBounded(rawNodes, rawEdges, size, { deferLayout: true, config: replacementConfig })
        pendingControlledConfigRef.current = undefined
        const controller = runLayoutRef.current()
        return () => controller?.abort()
      }

      store.ingestBounded(rawNodes, rawEdges, size, { config: replacementConfig })
      pendingControlledConfigRef.current = undefined
      rebuildSceneNow(store, size)
      // The canvas repaints imperatively, but labels, accessible data, and
      // custom HTML marks are React overlays. Synchronize the completed
      // synchronous layout revision so they update in the same transaction
      // instead of waiting for hover or another unrelated render.
      publishLayoutState(store)
      scheduleRender()
    }
    // Gated on `stableLayoutConfig` (layout/ingest-affecting fields only), NOT
    // the full `stablePipelineConfig`. Render-only style/animation function
    // props are excluded there, so their identity churn no longer re-ingests +
    // setState every render (the loop that crashed continuously-animated
    // charts); genuine layout-parameter, data, and dimension changes still
    // re-ingest. Palette changes only rebuild the scene.
  }, [nodesProp, edgesProp, hasControlledGraph, hierarchyRoot, isHierarchical, adjustedWidth, adjustedHeight, stableLayoutConfig, layoutExecution, iterations, chartType, customNetworkLayout, randomProp, scheduleRender, clearAll, rebuildSceneNow, publishLayoutState])

  // ── Initial streaming data ───────────────────────────────────────────

  // Seed initial edges once. ingestEdge is additive (value +=); re-running
  // on StrictMode double-invoke or pushManyEdges identity churn would double
  // edge weights. Guard with a once-ref so the seed is mount-only in practice.
  const initialEdgesSeededRef = React.useRef(false)
  useEffect(() => {
    if (initialEdgesSeededRef.current) return
    if (initialEdges && initialEdges.length > 0) {
      initialEdgesSeededRef.current = true
      pushManyEdges(initialEdges)
    }
  }, [initialEdges, pushManyEdges])

  // Run after data/seed ingestion so mount and resize never project the old
  // topology first. Those effects already refresh geometry and color caches;
  // theme-only changes still need a synchronous build for HTML marks/labels.
  useEffect(() => {
    const store = storeRef.current
    if (!store || layoutAbortRef.current) return
    const previousSize = lastSceneSizeRef.current
    const resized = previousSize !== null &&
      (previousSize[0] !== adjustedWidth || previousSize[1] !== adjustedHeight)
    if (!dirtyRef.current && !resized) return
    // Push-mode topology survives resize without bounded re-ingestion.
    if (resized) store.runLayout([adjustedWidth, adjustedHeight])
    rebuildSceneNow(store, [adjustedWidth, adjustedHeight])
    setSceneState((state) => typeof state === "number" ? state + 1 : 0)
    scheduleRender()
  }, [currentTheme, adjustedWidth, adjustedHeight, rebuildSceneNow, scheduleRender])

  // A custom layout with no restyle handler paints its hover state off-canvas
  // (React overlays / HTML marks), so the canvas needs no redraw on pointer move.
  // Dirtying + redrawing a (possibly very wide) canvas every move is the dominant
  // hover cost on large custom-layout graphs, so skip the canvas work there — the
  // observation (customHoverBehavior) and the tooltip (setHoverData) still update
  // via React. Built-in charts and restyle-driven layouts keep the redraw.
  const hoverPaintsCanvas = (): boolean =>
    !customNetworkLayout || (storeRef.current?.hasCustomRestyle ?? false)

  hoverHandlerRef.current = (e: HoverPointerCoords) => {
    const paintsCanvas = hoverPaintsCanvas()
    const canvas = canvasRef.current
    if (!canvas) return
    const store = storeRef.current
    if (!store) {
      setCanvasMarkCursor(canvas)
      return
    }

    const result = resolveNetworkPointerHit({
      viewTransform: props.viewTransform,
      clientX: e.clientX,
      clientY: e.clientY,
      canvasRect: canvas.getBoundingClientRect(),
      margin,
      adjustedWidth,
      adjustedHeight,
      sceneNodes: store.sceneNodes,
      sceneEdges: store.sceneEdges,
      ...preparedNetworkCustomHits(store),
      nodeQuadtree: store.nodeQuadtree,
      maxNodeRadius: store.maxNodeRadius,
      includeEdges: store.lastCustomLayoutResult?.edgeHitTesting !== false && (enableHover || sceneCursorInventoryRef.current.edges)
    })
    setCanvasMarkCursor(
      canvas,
      result.kind === "hit" ? sceneMarkCursor(result.mark) : undefined
    )
    if (!enableHover) return

    if (result.kind !== "hit") {
      if (hoverRef.current) {
        hoverRef.current = null
        setHoverData(null)
        // Hover/tooltip only — do not dirty the retained scene. Selection
        // restyle is driven by React state → useLayoutSelectionSync.
        customHoverBehavior?.(null)
        if (paintsCanvas) scheduleRender()
      }
      return
    }

    hoverRef.current = result.hover
    setHoverData(result.hover)
    customHoverBehavior?.(result.hover)
    if (paintsCanvas) scheduleRender()
  }

  hoverLeaveRef.current = () => {
    setCanvasMarkCursor(canvasRef.current)
    if (hoverRef.current) {
      const paintsCanvas = hoverPaintsCanvas()
      hoverRef.current = null
      setHoverData(null)
      customHoverBehavior?.(null)
      if (paintsCanvas) scheduleRender()
    }
  }

  // ── Click handler ────────────────────────────────────────────────────

  const clickHandlerRef = useRef<(e: React.MouseEvent) => void>(() => {})

  clickHandlerRef.current = (e: React.MouseEvent) => {
    if (isAnnotationActivationTarget(e.target)) return
    frame.flushPointerMove(e)
    if (!customClickBehaviorProp && !onObservation) return
    const canvas = canvasRef.current
    if (!canvas) return
    const store = storeRef.current
    if (!store) return

    const result = resolveNetworkPointerHit({
      viewTransform: props.viewTransform,
      clientX: e.clientX,
      clientY: e.clientY,
      canvasRect: canvas.getBoundingClientRect(),
      margin,
      adjustedWidth,
      adjustedHeight,
      sceneNodes: store.sceneNodes,
      sceneEdges: store.sceneEdges,
      ...preparedNetworkCustomHits(store),
      nodeQuadtree: store.nodeQuadtree,
      maxNodeRadius: store.maxNodeRadius,
      includeEdges: store.lastCustomLayoutResult?.edgeHitTesting !== false
    })

    if (result.kind === "hit") {
      customClickBehavior(result.hover, {
        type: "activate",
        inputType: observationInputType(
          (e.nativeEvent as MouseEvent & { pointerType?: string }).pointerType
        )
      })
    } else if (result.kind === "miss") {
      customClickBehavior(null)
    }
  }

  // Pointer coalescing and leave handling come from useFrame.
  const onClick = useCallback(
    (e: React.MouseEvent) => clickHandlerRef.current(e),
    []
  )

  const onMouseMoveWrapped = useCallback(
    (e: HoverPointerCoords) => {
      if (!shouldHandleFramePointer(
        pointerStateRef, e, enableHover,
        sceneCursorInventoryRef.current.nodes || sceneCursorInventoryRef.current.edges,
        canvasRef.current, "mouse"
      )) return
      kbFocusIndexRef.current = -1
      focusedNavPointRef.current = null
      onPointerMove(e)
    },
    [canvasRef, enableHover, onPointerMove, pointerStateRef, kbFocusIndexRef, focusedNavPointRef]
  )
  // Canvas bursts need no synthetic event. Interactive overlays keep React
  // bubbling below, so a child's stopPropagation still suppresses chart hover.
  const pointerSurface = useRef<HTMLDivElement | null>(null)
  const onCanvasMouseMove = useCallback((event: MouseEvent) => {
    if (event.target === canvasRef.current || event.target === pointerSurface.current)
      onMouseMoveWrapped(event)
  }, [canvasRef, onMouseMoveWrapped])
  const pointerSurfaceRef = useCallback((element: HTMLDivElement | null) => {
    pointerSurface.current?.removeEventListener("mousemove", onCanvasMouseMove)
    pointerSurface.current = element
    element?.addEventListener("mousemove", onCanvasMouseMove)
  }, [onCanvasMouseMove])

  // ── Render function ──────────────────────────────────────────────────

  const cameraPaint = useNetworkCameraPaint(props.viewTransform, renderFnRef, hoverLeaveRef, kbFocusIndexRef)
  const layoutCommitPending = useNetworkLayoutCommit(props.viewTransform, storeRef.current)
  renderFnRef.current = () => {
    // The scheduled paint is also the commit boundary for burst layout work.
    // Commit before canvas guards so data/layout semantics do not depend on
    // whether this particular frame has a paint surface.
    if (!cameraPaint.current) {
      rafRef.current = null
      flushPendingLayout()
    }
    if (!frameRuntime.isActive && !cameraPaint.current) return
    // Retain the previous scene while a worker owns the next geometry.
    // Its completion builds and schedules paint; projecting before then
    // duplicates scene work and exposes nodes without final positions.
    if (layoutAbortRef.current && !cameraPaint.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const store = storeRef.current
    if (!store) return

    paintNetworkFrame({
      canvas,
      store,
      sceneRevisionDiagnostics: sceneRevisionDiagnosticsRef.current,
      size,
      margin,
      adjustedWidth,
      adjustedHeight,
      background,
      themeBackground,
      maxDevicePixelRatio,
      renderMode,
      viewTransform: props.viewTransform,
      cameraOnly: cameraPaint.current,
      layoutCommitPending: layoutCommitPending(store),
      hasBackgroundGraphics: Boolean(backgroundGraphics || store.customLayoutBackgrounds),
      dirtyRef,
      resolutionDirtyRef,
      lastFrameTimeRef,
      now: frameRuntime.now(),
      random: frameRuntime.random,
      reducedMotion: !!reducedMotionRef.current,
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
      scheduleNextFrame: () => {
        scheduleRender()
      },
      syncColorMap: () => syncColorMap(store),
      onSceneOrStyleChange: ({ inventoryChanged, geometryChanged }) => {
        if (inventoryChanged || geometryChanged) prepareNetworkCustomHits(store)
        if (store.lastCustomLayoutResult?.edgeHitTesting === false && hoverRef.current?.nodeOrEdge === "edge") hoverLeaveRef.current()
        if (inventoryChanged || geometryChanged) refreshKeyboardFocus()
        if (inventoryChanged) {
          if (!refreshNetworkCursorInventory(
            sceneCursorInventoryRef.current,
            store.sceneNodes,
            store.sceneEdges
          )) setCanvasMarkCursor(canvas)
        }
        if (
          (sceneCursorInventoryRef.current.nodes || sceneCursorInventoryRef.current.edges) &&
          (inventoryChanged || geometryChanged || cameraPaint.current)
        ) {
          rehitNetworkFrameCursor({
            canvas, pointer: pointerStateRef.current, store, margin,
            viewTransform: props.viewTransform,
            width: adjustedWidth, height: adjustedHeight,
            geometryMoved: geometryChanged,
            cursorInventory: sceneCursorInventoryRef.current
          })
        }
      }
    })
  }

  useCanvasMarkCursorCleanup(canvasRef)

  // ── Staleness timer ─────────────────────────────────────────────────

  useStalenessCheck(
    staleness,
    storeRef,
    dirtyRef,
    scheduleRender,
    isStale,
    setIsStale
  )

  // ── SSR path: render SVG instead of canvas ──────────────────────────

  // SSR + actual SSR-hydration only — pure CSR mounts skip the
  // wasted SVG render. See StreamXYFrame for the full rationale.
  if (renderSVG) {
    return NetworkSSRFrame({
      hydrationMarkup,
      layoutPending,
      tableId,
      props,
      store: ssrStore ?? storeRef.current,
      responsiveRef,
      size,
      margin,
      adjustedWidth,
      adjustedHeight,
      surfaceBackground,
      resolvedBackground,
      resolvedForeground
    })
  }

  // ── Render ───────────────────────────────────────────────────────────

  const store = storeRef.current
  const containerProps = networkFrameContainerProps(props, frameId, size, layoutPending, "visible")
  const perspectiveFrame = store.perspective.frame
  const perspectiveMode = store.lastCustomLayoutResult?.perspective

  return (
    <div
      {...containerProps}
      ref={responsiveRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    >
      {process.env.NODE_ENV !== "production" && storeRef.current && (
        <SceneRevisionDiagnosticsObserver
          store={storeRef.current}
          diagnostics={sceneRevisionDiagnosticsRef.current}
        />
      )}
      {networkFrameAccessibility(props, store, tableId, layoutPending ? undefined : store.getUpdateSnapshot().revisions.accessibility)}
      {/* Live region MUST live outside the role="img" wrapper — AT treats the
          image as atomic and never announces content nested inside it. */}
      <NetworkFrameLiveHover hoverStore={hoverStore} kbFocusIndexRef={kbFocusIndexRef} store={store} />
      <div
        // An image is atomic to assistive technology. HTML marks can contain
        // editors and buttons, so expose their subtree as a group instead.
        role={store.customLayoutHtmlMarks?.length ? "group" : "img"}
        aria-label={containerProps["aria-label"]}
        style={{ position: "relative", width: "100%", height: "100%" }}
        ref={pointerSurfaceRef}
        onMouseLeave={onPointerLeave}
        onClick={customClickBehaviorProp || onObservation ? onClick : undefined}
      >
        <div style={{ display: "contents" }} onMouseMove={onMouseMoveWrapped}>
          {layoutPending && layoutLoadingContent !== false && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 3,
                background: "var(--semiotic-bg, #fff)"
              }}
            >
              {renderLoadingState(
                true,
                size[0],
                size[1],
                layoutLoadingContent
              )}
            </div>
          )}
          <CanvasFrameBackground
            size={size}
            margin={margin}
            backdropFill={surfaceBackground ?? undefined}
            overflowVisible
          >
            <NetworkViewGroup view={props.viewTransform} width={adjustedWidth} height={adjustedHeight}>
              {composeOverlays(resolvedBackground, withNetworkPerspective(store.customLayoutBackgrounds, perspectiveFrame, perspectiveMode))}
            </NetworkViewGroup>
          </CanvasFrameBackground>
        </div>

        <canvas
          aria-hidden="true"
          ref={canvasRef}
          aria-label={networkFrameAriaLabel(store)}
          style={{
            position: "absolute",
            top: 0,
            left: 0
          }}
        />

        <div style={{ display: "contents" }} onMouseMove={onMouseMoveWrapped}>
          <NetworkSVGOverlay
            decorative
            viewTransform={props.viewTransform}
            width={adjustedWidth}
            height={adjustedHeight}
            totalWidth={size[0]}
            totalHeight={size[1]}
            margin={margin}
            labels={store.labels}
            sceneNodes={store.sceneNodes}
            title={title}
            description={description}
            legend={legend}
            legendPosition={legendPosition}
            legendLayout={legendLayout}
            legendHoverBehavior={legendHoverBehavior}
            legendClickBehavior={legendClickBehavior}
            legendHighlightedCategory={legendHighlightedCategory}
            legendIsolatedCategories={legendIsolatedCategories}
            foregroundGraphics={withNetworkPerspective(composeOverlays(
              resolvedForeground,
              withNetworkPerspective(wrapWithCustomLayoutSelection(
                store.customLayoutOverlays,
                layoutSelection ?? null
              ), perspectiveFrame, perspectiveMode)
            ), perspectiveFrame)}
            annotations={annotations}
            onAnnotationActivate={onAnnotationActivate}
            onObservation={annotationObservationCallback ?? onObservation}
            chartId={chartId}
            chartType="StreamNetworkFrame"
            autoPlaceAnnotations={autoPlaceAnnotations}
            svgAnnotationRules={svgAnnotationRules}
            annotationFrame={annotationFrame}
          />

          {/* HTML marks: a real-DOM layer above the canvas + SVG overlays, read
            straight from the store (same render-time read as customLayoutOverlays).
            `pointer-events: none` keeps the canvas authoritative for hit-testing. */}
          <NetworkHtmlMarksLayer
            viewTransform={props.viewTransform}
            marks={store.customLayoutHtmlMarks}
            margin={margin}
            selection={layoutSelection ?? null}
            width={adjustedWidth}
            height={adjustedHeight}
            viewport={props.viewport}
            htmlMarkCulling={props.htmlMarkCulling}
            onViewportChange={props.onViewportChange}
          />

          <NetworkFrameHover
            viewTransform={props.viewTransform}
            hoverStore={hoverStore}
            kbFocusIndexRef={kbFocusIndexRef}
            focusedNavPointRef={focusedNavPointRef}
            enableHover={enableHover}
            tooltipContent={tooltipContent}
            adjustedWidth={adjustedWidth}
            adjustedHeight={adjustedHeight}
            margin={margin}
            size={size}
          />
        </div>
      </div>
      {staleness?.showBadge && (
        <StalenessBadge
          isStale={isStale}
          position={staleness.badgePosition}
          state={staleness.state}
          settling={staleness.settling}
        />
      )}
      {/* end visual content */}
    </div>
  )
})), "StreamNetworkFrame")

export default StreamNetworkFrame
