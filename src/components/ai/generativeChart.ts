/**
 * Generative-UI trust layer.
 *
 * "Generation is cheap; trust is scarce." An LLM can emit chart code in a
 * sentence — but hand-written JSX breaks on first paint, and a plausible-looking
 * chart for the wrong data misleads exactly the reader who can't tell. This
 * module is the trust layer an AI framework wraps around chart generation: it
 * turns an LLM's *proposal* (a component name + props) into a result that is
 * either guaranteed-renderable or accompanied by structured reasons and ranked
 * alternatives to retry with — never a broken chart.
 *
 * It composes the already-shipped surface into the documented loop —
 * **generate → validate → diagnose → repair → render+prove** — and rides
 * `ChartConfig`, the gate-defended public artifact. It is framework-agnostic by
 * construction: no Vercel/LangChain/OpenAI/Anthropic SDK enters the library
 * (the tool-definition shapers below are pure object transforms over JSON
 * Schema). The one heavy step — rendering to SVG with render evidence — is
 * *dependency-injected* (`RenderFn`), so this module stays free of server deps
 * and usable in a browser, an edge runtime, or a notebook.
 */
import type { Datum } from "../charts/shared/datumTypes"
import type { ChartConfig } from "../export/chartConfig"
import { configToJSX, toConfig } from "../export/chartConfig"
import type { ValidationResult } from "../charts/shared/validateProps"
import { VALIDATION_MAP, validateProps } from "../charts/shared/validateProps"
import type { Diagnosis } from "../charts/shared/diagnoseConfig"
import { diagnoseConfig } from "../charts/shared/diagnoseConfig"
import type { RepairResult } from "./repairChartConfig"
import { repairChartConfig } from "./repairChartConfig"
import type { IntentId } from "./intents"
import type { RenderEvidence } from "../server/renderEvidence"

/**
 * A renderer that turns a validated config into SVG + render evidence. Inject
 * `renderChartWithEvidence` from `semiotic/server` in Node/SSR; omit it in the
 * browser (the helper still validates, diagnoses, repairs, and emits JSX).
 */
export type RenderFn = (
  component: string,
  props: Datum
) => { svg: string; evidence: RenderEvidence }

export interface PrepareChartInput {
  /** Chart component name the model proposed (e.g. "LineChart"). */
  component: string
  /** Props the model proposed. */
  props?: Datum
}

export interface PrepareChartOptions {
  /**
   * The dataset, used to route a repair when the proposed chart is unknown or a
   * poor fit. When present, `repair` runs by default.
   */
  data?: ReadonlyArray<Datum>
  /** Ranking intent passed to repair's alternative search. */
  intent?: IntentId | IntentId[]
  /** Run `diagnoseConfig` anti-pattern checks (default true). */
  diagnose?: boolean
  /**
   * Run repair routing (fit check + ranked alternatives). Default: true when
   * `data` is provided, false otherwise (repair needs the data to profile).
   */
  repair?: boolean
  /**
   * Inject a renderer to prove the config paints (and to read render evidence —
   * the first-try oracle). When omitted, the result has no `svg`/`evidence`,
   * and `ok` is decided on validation + diagnostics alone.
   */
  render?: RenderFn
  /**
   * Treat error-severity diagnostics as blocking `ok` (default true). Set false
   * to let a caller surface warnings without failing the gate.
   */
  treatErrorsAsBlocking?: boolean
}

export interface PrepareChartResult {
  /**
   * True only when the proposal is trustworthy: it validates, carries no
   * error-severity diagnostics, and — if a renderer was injected — produced a
   * non-empty scene. A `false` result is the signal to retry with `reasons` and
   * `repair.alternatives`, never to paint.
   */
  ok: boolean
  component: string
  props: Datum
  /** The serializable, validated config — present whenever the component is known. */
  config?: ChartConfig
  /** JSX string for the validated config (only when a config could be built). */
  jsx?: string
  /** Structural validation: required props, types, enums, accessor/data shape. */
  validation: ValidationResult
  /** Anti-pattern diagnostics (empty data, misleading design, contrast, …). */
  diagnostics: Diagnosis[]
  /** Fit verdict + ranked alternatives, when repair ran. */
  repair?: RepairResult
  /** Render evidence (mark count, domains, ariaLabel, …) when a renderer ran. */
  evidence?: RenderEvidence
  /** Rendered SVG when a renderer ran. */
  svg?: string
  /** Human-readable reasons the proposal is not `ok` (empty when `ok`). */
  reasons: string[]
}

const NO_VALIDATION: ValidationResult = { valid: false, errors: [] }

/**
 * Run an LLM chart proposal through the trust loop. Pure except for any side
 * effects of an injected `render` function.
 */
export function prepareChart(
  input: PrepareChartInput,
  options: PrepareChartOptions = {}
): PrepareChartResult {
  const component = input.component
  const props: Datum = input.props ?? {}
  const reasons: string[] = []

  const known = Boolean(VALIDATION_MAP[component])
  if (!known) {
    reasons.push(
      `Unknown component "${component}". It is not in the chart registry — pick a known chart.`
    )
  }

  const validation = known ? validateProps(component, props) : { ...NO_VALIDATION }
  if (!validation.valid) {
    for (const err of validation.errors) reasons.push(err)
  }

  const runDiagnose = options.diagnose !== false && known
  const diagnostics: Diagnosis[] = runDiagnose ? diagnoseConfig(component, props).diagnoses : []
  const errorDiagnostics = diagnostics.filter((d) => d.severity === "error")
  const treatErrorsAsBlocking = options.treatErrorsAsBlocking !== false
  if (treatErrorsAsBlocking) {
    for (const d of errorDiagnostics) reasons.push(`${d.code}: ${d.message}`)
  }

  // Repair routing: fit check + ranked alternatives. Needs the data to profile.
  const shouldRepair = options.repair ?? Boolean(options.data)
  let repair: RepairResult | undefined
  if (shouldRepair && options.data) {
    repair = repairChartConfig(component, options.data, { intent: options.intent })
    if (repair.status === "alternative") {
      reasons.push(
        `${component} is a poor fit: ${repair.reason}. ` +
          `Consider ${repair.alternatives.map((a) => a.component).slice(0, 3).join(", ")}.`
      )
    } else if (repair.status === "unknown") {
      reasons.push(
        `${component} could not be evaluated against the data; ` +
          `consider ${repair.alternatives.map((a) => a.component).slice(0, 3).join(", ")}.`
      )
    }
  }

  // Build the config + JSX only when the component is known (toConfig throws on
  // an unknown component — the registry is the gate).
  let config: ChartConfig | undefined
  let jsx: string | undefined
  if (known) {
    config = toConfig(component, props)
    jsx = configToJSX(config)
  }

  // Prove it paints, if a renderer was injected.
  let evidence: RenderEvidence | undefined
  let svg: string | undefined
  if (options.render && known) {
    const rendered = options.render(component, props)
    svg = rendered.svg
    evidence = rendered.evidence
    if (evidence.empty) {
      reasons.push("Rendered to an empty scene (no marks) — the data or accessors produce nothing to draw.")
    }
    for (const w of evidence.warnings) reasons.push(w)
  }

  const ok =
    known &&
    validation.valid &&
    (!treatErrorsAsBlocking || errorDiagnostics.length === 0) &&
    (!repair || repair.status === "ok") &&
    (!evidence || !evidence.empty)

  return {
    ok,
    component,
    props,
    config,
    jsx,
    validation,
    diagnostics,
    repair,
    evidence,
    svg,
    reasons: ok ? [] : reasons,
  }
}

// ── Framework-agnostic tool definitions ──────────────────────────────────────

/**
 * A tool definition expressed as JSON Schema — the common denominator every
 * agent framework accepts. Mirrors the MCP `renderChart` contract so an
 * in-process tool and the MCP server speak the same shape.
 */
export interface ChartToolDefinition {
  name: string
  description: string
  /** JSON Schema for the tool input. */
  inputSchema: Record<string, unknown>
}

export interface ChartToolOptions {
  /** Override the tool name (default "render_semiotic_chart"). */
  name?: string
  /** Restrict the component enum to this allow-list (default: the whole registry). */
  components?: ReadonlyArray<string>
}

/**
 * Build a framework-agnostic tool definition for generating a Semiotic chart.
 * Pass it (or a shaper's output) to your agent framework, and pair it with
 * {@link createChartToolHandler} for the execute step.
 */
export function chartGenerationTool(options: ChartToolOptions = {}): ChartToolDefinition {
  const components = options.components ?? Object.keys(VALIDATION_MAP).sort()
  return {
    name: options.name ?? "render_semiotic_chart",
    description:
      "Render a Semiotic chart from a component name and props. The result is " +
      "validated, diagnosed for anti-patterns, and (when data is supplied) checked " +
      "for fit against the data, so it is guaranteed renderable or returns reasons " +
      "and ranked alternatives to retry with.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["component"],
      properties: {
        component: {
          type: "string",
          enum: [...components],
          description: "The chart component to render.",
        },
        props: {
          type: "object",
          description:
            "Props for the chart (accessors, data, encodings). See the component schema.",
          additionalProperties: true,
        },
      },
    },
  }
}

/** Shape a tool definition for the Anthropic Messages API `tools` array. */
export function toAnthropicTool(def: ChartToolDefinition): {
  name: string
  description: string
  input_schema: Record<string, unknown>
} {
  return { name: def.name, description: def.description, input_schema: def.inputSchema }
}

/** Shape a tool definition for the OpenAI / function-calling `tools` array. */
export function toOpenAITool(def: ChartToolDefinition): {
  type: "function"
  function: { name: string; description: string; parameters: Record<string, unknown> }
} {
  return {
    type: "function",
    function: { name: def.name, description: def.description, parameters: def.inputSchema },
  }
}

/**
 * Build the execute handler for the chart tool: it runs {@link prepareChart} on
 * the tool input and returns the trust-loop result. Inject a `render` fn (from
 * `semiotic/server`) and/or the `data` for fit checking via `optionsFor`.
 */
export function createChartToolHandler(
  optionsFor?: (input: PrepareChartInput) => PrepareChartOptions
): (input: PrepareChartInput) => PrepareChartResult {
  return (input: PrepareChartInput) => prepareChart(input, optionsFor ? optionsFor(input) : {})
}
