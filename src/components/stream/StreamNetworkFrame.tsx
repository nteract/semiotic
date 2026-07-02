"use client"
import type { Datum } from "../charts/shared/datumTypes"
import { formatVal, smartTooltipEntries } from "../charts/shared/tooltipUtils"
import * as React from "react"
import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useImperativeHandle,
  forwardRef
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
import { composeOverlays } from "./composeOverlays"
import { wrapWithCustomLayoutSelection } from "./customLayoutSelection"
import { useConfigSync, useLayoutSelectionSync } from "./streamStoreSync"
import { findNearestNetworkNode } from "./NetworkCanvasHitTester"
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
import { resolveThemeSemanticColors } from "../store/ThemeStore"
import { useStalenessCheck } from "./useStalenessCheck"
import { StalenessBadge } from "./StalenessBadge"
import { NetworkSVGOverlay } from "./NetworkSVGOverlay"
import { NetworkHtmlMarksLayer } from "./NetworkHtmlMarksLayer"
import {
  networkSceneNodeToSVG,
  networkSceneEdgeToSVG,
  networkLabelToSVG,
  isServerEnvironment
} from "./SceneToSVG"
import {
  useHydration,
  useWasHydratingFromSSR,
  useHydrationLifecycle
} from "./useHydration"
import { useStableShallow } from "./useStableShallow"
import { resolveCSSColor } from "./renderers/resolveCSSColor"
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
import { prepareCanvas, getDevicePixelRatio } from "./canvasSetup"

// Canvas renderers
import { networkRectRenderer } from "./renderers/networkRectRenderer"
import { networkCircleRenderer } from "./renderers/networkCircleRenderer"
import { networkArcRenderer } from "./renderers/networkArcRenderer"
import { networkSymbolRenderer } from "./renderers/networkSymbolRenderer"
import { networkEdgeRenderer } from "./renderers/networkEdgeRenderer"
import {
  renderNetworkParticles,
  spawnNetworkParticles
} from "./renderers/networkParticleRenderer"
import { DEFAULT_COLORS } from "../charts/shared/colorUtils"

// ── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_MARGIN = { top: 20, right: 80, bottom: 20, left: 80 }
const CENTERED_MARGIN = { top: 40, right: 40, bottom: 40, left: 40 }
const CENTERED_TYPES = new Set(["chord", "force", "circlepack", "orbit"])
const DEFAULT_SIZE: [number, number] = [800, 600]

// ── Tooltip ────────────────────────────────────────────────────────────

const defaultTooltipStyle: React.CSSProperties = {
  background: "rgba(0, 0, 0, 0.85)",
  color: "white",
  padding: "6px 10px",
  borderRadius: 4,
  fontSize: 12,
  lineHeight: 1.5,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  pointerEvents: "none",
  whiteSpace: "nowrap"
}

function DefaultNetworkTooltip({ data }: { data: HoverData }) {
  if (data.nodeOrEdge === "edge") {
    const edge = data.data as RealtimeEdge | null
    if (!edge) return null
    const sourceId =
      typeof edge.source === "object" ? edge.source.id : edge.source
    const targetId =
      typeof edge.target === "object" ? edge.target.id : edge.target
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        <div style={{ fontWeight: 600 }}>
          {sourceId} → {targetId}
        </div>
        {edge.value != null && (
          <div style={{ marginTop: 4, opacity: 0.8 }}>
            Value:{" "}
            {typeof edge.value === "number"
              ? edge.value.toLocaleString()
              : String(edge.value)}
          </div>
        )}
      </div>
    )
  }

  const node = data.data as RealtimeNode | null
  if (!node) return null

  // Hierarchy nodes have a __hierarchyNode with a .parent chain.
  // Show ancestor breadcrumb: grandparent → parent → **node**
  type HierarchyNode = { data?: Datum; parent?: HierarchyNode }
  const hNode = (node as RealtimeNode & { __hierarchyNode?: HierarchyNode })
    .__hierarchyNode
  if (hNode) {
    const ancestors: string[] = []
    let cur: HierarchyNode | undefined = hNode
    while (cur) {
      const name = cur.data?.name ?? cur.data?.id ?? node.id
      if (name != null) ancestors.unshift(String(name))
      cur = cur.parent
    }
    // Drop root (first entry) from the breadcrumb — it's usually unnamed
    if (ancestors.length > 1) ancestors.shift()

    const last = ancestors.length - 1
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        <div>
          {ancestors.map((name, i) => (
            <span key={i}>
              {i > 0 && (
                <span style={{ margin: "0 3px", opacity: 0.5 }}>{" → "}</span>
              )}
              {i === last ? (
                <strong>{name}</strong>
              ) : (
                <span style={{ opacity: 0.7 }}>{name}</span>
              )}
            </span>
          ))}
        </div>
        {node.value != null && node.value > 0 && (
          <div style={{ marginTop: 4, opacity: 0.8 }}>
            {typeof node.value === "number"
              ? node.value.toLocaleString()
              : String(node.value)}
          </div>
        )}
      </div>
    )
  }

  // Compute degree centrality from source/target links
  const degree =
    (node.sourceLinks?.length || 0) + (node.targetLinks?.length || 0)
  const weightedDegree =
    (node.sourceLinks || []).reduce((s, e) => s + (e.value || 0), 0) +
    (node.targetLinks || []).reduce((s, e) => s + (e.value || 0), 0)

  // Smartly surface the user datum's meaningful fields — a name for the title,
  // then a type/kind, then a value, then the rest — instead of just the id.
  // This is what makes the default tooltip useful for custom/recipe layouts
  // (Mermaid, lineage, dagre, …) where the id alone says nothing.
  const userDatum = (node.data ?? node) as Datum
  const smart = smartTooltipEntries(userDatum)
  const heading = smart.title != null ? String(smart.title) : node.id
  const hasValueRow = smart.entries.some((e) => VALUE_ROW_RE.test(e.key))

  return (
    <div className="semiotic-tooltip" style={defaultTooltipStyle}>
      <div style={{ fontWeight: 600 }}>{heading}</div>
      {smart.entries.map((e) => (
        <div key={e.key} style={{ marginTop: 4, opacity: 0.8 }}>
          {e.key}: {formatVal(e.value)}
        </div>
      ))}
      {!hasValueRow && node.value != null && node.value > 0 && (
        <div style={{ marginTop: 4, opacity: 0.8 }}>
          Total:{" "}
          {typeof node.value === "number"
            ? node.value.toLocaleString()
            : String(node.value)}
        </div>
      )}
      {degree > 0 && (
        <div style={{ marginTop: 4, opacity: 0.8 }}>
          Connections: {degree}
          {weightedDegree !== degree &&
            ` (weighted: ${weightedDegree.toLocaleString()})`}
        </div>
      )}
    </div>
  )
}

const VALUE_ROW_RE = /^(value|amount|total|count|weight|score)$/i
// Tell FlippingTooltip's chrome detector that this component paints its
// own chrome internally. Without this, the wrapper double-wraps and a
// theme with a light tooltip background (Carbon, journalist-light, etc.)
// reads as a white box around the tooltip text.
;(DefaultNetworkTooltip as unknown as { ownsChrome: boolean }).ownsChrome = true

// ── StreamNetworkFrame ─────────────────────────────────────────────────

const StreamNetworkFrame = forwardRef<
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
    chartId,
    onTopologyChange,
    annotations,
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
    foregroundGraphics,
    backgroundGraphics,
    animate,
    transitionProp,
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
    rafRef,
    renderFnRef,
    scheduleRender,
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
    (): NetworkPipelineConfig => ({
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
      themeCategorical: currentTheme?.colors?.categorical,
      themeSemantic: resolveThemeSemanticColors(currentTheme),
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
      layoutConfig
      // NOTE: `layoutSelection` is intentionally NOT part of pipelineConfig — a
      // selection change must not trigger the rebuild path. A dedicated effect
      // below feeds it to the store and either restyles (cheap) or rebuilds.
    }),
    [
      chartType,
      nodeIDAccessor,
      sourceAccessor,
      targetAccessor,
      valueAccessor,
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
      transition?.duration,
      transition?.easing,
      introEnabled,
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
      currentTheme,
      customNetworkLayout,
      layoutConfig
    ]
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
  const stableLayoutConfig = useStableShallow({
    chartType,
    nodeIDAccessor,
    sourceAccessor,
    targetAccessor,
    valueAccessor,
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
    orbitMode,
    orbitSize,
    orbitEccentricity,
    customNetworkLayout
  })

  // ── Refs ─────────────────────────────────────────────────────────────

  const canvasRef = useRef<HTMLCanvasElement>(null)
  // rafRef + renderFnRef + scheduleRender + cancel-on-unmount come from
  // useFrame (above). Network's previous local scheduleRender had an
  // isContinuous branch, but the inner `if (!rafRef.current)` guard made
  // that branch's effect identical to the simple "bail if pending" — so
  // the shared hook semantics preserve Network's behavior exactly.
  // rafRef + renderFnRef + scheduleRender + dirtyRef + theme-change
  // effect all destructured from useFrame above; not redeclared here.
  const lastFrameTimeRef = useRef(0)
  // Throttle the rAF-driven `setAnnotationFrame((f) => f + 1)` below.
  // Continuous-animation chart types (orbit, pulse-driven, particle
  // sankey) keep `animationTicked`/`hasActivePulses` true on every
  // frame, so an unguarded setAnnotationFrame would fire 60 React
  // re-renders per second per chart instance. When a parent component
  // *also* re-renders the page on its own cadence (PageLayout's
  // IntersectionObserver firing on scroll, for instance, hands fresh
  // inline-arrow function refs through to OrbitDiagram, which the
  // stabilizer can't absorb because functions aren't shallow-equal),
  // the two update streams compound and trip React 19's max-update-
  // depth guard. ~30 Hz is plenty for label-position updates that
  // track a moving scene; the canvas itself paints every frame.
  const lastAnnotationFrameTimeRef = useRef(0)
  // Set when the throttle gate blocks a `setAnnotationFrame` and the
  // chart isn't already in a continuous-rAF mode. The next-frame
  // continuation below honors this so a one-shot push never drops its
  // SVG-layer reconciliation just because it landed inside the 33 ms
  // gate of a recent fire.
  const pendingAnnotationFrameRef = useRef(false)

  // ── Store ────────────────────────────────────────────────────────────

  const storeRef = useRef<NetworkPipelineStore | null>(null)
  if (!storeRef.current) {
    storeRef.current = new NetworkPipelineStore(stablePipelineConfig)
  }

  // ── State ────────────────────────────────────────────────────────────

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
    (node: RealtimeNode): string => {
      if (typeof colorBy === "function") return String(colorBy(node))
      if (typeof colorBy === "string" && node.data) {
        const val = node.data[colorBy]
        if (val !== undefined) {
          if (!nodeColorMap.current.has(String(val))) {
            const colors = Array.isArray(colorScheme)
              ? colorScheme
              : DEFAULT_COLORS
            nodeColorMap.current.set(
              String(val),
              colors[colorIndexRef.current++ % colors.length]
            )
          }
          return nodeColorMap.current.get(String(val))!
        }
      }
      // Check if scene-fill sync already assigned this node a color
      if (nodeColorMap.current.has(node.id)) {
        return nodeColorMap.current.get(node.id)!
      }
      // No colorBy → all nodes get the same first palette color (matches HOC nodeStyle).
      // With colorBy (handled above), nodes cycle through the palette by category.
      const colors = Array.isArray(colorScheme) ? colorScheme : DEFAULT_COLORS
      const color = colorBy
        ? colors[colorIndexRef.current++ % colors.length]
        : colors[0]
      nodeColorMap.current.set(node.id, color)
      return color
    },
    [colorBy, colorScheme]
  )

  // Fallback color for edges/particles when no source or target is resolvable.
  // Chain mirrors the secondary→primary fallback used when building
  // themeSemantic: chart border > secondary > primary > hardcoded #999.
  // A custom theme that omits border+secondary still falls back to the
  // theme's accent rather than the hardcoded gray.
  const edgeFallbackColor =
    currentTheme?.colors?.border ||
    currentTheme?.colors?.secondary ||
    currentTheme?.colors?.primary ||
    "#999"

  // Resolve a source/target field to a RealtimeNode. For built-in
  // sankey layouts, d3-sankey replaces string ids with node references
  // during `computeLayout`. For customNetworkLayout charts (e.g.
  // ProcessSankey), `ingestBounded` keeps the ids as strings — the
  // customLayout path doesn't run plugin dispatch. Look up by id when
  // we get a string so both paths converge on a RealtimeNode.
  const resolveEdgeEndpoint = useCallback(
    (endpoint: RealtimeNode | string | undefined): RealtimeNode | null => {
      if (!endpoint) return null
      if (typeof endpoint === "object") return endpoint
      return storeRef.current?.nodes.get(endpoint) ?? null
    },
    []
  )

  const getEdgeColor = useCallback(
    (edge: RealtimeEdge): string => {
      if (typeof edgeColorBy === "function") return edgeColorBy(edge)
      const sourceNode = resolveEdgeEndpoint(edge.source)
      const targetNode = resolveEdgeEndpoint(edge.target)

      if (edgeColorBy === "target" && targetNode) {
        return getNodeColor(targetNode)
      }
      if (sourceNode) {
        return getNodeColor(sourceNode)
      }
      return edgeFallbackColor
    },
    [edgeColorBy, getNodeColor, edgeFallbackColor, resolveEdgeEndpoint]
  )

  const getParticleColor = useCallback(
    (edge: RealtimeEdge): string => {
      // Functional `particleStyle.color` runs first so users can fully
      // control per-edge colors. The particle renderer no longer
      // invokes the function directly — it delegates here so the
      // user-supplied callback receives a real `RealtimeNode` even
      // when `edge.source` is a string id (the case for
      // `customNetworkLayout` charts like ProcessSankey, which the
      // earlier `typeof edge.source === "object"` gate silently
      // dropped).
      if (typeof particleStyle.color === "function") {
        const sourceNode = resolveEdgeEndpoint(edge.source)
        if (sourceNode) {
          return (
            particleStyle.color as (e: RealtimeEdge, n: RealtimeNode) => string
          )(edge, sourceNode)
        }
        return edgeFallbackColor
      }
      // When the user hasn't explicitly set particleStyle.colorBy,
      // inherit the edge color so particles match their edge's fill.
      if (!particleStyleProp?.colorBy) {
        return getEdgeColor(edge)
      }
      const colorByMode = particleStyle.colorBy!
      const sourceNode = resolveEdgeEndpoint(edge.source)
      const targetNode = resolveEdgeEndpoint(edge.target)

      if (colorByMode === "target" && targetNode) {
        return getNodeColor(targetNode)
      }
      if (sourceNode) {
        return getNodeColor(sourceNode)
      }
      return edgeFallbackColor
    },
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

  // scheduleRender comes from useFrame above (the previous Network-local
  // implementation took an isContinuous flag, but it was effectively
  // dead — see the comment by the rAF refs above).
  // isContinuous is still used elsewhere in this file for the render
  // loop's "should I keep ticking" decision; declared here so the
  // existing references continue to resolve.
  // Animation gate: keep rAF ticking for any of (a) sankey with
  // particles, (b) customNetworkLayout charts with particles (e.g.
  // ProcessSankey — same particle pipeline, edges carry HOC-computed
  // bezier control points), (c) pulse encoding, (d) explicit store
  // animation state (transitions, push-mode intro).
  const isContinuous =
    ((chartType === "sankey" || !!customNetworkLayout) && showParticles) ||
    !!pulse ||
    (storeRef.current?.isAnimating ?? false)

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
    store.buildScene([adjustedWidth, adjustedHeight])
    for (const sceneNode of store.sceneNodes) {
      if (sceneNode.id && typeof sceneNode.style?.fill === "string") {
        nodeColorMap.current.set(sceneNode.id, sceneNode.style.fill)
      }
    }
    dirtyRef.current = true
    scheduleRender()
  }, [currentTheme, adjustedWidth, adjustedHeight, scheduleRender])

  // ── Layout execution ─────────────────────────────────────────────────

  const runLayout = useCallback(() => {
    const store = storeRef.current
    if (!store) return

    store.runLayout([adjustedWidth, adjustedHeight])
    store.buildScene([adjustedWidth, adjustedHeight])
    dirtyRef.current = true

    // Sync nodeColorMap from actual scene fills so particle/hover colors
    // match the rendered node colors exactly. The scene builder applies
    // the HOC's nodeStyleFn (which may use ThemeProvider, colorBy, or
    // resolveDefaultFill) — those are the authoritative colors.
    for (const sceneNode of store.sceneNodes) {
      if (sceneNode.id && typeof sceneNode.style?.fill === "string") {
        nodeColorMap.current.set(sceneNode.id, sceneNode.style.fill)
      }
    }
    // Fill remaining from palette (streaming: new nodes not yet in scene)
    const colors = Array.isArray(colorScheme) ? colorScheme : DEFAULT_COLORS
    const layoutNodes = Array.from(store.nodes.values())
    for (let i = 0; i < layoutNodes.length; i++) {
      const node = layoutNodes[i]
      if (!nodeColorMap.current.has(node.id)) {
        nodeColorMap.current.set(node.id, colors[i % colors.length])
      }
    }
    colorIndexRef.current = layoutNodes.length

    setLayoutVersion(store.layoutVersion)

    if (onTopologyChange) {
      const { nodes, edges } = store.getLayoutData()
      onTopologyChange(nodes, edges)
    }
  }, [adjustedWidth, adjustedHeight, onTopologyChange, colorScheme])

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
    [
      pushEdge,
      pushManyEdges,
      clearAll,
      forceRelayout,
      runLayout,
      scheduleRender
    ]
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
      // Hierarchy data: single root object
      store.ingestHierarchy(hierarchyRoot, [adjustedWidth, adjustedHeight])
      store.buildScene([adjustedWidth, adjustedHeight])
      setLayoutPending(false)
      dirtyRef.current = true
      scheduleRender()
    } else {
      // Graph data: nodes + edges arrays
      const rawNodes = safeNodes
      const rawEdges = Array.isArray(safeEdges) ? safeEdges : []

      if (rawNodes.length === 0 && rawEdges.length === 0) {
        setLayoutPending(false)
        return
      }

      const size: [number, number] = [adjustedWidth, adjustedHeight]
      const useWorker =
        chartType === "force" &&
        !customNetworkLayout &&
        canUseForceWorker() &&
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
            store.buildScene(size)

            // Keep the hover/particle color cache in parity with the normal
            // synchronous layout path. Scene fills are authoritative because
            // they include nodeStyle, colorBy, and theme resolution.
            for (const sceneNode of store.sceneNodes) {
              if (sceneNode.id && typeof sceneNode.style?.fill === "string") {
                nodeColorMap.current.set(sceneNode.id, sceneNode.style.fill)
              }
            }
            const colors = Array.isArray(colorScheme)
              ? colorScheme
              : DEFAULT_COLORS
            const layoutNodes = Array.from(store.nodes.values())
            for (let i = 0; i < layoutNodes.length; i++) {
              const node = layoutNodes[i]
              if (!nodeColorMap.current.has(node.id)) {
                nodeColorMap.current.set(node.id, colors[i % colors.length])
              }
            }
            colorIndexRef.current = layoutNodes.length

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
            store.buildScene(size)
            for (const sceneNode of store.sceneNodes) {
              if (sceneNode.id && typeof sceneNode.style?.fill === "string") {
                nodeColorMap.current.set(sceneNode.id, sceneNode.style.fill)
              }
            }
            setLayoutPending(false)
            onLayoutStateChangeRef.current?.("error")
            setLayoutVersion(store.layoutVersion)
            dirtyRef.current = true
            scheduleRender()
          })

        return () => controller.abort()
      }

      store.ingestBounded(rawNodes, rawEdges, size)
      store.buildScene(size)
      setLayoutPending(false)
      onLayoutStateChangeRef.current?.("ready")

      // Sync nodeColorMap from actual scene fills so particle/hover colors
      // match the rendered node colors exactly (same logic as runLayout sync)
      for (const sceneNode of store.sceneNodes) {
        if (sceneNode.id && sceneNode.style?.fill) {
          nodeColorMap.current.set(sceneNode.id, String(sceneNode.style.fill))
        }
      }
      // Fill remaining from palette (streaming: new nodes not yet in scene)
      const colors = Array.isArray(colorScheme) ? colorScheme : DEFAULT_COLORS
      const layoutNodes = Array.from(store.nodes.values())
      for (let i = 0; i < layoutNodes.length; i++) {
        const node = layoutNodes[i]
        if (!nodeColorMap.current.has(node.id)) {
          nodeColorMap.current.set(node.id, colors[i % colors.length])
        }
      }
      colorIndexRef.current = layoutNodes.length

      dirtyRef.current = true
      scheduleRender()
    }
    // Gated on `stableLayoutConfig` (layout/ingest-affecting fields only), NOT
    // the full `stablePipelineConfig`. Render-only style/animation function
    // props are excluded there, so their identity churn no longer re-ingests +
    // setState every render (the loop that crashed continuously-animated
    // charts); genuine layout-parameter, data, dimension, and palette changes
    // still re-ingest. See the `stableLayoutConfig` definition above.
  }, [
    safeNodes,
    safeEdges,
    dataProp,
    hierarchyRoot,
    isHierarchical,
    adjustedWidth,
    adjustedHeight,
    stableLayoutConfig,
    layoutExecution,
    iterations,
    wasHydratingFromSSR,
    chartType,
    customNetworkLayout,
    scheduleRender,
    colorScheme
  ])

  // ── Initial streaming data ───────────────────────────────────────────

  useEffect(() => {
    if (initialEdges && initialEdges.length > 0) {
      pushManyEdges(initialEdges)
    }
    // Only run on mount
  }, [])

  // ── Observation wrappers ─────────────────────────────────────────────

  const customHoverBehavior = useCallback(
    (d: HoverData | null) => {
      if (customHoverBehaviorProp) customHoverBehaviorProp(d)
      if (onObservation) {
        const now = Date.now()
        if (d) {
          onObservation({
            type: "hover",
            datum: d.data || {},
            x: d.x,
            y: d.y,
            timestamp: now,
            chartType: "StreamNetworkFrame",
            chartId
          })
        } else {
          onObservation({
            type: "hover-end",
            timestamp: now,
            chartType: "StreamNetworkFrame",
            chartId
          })
        }
      }
    },
    [customHoverBehaviorProp, onObservation, chartId]
  )

  const customClickBehavior = useCallback(
    (d: HoverData | null) => {
      if (customClickBehaviorProp) customClickBehaviorProp(d)
      if (onObservation) {
        const now = Date.now()
        if (d) {
          onObservation({
            type: "click",
            datum: d.data || {},
            x: d.x,
            y: d.y,
            timestamp: now,
            chartType: "StreamNetworkFrame",
            chartId
          })
        } else {
          onObservation({
            type: "click-end",
            timestamp: now,
            chartType: "StreamNetworkFrame",
            chartId
          })
        }
      }
    },
    [customClickBehaviorProp, onObservation, chartId]
  )

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
    const rect = canvas.getBoundingClientRect()

    const chartX = e.clientX - rect.left - margin.left
    const chartY = e.clientY - rect.top - margin.top

    if (
      chartX < 0 ||
      chartX > adjustedWidth ||
      chartY < 0 ||
      chartY > adjustedHeight
    ) {
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

    const store = storeRef.current
    if (!store) return

    const hit = findNearestNetworkNode(
      store.sceneNodes,
      store.sceneEdges,
      chartX,
      chartY,
      30,
      store.nodeQuadtree,
      store.maxNodeRadius
    )

    if (!hit) {
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

    const rawDatum = hit.datum || {}
    const hover: HoverData = buildHoverData(rawDatum, hit.x, hit.y, {
      nodeOrEdge: hit.type as "node" | "edge"
    })

    hoverRef.current = hover
    setHoverData(hover)
    if (customHoverBehavior) {
      customHoverBehavior(hover)
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
    if (!customClickBehaviorProp && !onObservation) return

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    const chartX = e.clientX - rect.left - margin.left
    const chartY = e.clientY - rect.top - margin.top

    if (
      chartX < 0 ||
      chartX > adjustedWidth ||
      chartY < 0 ||
      chartY > adjustedHeight
    ) {
      return
    }

    const store = storeRef.current
    if (!store) return

    const hit = findNearestNetworkNode(
      store.sceneNodes,
      store.sceneEdges,
      chartX,
      chartY,
      30,
      store.nodeQuadtree,
      store.maxNodeRadius
    )

    if (hit) {
      const rawDatum = hit.datum || {}
      customClickBehavior(
        buildHoverData(rawDatum, hit.x, hit.y, {
          nodeOrEdge: hit.type as "node" | "edge"
        })
      )
    } else {
      customClickBehavior(null)
    }
  }

  // pointermove coalescing + onPointerLeave come from useFrame above.
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
      const store = storeRef.current
      if (!store) return

      // Always rebuild NavGraph from current sceneNodes — positions change during
      // force simulation ticks and transition interpolation, so caching risks stale coordinates
      const navPoints = extractNetworkNavPoints(
        store.sceneNodes as NetworkSceneNode[]
      )
      if (navPoints.length === 0) return
      const graph: NavGraph = buildNavGraph(navPoints)

      const current = kbFocusIndexRef.current

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
          customHoverBehavior(hover)
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
        customHoverBehavior(hover)
        dirtyRef.current = true
      }
      scheduleRender()
    },
    [customHoverBehavior, scheduleRender]
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
    rafRef.current = 0
    const canvas = canvasRef.current
    if (!canvas) return

    // ctx obtained here for early null-check; prepareCanvas resets transform below
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const store = storeRef.current
    if (!store) return

    const now = performance.now()
    const deltaTime = lastFrameTimeRef.current
      ? Math.min((now - lastFrameTimeRef.current) / 1000, 0.1)
      : 0.016
    lastFrameTimeRef.current = now

    // Fast-forward transitions when reduced motion is active so target positions
    // are applied immediately and transition state is cleared properly
    const transitionActive = store.advanceTransition(
      reducedMotionRef.current ? now + 1e6 : now
    )
    const isTransitioning = reducedMotionRef.current ? false : transitionActive

    // Advance layout animation (e.g. orbit rotation) — skip when reduced motion
    const animationTicked = reducedMotionRef.current
      ? false
      : store.tickAnimation([adjustedWidth, adjustedHeight], deltaTime)

    if (transitionActive || dirtyRef.current || animationTicked) {
      // Rebuild scene for current positions
      store.buildScene([adjustedWidth, adjustedHeight])
    }

    // DPR setup — prepareCanvas sets size, DPR transform, and margin translate
    const dpr = getDevicePixelRatio()
    if (!prepareCanvas(canvas, size, margin, dpr)) return
    ctx.clearRect(-margin.left, -margin.top, size[0], size[1])

    // Background. The user prop may be a `var(--token, fallback)`
    // string, which the canvas API silently rejects when assigned to
    // `ctx.fillStyle` — leaving the prior frame's fillStyle (a node,
    // edge, or particle color) in place. The next `fillRect` then
    // paints the chart background with that stale color, producing
    // a palette-flashing effect on every animation frame. Resolve
    // CSS variables to their concrete value before assigning.
    if (background) {
      const resolvedBg = resolveCSSColor(ctx, background)
      if (resolvedBg) {
        ctx.fillStyle = resolvedBg
        ctx.fillRect(0, 0, adjustedWidth, adjustedHeight)
      }
    }

    // Apply realtime encoding (pulse/decay/thresholds)
    if (decay) {
      store.applyDecay()
    }
    if (pulse) {
      store.applyPulse(now)
    }
    if (thresholds) {
      store.applyThresholds(now)
    }

    // Topology diff highlighting (newly-added nodes glow briefly). Active for
    // streaming, but suppressed when the consumer opts out of animation with
    // `animate={false}` — a bounded/static chart (e.g. a minimap) shouldn't
    // pulse every node on its first render.
    if (animate !== false) {
      store.applyTopologyDiff(now)
    }

    // Staleness dimming
    const staleThreshold = staleness?.threshold ?? 5000
    const currentlyStale =
      staleness &&
      store.lastIngestTime > 0 &&
      now - store.lastIngestTime > staleThreshold

    if (currentlyStale) {
      ctx.globalAlpha = staleness?.dimOpacity ?? 0.5
    }

    // Render edges first (they go behind nodes)
    networkEdgeRenderer(ctx, store.sceneEdges)

    // Render nodes
    networkRectRenderer(ctx, store.sceneNodes)
    networkCircleRenderer(ctx, store.sceneNodes)
    networkArcRenderer(ctx, store.sceneNodes)
    networkSymbolRenderer(ctx, store.sceneNodes)

    // Render particles (sankey only) — stop entirely when stale or when the
    // user prefers reduced motion (particles are purely decorative movement).
    if (showParticles && !reducedMotionRef.current && store.particlePool && !currentlyStale) {
      // Read-only consumer — reuse the store's per-frame cached array instead
      // of allocating a fresh one every animation frame.
      const edges = store.edgesArray
      if (edges.length > 0) {
        spawnNetworkParticles(
          store.particlePool,
          edges,
          deltaTime,
          particleStyle
        )
        const speed = (particleStyle.speedMultiplier ?? 1) * 0.5

        // Compute per-edge speed multipliers for proportional flow rate
        let edgeSpeedMultipliers: number[] | undefined
        if (particleStyle.proportionalSpeed) {
          const maxValue = edges.reduce(
            (max, e) => Math.max(max, e.value || 1),
            1
          )
          edgeSpeedMultipliers = edges.map((e) => {
            const ratio = (e.value || 1) / maxValue
            // Scale between 0.3x and 2x so low-value edges still move
            return 0.3 + ratio * 1.7
          })
        }

        store.particlePool.step(deltaTime, speed, edges, edgeSpeedMultipliers)
        renderNetworkParticles(
          ctx,
          store.particlePool,
          edges,
          particleStyle,
          getParticleColor
        )
      }
    }

    // Reset staleness dimming
    if (currentlyStale) {
      ctx.globalAlpha = 1
    }

    const wasDirty = dirtyRef.current
    dirtyRef.current = false

    // NOTE: custom-layout overlays are read directly from
    // `storeRef.current.customLayoutOverlays` during React render (see the
    // `foregroundGraphics` composition). The render loop only triggers throttled
    // re-renders via `setAnnotationFrame`, so there's no per-frame overlay setState.

    // Update canvas aria-label imperatively after scene changes
    if (wasDirty || isTransitioning || animationTicked) {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.setAttribute(
          "aria-label",
          computeNetworkAriaLabel(
            store.sceneNodes?.length ?? 0,
            store.sceneEdges?.length ?? 0,
            "Network chart"
          )
        )
      }
    }

    // Update SVG overlay when layout changes. Throttle uniformly to
    // ~30 Hz regardless of source — animationTicked, isTransitioning,
    // and wasDirty all funnel through the same gate. The looser bound
    // protects against a parent re-rendering (e.g. a docs page whose
    // IntersectionObserver-driven sticky-TOC dirties the prop chain on
    // every scroll-pixel) compounding with the orbit's own continuous
    // animation tick to push React past its max-update-depth guard.
    // The canvas itself still paints every frame; this only governs
    // how often we ask React to reconcile the SVG-label layer.
    // Fold `pendingAnnotationFrameRef.current` into the predicate so a
    // previously-throttled frame still counts as wanting an update on
    // the very next tick (without it, a one-shot `wasDirty` that
    // landed inside the gate could leave `pending=true` while
    // `wantsAnnotationUpdate` flips back to false on the retry frame
    // and the rAF chain would keep spinning forever waiting for an
    // update that nothing was asking for anymore).
    const wantsAnnotationUpdate =
      wasDirty ||
      isTransitioning ||
      animationTicked ||
      pendingAnnotationFrameRef.current
    if (
      wantsAnnotationUpdate &&
      now - lastAnnotationFrameTimeRef.current >= 33
    ) {
      setAnnotationFrame((f) => f + 1)
      lastAnnotationFrameTimeRef.current = now
      pendingAnnotationFrameRef.current = false
    } else if (wantsAnnotationUpdate) {
      pendingAnnotationFrameRef.current = true
    } else {
      // Nothing to update — clear the pending flag so the rAF
      // continuation below doesn't keep ticking.
      pendingAnnotationFrameRef.current = false
    }

    // Schedule next frame for continuous rendering (particles/transitions/pulses/thresholds/diffs/animation),
    // OR to retry a throttled setAnnotationFrame so a one-shot dirty event
    // that landed inside the throttle gate still reconciles the SVG layer.
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
      rafRef.current = requestAnimationFrame(() => renderFnRef.current())
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  useHydrationLifecycle({
    hydrated,
    wasHydratingFromSSR,
    storeRef,
    dirtyRef,
    renderFnRef
    // No frame-specific cleanup — useFrame handles the rAF/pointermove
    // refs on unmount.
  })

  useEffect(() => {
    dirtyRef.current = true
    scheduleRender()
  }, [chartType, adjustedWidth, adjustedHeight, background, scheduleRender])

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
    const store = storeRef.current
    if (store) {
      const isHierarchical = [
        "tree",
        "cluster",
        "treemap",
        "circlepack",
        "partition",
        "orbit"
      ].includes(chartType)
      const hierarchyRoot = isHierarchical
        ? dataProp || (!Array.isArray(edgesProp) ? edgesProp : undefined)
        : undefined

      if (isHierarchical && hierarchyRoot) {
        store.ingestHierarchy(hierarchyRoot, [adjustedWidth, adjustedHeight])
        store.buildScene([adjustedWidth, adjustedHeight])
      } else {
        const rawNodes = safeNodes
        const rawEdges = Array.isArray(safeEdges) ? safeEdges : []
        if (rawNodes.length > 0 || rawEdges.length > 0) {
          store.ingestBounded(rawNodes, rawEdges, [
            adjustedWidth,
            adjustedHeight
          ])
          store.buildScene([adjustedWidth, adjustedHeight])
        }
      }
    }

    const sceneNodes = store?.sceneNodes ?? []
    const sceneEdges = store?.sceneEdges ?? []
    const labels = store?.labels ?? []

    return (
      <div
        // Attached on both branches so the `ResizeObserver` in
        // `useResponsiveSize` latches at first commit. See
        // `StreamXYFrame.tsx` for the full rationale.
        ref={responsiveRef}
        className={`stream-network-frame${className ? ` ${className}` : ""}`}
        role="img"
        aria-label={
          description || (typeof title === "string" ? title : "Network chart")
        }
        style={{
          position: "relative",
          width: responsiveWidth ? "100%" : size[0],
          height: responsiveHeight ? "100%" : size[1]
        }}
      >
        <ScreenReaderSummary summary={summary} />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size[0]}
          height={size[1]}
          style={{ position: "absolute", left: 0, top: 0 }}
        >
          {resolvedBackground && (
            <g transform={`translate(${margin.left},${margin.top})`}>
              {resolvedBackground}
            </g>
          )}
          <g transform={`translate(${margin.left},${margin.top})`}>
            {background && (
              <rect
                x={0}
                y={0}
                width={adjustedWidth}
                height={adjustedHeight}
                fill={background}
              />
            )}
            {sceneEdges
              .map((edge, i) => networkSceneEdgeToSVG(edge, i))
              .filter(Boolean)}
            {sceneNodes
              .map((node, i) => networkSceneNodeToSVG(node, i))
              .filter(Boolean)}
            {labels
              .map((label, i) => networkLabelToSVG(label, i))
              .filter(Boolean)}
          </g>
        </svg>
        <NetworkSVGOverlay
          width={adjustedWidth}
          height={adjustedHeight}
          totalWidth={size[0]}
          totalHeight={size[1]}
          margin={margin}
          labels={labels}
          sceneNodes={sceneNodes}
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
          autoPlaceAnnotations={autoPlaceAnnotations}
          svgAnnotationRules={svgAnnotationRules}
          annotationFrame={0}
        />
        <NetworkHtmlMarksLayer
          marks={store?.customLayoutHtmlMarks}
          margin={margin}
          selection={layoutSelection ?? null}
        />
      </div>
    )
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
        {resolvedBackground && (
          <svg
            overflow="visible"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: size[0],
              height: size[1],
              pointerEvents: "none",
              overflow: "visible"
            }}
          >
            <g transform={`translate(${margin.left},${margin.top})`}>
              {resolvedBackground}
            </g>
          </svg>
        )}

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
})

StreamNetworkFrame.displayName = "StreamNetworkFrame"
export default StreamNetworkFrame
