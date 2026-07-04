import { VALIDATION_MAP } from "../charts/shared/validateProps"
import type { SerializedSelections } from "./selectionSerializer"
import type { Datum } from "../charts/shared/datumTypes"
import {
  getChartRecipe,
  resolveChartRecipe,
} from "../ai/chartRecipeRegistry"
import { isJsonSafe } from "../ai/chartRecipes"
import { recipeIntentId } from "../ai/recipeSemantics"

// ── Types ───────────────────────────────────────────────────────────────

const CONFIG_VERSION = "1"

export interface ChartConfig {
  /** Component name, e.g. "LineChart", "SankeyDiagram" */
  component: string
  /** Serializable props only — functions and React elements stripped */
  props: Datum
  /** Config schema version */
  version: string
  /** ISO 8601 timestamp */
  createdAt: string
  /** Optional serialized selection/brush state */
  selections?: SerializedSelections
  /** Present for portable/local recipe configs. */
  recipeId?: string
  portable?: boolean
  reason?: string
  warnings?: string[]
  manifest?: {
    name: string
    intents: string[]
    audience?: string[]
    frameFamily: string
  }
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
  "legend", "recipe", "layout"
])

/** Data props excluded when includeData is false */
const DATA_PROPS = new Set(["data", "nodes", "edges"])

const deepClone = typeof structuredClone === "function"
  ? structuredClone
  : (obj: any) => JSON.parse(JSON.stringify(obj))

// ── toConfig ────────────────────────────────────────────────────────────

export function toConfig(
  componentName: string,
  props: Datum,
  options?: ToConfigOptions
): ChartConfig {
  const recipe =
    getChartRecipe(componentName) ??
    resolveChartRecipe(props.recipe) ??
    resolveChartRecipe(props.recipeId)
  if (recipe) {
    return recipeToConfig(recipe, props, options)
  }

  const spec = VALIDATION_MAP[componentName]
  if (!spec) {
    throw new Error(`Unknown component "${componentName}". Known components: ${Object.keys(VALIDATION_MAP).join(", ")}`)
  }

  const includeData = options?.includeData !== false
  const serializedProps: Datum = {}

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

function serializableProps(
  props: Datum,
  includeData: boolean,
  strict: boolean,
): Datum {
  const serialized: Datum = {}
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue
    if (ALWAYS_EXCLUDE.has(key) || key === "recipeId") continue
    if (!includeData && DATA_PROPS.has(key)) continue
    if (typeof value === "function" || value?.$$typeof) {
      if (strict) {
        throw new Error(`Portable recipe prop "${key}" is not JSON-safe.`)
      }
      continue
    }
    if (!isJsonSafe(value)) {
      if (strict) {
        throw new Error(`Portable recipe prop "${key}" is not JSON-safe.`)
      }
      continue
    }
    serialized[key] = deepClone(value)
  }
  return serialized
}

function recipeToConfig(
  recipe: NonNullable<ReturnType<typeof resolveChartRecipe>>,
  props: Datum,
  options?: ToConfigOptions,
): ChartConfig {
  const includeData = options?.includeData !== false
  const serializedProps = serializableProps(
    props,
    includeData,
    recipe.portability === "portable",
  )
  const intents = recipe.intents
    .map(recipeIntentId)
    .filter((id): id is string => !!id)
  const manifest = {
    name: recipe.name,
    intents,
    ...(recipe.audience?.primary
      ? { audience: [recipe.audience.primary] }
      : {}),
    frameFamily: recipe.frameFamily,
  }

  if (recipe.portability === "portable") {
    if (!isJsonSafe(serializedProps)) {
      throw new Error(
        `Portable recipe "${recipe.id}" contains non-JSON-safe props or layoutConfig.`,
      )
    }
    return {
      component: "ChartRecipe",
      recipeId: recipe.id,
      portable: true,
      props: serializedProps,
      manifest,
      version: CONFIG_VERSION,
      createdAt: new Date().toISOString(),
      ...(options?.selections ? { selections: options.selections } : {}),
    }
  }

  return {
    component: "LocalChartRecipe",
    recipeId: recipe.id,
    portable: false,
    reason: "Recipe contains or may depend on non-serializable local layout callbacks.",
    warnings: [
      "This config is inspectable but cannot be rendered remotely by CLI or MCP.",
    ],
    props: serializedProps,
    manifest,
    version: CONFIG_VERSION,
    createdAt: new Date().toISOString(),
    ...(options?.selections ? { selections: options.selections } : {}),
  }
}

// ── fromConfig ──────────────────────────────────────────────────────────

export function fromConfig(config: ChartConfig): {
  componentName: string
  props: Datum
} {
  if (!config.component || !config.props) {
    throw new Error("Invalid chart config: missing component or props")
  }

  if (config.component === "ChartRecipe" || config.component === "LocalChartRecipe") {
    if (!config.recipeId) {
      throw new Error("Invalid chart recipe config: missing recipeId")
    }
    const recipe = getChartRecipe(config.recipeId)
    if (!recipe) {
      throw new Error(
        `Unknown chart recipe "${config.recipeId}". Register it before deserializing this config.`,
      )
    }
    if (config.component === "ChartRecipe" && recipe.portability !== "portable") {
      throw new Error(`Chart recipe "${config.recipeId}" is registered as local, not portable.`)
    }
    return {
      componentName: config.component,
      props: {
        ...deepClone(config.props),
        recipeId: config.recipeId,
      },
    }
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

  if (config.recipeId) {
    lines.push(`  recipeId="${config.recipeId}"`)
  }

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
