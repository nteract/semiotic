import * as React from "react"
import type { ReactNode } from "react"
import type { CustomLayout, LayoutContext } from "../stream/customLayout"
import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type { Datum } from "../charts/shared/datumTypes"
import type {
  AreaSceneNode,
  PointSceneNode,
  RectSceneNode,
  SceneNode,
  Style,
} from "../stream/types"
import type {
  BezierCache,
  BezierPoint,
  NetworkCurvedEdge,
  NetworkRectNode,
  RealtimeEdge,
  RealtimeNode,
} from "../stream/networkTypes"
import { createSafeDatum, resolveAccessor, groupBy } from "./recipeUtils"
import { getMax, getMinMax } from "../charts/shared/minMax"

export type GofishGlyphMark =
  | {
      kind: "rect"
      id: string
      x: number
      y: number
      width: number
      height: number
      style?: Style
      datum?: Datum
      group?: string
      interactive?: boolean
      rx?: number
      /** Clip this mark to an SVG path (pixel coords) — e.g. a fill to a silhouette. */
      clipPath?: string
    }
  | {
      kind: "image"
      id: string
      x: number
      y: number
      width: number
      height: number
      href: string
      /** @default "none" — stretch to the box; "xMidYMid meet" to letterbox. */
      preserveAspectRatio?: string
      opacity?: number
      /** Clip the image to an SVG path (pixel coords). */
      clipPath?: string
    }
  | {
      kind: "circle"
      id: string
      cx: number
      cy: number
      r: number
      style?: Style
      datum?: Datum
      group?: string
      interactive?: boolean
    }
  | {
      kind: "area"
      id: string
      topPath: [number, number][]
      bottomPath: [number, number][]
      style?: Style
      datum?: Datum[]
      group?: string
    }
  | {
      kind: "path"
      id: string
      d: string
      style?: Style
      datum?: Datum
      group?: string
      clipPath?: string
    }
  | {
      kind: "line"
      id: string
      x1: number
      y1: number
      x2: number
      y2: number
      style?: Style
    }
  | {
      kind: "text"
      id: string
      x: number
      y: number
      text: ReactNode
      style?: Style
      fontSize?: number
      fontWeight?: number | string
      textAnchor?: "start" | "middle" | "end"
      dominantBaseline?: React.SVGProps<SVGTextElement>["dominantBaseline"]
      transform?: string
    }

export interface GofishGlyphLayer {
  marks: GofishGlyphMark[]
  overlays?: ReactNode
}

export interface HitRectForGlyphOptions {
  id: string
  x: number
  y: number
  width: number
  height: number
  datum?: Datum
  group?: string
  style?: Style
  rx?: number
}

export type GofishGlyphSolver<C extends object> = (
  ctx: LayoutContext<C>
) => GofishGlyphLayer

export function hitRectForGlyph(options: HitRectForGlyphOptions): GofishGlyphMark {
  return {
    kind: "rect",
    id: options.id,
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    style: { fill: "rgba(0,0,0,0)", stroke: "none", ...options.style },
    datum: options.datum,
    group: options.group,
    rx: options.rx,
  }
}

export function overlayGroup(children: ReactNode, className = "semiotic-gofish-glyph-layer"): ReactNode {
  return (
    <g className={className} style={{ pointerEvents: "none" }}>
      {children}
    </g>
  )
}

/**
 * Compile a small GoFish-style mark vocabulary to a Semiotic custom layout.
 *
 * Rects, circles, and areas become normal scene nodes when interactive is not
 * false, so Semiotic owns hit testing, transitions, decay, SSR evidence, and
 * tooltips. Rich glyph chrome such as petal paths, labels, bottle silhouettes,
 * and arrows is rendered as pointer-events-none SVG overlay content.
 */
export function createGofishGlyphLayout<C extends object>(
  solve: GofishGlyphSolver<C>
): CustomLayout<C> {
  return (ctx) => {
    const layer = solve(ctx)
    const nodes: SceneNode[] = []
    const overlayMarks: ReactNode[] = []

    for (const mark of layer.marks) {
      if (mark.kind === "rect" && mark.interactive !== false) {
        const node: RectSceneNode = {
          type: "rect",
          x: mark.x,
          y: mark.y,
          w: mark.width,
          h: mark.height,
          cornerRadii: mark.rx ? { tl: mark.rx, tr: mark.rx, br: mark.rx, bl: mark.rx } : undefined,
          style: mark.style ?? { fill: ctx.theme.semantic.primary ?? "#4e79a7", stroke: "none" },
          datum: mark.datum ?? null,
          group: mark.group,
          _transitionKey: mark.id,
        }
        nodes.push(node)
      } else if (mark.kind === "circle" && mark.interactive !== false) {
        const node: PointSceneNode = {
          type: "point",
          x: mark.cx,
          y: mark.cy,
          r: mark.r,
          style: mark.style ?? { fill: ctx.theme.semantic.primary ?? "#4e79a7", stroke: "none" },
          datum: mark.datum ?? null,
          pointId: mark.id,
          _transitionKey: mark.id,
        }
        nodes.push(node)
      } else if (mark.kind === "area") {
        const node: AreaSceneNode = {
          type: "area",
          topPath: mark.topPath,
          bottomPath: mark.bottomPath,
          style: mark.style ?? { fill: ctx.theme.semantic.primary ?? "#4e79a7", stroke: "none" },
          datum: mark.datum ?? null,
          group: mark.group,
          _transitionKey: mark.id,
        }
        nodes.push(node)
      }

      if (mark.kind !== "area") {
        overlayMarks.push(renderGlyphMark(mark))
      }
    }

    const hasOverlays = overlayMarks.some(Boolean) || layer.overlays != null
    return {
      nodes,
      overlays: hasOverlays
        ? overlayGroup(
            <>
              {overlayMarks}
              {layer.overlays}
            </>
          )
        : null,
    }
  }
}

export interface GofishFlowerConfig {
  lakeAccessor?: string | ((d: Datum) => string)
  speciesAccessor?: string | ((d: Datum) => string)
  countAccessor?: string | ((d: Datum) => number)
  xAccessor?: string | ((d: Datum) => number)
  flowerRadius?: number
  stemWidth?: number
}

export interface GofishBottleConfig {
  categoryAccessor?: string | ((d: Datum) => string)
  amountAccessor?: string | ((d: Datum) => number)
  bottleWidth?: number
  bottleHeight?: number
}

export interface GofishPolarRibbonConfig {
  lakeAccessor?: string | ((d: Datum) => string)
  speciesAccessor?: string | ((d: Datum) => string)
  countAccessor?: string | ((d: Datum) => number)
  innerRadius?: number
  outerRadius?: number
}

export interface GofishTitanicCircleTreemapConfig {
  classAccessor?: string | ((d: Datum) => string | number)
  survivedAccessor?: string | ((d: Datum) => string | number | boolean)
  fareAccessor?: string | ((d: Datum) => number)
  padding?: number
}

export interface PythonTutorPointer {
  pointer: number
}

export interface PythonTutorBinding {
  name: string
  value: string | PythonTutorPointer
}

export interface PythonTutorTuple {
  values: Array<string | PythonTutorPointer>
}

export interface PythonTutorDiagram {
  stack: PythonTutorBinding[]
  heap: PythonTutorTuple[]
  heapArrangement: Array<Array<number | null>>
}

export interface GofishPythonTutorConfig {
  diagram?: PythonTutorDiagram
  cellWidth?: number
  cellHeight?: number
  heapGap?: number
}

export interface PythonTutorMemoryGraph {
  nodes: Datum[]
  edges: Datum[]
}

export function buildPythonTutorMemoryGraph(diagram: PythonTutorDiagram): PythonTutorMemoryGraph {
  const nodes: Datum[] = []
  const edges: Datum[] = []

  diagram.stack.forEach((slot, index) => {
    nodes.push({
      id: `binding-${slot.name}`,
      kind: "binding",
      index,
      name: slot.name,
      value: displayValue(slot.value),
      pointer: isPointer(slot.value) ? slot.value.pointer : undefined,
    })
    if (isPointer(slot.value)) {
      edges.push({
        source: `binding-${slot.name}`,
        target: `cell-${slot.value.pointer}-0`,
        value: 1,
        kind: "stack pointer",
        pointer: slot.value.pointer,
      })
    }
  })

  diagram.heap.forEach((tuple, address) => {
    tuple.values.forEach((value, cellIndex) => {
      nodes.push({
        id: `cell-${address}-${cellIndex}`,
        kind: "heap cell",
        address,
        cellIndex,
        value: displayValue(value),
        pointer: isPointer(value) ? value.pointer : undefined,
      })
      if (isPointer(value)) {
        edges.push({
          source: `cell-${address}-${cellIndex}`,
          target: `cell-${value.pointer}-0`,
          value: 1,
          kind: "heap pointer",
          pointer: value.pointer,
        })
      }
    })
  })

  return { nodes, edges }
}

export const gofishFlowerLayout = createGofishGlyphLayout<GofishFlowerConfig>((ctx) => {
  const cfg = ctx.config
  const getLake = resolveAccessor<string>(cfg.lakeAccessor ?? "lake")
  const getSpecies = resolveAccessor<string>(cfg.speciesAccessor ?? "species")
  const getCount = resolveAccessor<number>(cfg.countAccessor ?? "count")
  const getX = resolveAccessor<number>(cfg.xAccessor ?? "x")
  const plot = ctx.dimensions.plot
  const radius = cfg.flowerRadius ?? 34
  const stemW = cfg.stemWidth ?? 4
  const baseY = plot.y + plot.height - 24
  const groups = groupBy(ctx.data, (d) => String(getLake(d)))
  const totals = Array.from(groups.values()).map((rows) => sum(rows, (d) => number(getCount(d))))
  const maxTotal = Math.max(1, ...totals)
  const xPad = Math.min(plot.width / 2, Math.max(radius * 1.8, plot.width * 0.12))
  const xStart = plot.x + xPad
  const xEnd = plot.x + plot.width - xPad
  const xValues = ctx.data.map((d) => number(getX(d))).filter(Number.isFinite)
  const [dataMinX, dataMaxX] = xValues.length ? getMinMax(xValues) : [0, 1]
  const minX = dataMinX
  const maxX = dataMaxX
  const marks: GofishGlyphMark[] = []

  Array.from(groups.entries()).forEach(([lake, rows], lakeIndex) => {
    const rowX = rows.map((d) => number(getX(d))).find(Number.isFinite)
    const hasRowX = typeof rowX === "number" && Number.isFinite(rowX)
    const x = hasRowX
      ? lerp(xStart, xEnd, normalize(rowX, minX, maxX))
      : xStart + lakeIndex * ((xEnd - xStart) / Math.max(1, groups.size - 1))
    const speciesRows = aggregateRows(rows, (d) => String(getSpecies(d)), (d) => number(getCount(d)), { lake })
    const total = sum(speciesRows, (d) => d.value)
    const stemH = lerp(plot.height * 0.18, plot.height * 0.52, total / maxTotal)
    const flowerY = baseY - stemH
    const hitW = Math.max(10, stemW + 6)
    const datum = datumOf({
      lake,
      total,
      kind: "stem",
    })

    marks.push({
      kind: "rect",
      id: `flower-stem-hit-${lake}`,
      x: x - hitW / 2,
      y: baseY - stemH,
      width: hitW,
      height: stemH,
      style: { fill: "rgba(0,0,0,0)", stroke: "none" },
      datum,
      group: lake,
      rx: hitW / 2,
    })
    marks.push({
      kind: "rect",
      id: `flower-stem-${lake}`,
      x: x - stemW / 2,
      y: baseY - stemH,
      width: stemW,
      height: stemH,
      style: { fill: ctx.theme.semantic.success ?? "#2f8f46", stroke: "none" },
      datum,
      group: lake,
      rx: stemW / 2,
      interactive: false,
    })

    const flowerTotal = Math.max(1, total)
    let angle = -Math.PI / 2
    for (const row of speciesRows) {
      const species = row.key
      const count = Math.max(0, row.value)
      const sweep = Math.max(0.16, (count / flowerTotal) * Math.PI * 2)
      marks.push({
        kind: "path",
        id: `flower-petal-${lake}-${species}`,
        d: petalPath(x, flowerY, radius * 0.18, radius, angle, angle + sweep),
        style: {
          fill: ctx.resolveColor(species),
          fillOpacity: 0.78,
          stroke: "rgba(255,255,255,0.45)",
          strokeWidth: 0.7,
        },
        datum: row.datum,
        group: species,
      })
      angle += sweep
    }

    marks.push({
      kind: "circle",
      id: `flower-center-${lake}`,
      cx: x,
      cy: flowerY,
      r: Math.max(3, radius * 0.12),
      style: { fill: "#f6d365", stroke: "rgba(0,0,0,0.25)", strokeWidth: 0.6 },
      datum,
      group: lake,
      interactive: false,
    })
    marks.push({
      kind: "text",
      id: `flower-label-${lake}`,
      x,
      y: baseY + 16,
      text: lake,
      fontSize: 11,
      textAnchor: "middle",
      style: { fill: "var(--semiotic-text-secondary, #667)" },
    })
  })

  return { marks }
})

export const gofishBottleFillLayout = createGofishGlyphLayout<GofishBottleConfig>((ctx) => {
  const cfg = ctx.config
  const getCategory = resolveAccessor<string>(cfg.categoryAccessor ?? "category")
  const getAmount = resolveAccessor<number>(cfg.amountAccessor ?? "amount")
  const plot = ctx.dimensions.plot
  const bottleW = Math.min(cfg.bottleWidth ?? 78, plot.width / Math.max(1, ctx.data.length) * 0.68)
  const bottleH = Math.min(cfg.bottleHeight ?? 220, plot.height - 44)
  const gap = ctx.data.length > 1 ? (plot.width - bottleW * ctx.data.length) / (ctx.data.length - 1) : 0
  const top = plot.y + 14
  const marks: GofishGlyphMark[] = []
  const bottleOverlays: ReactNode[] = []

  ctx.data.forEach((d, i) => {
    const category = String(getCategory(d))
    const amount = Math.max(0, Math.min(100, number(getAmount(d))))
    const x = plot.x + (ctx.data.length === 1 ? (plot.width - bottleW) / 2 : i * (bottleW + gap))
    const y = top
    const fillH = bottleH * (amount / 100)
    const clipId = `semiotic-bottle-clip-${stableId(category)}-${i}`
    const outline = bottlePath(x, y, bottleW, bottleH)

    marks.push(hitRectForGlyph({
      id: `bottle-hit-${category}`,
      x,
      y,
      width: bottleW,
      height: bottleH,
      datum: datumOf({ category, amount, kind: "bottle" }),
      group: category,
    }))

    bottleOverlays.push(
      <g key={`bottle-${category}`}>
        <clipPath id={clipId}>
          <path d={outline} />
        </clipPath>
        <path
          d={outline}
          fill="rgba(255,255,255,0.12)"
          stroke="var(--semiotic-border, #9aa)"
          strokeWidth={1.2}
        />
        <rect
          x={x}
          y={y + bottleH - fillH}
          width={bottleW}
          height={fillH}
          fill="#20bf55"
          opacity={0.76}
          clipPath={`url(#${clipId})`}
        />
        <line
          x1={x + bottleW * 0.08}
          x2={x + bottleW * 1.18}
          y1={y + bottleH - fillH}
          y2={y + bottleH - fillH}
          stroke="var(--semiotic-text-secondary, #666)"
          strokeWidth={1}
        />
        <text
          x={x + bottleW * 1.22}
          y={y + bottleH - fillH + 4}
          fontSize={12}
          fill="var(--semiotic-text-secondary, #666)"
        >
          {amount}%
        </text>
        <text
          x={x + bottleW / 2}
          y={y + bottleH + 18}
          fontSize={11}
          textAnchor="middle"
          fill="var(--semiotic-text-secondary, #666)"
        >
          {category}
        </text>
      </g>
    )
  })

  return { marks, overlays: bottleOverlays }
})

export const gofishPolarRibbonLayout = createGofishGlyphLayout<GofishPolarRibbonConfig>((ctx) => {
  const cfg = ctx.config
  const getLake = resolveAccessor<string>(cfg.lakeAccessor ?? "lake")
  const getSpecies = resolveAccessor<string>(cfg.speciesAccessor ?? "species")
  const getCount = resolveAccessor<number>(cfg.countAccessor ?? "count")
  const plot = ctx.dimensions.plot
  const cx = plot.x + plot.width / 2
  const cy = plot.y + plot.height / 2
  const outer = Math.min(cfg.outerRadius ?? 145, Math.min(plot.width, plot.height) * 0.43)
  const inner = cfg.innerRadius ?? Math.max(34, outer * 0.28)
  const lakeGroups = groupBy(ctx.data, (d) => String(getLake(d)))
  const lakes = Array.from(lakeGroups.keys())
  const species = Array.from(new Set(ctx.data.map((d) => String(getSpecies(d)))))
  const totalsByLake = new Map(lakes.map((lake) => [lake, sum(lakeGroups.get(lake) ?? [], (d) => number(getCount(d)))]))
  const segmentBySpecies = new Map<string, Array<{ angle: number; innerR: number; outerR: number; datum: Datum }>>()
  const marks: GofishGlyphMark[] = []

  lakes.forEach((lake, lakeIndex) => {
    const rows = aggregateRows(
      lakeGroups.get(lake) ?? [],
      (d) => String(getSpecies(d)),
      (d) => number(getCount(d)),
      { lake }
    ).sort((a, b) => a.value - b.value)
    const angle = -Math.PI / 2 + (lakeIndex / lakes.length) * Math.PI * 2
    const total = Math.max(1, totalsByLake.get(lake) ?? 0)
    let cursor = inner
    for (const row of rows) {
      const sp = row.key
      const count = Math.max(0, row.value)
      const segment = (count / total) * (outer - inner)
      const r0 = cursor
      const r1 = cursor + segment
      cursor = r1
      const barWidth = Math.PI / 46
      const hit = polarPoint(cx, cy, (r0 + r1) / 2, angle)
      marks.push({
        kind: "path",
        id: `polar-bar-${lake}-${sp}`,
        d: polarBandPath(cx, cy, r0, r1, angle - barWidth, angle + barWidth),
        style: {
          fill: ctx.resolveColor(sp),
          fillOpacity: 0.82,
          stroke: "rgba(255,255,255,0.35)",
          strokeWidth: 0.7,
        },
        datum: row.datum,
        group: sp,
      })
      marks.push({
        kind: "circle",
        id: `polar-hit-${lake}-${sp}`,
        cx: hit[0],
        cy: hit[1],
        r: Math.max(5, barWidth * (r0 + r1) * 0.5),
        style: { fill: "rgba(0,0,0,0)", stroke: "none" },
        datum: row.datum,
        group: sp,
      })
      if (!segmentBySpecies.has(sp)) segmentBySpecies.set(sp, [])
      segmentBySpecies.get(sp)!.push({ angle, innerR: r0, outerR: r1, datum: row.datum })
    }
    const labelPoint = polarPoint(cx, cy, outer + 14, angle)
    marks.push({
      kind: "text",
      id: `polar-label-${lake}`,
      x: labelPoint[0],
      y: labelPoint[1],
      text: lake,
      fontSize: 10,
      textAnchor: "middle",
      dominantBaseline: "middle",
      style: { fill: "var(--semiotic-text-secondary, #667)" },
    })
  })

  for (const sp of species) {
    const segments = segmentBySpecies.get(sp) ?? []
    if (segments.length < 2) continue
    const top = segments.map((s) => polarPoint(cx, cy, s.outerR, s.angle))
    const bottom = [...segments].reverse().map((s) => polarPoint(cx, cy, s.innerR, s.angle))
    marks.push({
      kind: "path",
      id: `polar-ribbon-${sp}`,
      d: smoothClosedPath([...top, ...bottom]),
      style: {
        fill: ctx.resolveColor(sp),
        fillOpacity: 0.26,
        stroke: ctx.resolveColor(sp),
        strokeWidth: 1,
        opacity: 0.9,
      },
      datum: datumOf({ species: sp, kind: "ribbon" }),
      group: sp,
    })
  }

  marks.push({
    kind: "circle",
    id: "polar-center",
    cx,
    cy,
    r: inner - 4,
    style: { fill: "var(--semiotic-bg, #fff)", stroke: "var(--semiotic-border, #ccd)", strokeWidth: 1 },
    interactive: false,
  })

  return { marks }
})

export const gofishTitanicCircleTreemapLayout = createGofishGlyphLayout<GofishTitanicCircleTreemapConfig>((ctx) => {
  const cfg = ctx.config
  const getClass = resolveAccessor<string | number>(cfg.classAccessor ?? "pclass")
  const getSurvived = resolveAccessor<string | number | boolean>(cfg.survivedAccessor ?? "survived")
  const getFare = resolveAccessor<number>(cfg.fareAccessor ?? "fare")
  const plot = ctx.dimensions.plot
  const padding = cfg.padding ?? 2
  const classes = Array.from(groupBy(ctx.data, (d) => String(getClass(d))).entries())
    .sort(([a], [b]) => Number(a) - Number(b))
  const marks: GofishGlyphMark[] = []

  const regions = layoutTreemapStrip(
    classes.map(([klass, rows]) => ({
      id: klass,
      rows,
      value: sum(rows, (row) => Math.max(1, number(getFare(row)))),
      heightValue: rows.length
        ? sum(rows, (row) => Math.max(1, number(getFare(row)))) / rows.length
        : 0,
    })),
    { x: plot.x, y: plot.y, width: plot.width, height: plot.height },
    Math.max(4, padding * 4)
  )

  regions.forEach((region) => {
    const circles = packCirclesInRect(
      region.rows,
      region,
      (row) => Math.max(1, number(getFare(row))),
      Math.max(1, padding)
    )

    for (const circle of circles) {
      const row = circle.row
      const survived = String(getSurvived(row))
      const color = survived === "1" || survived === "true" || survived.toLowerCase() === "yes"
        ? "#4e92c3"
        : "#f28e2c"
      const fare = Math.max(1, number(getFare(row)))
      const datum = datumOf({
        ...row,
        fare,
        pclass: getClass(row),
        survived: getSurvived(row),
        value: fare,
        kind: "passenger",
      })
      marks.push({
        kind: "circle",
        id: `titanic-${region.id}-${stableId(String(row.name ?? row.id ?? circle.index))}`,
        cx: circle.x,
        cy: circle.y,
        r: circle.r,
        style: { fill: color, fillOpacity: 0.95, stroke: "#d7d7d7", strokeWidth: 0.8 },
        datum,
        group: survived,
      })
    }
  })

  return { marks }
})

export const gofishPythonTutorLayout = createGofishGlyphLayout<GofishPythonTutorConfig>((ctx) => {
  const diagram = ctx.config.diagram ?? (ctx.data[0] as unknown as PythonTutorDiagram | undefined)
  if (!diagram) return { marks: [] }
  const plot = ctx.dimensions.plot
  const cellW = ctx.config.cellWidth ?? 54
  const cellH = ctx.config.cellHeight ?? 28
  const heapGap = ctx.config.heapGap ?? 18
  const frameW = 170
  const stackX = plot.x + 20
  const stackY = plot.y + 38
  const heapX = stackX + frameW + 88
  const heapY = plot.y + 34
  const marks: GofishGlyphMark[] = []
  const overlays: ReactNode[] = []
  const anchors = new Map<string, [number, number]>()

  marks.push({
    kind: "rect",
    id: "python-global-frame",
    x: stackX,
    y: stackY - 30,
    width: frameW,
    height: 30 + diagram.stack.length * cellH,
    style: { fill: "rgba(58, 142, 255, 0.08)", stroke: "var(--semiotic-border, #9aa)", strokeWidth: 1 },
    datum: datumOf({ kind: "global frame" }),
    group: "stack",
    rx: 6,
    interactive: false,
  })
  marks.push({
    kind: "text",
    id: "python-global-label",
    x: stackX + 10,
    y: stackY - 10,
    text: "Global frame",
    fontSize: 12,
    fontWeight: 700,
    style: { fill: "var(--semiotic-text, #333)" },
  })

  diagram.stack.forEach((slot, i) => {
    const y = stackY + i * cellH
    marks.push({
      kind: "rect",
      id: `python-binding-${slot.name}`,
      x: stackX,
      y,
      width: frameW,
      height: cellH,
      style: { fill: "rgba(255,255,255,0.05)", stroke: "var(--semiotic-border, #9aa)", strokeWidth: 1 },
      datum: datumOf({ name: slot.name, value: displayValue(slot.value), kind: "binding" }),
      group: "binding",
    })
    marks.push({
      kind: "text",
      id: `python-binding-name-${slot.name}`,
      x: stackX + 10,
      y: y + cellH / 2 + 4,
      text: slot.name,
      fontSize: 12,
      style: { fill: "var(--semiotic-text, #333)" },
    })
    marks.push({
      kind: "text",
      id: `python-binding-value-${slot.name}`,
      x: stackX + frameW - 12,
      y: y + cellH / 2 + 4,
      text: displayValue(slot.value),
      fontSize: 12,
      textAnchor: "end",
      style: { fill: isPointer(slot.value) ? "#1A5683" : "var(--semiotic-text-secondary, #666)" },
    })
    anchors.set(`stack-${i}`, [stackX + frameW - 8, y + cellH / 2])
  })

  diagram.heapArrangement.forEach((row, r) => {
    row.forEach((addr, c) => {
      if (addr == null) return
      const obj = diagram.heap[addr]
      if (!obj) return
      const tupleW = Math.max(cellW, obj.values.length * cellW)
      const x = heapX + c * (cellW * 2.55 + heapGap)
      const y = heapY + r * (cellH * 3.1)
      marks.push({
        kind: "rect",
        id: `python-heap-${addr}`,
        x,
        y,
        width: tupleW,
        height: cellH,
        style: { fill: "rgba(45, 138, 74, 0.10)", stroke: "var(--semiotic-border, #9aa)", strokeWidth: 1 },
        datum: datumOf({ address: addr, kind: "heap tuple" }),
        group: "heap",
        rx: 5,
      })
      marks.push({
        kind: "text",
        id: `python-heap-label-${addr}`,
        x,
        y: y - 7,
        text: `addr ${addr}`,
        fontSize: 10,
        style: { fill: "var(--semiotic-text-secondary, #666)" },
      })
      obj.values.forEach((value, i) => {
        const cellX = x + i * cellW
        marks.push({
          kind: "line",
          id: `python-heap-divider-${addr}-${i}`,
          x1: cellX,
          y1: y,
          x2: cellX,
          y2: y + cellH,
          style: { stroke: "var(--semiotic-border, #9aa)", strokeWidth: 1 },
        })
        marks.push({
          kind: "text",
          id: `python-heap-value-${addr}-${i}`,
          x: cellX + cellW / 2,
          y: y + cellH / 2 + 4,
          text: displayValue(value),
          fontSize: 12,
          textAnchor: "middle",
          style: { fill: isPointer(value) ? "#1A5683" : "var(--semiotic-text, #333)" },
        })
        anchors.set(`heap-${addr}-${i}`, [cellX + cellW / 2, y + cellH / 2])
      })
      anchors.set(`heap-${addr}`, [x + 8, y + cellH / 2])
    })
  })

  const addrPosition = new Map<number, [number, number]>()
  diagram.heapArrangement.forEach((row, r) => {
    row.forEach((addr, c) => {
      if (addr != null) addrPosition.set(addr, [r, c])
    })
  })

  diagram.stack.forEach((slot, i) => {
    if (!isPointer(slot.value)) return
    const start = anchors.get(`stack-${i}`)
    const target = anchors.get(`heap-${slot.value.pointer}`)
    if (start && target) overlays.push(<ArrowPath key={`stack-arrow-${i}`} start={start} end={target} />)
  })
  diagram.heap.forEach((obj, addr) => {
    obj.values.forEach((value, i) => {
      if (!isPointer(value)) return
      const start = anchors.get(`heap-${addr}-${i}`)
      const target = anchors.get(`heap-${value.pointer}`)
      if (start && target) overlays.push(<ArrowPath key={`heap-arrow-${addr}-${i}`} start={start} end={target} />)
    })
  })

  return {
    marks,
    overlays: (
      <>
        <defs>
          <marker id="semiotic-gofish-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#1A5683" />
          </marker>
        </defs>
        {overlays}
      </>
    ),
  }
})

export const gofishPythonTutorNetworkLayout: NetworkCustomLayout<GofishPythonTutorConfig> = (ctx) => {
  const diagram = ctx.config.diagram
  if (!diagram) return { sceneNodes: [], sceneEdges: [], labels: [] }

  const plot = ctx.dimensions.plot
  const fit = Math.max(0.68, Math.min(1, plot.width / 1120))
  const cellW = ctx.config.cellWidth ?? Math.round(58 * fit)
  const cellH = ctx.config.cellHeight ?? Math.round(52 * fit)
  const heapGap = ctx.config.heapGap ?? 18
  const frameW = Math.round(198 * fit)
  const titleH = Math.round(42 * fit)
  const bindingH = Math.round(42 * fit)
  const frameH = titleH + diagram.stack.length * bindingH + Math.round(18 * fit)
  const stackX = plot.x + 16
  const stackY = plot.y + 28
  const sceneNodes: NetworkRectNode[] = []
  const overlays: ReactNode[] = []
  const anchors = new Map<string, [number, number]>()
  const tupleTargets = new Map<string, [number, number]>()
  const tuplePositions = pythonTuplePositions(diagram, plot, stackX, frameW, cellW, cellH, heapGap)
  const pointerColor = "#1A5683"
  const tupleFill = "#fffcc5"
  const tupleStroke = "#a8a8a8"
  const frameFill = "#dce7f4"
  const labelFill = "#222"
  const mutedFill = "#777"

  sceneNodes.push({
    type: "rect",
    id: "python-global-frame",
    x: stackX,
    y: stackY,
    w: frameW,
    h: frameH,
    style: { fill: frameFill, stroke: "none" },
    datum: datumOf({ kind: "global frame" }),
    label: "Global frame",
  })
  overlays.push(
    <g key="python-global-overlay">
      <text
        x={stackX + 12 * fit}
        y={stackY + 25 * fit}
        fontSize={24 * fit}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
        fill={labelFill}
      >
        Global Frame
      </text>
      <line
        x1={stackX}
        y1={stackY}
        x2={stackX}
        y2={stackY + frameH}
        stroke="#9caebf"
        strokeWidth={4 * fit}
      />
    </g>
  )

  for (const node of ctx.nodes) {
    const raw = rawNodeDatum(node)
    const id = String(raw.id ?? node.id)
    if (raw.kind === "binding") {
      const index = number(raw.index)
      const y = stackY + titleH + index * bindingH
      const value = String(raw.value ?? "")
      const pointer = number(raw.pointer)
      const pointerLike = Number.isFinite(pointer) && value.startsWith("->")
      const textY = y + bindingH / 2 + 6 * fit
      const valueX = stackX + frameW - 40 * fit
      const dotX = stackX + frameW - 34 * fit
      const dotY = y + bindingH / 2
      sceneNodes.push({
        type: "rect",
        id,
        x: stackX,
        y,
        w: frameW,
        h: bindingH,
        style: { fill: "rgba(0,0,0,0)", stroke: "none" },
        datum: raw,
        label: String(raw.name ?? id),
      })
      overlays.push(
        <g key={`python-binding-label-${id}`}>
          <text x={stackX + 124 * fit} y={textY} fontSize={25 * fit} fill={labelFill}>
            {String(raw.name ?? id)}
          </text>
          {pointerLike ? (
            <>
              <path
                d={`M${valueX - 12 * fit},${dotY - 18 * fit} L${valueX - 12 * fit},${dotY + 18 * fit} L${valueX + 28 * fit},${dotY + 18 * fit}`}
                fill="none"
                stroke="#8d9aa0"
                strokeWidth={1.2}
              />
              <circle cx={dotX} cy={dotY} r={3.6 * fit} fill={pointerColor} />
            </>
          ) : (
            <>
              <text x={valueX} y={textY} fontSize={25 * fit} fill={labelFill}>
                {value}
              </text>
              <line
                x1={valueX - 3 * fit}
                y1={dotY + 18 * fit}
                x2={valueX + 27 * fit}
                y2={dotY + 18 * fit}
                stroke="#8d9aa0"
                strokeWidth={1.2}
              />
            </>
          )}
        </g>
      )
      if (pointerLike) anchors.set(id, [dotX, dotY])
    } else if (raw.kind === "heap cell") {
      const address = number(raw.address)
      const cellIndex = number(raw.cellIndex)
      const tuple = tuplePositions.get(address)
      if (!tuple) continue
      const pos = { x: tuple.x + cellIndex * cellW, y: tuple.y }
      const value = String(raw.value ?? "")
      const pointerLike = value.startsWith("->")
      sceneNodes.push({
        type: "rect",
        id,
        x: pos.x,
        y: pos.y,
        w: cellW,
        h: cellH,
        style: { fill: tupleFill, stroke: tupleStroke, strokeWidth: 1 },
        datum: raw,
        label: String(raw.value ?? ""),
      })
      if (pointerLike) anchors.set(id, [pos.x + cellW / 2, pos.y + cellH / 2])
    }
  }

  tuplePositions.forEach((tuple, addr) => {
    const obj = diagram.heap[addr]
    if (!obj) return
    tupleTargets.set(`tuple-${addr}`, [tuple.x - 8 * fit, tuple.y + cellH / 2])
    overlays.push(
      <g key={`python-tuple-${addr}`}>
        <text x={tuple.x} y={tuple.y - 14 * fit} fontSize={16 * fit} fill={mutedFill}>
          tuple
        </text>
        {obj.values.map((value, i) => {
          const x = tuple.x + i * cellW
          const pointerLike = isPointer(value)
          return (
            <g key={`python-tuple-cell-label-${addr}-${i}`}>
              <text x={x + 2 * fit} y={tuple.y + 16 * fit} fontSize={15 * fit} fill={mutedFill}>
                {i}
              </text>
              {pointerLike ? (
                <circle cx={x + cellW / 2} cy={tuple.y + cellH / 2} r={3.6 * fit} fill={pointerColor} />
              ) : (
                <text
                  x={x + cellW / 2}
                  y={tuple.y + cellH / 2 + 9 * fit}
                  textAnchor="middle"
                  fontSize={25 * fit}
                  fill={labelFill}
                >
                  {String(value)}
                </text>
              )}
            </g>
          )
        })}
      </g>
    )
  })

  const sceneEdges: NetworkCurvedEdge[] = []
  const edgeOverlays: ReactNode[] = []
  for (const edge of ctx.edges) {
    const sourceId = endpointId(edge.source)
    const targetId = endpointId(edge.target)
    const start = anchors.get(sourceId)
    const end = tupleTargets.get(targetTupleId(targetId)) ?? anchors.get(targetId)
    if (!start || !end) continue
    const curve = pointerCurve(start, end)
    const bezier: BezierCache = {
      circular: false,
      points: curve.points,
      halfWidth: 2,
    }
    ;(edge as RealtimeEdge).bezier = bezier
    sceneEdges.push({
      type: "curved",
      pathD: curve.d,
      style: { stroke: "rgba(26, 86, 131, 0.001)", strokeWidth: 1, fill: "none" },
      datum: edge.data ?? edge,
    })
    edgeOverlays.push(
      <path
        key={`python-pointer-${sourceId}-${targetId}`}
        d={curve.d}
        fill="none"
        stroke={pointerColor}
        strokeWidth={2.4 * fit}
        markerEnd="url(#semiotic-gofish-memory-arrow)"
      />
    )
  }

  return {
    sceneNodes,
    sceneEdges,
    labels: [],
    overlays: (
      <g className="semiotic-gofish-python-memory" style={{ pointerEvents: "none" }}>
        <defs>
          <marker
            id="semiotic-gofish-memory-arrow"
            markerWidth="9"
            markerHeight="9"
            refX="8"
            refY="4.5"
            orient="auto"
          >
            <path d="M0,0 L9,4.5 L0,9 Z" fill={pointerColor} />
          </marker>
        </defs>
        {edgeOverlays}
        {overlays}
      </g>
    ),
  }
}

function rawNodeDatum(node: RealtimeNode): Datum {
  return (node.data ?? node) as Datum
}

function endpointId(endpoint: string | RealtimeNode): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id
}

function pythonTuplePositions(
  diagram: PythonTutorDiagram,
  plot: { x: number; y: number; width: number; height: number },
  stackX: number,
  frameW: number,
  cellW: number,
  cellH: number,
  heapGap: number
): Map<number, { x: number; y: number }> {
  const out = new Map<number, { x: number; y: number }>()
  const tupleW = (addr: number) => Math.max(cellW, (diagram.heap[addr]?.values.length ?? 1) * cellW)
  const heapX = stackX + frameW + Math.max(54, plot.width * 0.07)
  const gap = Math.max(0, heapGap)
  const topY = plot.y + Math.max(42, plot.height * 0.18)
  const bottomY = Math.min(
    plot.y + plot.height - cellH - 20,
    topY + Math.max(96, cellH * 2.8) + gap * 1.15
  )

  diagram.heapArrangement.forEach((row, r) => {
    row.forEach((addr, c) => {
      if (addr == null) return
      out.set(addr, {
        x: heapX + c * (cellW * 2.55 + heapGap),
        y: r === 0 ? topY : bottomY,
      })
    })
  })

  if (diagram.heap.length >= 5) {
    const right = plot.x + plot.width - 16
    const addr4X = right - tupleW(4)
    const nearGap = Math.max(24, cellW * 0.55 + gap * 0.75)
    const midGap = Math.max(54, cellW * 1.15 + gap * 1.35)
    const farGap = Math.max(120, cellW * 2.55 + gap * 2.1)
    const addr2X = Math.min(
      addr4X - tupleW(2) - midGap,
      heapX + tupleW(0) + nearGap
    )
    const addr3X = Math.min(
      right - tupleW(3) - farGap,
      heapX + tupleW(0) + midGap
    )
    const addr1X = Math.min(
      Math.max(heapX + cellW * 3.1 + gap, stackX + frameW + Math.max(150, plot.width * 0.19) + gap),
      addr2X - tupleW(1) - nearGap
    )

    out.set(0, { x: heapX, y: topY })
    out.set(1, { x: addr1X, y: bottomY })
    out.set(2, { x: addr2X, y: bottomY })
    out.set(3, { x: addr3X, y: topY })
    out.set(4, { x: addr4X, y: bottomY })
  }

  return out
}

function targetTupleId(targetId: string): string {
  const match = /^cell-(\d+)-0$/.exec(targetId)
  return match ? `tuple-${match[1]}` : targetId
}

export function pointerCurve(start: [number, number], end: [number, number]): {
  d: string
  points: [BezierPoint, BezierPoint, BezierPoint, BezierPoint]
} {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const bend = Math.max(34, Math.min(160, Math.abs(dx) * 0.42))
  const c1: BezierPoint = { x: start[0] + bend, y: start[1] }
  const c2: BezierPoint = { x: end[0] - bend, y: end[1] }

  if (Math.abs(dx) < 80 && Math.abs(dy) > 20) {
    c1.x = start[0]
    c1.y = start[1] + dy * 0.55
    c2.x = end[0]
    c2.y = end[1] - dy * 0.55
  }

  const p0: BezierPoint = { x: start[0], y: start[1] }
  const p3: BezierPoint = { x: end[0], y: end[1] }
  return {
    d: `M${p0.x},${p0.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p3.x},${p3.y}`,
    points: [p0, c1, c2, p3],
  }
}

/**
 * Clip a glyph element to an SVG path (pixel coords). The `<clipPath>` def
 * rides inside the same `<g>` so the overlay stays self-contained — a custom
 * layout can clip a fill (or an image) to a silhouette without wiring shared
 * `<defs>`.
 */
function withClip(id: string, clipPath: string | undefined, element: ReactNode): ReactNode {
  if (!clipPath) return element
  const clipId = `${id}-clip`
  return (
    <g key={`${id}-clipwrap`}>
      <defs>
        <clipPath id={clipId}>
          <path d={clipPath} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{element}</g>
    </g>
  )
}

function renderGlyphMark(mark: GofishGlyphMark): ReactNode {
  const style = svgStyle("style" in mark ? mark.style : undefined)
  if (mark.kind === "rect" && mark.interactive === false) {
    return withClip(
      mark.id,
      mark.clipPath,
      <rect
        key={mark.id}
        data-gofish-id={mark.id}
        x={mark.x}
        y={mark.y}
        width={mark.width}
        height={mark.height}
        rx={mark.rx}
        style={style}
      />
    )
  }
  if (mark.kind === "circle" && mark.interactive === false) {
    return <circle key={mark.id} data-gofish-id={mark.id} cx={mark.cx} cy={mark.cy} r={mark.r} style={style} />
  }
  if (mark.kind === "image") {
    return withClip(
      mark.id,
      mark.clipPath,
      <image
        key={mark.id}
        data-gofish-id={mark.id}
        href={mark.href}
        x={mark.x}
        y={mark.y}
        width={mark.width}
        height={mark.height}
        preserveAspectRatio={mark.preserveAspectRatio ?? "none"}
        opacity={mark.opacity}
      />
    )
  }
  if (mark.kind === "path") {
    return withClip(
      mark.id,
      mark.clipPath,
      <path key={mark.id} data-gofish-id={mark.id} d={mark.d} style={style} />
    )
  }
  if (mark.kind === "line") {
    return <line key={mark.id} data-gofish-id={mark.id} x1={mark.x1} y1={mark.y1} x2={mark.x2} y2={mark.y2} style={style} />
  }
  if (mark.kind === "text") {
    return (
      <text
        key={mark.id}
        data-gofish-id={mark.id}
        x={mark.x}
        y={mark.y}
        fontSize={mark.fontSize}
        fontWeight={mark.fontWeight}
        textAnchor={mark.textAnchor}
        dominantBaseline={mark.dominantBaseline}
        transform={mark.transform}
        style={style}
      >
        {mark.text}
      </text>
    )
  }
  return null
}

function ArrowPath({ start, end }: { start: [number, number]; end: [number, number] }) {
  const midX = (start[0] + end[0]) / 2
  const d = `M${start[0]},${start[1]} C${midX},${start[1]} ${midX},${end[1]} ${end[0]},${end[1]}`
  return (
    <path
      d={d}
      fill="none"
      stroke="#1A5683"
      strokeWidth={1.4}
      markerEnd="url(#semiotic-gofish-arrow)"
    />
  )
}

function svgStyle(style: Style | undefined): React.CSSProperties {
  if (!style) return {}
  const fill = typeof style.fill === "string" ? style.fill : undefined
  return {
    fill,
    fillOpacity: style.fillOpacity,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    strokeDasharray: style.strokeDasharray,
    strokeLinecap: style.strokeLinecap,
    opacity: style.opacity,
  }
}

interface TreemapStripRegion<T> {
  id: string
  rows: T[]
  value: number
  x: number
  y: number
  width: number
  height: number
}

interface PackedCircle<T> {
  row: T
  index: number
  x: number
  y: number
  r: number
}

export function layoutTreemapStrip<T>(
  entries: Array<{ id: string; rows: T[]; value: number; heightValue?: number }>,
  bounds: { x: number; y: number; width: number; height: number },
  gap: number
): Array<TreemapStripRegion<T>> {
  if (!entries.length) return []
  const totalValue = sum(entries, (entry) => Math.max(0, entry.value))
  const maxHeightValue = getMax(entries.map((entry) => Math.max(0, entry.heightValue ?? entry.value)), 1)
  const layoutHeight = Math.max(1, bounds.height * 0.82)
  const availableWidth = Math.max(1, bounds.width - gap * Math.max(0, entries.length - 1))
  const targetArea = availableWidth * layoutHeight * 0.82
  const rawRegions = entries.map((entry) => {
    const share = totalValue > 0 ? Math.max(0, entry.value) / totalValue : 1 / entries.length
    const heightShare = Math.max(0, entry.heightValue ?? entry.value) / maxHeightValue
    const height = lerp(layoutHeight * 0.26, layoutHeight, heightShare)
    const width = Math.max(1, (targetArea * share) / Math.max(1, height))
    return { ...entry, width, height }
  })
  const rawWidth = sum(rawRegions, (entry) => entry.width)
  const widthScale = availableWidth / Math.max(1, rawWidth)
  let x = bounds.x

  return rawRegions.map((entry) => {
    const width = entry.width * widthScale
    const height = Math.min(bounds.height, entry.height)
    const region = {
      id: entry.id,
      rows: entry.rows,
      value: entry.value,
      x,
      y: bounds.y + bounds.height - height,
      width,
      height,
    }
    x += width + gap
    return region
  })
}

export function packCirclesInRect<T>(
  rows: T[],
  region: TreemapStripRegion<T>,
  value: (row: T) => number,
  gap: number
): Array<PackedCircle<T>> {
  const padding = Math.max(2, gap)
  const left = region.x + padding
  const right = region.x + region.width - padding
  const top = region.y + padding
  const bottom = region.y + region.height - padding
  const width = Math.max(1, right - left)
  const height = Math.max(1, bottom - top)
  const sorted = rows
    .map((row, index) => ({ row, index, value: Math.max(1, value(row)) }))
    .sort((a, b) => b.value - a.value || a.index - b.index)
  const totalValue = sum(sorted, (row) => row.value)
  let radiusScale = Math.sqrt((width * height * 0.68) / Math.max(1, Math.PI * totalValue))
  const minRadius = Math.max(1, Math.min(width, height) / 260)

  for (let attempt = 0; attempt < 24; attempt++) {
    const placed: Array<PackedCircle<T>> = []
    let cursorX = left
    let cursorY = top
    let rowHeight = 0
    let failed = false

    for (const item of sorted) {
      const r = Math.max(minRadius, Math.min(Math.min(width, height) / 2, Math.sqrt(item.value) * radiusScale))
      const diameter = r * 2
      if (cursorX > left && cursorX + diameter > right) {
        cursorX = left
        cursorY += rowHeight + gap
        rowHeight = 0
      }
      if (cursorY + diameter > bottom) {
        failed = true
        break
      }
      placed.push({ row: item.row, index: item.index, x: cursorX + r, y: cursorY + r, r })
      cursorX += diameter + gap
      rowHeight = Math.max(rowHeight, diameter)
    }

    if (!failed) {
      const packedBottom = placed.reduce((maxY, circle) => Math.max(maxY, circle.y + circle.r), top)
      const offsetY = Math.max(0, bottom - packedBottom)
      return placed.map((circle) => ({ ...circle, y: circle.y + offsetY }))
    }

    radiusScale *= 0.9
  }

  return sorted.map((item, index) => {
    const columns = Math.max(1, Math.floor(width / Math.max(2, gap * 2)))
    const cellW = width / columns
    const row = Math.floor(index / columns)
    const col = index % columns
    return {
      row: item.row,
      index: item.index,
      x: left + col * cellW + cellW / 2,
      y: top + row * Math.max(2, gap * 2) + gap,
      r: Math.max(1, Math.min(cellW, gap * 2) * 0.42),
    }
  })
}

function sum<T>(rows: T[], value: (row: T) => number): number {
  return rows.reduce((acc, row) => {
    const v = value(row)
    return acc + (Number.isFinite(v) ? v : 0)
  }, 0)
}

function aggregateRows<T>(
  rows: T[],
  key: (row: T) => string,
  value: (row: T) => number,
  fields?: Record<string, unknown>
): Array<{ key: string; value: number; datum: Datum }> {
  const grouped = new Map<string, { value: number; count: number }>()
  for (const row of rows) {
    const k = key(row)
    const entry = grouped.get(k) ?? { value: 0, count: 0 }
    entry.value += value(row)
    entry.count += 1
    grouped.set(k, entry)
  }
  return Array.from(grouped.entries()).map(([k, entry]) => ({
    key: k,
    value: entry.value,
    datum: datumOf({ ...fields, category: k, species: k, value: entry.value, count: entry.value, rows: entry.count }),
  }))
}

function number(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5
  return (value - min) / (max - min)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

export function datumFromFields(fields: Record<string, unknown>): Datum {
  return createSafeDatum((set) => {
    for (const [key, value] of Object.entries(fields)) set(key, value)
  })
}

export function stableGlyphId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item"
}

const datumOf = datumFromFields
const stableId = stableGlyphId

export function polarPoint(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]
}

export function petalPath(cx: number, cy: number, innerR: number, outerR: number, start: number, end: number): string {
  const mid = (start + end) / 2
  const a = polarPoint(cx, cy, innerR, start)
  const b = polarPoint(cx, cy, outerR, mid)
  const c = polarPoint(cx, cy, innerR, end)
  return `M${a[0]},${a[1]} Q${b[0]},${b[1]} ${c[0]},${c[1]} Q${cx},${cy} ${a[0]},${a[1]} Z`
}

export function polarBandPath(cx: number, cy: number, innerR: number, outerR: number, start: number, end: number): string {
  const p0 = polarPoint(cx, cy, outerR, start)
  const p1 = polarPoint(cx, cy, outerR, end)
  const p2 = polarPoint(cx, cy, innerR, end)
  const p3 = polarPoint(cx, cy, innerR, start)
  const large = end - start > Math.PI ? 1 : 0
  return [
    `M${p0[0]},${p0[1]}`,
    `A${outerR},${outerR} 0 ${large} 1 ${p1[0]},${p1[1]}`,
    `L${p2[0]},${p2[1]}`,
    `A${innerR},${innerR} 0 ${large} 0 ${p3[0]},${p3[1]}`,
    "Z",
  ].join(" ")
}

export function smoothClosedPath(points: [number, number][]): string {
  if (points.length === 0) return ""
  if (points.length === 1) return `M${points[0][0]},${points[0][1]}Z`
  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const midX = (prev[0] + curr[0]) / 2
    d += ` Q${midX},${prev[1]} ${curr[0]},${curr[1]}`
  }
  d += "Z"
  return d
}

export function bottlePath(x: number, y: number, w: number, h: number): string {
  const neckW = w * 0.34
  const shoulderY = y + h * 0.22
  const neckX = x + (w - neckW) / 2
  const bottomY = y + h
  return [
    `M${neckX},${y}`,
    `L${neckX + neckW},${y}`,
    `L${neckX + neckW},${shoulderY}`,
    `C${x + w * 0.88},${shoulderY + h * 0.05} ${x + w * 0.92},${shoulderY + h * 0.16} ${x + w * 0.84},${shoulderY + h * 0.24}`,
    `L${x + w * 0.78},${bottomY - 8}`,
    `Q${x + w / 2},${bottomY + 6} ${x + w * 0.22},${bottomY - 8}`,
    `L${x + w * 0.16},${shoulderY + h * 0.24}`,
    `C${x + w * 0.08},${shoulderY + h * 0.16} ${x + w * 0.12},${shoulderY + h * 0.05} ${neckX},${shoulderY}`,
    "Z",
  ].join(" ")
}

function isPointer(value: unknown): value is PythonTutorPointer {
  return typeof value === "object" && value != null && "pointer" in value
}

function displayValue(value: string | PythonTutorPointer): string {
  return isPointer(value) ? `-> ${value.pointer}` : String(value)
}
