"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSelection } from "../store/useSelection"
import { useChartObserver } from "../store/useObservation"
import type { ChartObservation } from "../store/ObservationStore"
import type { NavTreeNode } from "./navigationTree"
import type { Datum } from "../charts/shared/datumTypes"
/**
 * useNavigationSync — keep an `AccessibleNavTree` and a chart in sync, both ways:
 *
 *   tree → canvas : landing on a datum node highlights the matching mark (via
 *                   the selection store — pass `selection` to the chart).
 *   canvas → tree : hovering/clicking a mark moves the tree's active node (via
 *                   the observation store — give the chart a `chartId`).
 *
 * Both directions ride the existing module-global stores, so **no provider is
 * required** — the chart just needs `chartId` and `selection={sync.selection}`,
 * and the tree needs `activeId`/`onActiveChange`. Headless: BYO layout.
 *
 * @example
 * const sync = useNavigationSync({ tree, chartId: "sales", matchFields: ["month"] })
 * <LineChart chartId="sales" selection={sync.selection} {...props} />
 * <AccessibleNavTree tree={tree} activeId={sync.activeId} onActiveChange={sync.onActiveChange} />
 */

export interface UseNavigationSyncOptions {
  /** The navigation tree (from `buildNavigationTree`). */
  tree: NavTreeNode
  /** `chartId` set on the chart, so its hover/click can be matched back to a semantic node. */
  chartId?: string
  /**
   * Fields that identify a datum for highlighting + matching. Defaults to the
   * primitive-valued keys of the first leaf's datum.
   */
  matchFields?: string[]
  /** Selection name shared with the chart's `selection={{ name }}`. Default "__semiotic-nav-sync". */
  selectionName?: string
  /**
   * Which chart observations move the tree. Defaults to pointer hover/click
   * plus keyboard focus/activation so raw frames and HOC charts stay in sync
   * for both pointer and keyboard readers.
   */
  observe?: Array<"hover" | "click" | "focus" | "activate">
  /**
   * The chart's annotations. An annotation anchored to a datum carries that
   * datum's identifying fields (the same `matchFields` used for hover sync), so
   * each one resolves to a nav-tree leaf. Lets a non-visual reader *reach* an
   * anchored point — e.g. an AI's "anchored conversation" note — via
   * `focusAnnotation`, and lets the tree mark annotated nodes via `annotatedIds`.
   */
  annotations?: ReadonlyArray<Datum>
}

export interface UseNavigationSyncResult {
  /** Controlled active node id — pass to `AccessibleNavTree`. */
  activeId: string
  /** Change handler — pass to `AccessibleNavTree` (drives the canvas highlight). */
  onActiveChange: (node: NavTreeNode) => void
  /** Pass to the chart as `selection={sync.selection}`. */
  selection: { name: string }
  /**
   * Feed a chart observation directly into the sync. This is useful for raw
   * StreamFrames or custom interactions that call `onObservation` themselves
   * instead of publishing through the chart HOCs. Matching pointer and
   * keyboard observations move the tree; events later received from the global
   * observation store are de-duplicated by object identity.
   */
  onObservation: (observation: ChartObservation) => void
  /** Alias of `onObservation` for composing an externally supplied handler. */
  handleObservation: (observation: ChartObservation) => void
  /** Nav-tree datum-node ids that an annotation anchors to — mark these as "has a note". */
  annotatedIds: Set<string>
  /**
   * Move the tree (and canvas highlight) to an annotation's anchored node.
   * Accepts an annotation object or its index in `annotations`. Returns `true`
   * if the anchor resolved to a datum node. The reader lands on the anchor.
   */
  focusAnnotation: (annotation: Datum | number) => boolean
}

const KEY_SEP = "\u0001"
type NavigationObservationType = "hover" | "click" | "focus" | "activate"
type NavigationObservation = Extract<
  ChartObservation,
  { type: NavigationObservationType }
>

const DEFAULT_OBSERVE: ReadonlyArray<NavigationObservationType> = [
  "hover",
  "click",
  "focus",
  "activate"
]

function isPrimitive(v: unknown): boolean {
  return (
    v == null ||
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  )
}

function firstNavigationDatum(node: NavTreeNode): Datum | null {
  if (node.datum) return node.datum
  for (const c of node.children ?? []) {
    const d = firstNavigationDatum(c)
    if (d) return d
  }
  return null
}

function matchKey(datum: Datum | null | undefined, fields: string[]): string {
  if (!datum) return ""
  return fields
    .map((f) => String((datum as Record<string, unknown>)[f]))
    .join(KEY_SEP)
}

function findTreeNode(node: NavTreeNode, id: string): NavTreeNode | null {
  if (node.id === id) return node
  for (const child of node.children ?? []) {
    const found = findTreeNode(child, id)
    if (found) return found
  }
  return null
}

function isNavigationObservation(
  observation: ChartObservation
): observation is NavigationObservation {
  return (
    observation.type === "hover" ||
    observation.type === "click" ||
    observation.type === "focus" ||
    observation.type === "activate"
  )
}

/**
 * Network StreamFrames publish their RealtimeNode/RealtimeEdge wrapper in a
 * raw `onObservation` callback. Only unwrap wrappers with their characteristic
 * layout fields, never a user datum that merely happens to carry `.data`.
 */
function unwrapNavigationDatum(datum: Datum): Datum {
  const candidate = datum as Record<string, unknown>
  const raw = candidate.data
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return datum
  const hasNumericFields = (fields: string[]) =>
    fields.every((field) => typeof candidate[field] === "number")
  const isNetworkNode = hasNumericFields([
    "x0",
    "x1",
    "y0",
    "y1",
    "width",
    "height",
    "value"
  ])
  const isNetworkEdge =
    hasNumericFields(["y0", "y1", "sankeyWidth", "value"]) &&
    "source" in candidate &&
    "target" in candidate
  return isNetworkNode || isNetworkEdge ? (raw as Datum) : datum
}

/**
 * Geo StreamFrames expose feature properties at the interactive mark level,
 * while the authored navigation datum remains a GeoJSON Feature. Normalize
 * both shapes to the same direct-field record so default matching and the
 * chart selection predicate agree without making authors spell nested paths.
 */
function normalizeNavigationDatum(datum: Datum): Datum {
  const unwrapped = unwrapNavigationDatum(datum)
  const properties = unwrapped.properties
  if (
    !properties ||
    typeof properties !== "object" ||
    Array.isArray(properties)
  ) {
    return unwrapped
  }
  return { ...(properties as Datum), ...unwrapped }
}

export function useNavigationSync(
  options: UseNavigationSyncOptions
): UseNavigationSyncResult {
  const { tree, chartId, observe = DEFAULT_OBSERVE } = options
  // Default the selection name per-chart so multiple synced charts on one page
  // don't share a selection bus (which would cross-highlight). Explicit
  // `selectionName` still wins for intentional cross-chart linking.
  const selectionName =
    options.selectionName ??
    `__semiotic-nav-sync${chartId ? `:${chartId}` : ""}`

  // Match fields: explicit, or the primitive keys of the first semantic datum.
  // GeoJSON properties are flattened to match StreamGeoFrame's hover/style
  // shape; hierarchy branches may own datums as well as terminal leaves.
  const matchFields = useMemo(() => {
    if (options.matchFields) return options.matchFields
    const first = firstNavigationDatum(tree)
    const d = first ? normalizeNavigationDatum(first) : null
    if (!d) return []
    return Object.keys(d).filter(
      (k) =>
        !k.startsWith("_") && isPrimitive((d as Record<string, unknown>)[k])
    )
  }, [options.matchFields, tree])

  // matchKey → semantic node id, so a hovered mark maps back to its authored
  // hierarchy branch or geographic region rather than only terminal leaves.
  const nodeByKey = useMemo(() => {
    const map = new Map<string, string>()
    const walk = (node: NavTreeNode) => {
      if (node.datum) {
        const k = matchKey(normalizeNavigationDatum(node.datum), matchFields)
        if (!map.has(k)) map.set(k, node.id)
      }
      for (const c of node.children ?? []) walk(c)
    }
    walk(tree)
    return map
  }, [tree, matchFields])

  const { selectPoints, clear } = useSelection({
    name: selectionName,
    fields: matchFields
  })
  const observedTypes = useMemo<ChartObservation["type"][]>(
    () => [...observe, "hover-end"],
    [observe]
  )
  const { latest } = useChartObserver({
    chartId,
    types: observedTypes,
    limit: 1
  })

  const [activeId, setActiveId] = useState<string>(tree.id)
  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId
  const previousTreeRef = useRef(tree)

  // Procedural navigation-tree ids are positional. Preserve an active datum
  // across an equivalent rebuild only when its match key survives; otherwise
  // the same `datum-3` could now point to a different row while the old chart
  // selection remains active. Structural nodes do not own a selection, so an
  // unchanged id remains a useful reader position.
  useEffect(() => {
    const previousTree = previousTreeRef.current
    previousTreeRef.current = tree
    const previousNode = findTreeNode(previousTree, activeIdRef.current)
    const nextNode = findTreeNode(tree, activeIdRef.current)
    const keepsDatum =
      previousNode?.datum &&
      nextNode?.datum &&
      matchFields.length > 0 &&
      matchKey(normalizeNavigationDatum(previousNode.datum), matchFields) ===
        matchKey(normalizeNavigationDatum(nextNode.datum), matchFields)
    const keepsStructuralNode =
      previousNode && nextNode && !previousNode.datum && !nextNode.datum
    if (keepsDatum || keepsStructuralNode) return
    setActiveId(tree.id)
    clear()
  }, [tree, clear, matchFields])

  // tree → canvas: any node carrying a datum highlights its mark. This includes
  // hierarchy parents as well as terminal leaves; purely structural summaries
  // clear the selection.
  const onActiveChange = useCallback(
    (node: NavTreeNode) => {
      setActiveId(node.id)
      if (node.datum && matchFields.length > 0) {
        const datum = normalizeNavigationDatum(node.datum)
        const fieldValues: Record<string, unknown[]> = {}
        for (const f of matchFields) fieldValues[f] = [datum[f]]
        selectPoints(fieldValues)
      } else {
        clear()
      }
    },
    [matchFields, selectPoints, clear]
  )

  // Annotation anchors → nav nodes. An anchored annotation carries the datum's
  // matchFields, so it keys into `nodeByKey` exactly like a hovered datum.
  const annotations = options.annotations
  const annotatedIds = useMemo(() => {
    const ids = new Set<string>()
    if (matchFields.length === 0 || !annotations) return ids
    for (const a of annotations) {
      const id = nodeByKey.get(
        matchKey(normalizeNavigationDatum(a), matchFields)
      )
      if (id) ids.add(id)
    }
    return ids
  }, [annotations, nodeByKey, matchFields])

  // Jump the tree (and canvas highlight) to an annotation's anchored datum —
  // the reader "reaches" the anchor. Accepts the annotation or its index.
  const focusAnnotation = useCallback(
    (target: Datum | number): boolean => {
      const annotation =
        typeof target === "number" ? annotations?.[target] : target
      if (!annotation || matchFields.length === 0) return false
      const normalized = normalizeNavigationDatum(annotation)
      const id = nodeByKey.get(matchKey(normalized, matchFields))
      if (!id) return false
      setActiveId(id)
      const fieldValues: Record<string, unknown[]> = {}
      for (const f of matchFields) fieldValues[f] = [normalized[f]]
      selectPoints(fieldValues)
      return true
    },
    [annotations, nodeByKey, matchFields, selectPoints]
  )

  // canvas → tree: accept either an observation from the global store (the
  // default HOC path) or a raw frame's `onObservation` callback. The HOCs do
  // both with the same object, so remember it to avoid processing it twice.
  // hover-end remains sticky: leave the tree where the last datum placed it.
  const lastObsRef = useRef<ChartObservation | null>(null)
  const onObservation = useCallback(
    (observation: ChartObservation) => {
      // Match useChartObserver's filter for callers that feed raw observations
      // directly into the hook.
      if (chartId && observation.chartId !== chartId) return
      if (observation.type === "hover-end") {
        if (observation === lastObsRef.current) return
        lastObsRef.current = observation
        return
      }
      if (!isNavigationObservation(observation)) return
      if (!observe.includes(observation.type)) return
      if (observation === lastObsRef.current) return
      lastObsRef.current = observation

      // No match fields → matchKey() is "" for every datum and nodeByKey collapses
      // to the first node; skip rather than jump to the wrong one.
      if (matchFields.length === 0) return
      const datum = normalizeNavigationDatum(observation.datum)
      const id = nodeByKey.get(matchKey(datum, matchFields))
      if (id) setActiveId((currentId) => (currentId === id ? currentId : id))
    },
    [chartId, observe, nodeByKey, matchFields]
  )

  // `onObservation` can legitimately be recreated when callers provide an
  // inline match-field list. Track store delivery separately from the shared
  // callback identity guard so that rerender cannot replay an older `latest`
  // event and move the tree back from a newer raw-frame interaction.
  const lastStoreObservationRef = useRef<ChartObservation | null>(null)
  useEffect(() => {
    if (!latest || latest === lastStoreObservationRef.current) return
    lastStoreObservationRef.current = latest
    onObservation(latest)
  }, [latest, onObservation])

  return {
    activeId,
    onActiveChange,
    selection: { name: selectionName },
    onObservation,
    handleObservation: onObservation,
    annotatedIds,
    focusAnnotation
  }
}
