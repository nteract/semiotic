/**
 * Host-independent outputs for the public `createChart` tool.
 *
 * The app widget shows a rendered chart only in hosts that implement widget
 * resources. These helpers add what every other host needs: React code, a
 * reader-grounding payload, and a PNG image. Each addition is optional and is
 * dropped, never truncated, when it would not fit the response limit, so a
 * render that fit before these outputs existed still fits.
 *
 * None of these outputs returns source rows. Code refers to data by name, and
 * the grounding structure keeps announced labels but not the raw datum records.
 */
import { isDeepStrictEqual } from "node:util"
import {
  buildReaderGrounding,
  configToJSX,
  getCapability,
  toConfig
} from "semiotic/ai"
import {
  isSensitiveField,
  serializedMcpOutputBytes,
  truncateUtf8,
  type McpRenderOutputLimits
} from "./mcp-render-output-limits"

export type CreateChartBindingSource = "input-data" | "input-props" | "derived"

export type CreateChartCode = {
  language: "tsx"
  import: string
  jsx: string
  /** Props the JSX names instead of inlining, and where each value comes from. */
  bindings: Array<{ prop: string; source: CreateChartBindingSource }>
}

export type CreateChartCodeResult = {
  code: CreateChartCode
  config: Record<string, unknown>
}

type PublicNavNode = {
  id: string
  role: string
  label: string
  level: number
  value?: number
  children?: PublicNavNode[]
}

export type CreateChartGrounding = {
  component: string
  /** L1-L4 prose a model can read directly. */
  text: string
  description: Record<string, unknown>
  intent?: Record<string, unknown>
  facts?: Record<string, unknown>
  physics?: Record<string, unknown>
  structure?: PublicNavNode
  bounds: {
    /** Datum labels kept per branch; null when the structure is omitted. */
    leavesPerBranch: number | null
    structure: "bounded" | "omitted"
    sourceRows: "omitted"
  }
}

export type CreateChartImage =
  | { included: true; mimeType: "image/png"; data: string; bytes: number }
  | { included: false; reason: string }

export type CreateChartAttachmentStatus = {
  image: {
    included: boolean
    reason?: string
    mimeType?: "image/png"
    bytes?: number
  }
  code: { included: boolean; reason?: string }
  grounding: {
    included: boolean
    reason?: string
    structure?: "bounded" | "omitted"
  }
}

type ToolContentLike =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: "image/png" }

type ToolResultLike = {
  content: ToolContentLike[]
  isError?: boolean
  structuredContent?: Record<string, unknown>
  _meta?: Record<string, unknown>
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/
const BINDING_NOTES: Record<CreateChartBindingSource, string> = {
  "input-data": "the rows you passed as `data`",
  "input-props": "the value you passed in `props`",
  derived:
    "built by Semiotic from your rows for this chart; this tool does not return it"
}

/**
 * Build React code and a serializable config from the public props.
 * Returns null when the component has no JSX projection.
 */
export function createChartCode(args: {
  component: string
  importPath: string
  /** Props the chart was rendered with. */
  props: Record<string, unknown>
  /** The same props after source rows and unknown objects were removed. */
  publicProps: Record<string, unknown>
  inputData: unknown
  inputProps?: Record<string, unknown>
}): CreateChartCodeResult | null {
  let config: ReturnType<typeof toConfig>
  try {
    config = toConfig(args.component, args.publicProps, { includeData: false })
  } catch {
    return null
  }
  const bindings = Object.keys(args.props)
    .filter(
      (key) =>
        args.props[key] !== undefined &&
        args.props[key] !== null &&
        (!Object.prototype.hasOwnProperty.call(args.publicProps, key) ||
          !isDeepStrictEqual(args.props[key], args.publicProps[key])) &&
        !isSensitiveField(key) &&
        IDENTIFIER.test(key)
    )
    .map((prop) => ({
      prop,
      source: (args.props[prop] === args.inputData
        ? "input-data"
        : args.inputProps &&
            Object.prototype.hasOwnProperty.call(args.inputProps, prop)
          ? "input-props"
          : "derived") as CreateChartBindingSource
    }))
  // Compaction can retain a presentation bag while dropping nested settings.
  // Bind the complete original value instead of emitting an incomplete inline
  // copy. Keep the public config compact and free of source rows.
  const boundProps = new Set(bindings.map(({ prop }) => prop))
  let jsx: string
  try {
    jsx = configToJSX({
      ...config,
      props: Object.fromEntries(
        Object.entries(config.props).filter(([key]) => !boundProps.has(key))
      )
    })
  } catch {
    return null
  }
  const lines = jsx.split("\n")
  lines.splice(1, 0, ...bindings.map(({ prop }) => `  ${prop}={${prop}}`))
  const jsxComponent = /^<([A-Za-z_$][A-Za-z0-9_$.]*)/.exec(lines[0])?.[1]
  if (!jsxComponent) return null
  return {
    code: {
      language: "tsx",
      import: `import { ${jsxComponent} } from ${JSON.stringify(args.importPath)}`,
      jsx: lines.join("\n"),
      bindings
    },
    config: config as unknown as Record<string, unknown>
  }
}

export function formatCreateChartCode(code: CreateChartCode): string {
  return [
    "React code:",
    "```tsx",
    code.import,
    "",
    code.jsx,
    "```",
    ...(code.bindings.length
      ? [
          "Values the code refers to by name:",
          ...code.bindings.map(
            ({ prop, source }) => `- ${prop}: ${BINDING_NOTES[source]}`
          )
        ]
      : [])
  ].join("\n")
}

/** Keep what assistive technology announces; drop the raw datum records. */
function publicNavNode(node: unknown): PublicNavNode | undefined {
  if (!node || typeof node !== "object") return undefined
  const source = node as Record<string, unknown>
  if (typeof source.id !== "string" || typeof source.label !== "string") {
    return undefined
  }
  const children = Array.isArray(source.children)
    ? source.children
        .map(publicNavNode)
        .filter((child): child is PublicNavNode => child !== undefined)
    : []
  return {
    id: source.id,
    role: typeof source.role === "string" ? source.role : "node",
    label: source.label,
    level: typeof source.level === "number" ? source.level : 1,
    ...(typeof source.value === "number" && Number.isFinite(source.value)
      ? { value: source.value }
      : {}),
    ...(children.length ? { children } : {})
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

/**
 * Reader grounding for a public response: description, intent, and a
 * navigation structure bounded by the same row limit as the widget preview.
 * When the bounded structure still exceeds the metadata budget it is reduced
 * and then omitted; the prose is always kept.
 */
export function createChartGrounding(
  component: string,
  props: Record<string, unknown>,
  limits: McpRenderOutputLimits
): CreateChartGrounding {
  const capability = getCapability(component)
  const leafBudgets = [
    ...new Set([limits.maxWidgetRows, Math.min(10, limits.maxWidgetRows)])
  ]
  let text = ""
  let description: Record<string, unknown> = { text: "", levels: {} }
  for (const maxLeaves of [...leafBudgets, 0]) {
    const grounding = buildReaderGrounding(
      component,
      props,
      maxLeaves > 0
        ? { capability, maxLeaves }
        : { capability, includeStructure: false, maxLeaves: 1 }
    )
    text = grounding.text
    description = grounding.description as unknown as Record<string, unknown>
    const structure =
      maxLeaves > 0 ? publicNavNode(grounding.structure) : undefined
    const payload: CreateChartGrounding = {
      component,
      text,
      description,
      ...(record(grounding.intent) ? { intent: record(grounding.intent) } : {}),
      ...(record(grounding.facts) ? { facts: record(grounding.facts) } : {}),
      ...(record(grounding.physics)
        ? { physics: record(grounding.physics) }
        : {}),
      ...(structure ? { structure } : {}),
      bounds: {
        leavesPerBranch: structure ? maxLeaves : null,
        structure: structure ? "bounded" : "omitted",
        sourceRows: "omitted"
      }
    }
    if (serializedMcpOutputBytes(payload) <= limits.maxWidgetMetadataBytes) {
      return payload
    }
  }
  const proseBudget = Math.floor(limits.maxWidgetMetadataBytes / 2)
  return {
    component,
    text: truncateUtf8(text, proseBudget),
    description: {
      text: truncateUtf8(String(description.text ?? ""), proseBudget),
      levels: {}
    },
    bounds: { leavesPerBranch: null, structure: "omitted", sourceRows: "omitted" }
  }
}

function withoutStructure(grounding: CreateChartGrounding): CreateChartGrounding {
  const { structure: _structure, ...rest } = grounding
  return {
    ...rest,
    bounds: { leavesPerBranch: null, structure: "omitted", sourceRows: "omitted" }
  }
}

function formatGrounding(grounding: CreateChartGrounding): string {
  return [
    "Reading guide (what this chart shows and how to read it):",
    grounding.text,
    ...(grounding.structure
      ? [
          "A navigation structure (chart, axes, series, datum labels) is in structuredContent.grounding.structure."
        ]
      : [])
  ].join("\n")
}

/**
 * Add code, grounding, and an image to a proven render, in that priority
 * order, keeping only what fits `maximumBytes`. The required envelope is never
 * altered; the caller still applies the final response cap to it.
 */
export function attachCreateChartOutputs<Result extends ToolResultLike>(
  base: Result,
  parts: {
    summary: string
    code: CreateChartCodeResult | null
    grounding: CreateChartGrounding | null
    image: CreateChartImage
  },
  maximumBytes: number
): Result {
  let code = parts.code
  let grounding = parts.grounding
  let image = parts.image.included ? parts.image : null
  const status: CreateChartAttachmentStatus = {
    image: parts.image.included
      ? { included: true, mimeType: "image/png", bytes: parts.image.bytes }
      : { included: false, reason: parts.image.reason },
    code: code
      ? { included: true }
      : { included: false, reason: "unsupported-component" },
    grounding: grounding
      ? { included: true, structure: grounding.bounds.structure }
      : { included: false, reason: "unavailable" }
  }
  const build = (): Result => ({
    ...base,
    content: [
      { type: "text" as const, text: parts.summary },
      ...(image
        ? [{ type: "image" as const, data: image.data, mimeType: image.mimeType }]
        : []),
      ...(grounding
        ? [{ type: "text" as const, text: formatGrounding(grounding) }]
        : []),
      ...(code
        ? [{ type: "text" as const, text: formatCreateChartCode(code.code) }]
        : [])
    ],
    structuredContent: {
      ...base.structuredContent,
      ...(code ? { code: code.code, config: code.config } : {}),
      ...(grounding ? { grounding } : {}),
      attachments: status
    }
  })
  const fits = () => serializedMcpOutputBytes(build()) <= maximumBytes

  // Shed the largest, least essential output first: the image, then the
  // grounding structure, then the grounding prose, then the code.
  if (!fits() && image) {
    image = null
    status.image = { included: false, reason: "output-limit" }
  }
  if (!fits() && grounding?.structure) {
    grounding = withoutStructure(grounding)
    status.grounding = { included: true, structure: "omitted" }
  }
  if (!fits() && grounding) {
    grounding = null
    status.grounding = { included: false, reason: "output-limit" }
  }
  if (!fits() && code) {
    code = null
    status.code = { included: false, reason: "output-limit" }
  }
  // Even the summary and attachment-status fields cost bytes. Preserve the
  // original proven envelope when there is no room for those additions; the
  // caller still caps that envelope if it was already too large on its own.
  return fits() ? build() : base
}
