import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type {
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkSymbolNode,
  NetworkLineEdge,
  RealtimeEdge
} from "../stream/networkTypes"
import type { Datum } from "../charts/shared/datumTypes"
import type { HighlightMatch } from "./recipeUtils"
import {
  readField,
  datumFromFields,
  dimFor,
  signatureKey,
  LayoutCache,
  clamp
} from "./recipeUtils"
import { buildNetEnsembleOverlays } from "./netEnsembleOverlays"

/**
 * `netEnsembleLayout` — a layout for **ensembles of disconnected (or only
 * trivially connected) DAGs**: a "bag of little graphs" that force-directed
 * layout scatters into meaningless blobs and hierarchical layouts (dagre,
 * flextree) can't place at all because they assume one connected root.
 *
 * The organizing idea comes from the mathematical notion of a **net** (a
 * Moore–Smith net: a function from a *directed set*). A directed set is a
 * partial order in which every pair of elements has a common upper bound —
 * "everything eventually flows together." A DAG hands you a partial order for
 * free via reachability (`u ≤ v` iff `v` is reachable from `u`), and a finite
 * directed set must have a single greatest element. For a weakly-connected DAG
 * that collapses to a one-line, O(V+E) test: **count the sinks.** Exactly one
 * sink ⟹ the component is a net converging to a single limit; two or more sinks
 * ⟹ it fails directedness (some pair has no common descendant). See
 * `/recipes/net-ensemble` for the full explanation.
 *
 * The layout:
 *  1. splits the graph into weakly-connected components,
 *  2. tests each for directedness (the sink count),
 *  3. fingerprints each component with Weisfeiler–Leman color refinement so
 *     order-isomorphic components — the recurring *motifs* — group together,
 *  4. lays each component out so flow converges toward its sink(s) at the
 *     bottom (the convergence-to-a-limit made spatial), and
 *  5. arranges the ensemble as small multiples grouped into motif bands,
 *     turning a hairball-of-blobs into a **census** ("12 chains, 4 diamonds,
 *     3 branching forks, 1 oddball") — the thing force layout can never show.
 *
 * Emits one hit-testable scene node per drawn mark (individual nodes at full
 * detail, one node per component when cells collapse), so it inherits keyboard
 * nav, annotation anchoring, and shared selection for free. Pure / SSR-safe.
 */
export interface NetEnsembleConfig {
  /** Edge field naming the source node id. @default "source" */
  sourceAccessor?: string
  /** Edge field naming the target node id. @default "target" */
  targetAccessor?: string
  /** Node field for the display label. @default "label" */
  labelAccessor?: string
  /** Node field for a category (used by `colorMode: "category"`). @default "category" */
  categoryAccessor?: string
  /** Group order-isomorphic components into labelled motif bands. When `false`,
   *  every component is placed in one band ordered by size. @default true */
  groupByMotif?: boolean
  /** Band ordering. @default "frequency" */
  sort?: "frequency" | "size" | "directedness"
  /** What node fill encodes. @default "directedness" */
  colorMode?: "directedness" | "category" | "motif"
  /** Node radius at full detail (px). @default 4 */
  nodeRadius?: number
  /** Gap between component cells (px). @default 16 */
  cellGap?: number
  /** Gap between motif bands (px). @default 22 */
  bandGap?: number
  /** Height reserved for a band's header/label + exemplar (px). @default 34 */
  headerHeight?: number
  /** Below this cell size (px) a component collapses to a single glyph — the
   *  census view for large ensembles. @default 38 */
  minCellForFull?: number
  /** Largest cell edge (px). @default 120 */
  maxCellSize?: number
  /** Smallest cell edge (px) before the layout stops shrinking to fit. @default 12 */
  minCellSize?: number
  /** Weisfeiler–Leman refinement rounds for the motif fingerprint. More rounds
   *  distinguish subtler structural differences. @default 3 */
  fingerprintRounds?: number
  /** Draw the motif descriptor + instance count in each band header. @default true */
  showBandLabels?: boolean
  /** Draw the representative component once per band (the "template"). @default true */
  showExemplars?: boolean
  /** Draw the directedness legend. @default true */
  showLegend?: boolean
  /** Fill for converging (single-sink) components. @default theme info */
  convergeColor?: string
  /** Fill for branching (multi-sink) components. @default theme warning */
  branchColor?: string
  /** Edge stroke color. @default theme border */
  edgeColor?: string
  /** Dim marks that don't match this `{field, value}` highlight. */
  highlight?: HighlightMatch | null
}

// ── Internal geometry types (cached; contain no theme/selection state) ─────────

export interface NetEnsemblePlacedNode {
  id: string
  cx: number
  cy: number
  r: number
  datum: Datum
  category: string
}

export interface NetEnsemblePlacedEdge {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface ComponentInfo {
  ids: string[]
  nodeCount: number
  edgeCount: number
  sinkCount: number
  sourceCount: number
  /** True iff exactly one sink — a net converging to a single limit. */
  directed: boolean
  /** Weisfeiler–Leman structural fingerprint (isomorphic components share it). */
  motif: string
}

// ── Public headless analysis (the "census" without drawing) ────────────────────

/** One weakly-connected component of the ensemble, with its net diagnostics. */
export interface NetEnsembleComponent {
  /** Node ids belonging to this component. */
  ids: string[]
  nodeCount: number
  edgeCount: number
  /** Sinks (out-degree 0) and sources (in-degree 0) within the component. */
  sinkCount: number
  sourceCount: number
  /**
   * True iff the component is a **directed set** (a net with a single limit):
   * for a weakly-connected DAG this holds exactly when there is one sink, so
   * every pair of nodes shares a common descendant. Multiple sinks ⟹ some pair
   * has no common upper bound and the component fails directedness.
   */
  directed: boolean
  /** Weisfeiler–Leman fingerprint — order-isomorphic components share it. */
  motif: string
  /** Short human descriptor of the shape (e.g. `"chain of 5"`, `"diamond / mesh"`). */
  descriptor: string
}

/** A motif class: one recurring structural shape and how many times it appears. */
export interface NetEnsembleMotif {
  motif: string
  descriptor: string
  count: number
  directed: boolean
}

export interface NetEnsembleAnalysis {
  /** Every weakly-connected component, with net diagnostics. */
  components: NetEnsembleComponent[]
  /** The distinct motif classes, most frequent first. */
  motifs: NetEnsembleMotif[]
  /** Components that converge to a single sink (are directed nets). */
  directedCount: number
  /** Components that branch to two or more sinks. */
  branchingCount: number
}

/**
 * Analyze a graph as an **ensemble of nets** — headless, no rendering. Splits
 * the graph into weakly-connected components, tests each for directedness (the
 * sink count), fingerprints them so recurring motifs group together, and
 * returns the motif census. The pure core of {@link netEnsembleLayout}; reach
 * for it when you want the diagnostics (how many chains? how many branch?)
 * without drawing, e.g. to drive a summary readout or a data-quality check.
 */
export function analyzeNetEnsemble(
  nodes: ReadonlyArray<{ id: string }>,
  edges: ReadonlyArray<{ source: string; target: string }>,
  options: { fingerprintRounds?: number } = {}
): NetEnsembleAnalysis {
  const rounds = options.fingerprintRounds ?? 3
  const ids: string[] = []
  const seenId = new Set<string>()
  for (const n of nodes) {
    if (n.id == null || seenId.has(n.id)) continue
    seenId.add(n.id)
    ids.push(n.id)
  }
  const { outAdj, inAdj, undirected } = buildAdjacencies(ids, edges)
  const infos = analyzeComponents(ids, outAdj, inAdj, undirected, rounds)

  const components: NetEnsembleComponent[] = infos.map((info) => ({
    ids: info.ids,
    nodeCount: info.nodeCount,
    edgeCount: info.edgeCount,
    sinkCount: info.sinkCount,
    sourceCount: info.sourceCount,
    directed: info.directed,
    motif: info.motif,
    descriptor: describeMotif(info)
  }))

  const motifMap = new Map<string, NetEnsembleMotif>()
  for (const c of components) {
    const existing = motifMap.get(c.motif)
    if (existing) existing.count += 1
    else
      motifMap.set(c.motif, {
        motif: c.motif,
        descriptor: c.descriptor,
        count: 1,
        directed: c.directed
      })
  }
  const motifs = [...motifMap.values()].sort((a, b) => b.count - a.count)

  return {
    components,
    motifs,
    directedCount: components.filter((c) => c.directed).length,
    branchingCount: components.filter((c) => !c.directed).length
  }
}

interface Cell {
  component: ComponentInfo
  lod: "full" | "glyph"
  /** Center (used by the collapsed-glyph LOD). */
  cx: number
  cy: number
  /** Radius of the collapsed glyph. */
  glyphR: number
  nodes: NetEnsemblePlacedNode[]
  edges: NetEnsemblePlacedEdge[]
}

export interface BandInfo {
  motif: string
  descriptor: string
  count: number
  directed: boolean
  x: number
  y: number
  width: number
  height: number
  exemplar: {
    nodes: NetEnsemblePlacedNode[]
    edges: NetEnsemblePlacedEdge[]
  } | null
}

interface Geom {
  cells: Cell[]
  bands: BandInfo[]
}

// ── Small pure helpers ─────────────────────────────────────────────────────────

/** FNV-1a → short base-36 hash. Keeps fingerprint strings compact. */
function fnv1a(str: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/** Resolve an edge endpoint (id string or node reference) to an id. */
function endpointId(v: RealtimeEdge["source"]): string {
  return typeof v === "string" ? v : v?.id
}

/**
 * Weisfeiler–Leman (1-dimensional) color refinement fingerprint for a component.
 * Nodes start colored by their (in-degree, out-degree); each round recolors a
 * node by hashing the sorted multiset of its neighbors' colors (in and out kept
 * distinct so direction matters). The component signature is the sorted multiset
 * of final node colors plus node/edge counts — identical for order-isomorphic
 * DAGs, near-linear to compute. WL is not a complete isomorphism test, but it
 * separates essentially every distinct small motif you meet in practice.
 */
function motifFingerprint(
  ids: readonly string[],
  outAdj: Map<string, Set<string>>,
  inAdj: Map<string, Set<string>>,
  edgeCount: number,
  rounds: number
): string {
  const member = new Set(ids)
  let colors = new Map<string, string>()
  for (const id of ids) {
    let inDeg = 0
    let outDeg = 0
    for (const s of outAdj.get(id) ?? []) if (member.has(s)) outDeg += 1
    for (const p of inAdj.get(id) ?? []) if (member.has(p)) inDeg += 1
    colors.set(id, `${inDeg}:${outDeg}`)
  }
  for (let r = 0; r < rounds; r += 1) {
    const next = new Map<string, string>()
    for (const id of ids) {
      const outC: string[] = []
      for (const s of outAdj.get(id) ?? [])
        if (member.has(s)) outC.push(colors.get(s)!)
      const inC: string[] = []
      for (const p of inAdj.get(id) ?? [])
        if (member.has(p)) inC.push(colors.get(p)!)
      outC.sort()
      inC.sort()
      next.set(
        id,
        fnv1a(`${colors.get(id)}>${outC.join(",")}<${inC.join(",")}`)
      )
    }
    colors = next
  }
  const multiset = ids.map((id) => colors.get(id)!).sort()
  return fnv1a(`${ids.length}#${edgeCount}#${multiset.join(";")}`)
}

/**
 * Layer a component so flow converges toward its sinks at the bottom. `height(v)`
 * = longest path from `v` to any sink; layering places a node at `maxHeight −
 * height`, so every sink lands on the bottom row (the shared limit line) and
 * sources sit at the top. Cycle-guarded (a back edge contributes height 0) so a
 * non-DAG input degrades gracefully instead of looping.
 */
function layerComponent(
  ids: readonly string[],
  outAdj: Map<string, Set<string>>
): { layer: Map<string, number>; layerCount: number } {
  const member = new Set(ids)
  const height = new Map<string, number>()
  const active = new Set<string>()
  const visit = (v: string): number => {
    const cached = height.get(v)
    if (cached !== undefined) return cached
    if (active.has(v)) return 0 // cycle break
    active.add(v)
    let h = 0
    for (const s of outAdj.get(v) ?? []) {
      if (member.has(s)) h = Math.max(h, 1 + visit(s))
    }
    active.delete(v)
    height.set(v, h)
    return h
  }
  let maxH = 0
  for (const id of ids) maxH = Math.max(maxH, visit(id))
  const layer = new Map<string, number>()
  for (const id of ids) layer.set(id, maxH - height.get(id)!)
  return { layer, layerCount: maxH + 1 }
}

/**
 * Position a component's nodes inside a box, converging toward the bottom row.
 * Layers run top→bottom; within a layer, nodes are ordered by the mean x of
 * their already-placed predecessors (a one-pass barycenter sweep) to reduce
 * crossings, then spread evenly across the box.
 */
function placeComponent(
  info: ComponentInfo,
  nodeDatum: Map<string, Datum>,
  nodeCategory: Map<string, string>,
  outAdj: Map<string, Set<string>>,
  inAdj: Map<string, Set<string>>,
  box: { x: number; y: number; width: number; height: number },
  maxRadius: number
): { nodes: NetEnsemblePlacedNode[]; edges: NetEnsemblePlacedEdge[] } {
  const { layer, layerCount } = layerComponent(info.ids, outAdj)
  const buckets: string[][] = Array.from({ length: layerCount }, () => [])
  for (const id of info.ids) buckets[layer.get(id)!].push(id)

  const pad = Math.min(box.width, box.height) * 0.14
  const innerW = Math.max(1, box.width - 2 * pad)
  const innerH = Math.max(1, box.height - 2 * pad)
  const pos = new Map<string, { x: number; y: number }>()
  const member = new Set(info.ids)

  for (let li = 0; li < layerCount; li += 1) {
    let order = buckets[li]
    if (li > 0) {
      order = [...order].sort((a, b) => baryX(a) - baryX(b))
    }
    const n = order.length
    const y =
      box.y + pad + (layerCount === 1 ? 0.5 : li / (layerCount - 1)) * innerH
    order.forEach((id, k) => {
      const x = box.x + pad + (n === 1 ? 0.5 : k / (n - 1)) * innerW
      pos.set(id, { x, y })
    })
  }

  function baryX(id: string): number {
    let sum = 0
    let count = 0
    for (const p of inAdj.get(id) ?? []) {
      const pp = pos.get(p)
      if (member.has(p) && pp) {
        sum += pp.x
        count += 1
      }
    }
    return count > 0 ? sum / count : box.x + innerW / 2
  }

  const maxBucket = buckets.reduce((m, b) => Math.max(m, b.length), 1)
  const r = clamp(
    Math.min(
      maxRadius,
      innerW / (2.4 * maxBucket),
      innerH / (2.4 * layerCount)
    ),
    1.4,
    maxRadius
  )

  const nodes: NetEnsemblePlacedNode[] = info.ids.map((id) => {
    const p = pos.get(id)!
    return {
      id,
      cx: p.x,
      cy: p.y,
      r,
      datum: nodeDatum.get(id) ?? datumFromFields({ id }),
      category: nodeCategory.get(id) ?? ""
    }
  })

  const edges: NetEnsemblePlacedEdge[] = []
  for (const u of info.ids) {
    const pu = pos.get(u)!
    for (const v of outAdj.get(u) ?? []) {
      if (!member.has(v)) continue
      const pv = pos.get(v)!
      edges.push({ x1: pu.x, y1: pu.y, x2: pv.x, y2: pv.y })
    }
  }
  return { nodes, edges }
}

/** A short, human descriptor for a component's shape. */
function describeMotif(info: ComponentInfo): string {
  const { nodeCount, edgeCount, sinkCount, sourceCount } = info
  if (nodeCount === 1) return "isolate"
  if (nodeCount === 2 && edgeCount === 1) return "pair"
  const chain =
    sourceCount === 1 && sinkCount === 1 && edgeCount === nodeCount - 1
  if (chain) return `chain of ${nodeCount}`
  if (info.directed && sourceCount === 1 && edgeCount > nodeCount - 1)
    return "diamond / mesh"
  if (info.directed) return `converging (${nodeCount})`
  return `branching → ${sinkCount}`
}

/** Build directed + undirected adjacency maps over a resolved id set, deduping
 *  parallel edges and dropping self-loops / dangling endpoints. */
function buildAdjacencies(
  ids: readonly string[],
  edges: ReadonlyArray<{ source: string; target: string }>
): {
  outAdj: Map<string, Set<string>>
  inAdj: Map<string, Set<string>>
  undirected: Map<string, Set<string>>
} {
  const nodeSet = new Set(ids)
  const outAdj = new Map<string, Set<string>>()
  const inAdj = new Map<string, Set<string>>()
  const undirected = new Map<string, Set<string>>()
  for (const id of ids) {
    outAdj.set(id, new Set())
    inAdj.set(id, new Set())
    undirected.set(id, new Set())
  }
  for (const e of edges) {
    const s = e.source
    const t = e.target
    if (!nodeSet.has(s) || !nodeSet.has(t) || s === t) continue
    if (outAdj.get(s)!.has(t)) continue
    outAdj.get(s)!.add(t)
    inAdj.get(t)!.add(s)
    undirected.get(s)!.add(t)
    undirected.get(t)!.add(s)
  }
  return { outAdj, inAdj, undirected }
}

/** Weakly-connected components → per-component net diagnostics + fingerprint. */
function analyzeComponents(
  ids: readonly string[],
  outAdj: Map<string, Set<string>>,
  inAdj: Map<string, Set<string>>,
  undirected: Map<string, Set<string>>,
  rounds: number
): ComponentInfo[] {
  const seen = new Set<string>()
  const components: ComponentInfo[] = []
  for (const start of ids) {
    if (seen.has(start)) continue
    const stack = [start]
    seen.add(start)
    const compIds: string[] = []
    while (stack.length) {
      const cur = stack.pop()!
      compIds.push(cur)
      for (const nb of undirected.get(cur) ?? []) {
        if (!seen.has(nb)) {
          seen.add(nb)
          stack.push(nb)
        }
      }
    }
    const member = new Set(compIds)
    let sinkCount = 0
    let sourceCount = 0
    let compEdges = 0
    for (const id of compIds) {
      let outDeg = 0
      let inDeg = 0
      for (const s of outAdj.get(id) ?? []) if (member.has(s)) outDeg += 1
      for (const p of inAdj.get(id) ?? []) if (member.has(p)) inDeg += 1
      compEdges += outDeg
      if (outDeg === 0) sinkCount += 1
      if (inDeg === 0) sourceCount += 1
    }
    components.push({
      ids: compIds,
      nodeCount: compIds.length,
      edgeCount: compEdges,
      sinkCount,
      sourceCount,
      directed: sinkCount === 1,
      motif: motifFingerprint(compIds, outAdj, inAdj, compEdges, rounds)
    })
  }
  return components
}

// Module-scope geometry cache — signed by content, never array identity.
const GEOM_CACHE = new LayoutCache<Geom>(8)

export const netEnsembleLayout: NetworkCustomLayout<NetEnsembleConfig> = (
  ctx
) => {
  const cfg = ctx.config || {}
  const plot = ctx.dimensions.plot
  if (!ctx.nodes.length) return { sceneNodes: [] }

  const sourceAcc = cfg.sourceAccessor ?? "source"
  const targetAcc = cfg.targetAccessor ?? "target"
  const labelAcc = cfg.labelAccessor ?? "label"
  const categoryAcc = cfg.categoryAccessor ?? "category"
  const nodeRadius = cfg.nodeRadius ?? 4
  const cellGap = cfg.cellGap ?? 16
  const bandGap = cfg.bandGap ?? 22
  const headerHeight = cfg.headerHeight ?? 34
  const minCellForFull = cfg.minCellForFull ?? 38
  const maxCellSize = cfg.maxCellSize ?? 120
  const minCellSize = cfg.minCellSize ?? 12
  const rounds = cfg.fingerprintRounds ?? 3
  const groupByMotif = cfg.groupByMotif !== false
  const sort = cfg.sort ?? "frequency"

  // ── Resolve raw nodes/edges ───────────────────────────────────────────────
  const nodeDatum = new Map<string, Datum>()
  const nodeCategory = new Map<string, string>()
  const ids: string[] = []
  for (const node of ctx.nodes) {
    const id = node.id
    if (id == null || nodeDatum.has(id)) continue
    ids.push(id)
    nodeDatum.set(id, (node.data ?? node) as Datum)
    nodeCategory.set(id, String(readField(node, categoryAcc, "")))
  }
  const resolvedEdges: Array<{ source: string; target: string }> = []
  for (const edge of ctx.edges) {
    const s = endpointId(
      edge.source ?? (readField(edge, sourceAcc, undefined) as string)
    )
    const t = endpointId(
      edge.target ?? (readField(edge, targetAcc, undefined) as string)
    )
    if (s == null || t == null) continue
    resolvedEdges.push({ source: s, target: t })
  }

  const { outAdj, inAdj, undirected } = buildAdjacencies(ids, resolvedEdges)
  const components = analyzeComponents(ids, outAdj, inAdj, undirected, rounds)

  // ── Group into motif bands + order ────────────────────────────────────────
  const bandsMap = new Map<string, ComponentInfo[]>()
  if (groupByMotif) {
    for (const c of components) {
      const arr = bandsMap.get(c.motif)
      if (arr) arr.push(c)
      else bandsMap.set(c.motif, [c])
    }
  } else {
    bandsMap.set(
      "all",
      [...components].sort((a, b) => b.nodeCount - a.nodeCount)
    )
  }
  const bandGroups = [...bandsMap.entries()]
  bandGroups.sort((a, b) => {
    if (sort === "size") return b[1][0].nodeCount - a[1][0].nodeCount
    if (sort === "directedness")
      return Number(b[1][0].directed) - Number(a[1][0].directed)
    return b[1].length - a[1].length // frequency
  })

  // ── Fit a global cell size, then arrange (cached geometry) ────────────────
  const fingerprint = fnv1a(
    ids.join(",") +
      "|" +
      [...outAdj.entries()]
        .map(([k, v]) => k + ">" + [...v].sort().join("."))
        .join(";")
  )
  const sig = signatureKey([
    Math.round(plot.x),
    Math.round(plot.y),
    Math.round(plot.width),
    Math.round(plot.height),
    cellGap,
    bandGap,
    headerHeight,
    minCellForFull,
    maxCellSize,
    minCellSize,
    rounds,
    groupByMotif,
    sort,
    nodeRadius,
    bandGroups.map(([k, v]) => k + ":" + v.length).join(","),
    fingerprint
  ])

  const geom = GEOM_CACHE.getOrCompute(sig, () =>
    buildGeometry(bandGroups, {
      plot,
      cellGap,
      bandGap,
      headerHeight,
      minCellForFull,
      maxCellSize,
      minCellSize,
      nodeRadius,
      nodeDatum,
      nodeCategory,
      outAdj,
      inAdj
    })
  )

  // ── Emit scene (styling applied here — outside the cache) ─────────────────
  const semantic = ctx.theme.semantic || {}
  const convergeColor = cfg.convergeColor ?? semantic.info ?? "#4c78a8"
  const branchColor = cfg.branchColor ?? semantic.warning ?? "#e8853a"
  const edgeColor = cfg.edgeColor ?? semantic.border ?? "#9aa0aa"
  const colorMode = cfg.colorMode ?? "directedness"
  const selPredicate = ctx.selection?.isActive ? ctx.selection.predicate : null
  const dimOpts = {
    predicate: selPredicate,
    highlight: cfg.highlight ?? null,
    dimOpacity: 0.14
  }

  const componentColor = (info: ComponentInfo): string => {
    if (colorMode === "motif") return ctx.resolveColor(info.motif)
    if (colorMode === "category") return convergeColor // node-level override below
    return info.directed ? convergeColor : branchColor
  }

  const sceneNodes: NetworkSceneNode[] = []
  const sceneEdges: NetworkSceneEdge[] = []

  for (const cell of geom.cells) {
    const info = cell.component
    const baseFill = componentColor(info)
    if (cell.lod === "full") {
      for (const e of cell.edges) {
        const line: NetworkLineEdge = {
          type: "line",
          x1: e.x1,
          y1: e.y1,
          x2: e.x2,
          y2: e.y2,
          style: { stroke: edgeColor, strokeWidth: 1, opacity: 0.5 },
          datum: null
        }
        sceneEdges.push(line)
      }
      for (const n of cell.nodes) {
        const fill =
          colorMode === "category" && n.category
            ? ctx.resolveColor(n.category)
            : baseFill
        const symbol: NetworkSymbolNode = {
          type: "symbol",
          cx: n.cx,
          cy: n.cy,
          size: Math.PI * n.r * n.r,
          symbolType: "circle",
          style: { fill, opacity: dimFor(n.datum, dimOpts) },
          datum: n.datum,
          id: n.id,
          label: String(readField(n.datum, labelAcc, n.id))
        }
        sceneNodes.push(symbol)
      }
    } else {
      // Collapsed: the whole component is one hit-testable glyph.
      const compDatum = datumFromFields({
        id: `motif-${info.motif}-${cell.cx.toFixed(0)}-${cell.cy.toFixed(0)}`,
        motif: info.motif,
        shape: describeMotif(info),
        nodes: info.nodeCount,
        edges: info.edgeCount,
        sinks: info.sinkCount,
        sources: info.sourceCount,
        directedness: info.directed ? "converging" : "branching"
      })
      const symbol: NetworkSymbolNode = {
        type: "symbol",
        cx: cell.cx,
        cy: cell.cy,
        size: Math.PI * cell.glyphR * cell.glyphR,
        symbolType: info.directed ? "circle" : "diamond",
        style: {
          fill: baseFill,
          opacity: dimFor(compDatum, dimOpts),
          stroke: edgeColor,
          strokeWidth: 0.75
        },
        datum: compDatum,
        id: String(compDatum.id),
        label: describeMotif(info)
      }
      sceneNodes.push(symbol)
    }
  }

  const overlays = buildNetEnsembleOverlays(geom.bands, {
    convergeColor,
    branchColor,
    edgeColor,
    plot,
    showBandLabels: cfg.showBandLabels !== false,
    showExemplars: cfg.showExemplars !== false,
    // The legend explains the directedness colors; only show it when fill
    // actually encodes directedness (not in motif / category color modes).
    showLegend: cfg.showLegend !== false && colorMode === "directedness",
    textColor: semantic.text ?? "var(--semiotic-text, #1a1a1a)",
    subText: semantic.textSecondary ?? "var(--semiotic-text-secondary, #888)"
  })

  return { sceneNodes, sceneEdges, overlays }
}

// ── Geometry builder (pure; cached) ────────────────────────────────────────────

interface BuildOpts {
  plot: { x: number; y: number; width: number; height: number }
  cellGap: number
  bandGap: number
  headerHeight: number
  minCellForFull: number
  maxCellSize: number
  minCellSize: number
  nodeRadius: number
  nodeDatum: Map<string, Datum>
  nodeCategory: Map<string, string>
  outAdj: Map<string, Set<string>>
  inAdj: Map<string, Set<string>>
}

function buildGeometry(
  bandGroups: Array<[string, ComponentInfo[]]>,
  o: BuildOpts
): Geom {
  const { plot } = o
  const availW = Math.max(40, plot.width)

  // Pick the largest cell size at which the whole ensemble fits the plot height.
  const chooseCell = (): { cell: number; cols: number } => {
    for (let cell = o.maxCellSize; cell >= o.minCellSize; cell -= 2) {
      const cols = Math.max(
        1,
        Math.floor((availW + o.cellGap) / (cell + o.cellGap))
      )
      let h = 0
      for (const [, comps] of bandGroups) {
        const rows = Math.ceil(comps.length / cols)
        h += o.headerHeight + rows * (cell + o.cellGap) + o.bandGap
      }
      if (h <= plot.height) return { cell, cols }
    }
    const cols = Math.max(
      1,
      Math.floor((availW + o.cellGap) / (o.minCellSize + o.cellGap))
    )
    return { cell: o.minCellSize, cols }
  }
  const { cell, cols } = chooseCell()

  const cells: Cell[] = []
  const bands: BandInfo[] = []
  let cursorY = plot.y

  for (const [motif, comps] of bandGroups) {
    const rows = Math.ceil(comps.length / cols)
    const bandTop = cursorY
    const gridTop = bandTop + o.headerHeight
    const full = cell >= o.minCellForFull

    comps.forEach((info, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = plot.x + col * (cell + o.cellGap)
      const y = gridTop + row * (cell + o.cellGap)
      const box = { x, y, width: cell, height: cell }
      if (full) {
        const placed = placeComponent(
          info,
          o.nodeDatum,
          o.nodeCategory,
          o.outAdj,
          o.inAdj,
          box,
          o.nodeRadius
        )
        cells.push({
          component: info,
          lod: "full",
          cx: x + cell / 2,
          cy: y + cell / 2,
          glyphR: 0,
          nodes: placed.nodes,
          edges: placed.edges
        })
      } else {
        cells.push({
          component: info,
          lod: "glyph",
          cx: x + cell / 2,
          cy: y + cell / 2,
          glyphR: Math.max(2.5, cell * 0.36),
          nodes: [],
          edges: []
        })
      }
    })

    // Exemplar: the first (representative) component drawn once in the header.
    const exemplar = placeExemplar(comps[0], o, {
      x: plot.x,
      y: bandTop + 2,
      width: Math.min(o.headerHeight - 6, 40),
      height: o.headerHeight - 6
    })

    bands.push({
      motif,
      descriptor: describeMotif(comps[0]),
      count: comps.length,
      directed: comps[0].directed,
      x: plot.x,
      y: bandTop,
      width: availW,
      height: o.headerHeight + rows * (cell + o.cellGap),
      exemplar
    })

    cursorY = gridTop + rows * (cell + o.cellGap) + o.bandGap
  }

  return { cells, bands }
}

function placeExemplar(
  info: ComponentInfo,
  o: BuildOpts,
  box: { x: number; y: number; width: number; height: number }
): { nodes: NetEnsemblePlacedNode[]; edges: NetEnsemblePlacedEdge[] } | null {
  if (!info) return null
  return placeComponent(
    info,
    o.nodeDatum,
    o.nodeCategory,
    o.outAdj,
    o.inAdj,
    box,
    3
  )
}
