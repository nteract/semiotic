import * as React from "react"
import type { ReactNode } from "react"
import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type {
  NetworkSceneNode,
  NetworkRectNode,
  NetworkCircleNode,
  NetworkSceneEdge,
  NetworkCurvedEdge,
} from "../stream/networkTypes"
import type { Datum } from "../charts/shared/datumTypes"
import { readField } from "./recipeUtils"

/**
 * Level of detail for a node glyph.
 * - `full`    container + icon + type label + truncated name + store-slot chips
 * - `compact` container + icon + truncated name
 * - `icon`    container + icon only
 * - `dot`     a single ~5px circle (minimap density)
 */
export type LineageLod = "full" | "compact" | "icon" | "dot"

export interface LineageStoreSlot {
  storeName: string
  slotIndex: number
}

export interface LineageDagConfig {
  /** Number of layers (x domain). Computed from node `x` extents when omitted. */
  layerCount?: number
  /** Largest layer's row count (y domain). Computed from the data when omitted. */
  maxLayerSize?: number

  /** Target full-glyph width / height in px. Shrunk to fit the plot. @default 172 / 54 */
  nodeWidth?: number
  nodeHeight?: number
  /** Minimum gap reserved between glyphs when fitting. @default 26 / 18 */
  minGapX?: number
  minGapY?: number

  /** Force a level of detail; `"auto"` derives it from the fitted glyph size. @default "auto" */
  lod?: LineageLod | "auto"

  /**
   * Caller-supplied "reachable" set. When present, nodes/edges **outside**
   * it dim to `dimOpacity`. This is the controlled-dimming channel: the host
   * computes the set (e.g. downstream BFS of the hovered node) and re-renders.
   * Independent of, and composes with, `NetworkLayoutContext.selection`.
   */
  reachableIds?: Iterable<string> | null
  /** Currently-selected node id — drawn with the selection ring. Host-owned. */
  selectedId?: string | null
  /** Opacity for dimmed (out-of-reach / unselected) marks. @default 0.14 */
  dimOpacity?: number

  // ── field accessors on the node/edge datum ──────────────────────────────
  /** Logical layer index (0 = leftmost). @default "x" */
  layerAccessor?: string
  /** Logical row offset within the layer (centered on 0). @default "y" */
  rowAccessor?: string
  /** Node partition → fill family. @default "partition" */
  partitionAccessor?: string
  /** Node semantic → icon. @default "semantic" */
  semanticAccessor?: string
  /** Human label. @default "label" */
  labelAccessor?: string
  /** Store list — `string[]` or `{storeName,slotIndex}[]`. @default "stores" */
  storesAccessor?: string
  /** Edge "closes a cycle" flag. @default "isBackEdge" */
  backEdgeAccessor?: string
  /** Edge type, drives edge color. @default "edgeType" */
  edgeTypeAccessor?: string

  // ── visuals ─────────────────────────────────────────────────────────────
  /** Fill per partition. Overridable; recipe ships dark-theme-friendly defaults. */
  partitionColors?: Partial<Record<string, string>>
  /** Edge stroke per edgeType, plus `back` for back-edges. */
  edgeColors?: Partial<Record<string, string>>
  /** Selection-ring stroke. @default var(--semiotic-focus, #ffcc33) */
  accentColor?: string
  /** Container border stroke. @default var(--semiotic-border, #555) */
  borderColor?: string
  /** Draw the store-slot chips in `full` LOD. @default true */
  showStoreChips?: boolean
  /** Chip fill. @default var(--semiotic-info, #6a8caf) */
  storeChipColor?: string
  /** Base edge opacity (non-dimmed). @default 0.5 */
  edgeOpacity?: number
  /** Forward-edge stroke width in px. @default 1.25 */
  edgeWidth?: number
  /** Back-edge stroke width in px. @default `edgeWidth`, else 1.5 */
  backEdgeWidth?: number

  /**
   * Render the per-node icon. Receives the resolved semantic/partition, the
   * pixel size to draw within, and a color hint. Return any SVG node. When
   * omitted a labelled fallback chip is drawn. The demo passes a KStreams
   * icon set here — keeping the recipe domain-agnostic.
   */
  renderIcon?: (info: {
    semantic: string
    partition: string
    size: number
    color: string
    node: Datum
  }) => ReactNode
  /** Small type label shown above the name in `full` LOD. @default the semantic. */
  typeLabel?: (info: { semantic: string; partition: string; node: Datum }) => string
}

const DEFAULT_PARTITION_COLORS: Record<string, string> = {
  "topic-source": "#1f7a8c",
  "topic-sink": "#b4451f",
  "topic-bridge": "#4b5a82",
  processor: "#34344a",
  unknown: "#5a5a6a",
}

const DEFAULT_EDGE_COLORS: Record<string, string> = {
  internal: "var(--semiotic-border, #6b6b7d)",
  "cross-subtopology": "var(--semiotic-info, #6a8caf)",
  "topic-bridge": "var(--semiotic-secondary, #8b78c4)",
  back: "var(--semiotic-danger, #e0556b)",
}

function normalizeStores(raw: unknown): LineageStoreSlot[] {
  if (!Array.isArray(raw)) return []
  return raw.map((s, i) =>
    typeof s === "string"
      ? { storeName: s, slotIndex: i }
      : { storeName: String((s as LineageStoreSlot).storeName ?? ""), slotIndex: (s as LineageStoreSlot).slotIndex ?? i }
  )
}

/**
 * `lineageDagLayout` — a reusable layout recipe for **pre-positioned layered
 * lineage / DAG graphs** with rich, composite node glyphs. Used here for the
 * Kafka Streams topology viewer, but domain-agnostic: it reads logical
 * `x` (layer) / `y` (row) coordinates the caller already computed (e.g. from a
 * `dagLayoutFromGraph` pipeline) and maps them into the plot — it never runs a
 * force sim or re-lays-out, so output is deterministic.
 *
 * **Composite glyphs as one hit-testable unit.** Each node emits exactly one
 * `rect` (or `circle` in `dot` LOD) scene node — that single mark owns the
 * canvas hit area and carries the node datum/id. All glyph chrome (semantic
 * icon, type label, truncated name, per-store chips, selection ring) is drawn
 * in the returned `overlays` layer, which is `pointer-events: none`, so it
 * decorates without ever intercepting a hover. Hover/click therefore always
 * resolve to the underlying node as a unit — see §5.2(a) of the spec.
 *
 * **Controlled dimming + selection, from outside.** `config.reachableIds`
 * (host-computed set) dims everything outside it; `config.selectedId` draws
 * the selection ring; both are owned by the host, never by the frame. The
 * shared `NetworkLayoutContext.selection` predicate (from `LinkedCharts`)
 * composes on top — a node dims if excluded by *either* cue.
 *
 * @example
 * ```tsx
 * import { NetworkCustomChart } from "semiotic/network"
 * import { lineageDagLayout } from "semiotic/recipes"
 *
 * <NetworkCustomChart
 *   nodes={dagNodes}   // each: { id, x: layer, y: row, partition, semantic, stores, label }
 *   edges={dagEdges}   // each: { source, target, edgeType, isBackEdge }
 *   layout={lineageDagLayout}
 *   layoutConfig={{ layerCount, maxLayerSize, reachableIds, selectedId }}
 * />
 * ```
 */
export const lineageDagLayout: NetworkCustomLayout<LineageDagConfig> = (ctx) => {
  const cfg = ctx.config || {}
  const plot = ctx.dimensions.plot

  const layerAcc = cfg.layerAccessor ?? "x"
  const rowAcc = cfg.rowAccessor ?? "y"
  const partAcc = cfg.partitionAccessor ?? "partition"
  const semAcc = cfg.semanticAccessor ?? "semantic"
  const labelAcc = cfg.labelAccessor ?? "label"
  const storesAcc = cfg.storesAccessor ?? "stores"
  const backAcc = cfg.backEdgeAccessor ?? "isBackEdge"
  const edgeTypeAcc = cfg.edgeTypeAccessor ?? "edgeType"

  const partColors = { ...DEFAULT_PARTITION_COLORS, ...cfg.partitionColors }
  const edgeColors = { ...DEFAULT_EDGE_COLORS, ...cfg.edgeColors }
  const accent = cfg.accentColor ?? "var(--semiotic-focus, #ffcc33)"
  const border = cfg.borderColor ?? "var(--semiotic-border, #555)"
  const dimOpacity = cfg.dimOpacity ?? 0.14
  const edgeOpacity = cfg.edgeOpacity ?? 0.5
  const edgeWidth = cfg.edgeWidth ?? 1.25
  const backEdgeWidth = cfg.backEdgeWidth ?? cfg.edgeWidth ?? 1.5
  const showChips = cfg.showStoreChips !== false
  const chipColor = cfg.storeChipColor ?? "var(--semiotic-info, #6a8caf)"

  // ── Domain (layer/row counts) ───────────────────────────────────────────
  let layerCount = cfg.layerCount
  let maxLayerSize = cfg.maxLayerSize
  if (layerCount == null || maxLayerSize == null) {
    let maxLayer = 0
    const rowsByLayer = new Map<number, number>()
    for (const n of ctx.nodes) {
      const lx = Math.round(Number(readField(n, layerAcc, 0)))
      maxLayer = Math.max(maxLayer, lx)
      rowsByLayer.set(lx, (rowsByLayer.get(lx) ?? 0) + 1)
    }
    layerCount = layerCount ?? maxLayer + 1
    maxLayerSize = maxLayerSize ?? Math.max(1, ...rowsByLayer.values())
  }

  // ── Glyph size + level of detail ────────────────────────────────────────
  const availW = plot.width / Math.max(1, layerCount)
  const availH = plot.height / Math.max(1, maxLayerSize)
  let w = Math.min(cfg.nodeWidth ?? 172, Math.max(8, availW - (cfg.minGapX ?? 26)))
  let h = Math.min(cfg.nodeHeight ?? 54, Math.max(8, availH - (cfg.minGapY ?? 18)))
  const lod: LineageLod =
    cfg.lod && cfg.lod !== "auto"
      ? cfg.lod
      : w < 16
        ? "dot"
        : w < 48
          ? "icon"
          : w < 108
            ? "compact"
            : "full"
  if (lod === "dot") {
    const d = Math.min(w, h, 11)
    w = d
    h = d
  }

  // ── Logical → pixel mapping ─────────────────────────────────────────────
  const usableW = Math.max(1, plot.width - w)
  const usableH = Math.max(1, plot.height - h)
  const rowSpan = Math.max(1, maxLayerSize - 1)
  const xPx = (layer: number) =>
    plot.x + w / 2 + (layerCount! > 1 ? layer / (layerCount! - 1) : 0.5) * usableW
  const yPx = (row: number) => plot.y + h / 2 + ((row + rowSpan / 2) / rowSpan) * usableH

  // ── Reach / selection state ─────────────────────────────────────────────
  const reachSet = cfg.reachableIds ? new Set(cfg.reachableIds) : null
  const selId = cfg.selectedId ?? null
  const sel = ctx.selection

  const positions = new Map<string, { cx: number; cy: number }>()
  const dimById = new Map<string, boolean>()
  const sceneNodes: NetworkSceneNode[] = []
  const glyphs: Array<{
    id: string
    cx: number
    cy: number
    partition: string
    semantic: string
    label: string
    stores: LineageStoreSlot[]
    opacity: number
    selected: boolean
    node: Datum
  }> = []

  for (const node of ctx.nodes) {
    const id = node.id
    const layer = Number(readField(node, layerAcc, 0))
    const row = Number(readField(node, rowAcc, 0))
    const partition = String(readField(node, partAcc, "processor"))
    const semantic = String(readField(node, semAcc, "processor"))
    const label = String(readField(node, labelAcc, id))
    const stores = normalizeStores(readField(node, storesAcc, []))
    const rawDatum = (node.data ?? node) as Datum

    const cx = xPx(layer)
    const cy = yPx(row)
    positions.set(id, { cx, cy })

    // Reach (host-owned set) is the dimming source when present; otherwise the
    // shared selection (from LinkedCharts) governs dimming. A selection match
    // always rescues from dim and draws the ring, so a linked selection
    // *highlights* a node across views rather than fighting the reach preview.
    const inReach = reachSet ? reachSet.has(id) : null
    const selMatch = sel?.isActive ? sel.predicate(rawDatum) : null
    const dimmed = inReach !== null ? !inReach : selMatch !== null ? !selMatch : false
    dimById.set(id, dimmed)
    // The selection ring is host-owned (`selectedId`) only — `ctx.selection`
    // is a dim/focus cue (it may carry a many-node reach set, which must not
    // ring every member).
    const selected = selId != null && id === selId
    // The selected node is the focus — never dim it out, even when a reach
    // preview would otherwise exclude it.
    const opacity = dimmed && !selected ? dimOpacity : 1
    const fill = partColors[partition] ?? partColors.unknown

    if (lod === "dot") {
      const dot: NetworkCircleNode = {
        type: "circle",
        cx,
        cy,
        r: w / 2,
        style: {
          fill,
          opacity,
          stroke: selected ? accent : "transparent",
          strokeWidth: selected ? 2 : 0,
        },
        datum: node,
        id,
        label,
      }
      sceneNodes.push(dot)
    } else {
      const rect: NetworkRectNode = {
        type: "rect",
        x: cx - w / 2,
        y: cy - h / 2,
        w,
        h,
        style: {
          fill,
          opacity,
          stroke: selected ? accent : border,
          strokeWidth: selected ? 3 : 1,
        },
        datum: node,
        id,
        label,
      }
      sceneNodes.push(rect)
      glyphs.push({ id, cx, cy, partition, semantic, label, stores, opacity, selected, node: rawDatum })
    }
  }

  // ── Edges ───────────────────────────────────────────────────────────────
  const sceneEdges: NetworkSceneEdge[] = []
  for (const edge of ctx.edges) {
    const sId = typeof edge.source === "string" ? edge.source : edge.source.id
    const tId = typeof edge.target === "string" ? edge.target : edge.target.id
    const s = positions.get(sId)
    const t = positions.get(tId)
    if (!s || !t) continue

    const isBack = Boolean(readField(edge, backAcc, false))
    const edgeType = String(readField(edge, edgeTypeAcc, "internal"))
    const dimmed = dimById.get(sId) || dimById.get(tId)
    const opacity = dimmed ? Math.min(edgeOpacity, dimOpacity * 1.4) : edgeOpacity
    const stroke = isBack ? edgeColors.back : edgeColors[edgeType] ?? edgeColors.internal

    let pathD: string
    if (isBack) {
      // Back-edge: a distinct dashed loop bowing *below* the layers, so the
      // cycle reads clearly against the forward L→R flow.
      const sx = s.cx
      const sy = s.cy + h / 2
      const tx = t.cx
      const ty = t.cy + h / 2
      const bow = Math.max(48, Math.abs(sx - tx) * 0.28) + h
      pathD = `M${sx},${sy} C${sx},${sy + bow} ${tx},${ty + bow} ${tx},${ty}`
    } else {
      // Forward edge: cubic-bezier S-curve, source right edge → target left edge.
      const sx = s.cx + w / 2
      const sy = s.cy
      const tx = t.cx - w / 2
      const ty = t.cy
      const mx = (sx + tx) / 2
      pathD = `M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`
    }

    const curved: NetworkCurvedEdge = {
      type: "curved",
      pathD,
      style: {
        stroke,
        strokeWidth: isBack ? backEdgeWidth : edgeWidth,
        fill: "none",
        opacity,
        ...(isBack ? { strokeDasharray: "5 4", strokeLinecap: "round" as const } : {}),
      },
      datum: edge,
    }
    sceneEdges.push(curved)
  }

  // ── Glyph chrome overlay (pointer-events:none; never steals a hit) ───────
  const overlays: ReactNode =
    glyphs.length === 0 ? null : (
      <g className="lineage-dag-glyphs">
        {glyphs.map((g) =>
          renderGlyph(g, {
            w,
            h,
            lod,
            partColors,
            chipColor,
            showChips,
            renderIcon: cfg.renderIcon,
            typeLabel: cfg.typeLabel,
          })
        )}
      </g>
    )

  return { sceneNodes, sceneEdges, overlays }
}

// ── Overlay glyph renderer ─────────────────────────────────────────────────

interface GlyphRenderCtx {
  w: number
  h: number
  lod: LineageLod
  partColors: Record<string, string | undefined>
  chipColor: string
  showChips: boolean
  renderIcon?: LineageDagConfig["renderIcon"]
  typeLabel?: LineageDagConfig["typeLabel"]
}

function renderGlyph(
  g: {
    id: string
    cx: number
    cy: number
    partition: string
    semantic: string
    label: string
    stores: LineageStoreSlot[]
    opacity: number
    selected: boolean
    node: Datum
  },
  c: GlyphRenderCtx
): ReactNode {
  const { w, h, lod } = c
  // In icon LOD the glyph IS the node — let the icon fill the rect (a small
  // category-color-filled square). Otherwise reserve room for the label.
  const iconSize = lod === "icon" ? Math.min(w, h) : Math.min(h - 14, 26)
  const iconColor = c.partColors[g.partition] ?? c.partColors.unknown ?? "#5a5a6a"
  const padX = 8
  const textX = lod === "icon" ? 0 : padX + iconSize + 8
  const textColor = "var(--semiotic-text, #f4f4f8)"
  const mutedColor = "var(--semiotic-text-secondary, #b9b9c8)"

  const icon =
    c.renderIcon != null
      ? c.renderIcon({ semantic: g.semantic, partition: g.partition, size: iconSize, color: iconColor, node: g.node })
      : defaultIcon(g.semantic, g.partition, iconSize)

  const showType = lod === "full"
  const showName = lod !== "icon"
  const showChips = lod === "full" && c.showChips && g.stores.length > 0

  return (
    <g
      key={g.id}
      transform={`translate(${g.cx - w / 2}, ${g.cy - h / 2})`}
      opacity={g.opacity}
      style={{ pointerEvents: "none" }}
    >
      {/* icon slot, vertically centered */}
      <g transform={`translate(${lod === "icon" ? (w - iconSize) / 2 : padX}, ${(h - iconSize) / 2})`}>
        {icon}
      </g>

      {showName && (
        // foreignObject + CSS ellipsis so the label truncates to the real
        // available width (not a character count), with the full text in a
        // native title tooltip — matching the DOM reference's behavior.
        <foreignObject
          x={textX}
          y={showType ? h / 2 - 12 : h / 2 - 9}
          width={Math.max(8, w - textX - 8)}
          height={18}
          style={{ pointerEvents: "none" }}
        >
          <div
            title={g.label}
            style={{
              // The SVG overlay's pointer-events:none does not reliably cascade
              // to HTML inside a foreignObject — set it here too, or these label
              // divs would intercept hover/click before the canvas does.
              pointerEvents: "none",
              fontFamily: "var(--semiotic-font-family, inherit)",
              fontSize: lod === "full" ? 12.5 : 11.5,
              fontWeight: 600,
              color: textColor,
              lineHeight: "18px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {g.label}
          </div>
        </foreignObject>
      )}

      {showType && (
        <text
          x={textX}
          y={h / 2 - 16}
          dominantBaseline="middle"
          fontSize={9.5}
          fontWeight={500}
          fill={mutedColor}
          style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
        >
          {(c.typeLabel
            ? c.typeLabel({ semantic: g.semantic, partition: g.partition, node: g.node })
            : g.partition.startsWith("topic")
              ? "topic"
              : g.semantic)}
        </text>
      )}

      {showChips &&
        g.stores.map((s, i) => {
          const chipW = 12
          const chipH = 5
          const gap = 3
          return (
            <rect
              key={s.storeName + i}
              x={textX + i * (chipW + gap)}
              y={h - 10}
              width={chipW}
              height={chipH}
              rx={1.5}
              fill={c.chipColor}
            >
              <title>{s.storeName}</title>
            </rect>
          )
        })}
    </g>
  )
}

/**
 * Minimal fallback icon when the caller supplies no `renderIcon`: a rounded
 * square in the partition color with a 1–2 letter semantic code. The demo
 * overrides this with a proper KStreams icon set.
 */
function defaultIcon(semantic: string, partition: string, size: number): ReactNode {
  const code = partition.startsWith("topic")
    ? "T"
    : (
        {
          source: "SR",
          sink: "SK",
          filter: "FL",
          map: "MP",
          aggregate: "AG",
          reduce: "RD",
          "join-this": "JN",
          "join-other": "JN",
          merge: "MG",
          suppress: "SP",
          select: "SE",
          tostream: "TS",
        } as Record<string, string>
      )[semantic] ?? "PR"
  return (
    <g>
      <rect width={size} height={size} rx={4} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" />
      <text
        x={size / 2}
        y={size / 2 + 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.42}
        fontWeight={700}
        fill="var(--semiotic-text, #fff)"
      >
        {code}
      </text>
    </g>
  )
}
