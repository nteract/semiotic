/**
 * Generative-UI trust layer.
 *
 * "Generation is cheap; trust is scarce." An LLM can emit chart code in a
 * sentence — but hand-written JSX breaks on first paint, and a plausible-looking
 * chart for the wrong data misleads exactly the reader who can't tell. This
 * module is the trust layer an AI framework wraps around chart generation: it
 * turns an LLM's *proposal* (a component name + props) into a result that is
 * either validated and diagnosed (and, when a renderer is injected, proven to
 * paint) or accompanied by structured reasons and ranked alternatives to retry
 * with — never an unchecked chart.
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
import { semanticFailureReasons } from "./semanticEvidence"
import { artifactAttachmentIssues } from "../artifact/attachmentAudit"

/**
 * A renderer that turns a validated config into SVG + render evidence. Inject
 * `renderChartWithEvidence` from `semiotic/server` in Node/SSR; omit it in the
 * browser (the helper still validates, diagnoses, repairs, and emits JSX).
 */
export type RenderFn = (
  component: string,
  props: Datum
) => { svg: string; evidence: RenderEvidence }

/** A bounded cache for injected render-evidence oracles. */
export interface RenderEvidenceMemo {
  /** Pass this function as `PrepareChartOptions.render` or `EvaluateChartOptions.render`. */
  render: RenderFn
  /** Invalidate every cached result after mutable data or external state changes. */
  clear: () => void
}

function memoToken(
  value: unknown,
  objectIds: WeakMap<object, number>,
  nextObjectId: { value: number },
): string {
  if (value === null) return "null"
  switch (typeof value) {
    case "undefined": return "undefined"
    case "string": return `string:${value}`
    case "number": return Number.isNaN(value) ? "number:NaN" : `number:${Object.is(value, -0) ? "-0" : value}`
    case "boolean": return `boolean:${value}`
    case "bigint": return `bigint:${value}`
    case "symbol": return `symbol:${String(value)}`
    case "function":
    case "object": {
      const object = value as object
      let id = objectIds.get(object)
      if (id === undefined) {
        id = nextObjectId.value++
        objectIds.set(object, id)
      }
      return `object:${id}`
    }
    default: return "unknown"
  }
}

/**
 * Memoize an injected `(component, props) → SVG + evidence` oracle safely.
 *
 * Results are scoped to the identity of the chart's primary input (`data`,
 * `nodes`, or `edges`) and to every other prop's primitive value or
 * object/function identity. Value-backed components (for example BigNumber)
 * use a small bounded configuration cache because their input is commonly a
 * scalar rather than an array. This avoids serializing user callbacks or
 * accidentally sharing a result across distinct inputs. Treat inputs as
 * immutable; call `clear()` after an in-place mutation or whenever an external
 * renderer dependency changes.
 */
const MEMO_INPUT_PROPS = ["data", "nodes", "edges"] as const
const VALUE_CONFIG_CACHE_LIMIT = 64

interface MemoInput {
  prop: string
  value: object
}

function primaryMemoInput(props: Datum): MemoInput | undefined {
  for (const prop of MEMO_INPUT_PROPS) {
    const value = props[prop]
    if (value !== null && (typeof value === "object" || typeof value === "function")) {
      return { prop, value: value as object }
    }
  }
  return undefined
}

function memoCacheKey(
  component: string,
  props: Datum,
  objectIds: WeakMap<object, number>,
  nextObjectId: { value: number },
  excludedProp?: string,
): string {
  const key = Object.keys(props)
    .filter((name) => name !== excludedProp)
    .sort()
    .map((name) => [name, memoToken(props[name], objectIds, nextObjectId)])
  // Keep the component and sorted prop pairs as a structured value. Raw
  // delimiter joining let string-valued props manufacture a second pair and
  // collide with a distinct configuration.
  return JSON.stringify([component, key])
}

export function createRenderEvidenceMemo(render: RenderFn): RenderEvidenceMemo {
  let byInput = new WeakMap<object, Map<string, ReturnType<RenderFn>>>()
  let valueConfigurations = new Map<string, ReturnType<RenderFn>>()
  const objectIds = new WeakMap<object, number>()
  const nextObjectId = { value: 1 }

  return {
    render(component, props) {
      const input = primaryMemoInput(props)
      if (!input) {
        // Value components usually receive a primitive `value`, so they cannot
        // use a WeakMap identity key. Keep their fully-keyed configurations
        // bounded rather than making every BigNumber render miss the cache.
        if (!Object.prototype.hasOwnProperty.call(props, "value")) {
          return render(component, props)
        }
        const cacheKey = memoCacheKey(component, props, objectIds, nextObjectId)
        const cached = valueConfigurations.get(cacheKey)
        if (cached !== undefined) {
          // Refresh insertion order so this behaves as a compact LRU cache.
          valueConfigurations.delete(cacheKey)
          valueConfigurations.set(cacheKey, cached)
          return cached
        }
        const result = render(component, props)
        if (valueConfigurations.size >= VALUE_CONFIG_CACHE_LIMIT) {
          const oldest = valueConfigurations.keys().next().value as string | undefined
          if (oldest !== undefined) valueConfigurations.delete(oldest)
        }
        valueConfigurations.set(cacheKey, result)
        return result
      }

      const cacheKey = memoCacheKey(
        component,
        props,
        objectIds,
        nextObjectId,
        input.prop,
      )
      let entries = byInput.get(input.value)
      if (!entries) {
        entries = new Map()
        byInput.set(input.value, entries)
      }
      const cached = entries.get(cacheKey)
      if (cached !== undefined) return cached
      const result = render(component, props)
      entries.set(cacheKey, result)
      return result
    },
    clear() {
      byInput = new WeakMap()
      valueConfigurations = new Map()
    },
  }
}

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
   * Narration authored after chart selection. It is merged before validation
   * and diagnosis, so `MISSING_DESCRIPTION` cannot linger from an earlier
   * proposal after a caller supplies generated title/description/summary text.
   */
  narration?: Partial<Pick<Datum, "title" | "description" | "summary">>
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
   * non-empty, non-degenerate scene. A `false` result is the signal to retry
   * with `reasons` and `repair.alternatives`, never to paint.
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

/** Re-run only the inexpensive configuration diagnosis after props change. */
export function refreshChartDiagnostics(
  component: string,
  props: Datum,
): Diagnosis[] {
  return VALIDATION_MAP[component]
    ? diagnoseConfig(component, props).diagnoses
    : []
}

/**
 * Run an LLM chart proposal through the trust loop. Pure except for any side
 * effects of an injected `render` function.
 */
export function prepareChart(
  input: PrepareChartInput,
  options: PrepareChartOptions = {}
): PrepareChartResult {
  const component = input.component
  const props: Datum = { ...input.props, ...options.narration }
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
  const diagnostics: Diagnosis[] = runDiagnose ? refreshChartDiagnostics(component, props) : []
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
  let identityFailure = false
  if (
    options.render &&
    known &&
    validation.valid &&
    (!treatErrorsAsBlocking || errorDiagnostics.length === 0)
  ) {
    const rendered = options.render(component, props)
    svg = rendered.svg
    evidence = rendered.evidence
    const attachmentFailures = artifactAttachmentIssues({
      contract: evidence.artifactContract,
      transfer: evidence.artifactTransfer,
      binding: evidence.artifactBinding
    }).filter((issue) => issue.status === "fail")
    identityFailure = evidence.component !== component || attachmentFailures.length > 0
    if (evidence.component !== component) {
      reasons.push("The render evidence names a different chart component.")
    }
    reasons.push(...attachmentFailures.map(({ message }) => message))
    if (evidence.empty) {
      reasons.push("Rendered to an empty scene (no marks) — the data or accessors produce nothing to draw.")
    }
    reasons.push(...semanticFailureReasons(evidence))
    for (const w of evidence.warnings) reasons.push(w)
  }

  const ok =
    known &&
    validation.valid &&
    (!treatErrorsAsBlocking || errorDiagnostics.length === 0) &&
    (!repair || repair.status === "ok") &&
    (!evidence || (!evidence.empty && evidence.semanticStatus !== "degenerate")) &&
    !identityFailure

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
      "for fit against the data. Inject a renderer to prove it paints; otherwise " +
      "the result returns validation and repair reasons plus ranked alternatives.",
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

/** Shape a tool definition for the OpenAI Chat Completions `tools` array. */
export function toOpenAITool(def: ChartToolDefinition): {
  type: "function"
  function: { name: string; description: string; parameters: Record<string, unknown> }
} {
  return {
    type: "function",
    function: { name: def.name, description: def.description, parameters: def.inputSchema },
  }
}

/** A flat function-tool shape for the OpenAI Responses API. */
export interface OpenAIResponsesTool {
  type: "function"
  name: string
  description: string
  parameters: Record<string, unknown>
  strict: boolean
}

export interface OpenAIResponsesToolOptions {
  /**
   * Enable OpenAI strict mode. The definition must use closed objects and
   * declare every property as required (nullable properties are supported).
   * The generic chart tool intentionally leaves `props` open, so use a
   * component-specific definition before setting this to true.
   */
  strict?: boolean
}

function isStrictOpenAICompatibleSchema(schema: unknown, root = true): boolean {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return false
  const record = schema as Record<string, unknown>
  const types = Array.isArray(record.type) ? record.type : [record.type]
  const isObject = types.includes("object") || Boolean(record.properties)

  // Function parameters must be a top-level object. Scalar schemas remain
  // valid for nested properties.
  if (root && !isObject) return false

  if (isObject) {
    if (record.additionalProperties !== false) return false
    const properties = record.properties
    if (!properties || typeof properties !== "object" || Array.isArray(properties)) return false
    const required = new Set(Array.isArray(record.required) ? record.required : [])
    if (Object.keys(properties).some((name) => !required.has(name))) return false
    if (!Object.values(properties as Record<string, unknown>).every((value) => isStrictOpenAICompatibleSchema(value, false))) return false
  }

  if (types.includes("array")) {
    if (!record.items || !isStrictOpenAICompatibleSchema(record.items, false)) return false
  }

  for (const keyword of ["anyOf", "oneOf", "allOf"] as const) {
    if (record[keyword] === undefined) continue
    const branches = record[keyword]
    if (!Array.isArray(branches) || branches.length === 0) return false
    if (!branches.every((branch) => isStrictOpenAICompatibleSchema(branch, false))) return false
  }

  return true
}

/**
 * Shape a tool definition for the OpenAI Responses API `tools` array.
 *
 * This is deliberately separate from {@link toOpenAITool}: Chat Completions
 * nests the function under `function`, whereas Responses uses a flat object.
 */
export function toOpenAIResponsesTool(
  def: ChartToolDefinition,
  options: OpenAIResponsesToolOptions = {}
): OpenAIResponsesTool {
  const strict = options.strict ?? false
  if (strict && !isStrictOpenAICompatibleSchema(def.inputSchema)) {
    throw new Error(
      "OpenAI strict mode requires a top-level object schema, closed object schemas, and every property required. " +
        "chartGenerationTool() intentionally leaves props open for chart-specific props; " +
        "use strict: false or pass a component-specific closed schema."
    )
  }

  return {
    type: "function",
    name: def.name,
    description: def.description,
    parameters: def.inputSchema,
    strict,
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
