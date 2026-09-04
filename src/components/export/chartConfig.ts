import {
  KNOWN_CHART_COMPONENTS,
  isKnownChartComponent
} from "../charts/shared/knownChartComponents"
import type { SerializedSelections } from "./selectionSerializer"
import type { Datum } from "../charts/shared/datumTypes"
import {
  getChartRecipe,
  getRecipeLayout,
  getRecipeLayoutIdentity,
  resolveChartRecipe
} from "../ai/chartRecipeRegistry"
import { recipeIntentId } from "../ai/recipeSemantics"
import type { ArtifactContract } from "../artifact/types"
import { nonJsonValuePaths } from "../artifact/jsonCompatibility"
import { fingerprintValue } from "../artifact/fingerprint"
import type {
  ArtifactTransferStatus,
  PortableArtifactContract
} from "../artifact/serialization"
import {
  artifactConfigFields,
  restoredArtifactFields
} from "./chartConfigArtifact"

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
    recipeVersion?: string
    definitionFingerprint?: string
    layoutId?: string
    layoutVersion?: string
    layoutFingerprint?: string
  }
  /** Optional interpretation sidecar, kept separate from executable chart props. */
  artifactContract?: PortableArtifactContract
  /** Explicit preservation/version result for the sidecar. */
  artifactTransfer?: ChartArtifactTransferStatus
}

export interface ChartArtifactTransferStatus extends ArtifactTransferStatus {
  /** Identity of the serialized non-data props; detects later payload drift. */
  serializedConfigFingerprint?: string
  /** Identity of serialized data, or null when the payload intentionally has none. */
  serializedDataFingerprint?: string | null
  /** Identity of the component or recipe, contract, transfer report, and payload bindings. */
  transferFingerprint?: string
}

export interface ToConfigOptions {
  /** Include data arrays in the config. Default: true */
  includeData?: boolean
  /** Serialized selection state to embed */
  selections?: SerializedSelections
  /** Portable interpretation sidecar to preserve with the chart config. */
  artifactContract?: ArtifactContract
}

export interface FromConfigResult {
  componentName: string
  props: Datum
  artifactContract?: PortableArtifactContract
  artifactTransfer?: ChartArtifactTransferStatus
}

export interface ToURLOptions {
  /** Refuse an encoded query string longer than this value. Omit for compatibility. */
  maxLength?: number
}

export interface JSXProjectionResult {
  jsx: string
  omittedPaths: string[]
  warnings: string[]
}

export type CopyFormat = "json" | "jsx"

// ── Constants ───────────────────────────────────────────────────────────

/** Props always excluded (callbacks, React nodes, non-serializable) */
const ALWAYS_EXCLUDE = new Set([
  "tooltip",
  "onObservation",
  "xFormat",
  "yFormat",
  "valueFormat",
  "svgAnnotationRules",
  "tooltipContent",
  "onHover",
  "tickFormatTime",
  "tickFormatValue",
  "edgeSort",
  "sortGroups",
  "centerContent",
  "frameProps",
  "controls",
  "oFormat",
  "rFormat",
  "oSort",
  "pieceStyle",
  "summaryStyle",
  "nodeStyle",
  "edgeStyle",
  "customHoverBehavior",
  "customClickBehavior",
  "customDoubleClickBehavior",
  "onBrush",
  "onTopologyChange",
  "backgroundGraphics",
  "foregroundGraphics",
  "legend",
  "recipe",
  "layout"
])

/** Public row/feature collections excluded when includeData is false. */
const DATA_PROPS = new Set([
  "data",
  "nodes",
  "edges",
  "points",
  "areas",
  "lines",
  "flows"
])

function setOwnValue(
  target: Record<string, unknown>,
  key: string,
  value: unknown
): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  })
}

function shouldExcludeDataProp(key: string, value: unknown): boolean {
  if (!DATA_PROPS.has(key)) return false
  // `areas` can be a reference geography id (e.g. "world-110m"), which is
  // lightweight config rather than raw GeoJSON features.
  if (key === "areas" && typeof value === "string") return false
  return true
}

const deepClone: <T>(obj: T) => T =
  typeof structuredClone === "function"
    ? structuredClone
    : <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T

// ── toConfig ────────────────────────────────────────────────────────────

export function toConfig(
  componentName: string,
  props: Datum,
  options?: ToConfigOptions
): ChartConfig {
  if (options?.selections && nonJsonValuePaths(options.selections).length > 0) {
    throw new TypeError(
      "Serialized selection state must contain only values that survive JSON serialization unchanged."
    )
  }
  const recipe =
    getChartRecipe(componentName) ??
    resolveChartRecipe(props.recipe) ??
    resolveChartRecipe(props.recipeId)
  if (recipe) {
    return recipeToConfig(recipe, props, options)
  }

  if (!isKnownChartComponent(componentName)) {
    throw new Error(
      `Unknown component "${componentName}". Known components: ${KNOWN_CHART_COMPONENTS.join(", ")}`
    )
  }

  const includeData = options?.includeData !== false
  const serializedProps: Datum = {}

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue
    if (ALWAYS_EXCLUDE.has(key)) continue
    if (!includeData && shouldExcludeDataProp(key, value)) continue
    if (typeof value === "function") continue
    if (nonJsonValuePaths(value).length > 0) continue

    // The strict JSON check above makes this clone stable across URL and file
    // boundaries. A whole top-level prop is omitted when any nested value
    // would otherwise be normalized or lost.
    try {
      setOwnValue(serializedProps, key, deepClone(value))
    } catch {
      // Non-cloneable value — skip rather than fail the whole toConfig call.
    }
  }

  const createdAt = new Date().toISOString()
  const binding = {
    version: CONFIG_VERSION,
    createdAt,
    ...(options?.selections ? { selections: options.selections } : {})
  }
  return {
    component: componentName,
    props: serializedProps,
    version: CONFIG_VERSION,
    createdAt,
    ...artifactConfigFields(
      componentName,
      options?.artifactContract,
      props,
      serializedProps,
      binding
    ),
    ...(options?.selections ? { selections: options.selections } : {})
  }
}

function serializableProps(
  props: Datum,
  includeData: boolean,
  strict: boolean
): Datum {
  const serialized: Datum = {}
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue
    if (ALWAYS_EXCLUDE.has(key) || key === "recipeId") continue
    if (!includeData && shouldExcludeDataProp(key, value)) continue
    if (typeof value === "function") {
      if (strict) {
        throw new Error(`Portable recipe prop "${key}" is not JSON-safe.`)
      }
      continue
    }
    if (nonJsonValuePaths(value).length > 0) {
      if (strict) {
        throw new Error(`Portable recipe prop "${key}" is not JSON-safe.`)
      }
      continue
    }
    setOwnValue(serialized, key, deepClone(value))
  }
  return serialized
}

function recipeToConfig(
  recipe: NonNullable<ReturnType<typeof resolveChartRecipe>>,
  props: Datum,
  options?: ToConfigOptions
): ChartConfig {
  const includeData = options?.includeData !== false
  const definitionIncompatiblePaths = nonJsonValuePaths(recipe)
  if (
    recipe.portability === "portable" &&
    definitionIncompatiblePaths.length > 0
  ) {
    throw new Error(
      `Portable recipe "${recipe.id}" has non-JSON definition values at: ${definitionIncompatiblePaths.join(", ")}.`
    )
  }
  const serializedProps = serializableProps(
    props,
    includeData,
    recipe.portability === "portable"
  )
  const intents = recipe.intents
    .map(recipeIntentId)
    .filter((id): id is string => !!id)
  const registeredLayoutId =
    recipe.layout &&
    typeof recipe.layout === "object" &&
    typeof recipe.layout.id === "string"
      ? recipe.layout.id
      : undefined
  const registeredLayoutIdentity = registeredLayoutId
    ? getRecipeLayoutIdentity(registeredLayoutId)
    : undefined
  const declaredLayoutIdentity =
    recipe.layout &&
    typeof recipe.layout === "object" &&
    typeof recipe.layout.version === "string" &&
    recipe.layout.version
      ? {
          version: recipe.layout.version,
          ...(recipe.layout.fingerprint
            ? { fingerprint: recipe.layout.fingerprint }
            : {})
        }
      : undefined
  if (
    registeredLayoutIdentity &&
    declaredLayoutIdentity &&
    (registeredLayoutIdentity.version !== declaredLayoutIdentity.version ||
      registeredLayoutIdentity.fingerprint !==
        declaredLayoutIdentity.fingerprint)
  ) {
    throw new Error(
      `Recipe layout "${registeredLayoutId}" registry identity does not match its portable declaration.`
    )
  }
  const layoutIdentity = registeredLayoutIdentity ?? declaredLayoutIdentity
  if (
    recipe.portability === "portable" &&
    registeredLayoutId &&
    !layoutIdentity
  ) {
    throw new Error(
      `Portable recipe layout "${registeredLayoutId}" must be registered with an explicit version identity.`
    )
  }
  const manifest = {
    name: recipe.name,
    intents,
    ...(recipe.audience?.primary
      ? { audience: [recipe.audience.primary] }
      : {}),
    frameFamily: recipe.frameFamily,
    ...(recipe.version ? { recipeVersion: recipe.version } : {}),
    ...(definitionIncompatiblePaths.length === 0
      ? { definitionFingerprint: fingerprintValue(recipe).fingerprint }
      : {}),
    ...(registeredLayoutId ? { layoutId: registeredLayoutId } : {}),
    ...(layoutIdentity ? { layoutVersion: layoutIdentity.version } : {}),
    ...(layoutIdentity?.fingerprint
      ? { layoutFingerprint: layoutIdentity.fingerprint }
      : {})
  }
  const createdAt = new Date().toISOString()

  if (recipe.portability === "portable") {
    if (nonJsonValuePaths(serializedProps).length > 0) {
      throw new Error(
        `Portable recipe "${recipe.id}" contains non-JSON-safe props or layoutConfig.`
      )
    }
    const binding = {
      version: CONFIG_VERSION,
      createdAt,
      recipeId: recipe.id,
      portable: true,
      manifest,
      ...(options?.selections ? { selections: options.selections } : {})
    }
    return {
      component: "ChartRecipe",
      recipeId: recipe.id,
      portable: true,
      props: serializedProps,
      manifest,
      version: CONFIG_VERSION,
      createdAt,
      ...artifactConfigFields(
        "ChartRecipe",
        options?.artifactContract,
        props,
        serializedProps,
        binding
      ),
      ...(options?.selections ? { selections: options.selections } : {})
    }
  }

  const reason =
    "Recipe contains or may depend on non-serializable local layout callbacks."
  const warnings = [
    "This config is inspectable but cannot be rendered remotely by CLI or MCP."
  ]
  const binding = {
    version: CONFIG_VERSION,
    createdAt,
    recipeId: recipe.id,
    portable: false,
    manifest,
    reason,
    warnings,
    ...(options?.selections ? { selections: options.selections } : {})
  }
  return {
    component: "ChartRecipe",
    recipeId: recipe.id,
    portable: false,
    reason,
    warnings,
    props: serializedProps,
    manifest,
    version: CONFIG_VERSION,
    createdAt,
    ...artifactConfigFields(
      "ChartRecipe",
      options?.artifactContract,
      props,
      serializedProps,
      binding
    ),
    ...(options?.selections ? { selections: options.selections } : {})
  }
}

// ── fromConfig ──────────────────────────────────────────────────────────

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
  } catch {
    return false
  }
}

function assertChartConfig(value: unknown): asserts value is ChartConfig {
  if (!isPlainRecord(value)) {
    throw new Error("Invalid chart config: expected a plain object")
  }
  const incompatiblePaths = nonJsonValuePaths(value)
  if (incompatiblePaths.length > 0) {
    throw new TypeError(
      `Chart config contains values that cannot survive JSON serialization at: ${incompatiblePaths.join(", ")}.`
    )
  }
  if (value.version !== CONFIG_VERSION) {
    throw new Error(
      `Unsupported chart config version ${String(value.version)}; expected ${CONFIG_VERSION}.`
    )
  }
  if (typeof value.component !== "string" || !value.component.trim()) {
    throw new Error("Invalid chart config: missing component")
  }
  if (!isPlainRecord(value.props)) {
    throw new Error("Invalid chart config: props must be a plain object")
  }
  if (
    typeof value.createdAt !== "string" ||
    !Number.isFinite(Date.parse(value.createdAt))
  ) {
    throw new Error("Invalid chart config: createdAt must be a valid timestamp")
  }
  if (
    value.recipeId !== undefined &&
    (typeof value.recipeId !== "string" || !value.recipeId.trim())
  ) {
    throw new Error("Invalid chart config: recipeId must be a non-empty string")
  }
  if (value.portable !== undefined && typeof value.portable !== "boolean") {
    throw new Error("Invalid chart config: portable must be a boolean")
  }
  if (value.selections !== undefined && !isPlainRecord(value.selections)) {
    throw new Error("Invalid chart config: selections must be a plain object")
  }
  if (value.manifest !== undefined) {
    if (!isPlainRecord(value.manifest)) {
      throw new Error("Invalid chart config: manifest must be a plain object")
    }
    if (
      typeof value.manifest.name !== "string" ||
      !value.manifest.name.trim() ||
      typeof value.manifest.frameFamily !== "string" ||
      !value.manifest.frameFamily.trim() ||
      !Array.isArray(value.manifest.intents) ||
      value.manifest.intents.some(
        (intent: unknown) => typeof intent !== "string" || !intent.trim()
      ) ||
      (value.manifest.audience !== undefined &&
        (!Array.isArray(value.manifest.audience) ||
          value.manifest.audience.some(
            (audience: unknown) =>
              typeof audience !== "string" || !audience.trim()
          ))) ||
      (value.manifest.recipeVersion !== undefined &&
        (typeof value.manifest.recipeVersion !== "string" ||
          !value.manifest.recipeVersion.trim())) ||
      (value.manifest.definitionFingerprint !== undefined &&
        (typeof value.manifest.definitionFingerprint !== "string" ||
          !value.manifest.definitionFingerprint.trim())) ||
      (value.manifest.layoutId !== undefined &&
        (typeof value.manifest.layoutId !== "string" ||
          !value.manifest.layoutId.trim())) ||
      (value.manifest.layoutVersion !== undefined &&
        (typeof value.manifest.layoutVersion !== "string" ||
          !value.manifest.layoutVersion.trim())) ||
      (value.manifest.layoutFingerprint !== undefined &&
        (typeof value.manifest.layoutFingerprint !== "string" ||
          !value.manifest.layoutFingerprint.trim())) ||
      (value.manifest.layoutVersion !== undefined &&
        value.manifest.layoutId === undefined) ||
      (value.manifest.layoutFingerprint !== undefined &&
        value.manifest.layoutVersion === undefined)
    ) {
      throw new Error("Invalid chart config: malformed recipe manifest")
    }
  }
}

export function fromConfig(config: ChartConfig): FromConfigResult {
  assertChartConfig(config)

  if (
    config.component === "ChartRecipe" ||
    config.component === "LocalChartRecipe"
  ) {
    if (!config.recipeId) {
      throw new Error("Invalid chart recipe config: missing recipeId")
    }
    const recipe = getChartRecipe(config.recipeId)
    if (!recipe) {
      throw new Error(
        `Unknown chart recipe "${config.recipeId}". Register it before deserializing this config.`
      )
    }
    if (
      config.manifest?.definitionFingerprint &&
      config.manifest.definitionFingerprint !==
        fingerprintValue(recipe).fingerprint
    ) {
      throw new Error(
        `Chart recipe "${config.recipeId}" no longer matches the serialized definition.`
      )
    }
    if (
      config.manifest?.recipeVersion !== undefined &&
      config.manifest.recipeVersion !== recipe.version
    ) {
      throw new Error(
        `Chart recipe "${config.recipeId}" version does not match the serialized config.`
      )
    }
    if (config.manifest?.layoutVersion) {
      const layoutId = config.manifest.layoutId
      const registeredLayout = layoutId ? getRecipeLayout(layoutId) : undefined
      const registeredIdentity = layoutId
        ? getRecipeLayoutIdentity(layoutId)
        : undefined
      const declaredLayout =
        recipe.layout &&
        typeof recipe.layout === "object" &&
        recipe.layout.id === layoutId &&
        recipe.layout.version
          ? {
              version: recipe.layout.version,
              fingerprint: recipe.layout.fingerprint
            }
          : undefined
      const identity = registeredLayout
        ? registeredIdentity
        : (registeredIdentity ?? declaredLayout)
      if (
        !identity ||
        identity.version !== config.manifest.layoutVersion ||
        identity.fingerprint !== config.manifest.layoutFingerprint
      ) {
        throw new Error(
          `Chart recipe "${config.recipeId}" layout implementation no longer matches the serialized config.`
        )
      }
    }
    const legacyLocalRecipe = config.component === "LocalChartRecipe"
    const expectsPortableRecipe =
      !legacyLocalRecipe && config.portable !== false
    if (expectsPortableRecipe && recipe.portability !== "portable") {
      throw new Error(
        `Chart recipe "${config.recipeId}" is registered as local, not portable.`
      )
    }
    return {
      componentName: "ChartRecipe",
      props: {
        ...deepClone(config.props),
        recipeId: config.recipeId
      },
      ...restoredArtifactFields(config)
    }
  }

  if (!isKnownChartComponent(config.component)) {
    throw new Error(
      `Unknown component "${config.component}". This config may require a newer version of semiotic.`
    )
  }

  return {
    componentName: config.component,
    props: deepClone(config.props),
    ...restoredArtifactFields(config)
  }
}

// ── toURL / fromURL ─────────────────────────────────────────────────────

export function toURL(config: ChartConfig, options: ToURLOptions = {}): string {
  assertChartConfig(config)
  const json = JSON.stringify(config)
  const encoded = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
  const query = `sc=${encoded}`
  if (
    options.maxLength !== undefined &&
    query.length > Math.max(0, Math.floor(options.maxLength))
  ) {
    throw new RangeError(
      `Serialized chart config is ${query.length} characters; the declared URL limit is ${options.maxLength}. Use a file or sidecar export instead.`
    )
  }
  return query
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
  const parsed: unknown = JSON.parse(json)
  assertChartConfig(parsed)
  return parsed
}

// ── copyConfig ──────────────────────────────────────────────────────────

export async function copyConfig(
  config: ChartConfig,
  format: CopyFormat = "json"
): Promise<void> {
  const text =
    format === "jsx" ? configToJSX(config) : JSON.stringify(config, null, 2)

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text)
  } else {
    throw new Error(
      "Clipboard API not available. copyConfig requires a browser environment."
    )
  }
}

// ── configToJSX ─────────────────────────────────────────────────────────

export function configToJSX(config: ChartConfig): string {
  assertChartConfig(config)
  const { props } = config
  const component =
    config.component === "LocalChartRecipe" ? "ChartRecipe" : config.component
  if (component !== "ChartRecipe" && !isKnownChartComponent(component)) {
    throw new Error(`Cannot project unknown component "${component}" to JSX.`)
  }
  const lines: string[] = [`<${component}`]

  if (config.recipeId) {
    lines.push(`  recipeId={${jsxJson(config.recipeId)}}`)
  }

  for (const [key, value] of Object.entries(props)) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) {
      const property: Record<string, unknown> = {}
      Object.defineProperty(property, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true
      })
      lines.push(`  {...${jsxJson(property)}}`)
      continue
    }
    if (typeof value === "string") {
      lines.push(
        jsxQuotedAttributeSafe(value)
          ? `  ${key}="${value}"`
          : `  ${key}={${jsxJson(value)}}`
      )
    } else if (typeof value === "boolean" && value === true) {
      lines.push(`  ${key}`)
    } else if (typeof value === "boolean" && value === false) {
      lines.push(`  ${key}={false}`)
    } else if (typeof value === "number") {
      lines.push(`  ${key}={${value}}`)
    } else {
      const json = jsxJson(value)
      if (json.length < 80) {
        lines.push(`  ${key}={${json}}`)
      } else {
        lines.push(`  ${key}={${jsxJson(value, 2)}}`)
      }
    }
  }

  lines.push(`/>`)
  return lines.join("\n")
}

function jsxQuotedAttributeSafe(value: string): boolean {
  return !/["&<>{}\r\n\u2028\u2029]/.test(value)
}

function jsxJson(value: unknown, space?: number): string {
  return JSON.stringify(value, null, space)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}

/** Return JSX together with the top-level metadata it cannot represent. */
export function configToJSXWithReport(
  config: ChartConfig
): JSXProjectionResult {
  const omittedPaths = [
    ...(config.artifactContract ? ["artifactContract"] : []),
    ...(config.artifactTransfer ? ["artifactTransfer"] : []),
    ...(config.selections ? ["selections"] : [])
  ]
  return {
    jsx: configToJSX(config),
    omittedPaths,
    warnings: omittedPaths.length
      ? [
          "JSX represents the chart props only. Preserve the reported top-level fields as a separate artifact packet."
        ]
      : []
  }
}
