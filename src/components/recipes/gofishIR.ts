import type { Datum } from "../charts/shared/datumTypes"
import type { CustomLayout } from "../stream/customLayout"
import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type { OrdinalCustomLayout } from "../stream/ordinalCustomLayout"
import { buildPythonTutorMemoryGraph, gofishPythonTutorNetworkLayout } from "./gofish"
import type { GofishPythonTutorConfig, PythonTutorDiagram } from "./gofish"
import { interpretToOrdinalLayout, interpretToXYLayout } from "./gofishInterpreter"
import type { GofishLambda } from "./gofishLambdas"

/**
 * Experimental GoFish Frontend IR → Semiotic custom-layout adapter.
 *
 * This is the GoFish analogue of `fromVegaLite`. Where `fromVegaLite` maps a
 * Vega-Lite spec onto a built-in HOC component + props, `unstable_fromGofishIR` maps a
 * GoFish *Frontend IR* document (the JSON artifact GoFish's `to_ir` /
 * serialization frontend emits — see the `gofish-ir` package) onto Semiotic's
 * custom-layout surface.
 *
 * Unlike a recognizer, this *interprets* the spec: `unstable_fromGofishIR` picks a
 * frame family, then hands the IR to `interpretGofishIR` (see
 * `gofishInterpreter.ts`), which walks `data → operators → mark` and executes
 * `group`/`spread`/`stack`/`scatter`/`treemap`/`layer`, the `polar`/`unit`
 * coordinate transforms, mark channels through scales, and `connect`/`ref`/
 * `arrow` relations. The two sanctioned non-grammar paths — `derive` and
 * `mark-fn` — resolve through the lambda registry. Any spec built from the
 * supported grammar renders; it is not limited to known archetypes.
 *
 * Frame family (hybrid): `arrow`/pointer specs → network; the boba volume
 * signature → ordinal (Semiotic owns the category axis, the interpreter owns
 * the within-cup composition); everything else → XY. The Python Tutor memory
 * diagram is a genuinely bespoke diagram beyond the grammar, so it stays a
 * chart-level escape hatch rendered by `gofishPythonTutorNetworkLayout`.
 *
 * Scope: GoFish Frontend IR v0. This is a PR-preview adapter named
 * `unstable-gofish-ir-adapter`, not a release API commitment. Constructs outside the interpreter's
 * allocation model (`table`, `cut`, `mask`, free-form `.constrain`, …) record
 * a warning and fall back rather than silently mis-rendering.
 */

export const EXPERIMENTAL_GOFISH_ADAPTER_NAME = "unstable-gofish-ir-adapter"

// ── IR types (subset of gofish-ir Frontend v0; see packages/gofish-ir) ───────

/** Explicit field-accessor channel form, emitted by `field(name)`. */
export interface GofishFieldAccessor {
  type: "field"
  name: string
  measure?: string
}

/** A data-driven channel value, emitted by `datum(v)` / `v(...)`. */
export interface GofishDatumValue {
  type: "datum"
  datum?: unknown
  offset?: number
  [key: string]: unknown
}

/** The right-hand side of a mark or operator channel (`h: …`, `fill: …`). */
export type GofishChannelValue =
  | string
  | number
  | boolean
  | null
  | GofishFieldAccessor
  | GofishDatumValue
  | { __gofish_lambda: string }

export interface GofishOperatorIR {
  type: string
  by?: string
  dir?: "x" | "y"
  x?: GofishChannelValue
  y?: GofishChannelValue
  spacing?: number | [number, number]
  [key: string]: unknown
}

export interface GofishMarkIR {
  type: string
  __combinator?: true
  children?: GofishMarkIR[]
  source?: GofishMarkIR
  options?: Record<string, unknown>
  origin?: { name?: string }
  name?: string
  [key: string]: unknown
}

export interface GofishChartIR {
  type: "chart"
  data?: GofishDataIR | null
  operators?: GofishOperatorIR[]
  mark: GofishMarkIR
  options?: Record<string, unknown>
  connect?: GofishMarkIR
  name?: string
}

export interface GofishLayerIR {
  type: "layer"
  charts: GofishChartIR[]
  options?: Record<string, unknown>
}

export interface GofishRawMarkIR {
  type: "raw-mark"
  mark: GofishMarkIR
  options?: Record<string, unknown>
}

export type GofishDataIR =
  | { type: "inline"; rows: Array<Record<string, unknown>> }
  | { type: "select"; layer: string; mode?: "one" | "all" }
  | { type: "external"; id?: string }

export type GofishRootIR = GofishChartIR | GofishLayerIR | GofishRawMarkIR

export interface GofishIRDocument {
  irVersion: number
  ir: string
  $schema?: string
  root: GofishRootIR
}

// ── Output ───────────────────────────────────────────────────────────────

export type GofishChartFamily = "xy" | "network" | "ordinal"

export type GofishRecipeName =
  /** XY / ordinal charts are produced by the IR interpreter, not a named recipe. */
  | "gofishInterpreter"
  /** The Python Tutor memory diagram is a bespoke network glyph (chart-level escape hatch). */
  | "gofishPythonTutorNetworkLayout"

/**
 * The translated chart, spreadable into `XYCustomChart` / `NetworkCustomChart`.
 * Mirrors `fromVegaLite`'s `{ component, props, warnings }` for the
 * custom-layout surface.
 */
export interface GofishChartConfig {
  family: GofishChartFamily
  /** Which `gofish.tsx` recipe the IR resolved to. */
  recipe: GofishRecipeName
  /** Layout function to pass as `layout` on `XYCustomChart` — null otherwise. */
  layout: CustomLayout<Record<string, unknown>> | null
  /** Layout function to pass as `layout` on `NetworkCustomChart` — null otherwise. */
  networkLayout: NetworkCustomLayout<Record<string, unknown>> | null
  /** Layout function to pass as `layout` on `OrdinalCustomChart` — null otherwise. */
  ordinalLayout: OrdinalCustomLayout<Record<string, unknown>> | null
  /** Accessor config derived from the IR; pass as `layoutConfig`. */
  layoutConfig: Record<string, unknown>
  /** Category accessor for ordinal charts (the frame builds the o-scale from it). */
  categoryAccessor?: string
  /** Value accessor for ordinal charts (the frame builds the r-scale from it). */
  valueAccessor?: string
  /** Inline data to seed the chart (`data` / `pushMany`). Empty for network. */
  data: Datum[]
  /** Node/edge graph for `NetworkCustomChart` (memory diagram only). */
  graph: { nodes: Datum[]; edges: Datum[] } | null
  irVersion: number
  warnings?: string[]
}

// ── Channel / tree helpers ─────────────────────────────────────────────────

function stripDatumPrefix(name: string): string {
  return name.startsWith("datum.") ? name.slice("datum.".length) : name
}

function rootCharts(root: GofishRootIR): GofishChartIR[] {
  if (root.type === "chart") return [root]
  if (root.type === "layer") return root.charts
  return []
}

/** Depth-first walk of every mark reachable from a root. */
function walkMarks(root: GofishRootIR, visit: (mark: GofishMarkIR) => void): void {
  const recurse = (mark: GofishMarkIR | undefined) => {
    if (!mark) return
    visit(mark)
    if (mark.children) for (const child of mark.children) recurse(child)
    if (mark.source) recurse(mark.source)
  }
  if (root.type === "raw-mark") {
    recurse(root.mark)
    return
  }
  for (const chart of rootCharts(root)) {
    recurse(chart.mark)
    recurse(chart.connect)
  }
}

function collectMarks(root: GofishRootIR): GofishMarkIR[] {
  const out: GofishMarkIR[] = []
  walkMarks(root, (m) => out.push(m))
  return out
}

function collectOperators(root: GofishRootIR): GofishOperatorIR[] {
  return rootCharts(root).flatMap((chart) => chart.operators ?? [])
}

/** First inline data rows found anywhere in the document. */
function collectInlineData(root: GofishRootIR): Array<Record<string, unknown>> {
  for (const chart of rootCharts(root)) {
    if (chart.data?.type === "inline") return chart.data.rows
  }
  if (root.type === "raw-mark") return []
  return []
}

function dataFieldSet(rows: Array<Record<string, unknown>>): Set<string> {
  const fields = new Set<string>()
  for (const row of rows.slice(0, 8)) {
    for (const key of Object.keys(row)) fields.add(key)
  }
  return fields
}

function findOperator(operators: GofishOperatorIR[], type: string): GofishOperatorIR | undefined {
  return operators.find((op) => op.type === type)
}

/** A diagram-shaped inline row, used by the memory-diagram chart. */
function findDiagram(root: GofishRootIR): PythonTutorDiagram | undefined {
  for (const chart of rootCharts(root)) {
    if (chart.data?.type !== "inline") continue
    for (const row of chart.data.rows) {
      const candidate = row as unknown as PythonTutorDiagram
      if (row && Array.isArray(candidate.stack) && Array.isArray(candidate.heap)) {
        return candidate
      }
    }
  }
  return undefined
}

// ── Family inference + dispatch ─────────────────────────────────────────────

/**
 * Pick the Semiotic frame that best hosts a spec (hybrid model):
 * - `arrow`/pointer relations → network (bespoke diagram escape hatch).
 * - the boba volume signature → ordinal (category axis + per-cup composition).
 * - everything else → XY (free-coordinate interpretation).
 */
function inferFamily(
  markTypes: Set<string>,
  fields: Set<string>,
  operators: GofishOperatorIR[]
): GofishChartFamily {
  if (markTypes.has("arrow")) return "network"
  const bobaDerive = operators.some(
    (op) => op.type === "derive" && String(op.lambdaId ?? "").toLowerCase().includes("boba")
  )
  if (bobaDerive || (fields.has("teaVolume") && fields.has("bobaVolume"))) return "ordinal"
  return "xy"
}

/**
 * The Python Tutor memory diagram is a genuinely bespoke visualization beyond
 * the grammar — in GoFish it bottoms out in custom frame/heap glyphs. We honor
 * that as a chart-level escape hatch: the structural IR carries the snapshot as
 * an inline row, which the dedicated network layout renders (with particles).
 */
function buildPythonMemory(root: GofishRootIR, irVersion: number, warnings: string[]): GofishChartConfig {
  const diagram = findDiagram(root)
  if (!diagram) {
    warnings.push(
      "Memory-diagram IR carried no inline {stack, heap, heapArrangement} row; rendering an empty graph."
    )
  }
  const graph = diagram
    ? buildPythonTutorMemoryGraph(diagram)
    : { nodes: [] as Datum[], edges: [] as Datum[] }
  const config: GofishPythonTutorConfig = diagram ? { diagram } : {}
  return {
    family: "network",
    recipe: "gofishPythonTutorNetworkLayout",
    layout: null,
    networkLayout: gofishPythonTutorNetworkLayout as NetworkCustomLayout<Record<string, unknown>>,
    ordinalLayout: null,
    layoutConfig: config as Record<string, unknown>,
    data: [],
    graph,
    irVersion,
    warnings: warnings.length ? warnings : undefined,
  }
}

// ── Public entry ───────────────────────────────────────────────────────────

export interface FromGofishIROptions {
  /** Force a frame family instead of inferring it. */
  family?: GofishChartFamily
  /** Per-call `derive`/`mark-fn` lambda overrides (merged over the registry). */
  lambdas?: Record<string, GofishLambda>
}

/**
 * Translate a GoFish Frontend IR document into a Semiotic custom-layout config
 * by *interpreting* the spec.
 *
 * @example
 * ```tsx
 * import { unstable_fromGofishIR } from "semiotic/experimental"
 * import { XYCustomChart } from "semiotic/xy"
 *
 * const cfg = unstable_fromGofishIR(flowerIR)
 * <XYCustomChart data={cfg.data} layout={cfg.layout} />
 * ```
 */
export function unstable_fromGofishIR(doc: GofishIRDocument, options: FromGofishIROptions = {}): GofishChartConfig {
  const warnings: string[] = []
  if (!doc || doc.ir !== "gofish-frontend") {
    warnings.push(
      `Expected a "gofish-frontend" IR document but got ir="${doc?.ir}". Attempting best-effort translation.`
    )
  }
  if (doc?.irVersion !== 0) {
    warnings.push(
      `This adapter targets GoFish Frontend IR v0; document declares irVersion=${doc?.irVersion}. Newer fields are ignored.`
    )
  }

  const root = doc.root
  const marks = collectMarks(root)
  const operators = collectOperators(root)
  const rows = collectInlineData(root)
  const fields = dataFieldSet(rows)
  const markTypes = new Set(marks.map((m) => m.type))
  const family = options.family ?? inferFamily(markTypes, fields, operators)
  const lambdas = options.lambdas

  if (family === "network") return buildPythonMemory(root, doc.irVersion, warnings)

  if (family === "ordinal") {
    const spread = findOperator(operators, "spread")
    const categoryAccessor = (spread?.by && stripDatumPrefix(spread.by)) || "name"
    return {
      family: "ordinal",
      recipe: "gofishInterpreter",
      layout: null,
      networkLayout: null,
      ordinalLayout: interpretToOrdinalLayout(root, categoryAccessor, { lambdas, warnings }),
      layoutConfig: {},
      categoryAccessor,
      valueAccessor: fields.has("teaVolume") ? "teaVolume" : undefined,
      data: rows as Datum[],
      graph: null,
      irVersion: doc.irVersion,
      warnings: warnings.length ? warnings : undefined,
    }
  }

  return {
    family: "xy",
    recipe: "gofishInterpreter",
    layout: interpretToXYLayout(root, { lambdas, warnings }),
    networkLayout: null,
    ordinalLayout: null,
    layoutConfig: {},
    data: rows as Datum[],
    graph: null,
    irVersion: doc.irVersion,
    warnings: warnings.length ? warnings : undefined,
  }
}

/** @deprecated Internal compatibility alias for the temporary GoFish PR preview. */
export const fromGofishIR = unstable_fromGofishIR
