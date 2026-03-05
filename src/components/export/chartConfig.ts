import { VALIDATION_MAP } from "../charts/shared/validateProps"
import type { SerializedSelections } from "./selectionSerializer"

// ── Types ───────────────────────────────────────────────────────────────

const CONFIG_VERSION = "1"

export interface ChartConfig {
  /** Component name, e.g. "LineChart", "SankeyDiagram" */
  component: string
  /** Serializable props only — functions and React elements stripped */
  props: Record<string, any>
  /** Config schema version */
  version: string
  /** ISO 8601 timestamp */
  createdAt: string
  /** Optional serialized selection/brush state */
  selections?: SerializedSelections
}

export interface ToConfigOptions {
  /** Include data arrays in the config. Default: true */
  includeData?: boolean
  /** Serialized selection state to embed */
  selections?: SerializedSelections
}

export type CopyFormat = "json" | "jsx"

// ── Constants ───────────────────────────────────────────────────────────

/** Props always excluded (callbacks, React nodes, non-serializable) */
const ALWAYS_EXCLUDE = new Set([
  "tooltip", "onObservation", "xFormat", "yFormat", "valueFormat",
  "svgAnnotationRules", "tooltipContent", "onHover", "tickFormatTime",
  "tickFormatValue", "edgeSort", "sortGroups", "centerContent",
  "frameProps", "controls", "oFormat", "rFormat", "oSort",
  "pieceStyle", "summaryStyle", "nodeStyle", "edgeStyle",
  "customHoverBehavior", "customClickBehavior", "customDoubleClickBehavior",
  "onBrush", "onTopologyChange", "backgroundGraphics", "foregroundGraphics",
  "legend"
])

/** Data props excluded when includeData is false */
const DATA_PROPS = new Set(["data", "nodes", "edges"])

const deepClone = typeof structuredClone === "function"
  ? structuredClone
  : (obj: any) => JSON.parse(JSON.stringify(obj))

// ── toConfig ────────────────────────────────────────────────────────────

export function toConfig(
  componentName: string,
  props: Record<string, any>,
  options?: ToConfigOptions
): ChartConfig {
  const spec = VALIDATION_MAP[componentName]
  if (!spec) {
    throw new Error(`Unknown component "${componentName}". Known components: ${Object.keys(VALIDATION_MAP).join(", ")}`)
  }

  const includeData = options?.includeData !== false
  const serializedProps: Record<string, any> = {}

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue
    if (ALWAYS_EXCLUDE.has(key)) continue
    if (!includeData && DATA_PROPS.has(key)) continue
    if (typeof value === "function") continue
    if (value?.$$typeof) continue // React element

    serializedProps[key] = deepClone(value)
  }

  return {
    component: componentName,
    props: serializedProps,
    version: CONFIG_VERSION,
    createdAt: new Date().toISOString(),
    ...(options?.selections ? { selections: options.selections } : {})
  }
}

// ── fromConfig ──────────────────────────────────────────────────────────

export function fromConfig(config: ChartConfig): {
  componentName: string
  props: Record<string, any>
} {
  if (!config.component || !config.props) {
    throw new Error("Invalid chart config: missing component or props")
  }

  const spec = VALIDATION_MAP[config.component]
  if (!spec) {
    throw new Error(
      `Unknown component "${config.component}". This config may require a newer version of semiotic.`
    )
  }

  return {
    componentName: config.component,
    props: deepClone(config.props)
  }
}

// ── toURL / fromURL ─────────────────────────────────────────────────────

export function toURL(config: ChartConfig): string {
  const json = JSON.stringify(config)
  const encoded = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
  return `sc=${encoded}`
}

export function fromURL(urlString: string): ChartConfig {
  const params = new URLSearchParams(
    urlString.includes("?") ? urlString.split("?")[1] : urlString
  )
  const encoded = params.get("sc")
  if (!encoded) {
    throw new Error("No chart config found in URL (missing 'sc' parameter)")
  }
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/")
  const json = decodeURIComponent(escape(atob(padded)))
  return JSON.parse(json) as ChartConfig
}

// ── copyConfig ──────────────────────────────────────────────────────────

export async function copyConfig(
  config: ChartConfig,
  format: CopyFormat = "json"
): Promise<void> {
  const text = format === "jsx" ? configToJSX(config) : JSON.stringify(config, null, 2)

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text)
  } else {
    throw new Error("Clipboard API not available. copyConfig requires a browser environment.")
  }
}

// ── configToJSX ─────────────────────────────────────────────────────────

export function configToJSX(config: ChartConfig): string {
  const { component, props } = config
  const lines: string[] = [`<${component}`]

  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "string") {
      lines.push(`  ${key}="${value}"`)
    } else if (typeof value === "boolean" && value === true) {
      lines.push(`  ${key}`)
    } else if (typeof value === "boolean" && value === false) {
      lines.push(`  ${key}={false}`)
    } else if (typeof value === "number") {
      lines.push(`  ${key}={${value}}`)
    } else {
      const json = JSON.stringify(value)
      if (json.length < 80) {
        lines.push(`  ${key}={${json}}`)
      } else {
        lines.push(`  ${key}={${JSON.stringify(value, null, 2)}}`)
      }
    }
  }

  lines.push(`/>`)
  return lines.join("\n")
}
