import type { Datum } from "../charts/shared/datumTypes"
import type { CustomLayout } from "../stream/customLayout"
import type { GeoCustomLayout } from "../stream/geoCustomLayout"
import type { NetworkCustomLayout } from "../stream/networkCustomLayout"
import type { OrdinalCustomLayout } from "../stream/ordinalCustomLayout"
import type { NavTreeNode } from "./navigationTree"
import type { IntentId } from "./intents"

/**
 * A frame identifies the rendering/runtime substrate a recipe expects. It does
 * not identify the recipe's analytical meaning — that lives in dataRoles,
 * encodings, intents, and designContract.
 */
export type ChartRecipeFrameFamily =
  | "XYFrame"
  | "OrdinalFrame"
  | "NetworkFrame"
  | "GeoFrame"
  | "XYCustomChart"
  | "NetworkCustomChart"
  | "OrdinalCustomChart"
  | "GeoCustomChart"
  | "Other"

export type ChartRecipePortability = "portable" | "local"

/**
 * JSON-schema-compatible metadata for serializable recipe configuration.
 * Kept structurally open in v0 so callers can use JSON Schema, Zod-emitted
 * schema, or another serializable schema vocabulary without an adapter.
 */
export type SerializableSchema = Record<string, unknown>

interface RecipeDatumMarker<TDatum> {
  /** Type-only marker; never required on a runtime layout function. */
  readonly __chartRecipeDatumType?: TDatum
}

/**
 * Any of Semiotic's four custom-layout contracts. The datum marker preserves a
 * recipe author's datum generic without changing the established layout APIs.
 */
export type CustomLayoutFunction<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>,
> = (
  | CustomLayout<TConfig>
  | OrdinalCustomLayout<TConfig>
  | NetworkCustomLayout<TConfig>
  | GeoCustomLayout<TConfig>
) & RecipeDatumMarker<TDatum>

/**
 * Serializable reference used by portable recipes. A host registry resolves
 * the id to executable layout code; local recipes may carry the function
 * directly instead.
 */
export interface RegisteredRecipeLayout {
  id: string
  importPath?: string
  exportName?: string
}

export type DataSemanticType =
  | "nominal"
  | "ordinal"
  | "quantitative"
  | "temporal"
  | "identifier"
  | "boolean"
  | "geographic"
  | "unknown"

export interface DataRoleDefinition {
  /** Open role vocabulary: category/value, node-id, edge-source, longitude, etc. */
  role: string
  /** Concrete/default field used by this recipe/example. May be omitted for computed roles. */
  field?: string
  /** Recipe config key that can bind this role to a different concrete field. */
  accessor?: string
  required?: boolean
  semanticType: DataSemanticType
  description?: string
  /** Which input collection owns the field for multi-table/network/geo recipes. */
  source?: "data" | "nodes" | "edges" | "areas" | "points" | "lines" | string
}

export type EncodingChannel =
  | "position"
  | "count"
  | "color"
  | "size"
  | "shape"
  | "length"
  | "area"
  | "angle"
  | "connection"
  | "order"
  | "texture"
  | "motion"
  | "label"
  | string

export interface EncodingDefinition {
  channel: EncodingChannel
  /** One role or a relationship among several roles. */
  role: string | string[]
  meaning: string
  /** Other channels that preserve this meaning when the primary channel fails. */
  redundantWith?: string[]
}

/**
 * String shorthand keeps v0 manifests approachable. The object form adds the
 * rationale/strength needed by suggestion and explanation surfaces.
 */
export type IntentDefinition =
  | IntentId
  | {
      /** Canonical intent id. `name` is accepted as an author-friendly alias. */
      id?: IntentId
      name?: IntentId
      strength?: "primary" | "secondary" | "supporting"
      score?: number
      rationale?: string
    }

export interface AudienceFitDefinition {
  audience: string
  fit: "strong" | "moderate" | "weak" | "avoid"
  rationale?: string
}

export interface LiteracyTargetDefinition {
  concept: string
  rationale: string
}

/**
 * Example-local audience vocabulary. This mirrors the seed manifests used in
 * the docs while audienceFit supports a compact list for ranking systems.
 */
export interface RecipeAudienceDefinition {
  primary?: string
  familiarity?: Record<string, string | number>
  literacyTargets?: LiteracyTargetDefinition[]
}

export interface ReceptionDefinition {
  channels: string[]
  strengths?: string[]
  risks?: string[]
  scaffolds?: string[]
  /** Whether distinct form/memorability is an intentional reception benefit. */
  memorableForm?: boolean
}

export interface DesignContractDefinition {
  whyCustom: string
  /** Alias used by Intent Mark / portable manifests. */
  whyThisForm?: string
  whyNotDefault?: string
  defaultAlternative?: string
  tradeoff?: string
  caveats?: string[]
  misuse?: string[]
}

export interface RecipeStrategyContext<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>,
> {
  data: ReadonlyArray<TDatum>
  config: TConfig
  locale?: string
}

export interface RecipeDescription {
  text: string
  levels?: {
    l1?: string
    l2?: string
    l3?: string
    l4?: string
  }
}

export type DescriptionStrategy<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>,
> = (context: RecipeStrategyContext<TDatum, TConfig>) => RecipeDescription

export type NavigationStrategy<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>,
> = (context: RecipeStrategyContext<TDatum, TConfig>) => NavTreeNode

/**
 * JSON-safe navigation contract for portable recipes. Role names resolve
 * through `dataRoles`; templates use `{field}`, `{role}`, and `{count}` tokens.
 */
export interface PortableNavigationStrategy {
  groupByRole?: string
  groupBy?: string[]
  itemLabelTemplate?: string
  summaryTemplate?: string
  idRole?: string
}

export interface AccessibilityTableField {
  role?: string
  field?: string
  label: string
  format?: "number" | "percent" | "date" | string
}

export interface AccessibilityExpectations {
  keyboardNavigation?: "required" | "recommended" | "not-applicable"
  accessibleTable?: "required" | "recommended" | "not-applicable"
  description?: "required" | "recommended" | "not-applicable"
  /** The semantic unit readers should traverse instead of raw visual primitives. */
  navigationGranularity?: "datum" | "category" | "group" | "node" | "edge" | "summary" | string
  dataBearingSceneNodes?: "required" | "recommended" | "not-applicable"
  fallbackTable?: boolean
  redundantEncodings?: string[]
  requirements?: string[]
  /** Fields the scene-backed accessible table must preserve. */
  tableFields?: AccessibilityTableField[]
  /** Author-friendly aliases used by portable manifests. */
  requiresTitle?: boolean
  requiresSummary?: boolean
  requiresAccessibleTable?: boolean
  minimumHitTarget?: number
  tableRoles?: string[]
}

export interface MobileInteractionDefinition {
  /** Primary phone interaction, e.g. "tap", "button", "drag", "none". */
  primary?: string
  /** Standard non-hover alternatives available to the reader. */
  alternatives?: string[]
  /** How hover detail is recovered on touch devices, e.g. "tap-to-lock". */
  hoverFallback?: string
  /** Comfortable pointer target in CSS pixels. */
  targetSize?: number
}

export interface MobileLabelDefinition {
  /** Label strategy at phone width, e.g. "direct", "inline", "external", "legend". */
  strategy?: string
  /** Minimum resolved label font size in CSS pixels. */
  minFontSize?: number
}

export interface MobileCustomSemanticsDefinition {
  /** Whether emitted scene nodes retain data semantics for audit/grounding. */
  dataBearingSceneNodes?: boolean
  /** Whether emitted scene nodes use stable ids across renders. */
  stableIds?: boolean
  /** Semantic unit readers should traverse on a phone. */
  navigationGranularity?: string
}

export interface MobileDesignDefinition {
  /** Overall mobile design strategy, e.g. "responsive", "small-multiples", "summary-cards". */
  strategy?: string
  /** True when the layout intentionally recomputes for narrow viewports. */
  responsive?: boolean
  /** Alias for responsive, friendlier in portable manifests. */
  supportsResponsiveLayout?: boolean
  /** Widths this recipe/adapter has designed variants for. */
  breakpoints?: number[]
  /** Minimum CSS viewport width the authored design supports. */
  minViewportWidth?: number
  /** Mobile mark budget before aggregation/faceting/progressive disclosure. */
  maxMarks?: number
  /** Mobile annotation budget before collapsing notes out of the plot. */
  maxAnnotations?: number
  /** Minimum pointer target the recipe/adapter provides. */
  minimumHitTarget?: number
  /** Whether the mobile view provides a title/summary/card before the visual. */
  summary?: boolean | string
  interaction?: MobileInteractionDefinition
  labels?: MobileLabelDefinition
  custom?: MobileCustomSemanticsDefinition
}

export interface RecipeAuditExpectations {
  maxCategories?: number
  maxMarks?: number
  minimumHitTargetSize?: number
  requireStableIds?: boolean
  requireDatumCoverage?: boolean
  expectedSceneNodeTypes?: string[]
  checks?: string[]
}

export interface RecipeExample<TDatum extends Datum = Datum, TConfig extends object = Record<string, unknown>> {
  name: string
  description?: string
  data?: ReadonlyArray<TDatum>
  config?: TConfig
  path?: string
}

export interface RecipePortabilityConfig {
  schema: SerializableSchema
}

/**
 * Declarative identity/meaning contract for a custom chart recipe.
 *
 * Required v0 fields intentionally stay small. A recipe can participate before
 * it has a schema, generated description, custom navigation tree, or detailed
 * audit expectations; those layers can be added without changing its identity.
 */
export interface ChartRecipe<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>,
> {
  id: string
  name: string
  version?: string
  frameFamily: ChartRecipeFrameFamily
  portability: ChartRecipePortability

  layout?: CustomLayoutFunction<TDatum, TConfig> | RegisteredRecipeLayout
  layoutConfigSchema?: SerializableSchema
  portabilityConfig?: RecipePortabilityConfig

  dataRoles: DataRoleDefinition[]
  encodings?: EncodingDefinition[]
  intents: IntentDefinition[]
  audience?: RecipeAudienceDefinition
  audienceFit?: AudienceFitDefinition[]
  reception?: ReceptionDefinition

  designContract: DesignContractDefinition
  accessibility: AccessibilityExpectations
  /** Phone-specific contract consumed by audits, agents, and portable adapters. */
  mobile?: MobileDesignDefinition

  description?: DescriptionStrategy<TDatum, TConfig>
  navigation?: NavigationStrategy<TDatum, TConfig> | PortableNavigationStrategy
  audit?: RecipeAuditExpectations

  caveats?: string[]
  examples?: RecipeExample<TDatum, TConfig>[]
}

/**
 * Define a chart recipe with full generic inference. Intentionally an identity
 * function in v0: the value is the shared, inspectable shape rather than hidden
 * registration or runtime behavior.
 */
export function defineChartRecipe<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>,
>(recipe: ChartRecipe<TDatum, TConfig>): ChartRecipe<TDatum, TConfig> {
  validateChartRecipe(recipe)
  return recipe
}

/**
 * Runtime validation is intentionally limited to contract integrity. It does
 * not try to validate a recipe's domain-specific layout configuration.
 */
export function validateChartRecipe<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>,
>(recipe: ChartRecipe<TDatum, TConfig>): void {
  if (!recipe || typeof recipe !== "object") {
    throw new Error("Chart recipe must be an object.")
  }
  if (typeof recipe.id !== "string" || recipe.id.trim() === "") {
    throw new Error("Chart recipe requires a non-empty id.")
  }
  if (typeof recipe.name !== "string" || recipe.name.trim() === "") {
    throw new Error(`Chart recipe "${recipe.id}" requires a non-empty name.`)
  }
  if (!Array.isArray(recipe.dataRoles) || recipe.dataRoles.length === 0) {
    throw new Error(`Chart recipe "${recipe.id}" requires at least one data role.`)
  }
  if (!Array.isArray(recipe.intents) || recipe.intents.length === 0) {
    throw new Error(`Chart recipe "${recipe.id}" requires at least one intent.`)
  }
  for (const intent of recipe.intents) {
    if (
      typeof intent !== "string" &&
      (!intent || (typeof intent.id !== "string" && typeof intent.name !== "string"))
    ) {
      throw new Error(`Chart recipe "${recipe.id}" has an intent without an id or name.`)
    }
  }
  if (!recipe.designContract?.whyCustom) {
    throw new Error(`Chart recipe "${recipe.id}" requires designContract.whyCustom.`)
  }
  if (!recipe.accessibility || typeof recipe.accessibility !== "object") {
    throw new Error(`Chart recipe "${recipe.id}" requires accessibility expectations.`)
  }

  if (recipe.portability === "portable") {
    if (!isRegisteredRecipeLayout(recipe.layout)) {
      throw new Error(
        `Portable chart recipe "${recipe.id}" must reference a registered layout by id.`,
      )
    }
    const schema = recipe.layoutConfigSchema ?? recipe.portabilityConfig?.schema
    if (!schema) {
      throw new Error(
        `Portable chart recipe "${recipe.id}" requires a serializable layout config schema.`,
      )
    }
    if (!isJsonSafe(schema)) {
      throw new Error(
        `Portable chart recipe "${recipe.id}" has a layout config schema that is not JSON-safe.`,
      )
    }
  }
}

export function isRegisteredRecipeLayout(
  layout: unknown,
): layout is RegisteredRecipeLayout {
  return (
    !!layout &&
    typeof layout === "object" &&
    typeof (layout as Record<string, unknown>).id === "string"
  )
}

/** True when a value can cross JSON/CLI/MCP boundaries without data loss. */
export function isJsonSafe(value: unknown, seen = new Set<object>()): boolean {
  if (value === null) return true
  const type = typeof value
  if (type === "string" || type === "boolean") return true
  if (type === "number") return Number.isFinite(value)
  if (type !== "object") return false
  if (seen.has(value as object)) return false
  seen.add(value as object)
  const result = Array.isArray(value)
    ? value.every((item) => isJsonSafe(item, seen))
    : Object.entries(value as Record<string, unknown>).every(
        ([, item]) => isJsonSafe(item, seen),
      )
  seen.delete(value as object)
  return result
}
