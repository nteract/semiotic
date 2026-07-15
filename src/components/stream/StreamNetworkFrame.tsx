"use client"
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
  NetworkSceneNode,
  NetworkPipelineConfig,
  RealtimeNode,
  RealtimeEdge,
  EdgePush
} from "./networkTypes"
import type { HoverData } from "../realtime/types"
import { buildHoverData, type HoverPointerCoords } from "./hoverUtils"
import { DEFAULT_TENSION_CONFIG, DEFAULT_PARTICLE_STYLE } from "./networkTypes"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import {
  SceneRevisionDiagnosticsObserver,
  runSceneBuild,
  useSceneRevisionDiagnostics
} from "./sceneRevisionDiagnostics"
import { composeOverlays } from "./composeOverlays"
import { wrapWithCustomLayoutSelection } from "./customLayoutSelection"
import { useConfigSync, useLayoutSelectionSync } from "./streamStoreSync"
import {
  extractNetworkNavPoints,
  buildNavGraph,
  resolvePosition,
  nextNetworkIndex,
  type NavGraph
} from "./keyboardNav"
import { FocusRing } from "./FocusRing"
import { FlippingTooltip } from "../Tooltip/FlippingTooltip"
import { useFrame } from "./useFrame"
import { useStalenessCheck } from "./useStalenessCheck"
import { StalenessBadge } from "./StalenessBadge"
import { NetworkSVGOverlay } from "./NetworkSVGOverlay"
import { NetworkHtmlMarksLayer } from "./NetworkHtmlMarksLayer"
import { isServerEnvironment } from "./SceneToSVG"
import { NetworkSSRFrame } from "./NetworkSSRFrame"
import {
  useHydration,
  useWasHydratingFromSSR
} from "./useHydration"
import { CanvasFrameBackground, useFrameCanvasHost } from "./useCanvasFrameHost"
import { useStableShallow } from "./useStableShallow"
import {
  NetworkAccessibleDataTable,
  AriaLiveTooltip,
  ScreenReaderSummary,
  SkipToTableLink,
  computeNetworkAriaLabel
} from "./AccessibleDataTable"
import { filterSparseArray } from "../charts/shared/sparseArray"
import { renderLoadingState } from "../charts/shared/withChartWrapper"
import {
  canUseForceWorker,
  createFrameForceWorkerRequest,
  runForceLayoutWorker,
  shouldUseForceWorker
} from "./layouts/forceLayoutWorkerClient"

// Canvas setup

// Canvas renderers
import { DefaultNetworkTooltip } from "./networkDefaultTooltip"
import {
  buildNetworkPipelineConfig,
  buildNetworkLayoutConfigSignature
} from "./networkPipelineConfig"

import { paintNetworkFrame } from "./networkFramePaint"
import {
  networkEdgeFallbackColor,
  resolveNetworkEdgeColor,
  resolveNetworkEdgeEndpoint,
  resolveNetworkNodeColor,
  resolveNetworkParticleColor,
  syncNetworkNodeColorMap
} from "./networkColorAccessors"
import { resolveNetworkPointerHit } from "./networkFrameInteraction"
import {
  isInteractiveKeyboardTarget,
  observationInputType
} from "../charts/shared/semanticInteractions"
import { isAnnotationActivationTarget } from "../charts/shared/annotationActivation"
import { useNetworkObservationBehaviors } from "./networkFrameObservations"
import { shouldContinueNetworkAnimation } from "./networkFrameAnimation"

// ── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_MARGIN = { top: 20, right: 80, bottom: 20, left: 80 }
const CENTERED_MARGIN = { top: 40, right: 40, bottom: 40, left: 40 }
const CENTERED_TYPES = new Set(["chord", "force", "circlepack", "orbit"])
const DEFAULT_SIZE: [number, number] = [800, 600]

// ── StreamNetworkFrame ─────────────────────────────────────────────────

const StreamNetworkFrame = memo(forwardRef<
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
    edgeIdAccessor,
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
    className,
    background,
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
    accessibleTable = true,
    description,
    summary,
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
  // Network has two margin defaults — CENTERED for radial chart types, the
  // standard DEFAULT_MARGIN for everything else. Resolve the family default
  // before handing it to useFrame.
  const baseMargin = CENTERED_TYPES.has(chartType)
    ? CENTERED_MARGIN
    : DEFAULT_MARGIN
  // dirtyRef declared before useFrame so it can be threaded in for the
  // theme-change effect. Network inits to true (load-bearing).
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
    foregroundGraphics,
    backgroundGraphics,
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
    resolvedForeground,
    resolvedBackground,
    transition,
    introEnabled,
    tableId,
    rafRef, renderFnRef, scheduleRender, frameRuntime,
    currentTheme
  } = frame

  // ── Hydration boundary ─────────────────────────────────────────────────
  // See `HYDRATION.md` for the full recipe + `StreamXYFrame` for the
  // canonical comment. SVG-branch gate is
  // `isServerEnvironment || (!hydrated && wasHydratingFromSSR)`:
  // SSR pass + first client render after SSR get the SVG branch
  // (matches server output); pure CSR mounts skip it.
  const hydrated = useHydration()
  const wasHydratingFromSSR = useWasHydratingFromSSR()
  const safeNodes = useMemo(() => filterSparseArray(nodesProp), [nodesProp])
  const safeEdges = useMemo(
    () => (Array.isArray(edgesProp) ? filterSparseArray(edgesProp) : edgesProp),
    [edgesProp]
  )

  const tensionConfig = useMemo(
    () => ({ ...DEFAULT_TENSION_CONFIG, ...tensionConfigProp }),
    [tensionConfigProp]
  )

  const particleStyle = useMemo(
    () => ({ ...DEFAULT_PARTICLE_STYLE, ...particleStyleProp }),
    [particleStyleProp]
  )

  // ── Pipeline config ──────────────────────────────────────────────────

  const pipelineConfig = useMemo(
    (): NetworkPipelineConfig =>
      buildNetworkPipelineConfig({
        chartType,
        clock: frameRuntime.now,
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
        edgeIdAccessor,
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
        currentTheme
      }),
    [chartType, frameRuntime.now, randomProp, seed, nodeIDAccessor, sourceAccessor, targetAccessor, valueAccessor, edgeIdAccessor, childrenAccessor, hierarchySum, orientation, nodeAlign, nodePaddingRatio, nodeWidth, iterations, forceStrength, padAngle, groupWidth, sortGroups, edgeSort, treeOrientation, edgeType, padding, paddingTop, tensionConfig, showParticles, particleStyle, nodeStyle, edgeStyle, nodeLabel, showLabels, labelMode, colorBy, colorScheme, edgeColorBy, edgeOpacity, colorByDepth, nodeSize, nodeSizeRange, decay, pulse, transition, introEnabled, staleness, thresholds, orbitMode, orbitSize, orbitSpeed, orbitRevolution, orbitRevolutionStyle, orbitEccentricity, orbitShowRings, orbitAnimated, customNetworkLayout, onLayoutError, layoutConfig, currentTheme]
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
  // edgeStyle, orbitRevolution, nodeSize, labels, colors, realtime encoding,
  // animation) are deliberately excluded — those are applied by the
  // `updateConfig` effect + the next `buildScene` without a re-ingest. The
  // hierarchy-ingest effect below depends on this instead of the full
  // pipeline config so a parent passing fresh inline-arrow *style* callbacks
  // on every render can't re-ingest + setState in a loop (which compounds
  // with a continuous animation's frame loop into React's max-update-depth
  // crash), while genuine layout-parameter changes still take effect.
  //
  // `layoutConfig` is deliberately EXCLUDED: it's threaded to a custom layout
  // as `ctx.config` and read only during `buildScene` (the custom layout) —
  // never during ingest, which rebuilds the node/edge maps the config doesn't
  // touch. So a `layoutConfig` change re-runs the layout via the
  // `updateConfig` effect → render-loop `buildScene` (an in-place re-layout),
  // with no topology re-ingest. That makes config-driven custom-layout updates
  // — interaction state, styling, animation progress — cheap to drive per frame.
  const stableLayoutConfig = useStableShallow(
    buildNetworkLayoutConfigSignature({
      chartType,
      nodeIDAccessor,
      sourceAccessor,
      targetAccessor,
      valueAccessor,
      edgeIdAccessor,
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
      random: randomProp,
      seed,
      tensionConfig,
      customNetworkLayout,
      orbitMode,
      orbitSize,
      orbitEccentricity
    })
  )

  const lastFrameTimeRef = useRef(0)
  const lastAnnotationFrameTimeRef = useRef(0)
  const pendingAnnotationFrameRef = useRef(false)

  const storeRef = useRef<NetworkPipelineStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = new NetworkPipelineStore(stablePipelineConfig)
  }
  const sceneRevisionDiagnosticsRef = useSceneRevisionDiagnostics("StreamNetworkFrame")
  const buildSceneWithDiagnostics = useCallback((store: NetworkPipelineStore, sceneSize: [number, number], isTransitioning = false) => runSceneBuild(sceneRevisionDiagnosticsRef.current, store, () => store.buildScene(sceneSize), isTransitioning), [sceneRevisionDiagnosticsRef])

  const [hoverData, setHoverData] = useState<HoverData | null>(null)
  const [_layoutVersion, setLayoutVersion] = useState(0)
  const [annotationFrame, setAnnotationFrame] = useState(0)
  const [isStale, setIsStale] = useState(false)
  const [layoutPending, setLayoutPending] = useState(false)
  const layoutRequestRef = useRef(0)
  const layoutAbortRef = useRef<AbortController | null>(null)
  const hydrationLayoutHandledRef = useRef(false)
  const onLayoutStateChangeRef = useRef(onLayoutStateChange)
  onLayoutStateChangeRef.current = onLayoutStateChange
  const pipelineConfigRef = useRef(stablePipelineConfig)
  pipelineConfigRef.current = stablePipelineConfig

  const hoverRef = useRef<typeof hoverData>(null)

  // ── Color functions ──────────────────────────────────────────────────

  const nodeColorMap = useRef(new Map<string, string>())
  const colorIndexRef = useRef(0)

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

  // customLayout overlays are read straight from `storeRef.current.customLayoutOverlays`
  // at render time (see the `foregroundGraphics` composition below) — the same
  // pattern as StreamXYFrame. Every overlay-changing path (config/data/theme/
  // hover) already sets `dirtyRef` + `scheduleRender`, and the render loop's
  // throttled `setAnnotationFrame` re-renders to pick up the fresh overlays.
  // So no separate React state / per-change setState is needed (and can't
  // compound with a per-frame morph into a "Maximum update depth" storm).

  // A render-only config change (e.g. the resolved selection predicate driving
  // dim/highlight) flows through here too: updateConfig → dirty → render-loop
  // buildScene re-emits the overlays → setAnnotationFrame re-render reads them.
  useConfigSync(storeRef, stablePipelineConfig, dirtyRef, scheduleRender)

  // Bridge the resolved custom-layout selection into the scene store +
  // repaint. See useLayoutSelectionSync for why this is a legitimate
  // React→canvas sync (selection is React-assembled), not a store relay.
  useLayoutSelectionSync(storeRef, layoutSelection, dirtyRef, scheduleRender)

  // Theme-change repaint (clearCSSColorCache + dirty + scheduleRender)
  // is handled by useFrame above when themeDirtyRef is provided. But there's
  // a second surface to refresh: `nodeColorMap` caches the palette color per
  // node id and is only resynced inside `runLayout`. Theme changes hit
  // `updateConfig` + the useFrame repaint, but not `runLayout` — without the
  // resync below, particle/hover colors (which read from nodeColorMap) would
  // stay on the previous theme's palette. Rebuild the scene (cheap — just
  // re-runs the layout plugin's scene-emit step against existing node
  // positions) and copy the fresh fills into the map.
  useEffect(() => {
    const store = storeRef.current
    if (!store) return
    buildSceneWithDiagnostics(store, [adjustedWidth, adjustedHeight])
    colorIndexRef.current = syncNetworkNodeColorMap({
      sceneNodes: store.sceneNodes,
      nodes: store.nodes.values(),
      nodeColorMap: nodeColorMap.current,
      colorScheme
    })
    dirtyRef.current = true
    scheduleRender()
  }, [currentTheme, adjustedWidth, adjustedHeight, buildSceneWithDiagnostics, scheduleRender, colorScheme])

  // ── Layout execution ─────────────────────────────────────────────────

  const runLayout = useCallback(() => {
    const store = storeRef.current
    if (!store) return

    store.runLayout([adjustedWidth, adjustedHeight])
    buildSceneWithDiagnostics(store, [adjustedWidth, adjustedHeight])
    dirtyRef.current = true

    colorIndexRef.current = syncNetworkNodeColorMap({
      sceneNodes: store.sceneNodes,
      nodes: store.nodes.values(),
      nodeColorMap: nodeColorMap.current,
      colorScheme
    })

    setLayoutVersion(store.layoutVersion)

    if (onTopologyChange) {
      const { nodes, edges } = store.getLayoutData()
      onTopologyChange(nodes, edges)
    }
  }, [
    adjustedWidth,
    adjustedHeight,
    buildSceneWithDiagnostics,
    onTopologyChange,
    colorScheme
  ])

  // ── Push API ─────────────────────────────────────────────────────────

  // Drop sparse entries before they reach `NetworkPipelineStore` —
  // mirrors the bounded-ingest hardening. `ref.push(null)` or
  // `ref.pushMany([null, valid])` would otherwise crash node/edge
  // accessor reads inside `ingestEdge`.
  const pushEdge = useCallback(
    (edge: EdgePush) => {
      if (edge == null || typeof edge !== "object") return
      const store = storeRef.current
      if (!store) return
      const needsRelayout = store.ingestEdge(edge)
      if (needsRelayout) {
        runLayout()
      }
      scheduleRender()
    },
    [runLayout, scheduleRender]
  )

  const pushManyEdges = useCallback(
    (edges: EdgePush[]) => {
      const store = storeRef.current
      if (!store) return
      let needsRelayout = false
      for (const edge of edges) {
        if (edge == null || typeof edge !== "object") continue
        if (store.ingestEdge(edge)) {
          needsRelayout = true
        }
      }
      if (needsRelayout) {
        runLayout()
      }
      scheduleRender()
    },
    [runLayout, scheduleRender]
  )

  const clearAll = useCallback(() => {
    storeRef.current?.clear()
    nodeColorMap.current.clear()
    colorIndexRef.current = 0
    // clear() bumps layoutVersion monotonically; sync React state to the new
    // value so the render fires (never force 0 — that can equal the last-seen
    // value and skip the post-clear repaint).
    setLayoutVersion(storeRef.current?.layoutVersion ?? 0)
    setHoverData(null)
    hoverRef.current = null
    dirtyRef.current = true
    scheduleRender()
  }, [scheduleRender])

  const forceRelayout = useCallback(() => {
    const store = storeRef.current
    if (!store) return
    store.tension += 999
    runLayout()
    scheduleRender()
  }, [runLayout, scheduleRender])

  useImperativeHandle(
    ref,
    () => ({
      push: pushEdge,
      pushMany: pushManyEdges,
      removeNode: (id: string) => {
        const removed = storeRef.current?.removeNode(id) ?? false
        if (removed) {
          // Clear hover if the removed node was being hovered
          const hoveredId = hoverRef.current?.data
            ? typeof nodeIDAccessor === "function"
              ? nodeIDAccessor(hoverRef.current.data)
              : hoverRef.current.data[nodeIDAccessor]
            : undefined
          if (
            hoverRef.current &&
            hoverRef.current.nodeOrEdge === "node" &&
            hoveredId === id
          ) {
            hoverRef.current = null
            setHoverData(null)
          }
          nodeColorMap.current.delete(id)
          runLayout()
          dirtyRef.current = true
          scheduleRender()
        }
        return removed
      },
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
            } else if (edgeIdAccessor && hoveredEdge) {
              const getEid =
                typeof edgeIdAccessor === "function"
                  ? edgeIdAccessor
                  : (d: Datum) => d?.[edgeIdAccessor]
              matches = getEid(hoveredEdge) === sourceIdOrEdgeId
            } else {
              matches = true // no accessor to compare — conservatively clear
            }
            if (matches) {
              hoverRef.current = null
              setHoverData(null)
            }
          }
          runLayout()
          dirtyRef.current = true
          scheduleRender()
        }
        return removed
      },
      updateNode: (id: string, updater: (data: Datum) => Datum) => {
        const previous = storeRef.current?.updateNode(id, updater) ?? null
        if (previous) {
          dirtyRef.current = true
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
        if (previous.length > 0) {
          runLayout()
          dirtyRef.current = true
          scheduleRender()
        }
        return previous
      },
      clear: clearAll,
      getTopology: () =>
        storeRef.current?.getLayoutData() ?? { nodes: [], edges: [] },
      getCustomLayout: () => storeRef.current?.lastCustomLayoutResult ?? null,
      getLayoutFailure: () => storeRef.current?.lastCustomLayoutFailure ?? null,
      getTopologyDiff: () => {
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
      getTension: () => storeRef.current?.tension ?? 0
    }),
    [pushEdge, pushManyEdges, clearAll, forceRelayout, nodeIDAccessor, runLayout, scheduleRender, edgeIdAccessor]
  )

  // ── Bounded data ingestion ───────────────────────────────────────────

  // Determine if this is a hierarchical chart type
  const isHierarchical = [
    "tree",
    "cluster",
    "treemap",
    "circlepack",
    "partition",
    "orbit"
  ].includes(chartType)
  // Resolve hierarchy root: `data` prop or single-object `edges` prop
  const hierarchyRoot = isHierarchical
    ? dataProp || (!Array.isArray(edgesProp) ? edgesProp : undefined)
    : undefined

  useEffect(() => {
    const store = storeRef.current
    if (!store) return
    const requestId = ++layoutRequestRef.current
    layoutAbortRef.current?.abort()
    layoutAbortRef.current = null

    if (isHierarchical && hierarchyRoot) {
      // Hierarchy data: single root object. Emit "ready" like the other
      // synchronous paths — a chart-type/data switch away from a pending
      // worker layout must not leave consumers stuck on "pending".
      store.ingestHierarchy(hierarchyRoot, [adjustedWidth, adjustedHeight])
      buildSceneWithDiagnostics(store, [adjustedWidth, adjustedHeight])
      setLayoutPending(false)
      onLayoutStateChangeRef.current?.("ready")
      dirtyRef.current = true
      scheduleRender()
    } else {
      // Graph data: nodes + edges arrays
      const rawNodes = safeNodes
      const rawEdges = Array.isArray(safeEdges) ? safeEdges : []

      if (rawNodes.length === 0 && rawEdges.length === 0) {
        // Controlled data went non-empty → empty: tear down the previous
        // scene (topology, hover, color caches) so the frame renders empty
        // instead of retaining stale marks. Gated on the props actually
        // being provided — push mode omits them, and its store contents
        // must survive this effect re-running on resize/palette changes.
        if (
          (nodesProp != null || edgesProp != null) &&
          (store.nodes.size > 0 || store.edges.size > 0)
        ) {
          clearAll()
        }
        // Nothing to lay out — the frame is no longer busy, so a consumer
        // watching a previously-pending worker layout gets released.
        setLayoutPending(false)
        onLayoutStateChangeRef.current?.("ready")
        return
      }

      const size: [number, number] = [adjustedWidth, adjustedHeight]
      const useWorker =
        chartType === "force" &&
        !customNetworkLayout &&
        canUseForceWorker() &&
        // A callback cannot cross the worker boundary. A serializable seed
        // does, so seeded layouts retain worker execution while injected
        // randomness deliberately uses the synchronous plugin path.
        !randomProp &&
        shouldUseForceWorker(
          layoutExecution,
          rawNodes.length,
          rawEdges.length,
          iterations
        )

      // The SSR/first-hydration branch above already produced deterministic
      // geometry synchronously. Keep it instead of immediately replacing it
      // with an equivalent worker request after hydration.
      if (
        useWorker &&
        wasHydratingFromSSR &&
        !hydrationLayoutHandledRef.current &&
        store.sceneNodes.length > 0
      ) {
        hydrationLayoutHandledRef.current = true
        setLayoutPending(false)
        onLayoutStateChangeRef.current?.("ready")
        dirtyRef.current = true
        scheduleRender()
        return
      }

      if (useWorker) {
        const controller = new AbortController()
        layoutAbortRef.current = controller
        const previousPositions = store._lastPositionSnapshot

        store.ingestBounded(rawNodes, rawEdges, size, { deferLayout: true })
        const layoutData = store.getLayoutData()
        const request = createFrameForceWorkerRequest(
          layoutData.nodes,
          layoutData.edges,
          pipelineConfigRef.current,
          size,
          previousPositions
        )

        setLayoutPending(true)
        onLayoutStateChangeRef.current?.("pending")
        runForceLayoutWorker(request, controller.signal)
          .then(({ positions }) => {
            if (requestId !== layoutRequestRef.current) return
            store.applyForceLayoutPositions(positions, size)
            buildSceneWithDiagnostics(store, size)

            // Keep the hover/particle color cache in parity with the normal
            // synchronous layout path. Scene fills are authoritative because
            // they include nodeStyle, colorBy, and theme resolution.
            colorIndexRef.current = syncNetworkNodeColorMap({
              sceneNodes: store.sceneNodes,
              nodes: store.nodes.values(),
              nodeColorMap: nodeColorMap.current,
              colorScheme
            })

            setLayoutPending(false)
            onLayoutStateChangeRef.current?.("ready")
            setLayoutVersion(store.layoutVersion)
            dirtyRef.current = true
            scheduleRender()
          })
          .catch((error: Error) => {
            if (error.name === "AbortError") return
            if (requestId !== layoutRequestRef.current) return
            // Worker construction/runtime failures retain correctness through
            // the established synchronous plugin path.
            store.runLayout(size)
            buildSceneWithDiagnostics(store, size)
            colorIndexRef.current = syncNetworkNodeColorMap({
              sceneNodes: store.sceneNodes,
              nodes: store.nodes.values(),
              nodeColorMap: nodeColorMap.current,
              colorScheme
            })
            setLayoutPending(false)
            onLayoutStateChangeRef.current?.("error")
            setLayoutVersion(store.layoutVersion)
            dirtyRef.current = true
            scheduleRender()
          })

        return () => controller.abort()
      }

      store.ingestBounded(rawNodes, rawEdges, size)
      buildSceneWithDiagnostics(store, size)
      setLayoutPending(false)
      onLayoutStateChangeRef.current?.("ready")

      // Sync nodeColorMap from actual scene fills so particle/hover colors
      // match the rendered node colors exactly (same logic as runLayout sync)
      colorIndexRef.current = syncNetworkNodeColorMap({
        sceneNodes: store.sceneNodes,
        nodes: store.nodes.values(),
        nodeColorMap: nodeColorMap.current,
        colorScheme
      })

      dirtyRef.current = true
      scheduleRender()
    }
    // Gated on `stableLayoutConfig` (layout/ingest-affecting fields only), NOT
    // the full `stablePipelineConfig`. Render-only style/animation function
    // props are excluded there, so their identity churn no longer re-ingests +
    // setState every render (the loop that crashed continuously-animated
    // charts); genuine layout-parameter, data, dimension, and palette changes
    // still re-ingest. See the `stableLayoutConfig` definition above.
  }, [safeNodes, safeEdges, nodesProp, edgesProp, dataProp, hierarchyRoot, isHierarchical, adjustedWidth, adjustedHeight, stableLayoutConfig, layoutExecution, iterations, wasHydratingFromSSR, chartType, customNetworkLayout, randomProp, scheduleRender, clearAll, colorScheme, buildSceneWithDiagnostics])

  // ── Initial streaming data ───────────────────────────────────────────

  useEffect(() => {
    if (initialEdges && initialEdges.length > 0) {
      pushManyEdges(initialEdges)
    }
    // Only run on mount
  }, [initialEdges, pushManyEdges])

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
  const { hoverHandlerRef, hoverLeaveRef, onPointerMove, onPointerLeave } =
    frame

  // A custom layout with no restyle handler paints its hover state off-canvas
  // (React overlays / HTML marks), so the canvas needs no redraw on pointer move.
  // Dirtying + redrawing a (possibly very wide) canvas every move is the dominant
  // hover cost on large custom-layout graphs, so skip the canvas work there — the
  // observation (customHoverBehavior) and the tooltip (setHoverData) still update
  // via React. Built-in charts and restyle-driven layouts keep the redraw.
  const hoverPaintsCanvas = (): boolean =>
    !customNetworkLayout || (storeRef.current?.hasCustomRestyle ?? false)

  hoverHandlerRef.current = (e: HoverPointerCoords) => {
    if (!enableHover) return
    const paintsCanvas = hoverPaintsCanvas()
    const canvas = canvasRef.current
    if (!canvas) return
    const store = storeRef.current
    if (!store) return

    const result = resolveNetworkPointerHit({
      clientX: e.clientX,
      clientY: e.clientY,
      canvasRect: canvas.getBoundingClientRect(),
      margin,
      adjustedWidth,
      adjustedHeight,
      sceneNodes: store.sceneNodes,
      sceneEdges: store.sceneEdges,
      nodeQuadtree: store.nodeQuadtree,
      maxNodeRadius: store.maxNodeRadius
    })

    if (result.kind !== "hit") {
      if (hoverRef.current) {
        hoverRef.current = null
        setHoverData(null)
        if (customHoverBehavior) {
          customHoverBehavior(null)
          if (paintsCanvas) dirtyRef.current = true
        }
        if (paintsCanvas) scheduleRender()
      }
      return
    }

    hoverRef.current = result.hover
    setHoverData(result.hover)
    if (customHoverBehavior) {
      customHoverBehavior(result.hover)
      if (paintsCanvas) dirtyRef.current = true
    }
    if (paintsCanvas) scheduleRender()
  }

  hoverLeaveRef.current = () => {
    if (hoverRef.current) {
      const paintsCanvas = hoverPaintsCanvas()
      hoverRef.current = null
      setHoverData(null)
      if (customHoverBehavior) {
        customHoverBehavior(null)
        if (paintsCanvas) dirtyRef.current = true
      }
      if (paintsCanvas) scheduleRender()
    }
  }

  // ── Click handler ────────────────────────────────────────────────────

  const clickHandlerRef = useRef<(e: React.MouseEvent) => void>(() => {})

  clickHandlerRef.current = (e: React.MouseEvent) => {
    if (isAnnotationActivationTarget(e.target)) return
    if (!customClickBehaviorProp && !onObservation) return
    const canvas = canvasRef.current
    if (!canvas) return
    const store = storeRef.current
    if (!store) return

    const result = resolveNetworkPointerHit({
      clientX: e.clientX,
      clientY: e.clientY,
      canvasRect: canvas.getBoundingClientRect(),
      margin,
      adjustedWidth,
      adjustedHeight,
      sceneNodes: store.sceneNodes,
      sceneEdges: store.sceneEdges,
      nodeQuadtree: store.nodeQuadtree,
      maxNodeRadius: store.maxNodeRadius
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

  // pointermove coalescing  // pointermove coalescing + onPointerLeave come from useFrame above.
  const onClick = useCallback(
    (e: React.MouseEvent) => clickHandlerRef.current(e),
    []
  )

  // ── Keyboard navigation ───────────────────────────────────────────

  const kbFocusIndexRef = useRef(-1)
  const focusedNavPointRef = useRef<{
    shape?: string
    w?: number
    h?: number
  } | null>(null)
  const neighborIndexRef = useRef(-1)
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isInteractiveKeyboardTarget(e)) return
      const store = storeRef.current
      if (!store) return
      const clearFocus = () => {
        kbFocusIndexRef.current = -1
        focusedNavPointRef.current = null
        neighborIndexRef.current = -1
        hoverRef.current = null
        setHoverData(null)
        if (customHoverBehavior) {
          customHoverBehavior(null)
          dirtyRef.current = true
        }
        scheduleRender()
      }

      // Always rebuild NavGraph from current sceneNodes — positions change during
      // force simulation ticks and transition interpolation, so caching risks stale coordinates
      const navPoints = extractNetworkNavPoints(
        store.sceneNodes as NetworkSceneNode[]
      )
      if (navPoints.length === 0) {
        if (kbFocusIndexRef.current >= 0) clearFocus()
        return
      }
      const graph: NavGraph = buildNavGraph(navPoints)

      const requestedIndex = kbFocusIndexRef.current
      let current = requestedIndex
      if (current >= graph.flat.length) {
        clearFocus()
        current = -1
      }

      // Enter is reserved for the network-specific "follow connected edge"
      // navigation contract. Space activates the currently focused node.
      if (e.key === " " && current >= 0) {
        e.preventDefault()
        const point = graph.flat[current]
        customClickBehavior(buildHoverData(point.datum || {}, point.x, point.y, {
          nodeOrEdge: "node"
        }), { type: "activate", inputType: "keyboard" })
        return
      }

      if (current < 0) {
        if (e.key === "Escape") return
        const isNav = [
          "ArrowRight",
          "ArrowLeft",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
          "PageUp",
          "PageDown",
          "Enter"
        ].includes(e.key)
        if (!isNav) return
        e.preventDefault()
        kbFocusIndexRef.current = 0
        neighborIndexRef.current = -1
        const point = graph.flat[0]
        focusedNavPointRef.current = {
          shape: point.shape,
          w: point.w,
          h: point.h
        }
        const rawDatum = point.datum || {}
        const hover: HoverData = buildHoverData(rawDatum, point.x, point.y, {
          nodeOrEdge: "node"
        })
        hoverRef.current = hover
        setHoverData(hover)
        if (customHoverBehavior) {
          customHoverBehavior(hover, { type: "focus", inputType: "keyboard" })
          dirtyRef.current = true
        }
        scheduleRender()
        return
      }

      const pos = resolvePosition(graph, current)
      const next = nextNetworkIndex(
        e.key,
        pos,
        graph,
        store.sceneEdges ?? [],
        neighborIndexRef
      )
      if (next === null) return

      e.preventDefault()

      if (next < 0) {
        clearFocus()
        return
      }

      kbFocusIndexRef.current = next
      const point = graph.flat[next]
      focusedNavPointRef.current = {
        shape: point.shape,
        w: point.w,
        h: point.h
      }
      const rawDatum = point.datum || {}
      const hover: HoverData = {
        data: rawDatum,
        x: point.x,
        y: point.y,
        __semioticHoverData: true,
        nodeOrEdge: "node"
      }
      hoverRef.current = hover
      setHoverData(hover)
      if (customHoverBehavior) {
        customHoverBehavior(hover, { type: "focus", inputType: "keyboard" })
        dirtyRef.current = true
      }
      scheduleRender()
    },
    [customClickBehavior, customHoverBehavior, scheduleRender]
  )

  const onMouseMoveWrapped = useCallback(
    (e: React.MouseEvent) => {
      kbFocusIndexRef.current = -1
      focusedNavPointRef.current = null
      onPointerMove(e)
    },
    [onPointerMove]
  )

  // ── Render function ──────────────────────────────────────────────────

  renderFnRef.current = () => {
    rafRef.current = null
    if (!frameRuntime.isActive) return
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
      renderMode,
      hasBackgroundGraphics: Boolean(backgroundGraphics),
      dirtyRef,
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
      }
    })
  }

  const { canvasRef } = useFrameCanvasHost(frame, {
    hydrated,
    wasHydratingFromSSR,
    storeRef,
    dirtyRef,
    canvasPaintDependencies: [chartType, adjustedWidth, adjustedHeight, background, backgroundGraphics, renderMode, scheduleRender],
  })

  // ── Staleness timer ─────────────────────────────────────────────────

  useStalenessCheck(
    staleness,
    storeRef,
    dirtyRef,
    scheduleRender,
    isStale,
    setIsStale
  )

  // ── Tooltip ──────────────────────────────────────────────────────────

  const tooltipElement =
    enableHover && hoverData ? (
      <FlippingTooltip
        x={hoverData.x}
        y={hoverData.y}
        containerWidth={adjustedWidth}
        containerHeight={adjustedHeight}
        margin={margin}
        className="stream-network-tooltip"
        zIndex={2}
      >
        {tooltipContent ? (
          tooltipContent(hoverData)
        ) : (
          <DefaultNetworkTooltip data={hoverData} />
        )}
      </FlippingTooltip>
    ) : null

  // ── SSR path: render SVG instead of canvas ──────────────────────────

  // SSR + actual SSR-hydration only — pure CSR mounts skip the
  // wasted SVG render. See StreamXYFrame for the full rationale.
  if (isServerEnvironment || (!hydrated && wasHydratingFromSSR)) {
    return <NetworkSSRFrame props={props} store={storeRef.current} responsiveRef={responsiveRef} size={size} margin={margin} adjustedWidth={adjustedWidth} adjustedHeight={adjustedHeight} resolvedBackground={resolvedBackground} resolvedForeground={resolvedForeground} />
  }

  // ── Render ───────────────────────────────────────────────────────────

  const store = storeRef.current

  return (
    <div
      ref={responsiveRef}
      className={`stream-network-frame${className ? ` ${className}` : ""}`}
      role="group"
      aria-label={
        description || (typeof title === "string" ? title : "Network chart")
      }
      tabIndex={0}
      aria-busy={layoutPending || undefined}
      style={{
        position: "relative",
        width: responsiveWidth ? "100%" : size[0],
        height: responsiveHeight ? "100%" : size[1],
        overflow: "visible"
      }}
      onKeyDown={onKeyDown}
    >
      {process.env.NODE_ENV !== "production" && storeRef.current && (
        <SceneRevisionDiagnosticsObserver
          store={storeRef.current}
          diagnostics={sceneRevisionDiagnosticsRef.current}
        />
      )}
      {accessibleTable && <SkipToTableLink tableId={tableId} />}
      {accessibleTable && (
        <NetworkAccessibleDataTable
          nodes={store?.sceneNodes ?? []}
          edges={store?.sceneEdges ?? []}
          chartType="Network chart"
          tableId={tableId}
          chartTitle={typeof title === "string" ? title : undefined}
        />
      )}
      <ScreenReaderSummary summary={summary} />
      {/* Live region MUST live outside the role="img" wrapper — AT treats the
          image as atomic and never announces content nested inside it. */}
      <AriaLiveTooltip hoverPoint={hoverData} />
      <div
        role="img"
        aria-label={
          description || (typeof title === "string" ? title : "Network chart")
        }
        style={{ position: "relative", width: "100%", height: "100%" }}
        onMouseMove={enableHover ? onMouseMoveWrapped : undefined}
        onMouseLeave={enableHover ? onPointerLeave : undefined}
        onClick={customClickBehaviorProp || onObservation ? onClick : undefined}
      >
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
        <CanvasFrameBackground size={size} margin={margin} overflowVisible>
          {resolvedBackground}
        </CanvasFrameBackground>

        <canvas
          ref={canvasRef}
          aria-label={computeNetworkAriaLabel(
            store?.sceneNodes?.length ?? 0,
            store?.sceneEdges?.length ?? 0,
            "Network chart"
          )}
          style={{
            position: "absolute",
            top: 0,
            left: 0
          }}
        />

        <NetworkSVGOverlay
          width={adjustedWidth}
          height={adjustedHeight}
          totalWidth={size[0]}
          totalHeight={size[1]}
          margin={margin}
          labels={store?.labels || []}
          sceneNodes={store?.sceneNodes}
          title={title}
          legend={legend}
          legendPosition={legendPosition}
          legendLayout={legendLayout}
          legendHoverBehavior={legendHoverBehavior}
          legendClickBehavior={legendClickBehavior}
          legendHighlightedCategory={legendHighlightedCategory}
          legendIsolatedCategories={legendIsolatedCategories}
          foregroundGraphics={composeOverlays(
            resolvedForeground,
            wrapWithCustomLayoutSelection(
              storeRef.current?.customLayoutOverlays,
              layoutSelection ?? null
            )
          )}
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
          marks={store?.customLayoutHtmlMarks}
          margin={margin}
          selection={layoutSelection ?? null}
        />

        <FocusRing
          active={kbFocusIndexRef.current >= 0}
          hoverPoint={hoverData}
          margin={margin}
          size={size}
          shape={
            focusedNavPointRef.current?.shape as
              | "circle"
              | "rect"
              | "wedge"
              | undefined
          }
          width={focusedNavPointRef.current?.w}
          height={focusedNavPointRef.current?.h}
        />

        {tooltipElement}

        {staleness?.showBadge && (
          <StalenessBadge
            isStale={isStale}
            position={staleness.badgePosition}
          />
        )}
      </div>
      {/* end role="img" */}
    </div>
  )
}))

StreamNetworkFrame.displayName = "StreamNetworkFrame"
export default StreamNetworkFrame
