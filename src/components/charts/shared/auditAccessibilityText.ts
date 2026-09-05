import type { A11yFinding } from "./auditAccessibility"
import type { ChartRecipeFrameFamily } from "../../ai/chartRecipes"
import type { Datum } from "./datumTypes"
import { VALIDATION_MAP } from "./validateProps"

const ACCESSIBILITY_TEXT_PROPS = ["title", "description", "summary"] as const
// React-only custom layouts are intentionally absent from the JSON prop schema.
// All four wrappers forward BaseChartProps text through buildBaseMetadataProps.
const CUSTOM_TEXT_COMPONENTS = new Set([
  "XYCustomChart",
  "OrdinalCustomChart",
  "NetworkCustomChart",
  "GeoCustomChart"
])
// ChartRecipe also routes these legacy family names through the same wrappers.
const RECIPE_TEXT_FAMILIES = new Set([
  ...CUSTOM_TEXT_COMPONENTS,
  "XYFrame",
  "OrdinalFrame",
  "NetworkFrame",
  "GeoFrame"
])

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

/**
 * Only declared chart props can be credited as rendered accessibility text.
 * Credit schema declarations and the custom wrappers' executable text contract.
 * Recipe metadata alone does not establish support for an unknown renderer.
 */
export function assessAccessibilityText(
  component: string,
  props: Datum,
  recipeFamily?: ChartRecipeFrameFamily
) {
  const declaredProps = VALIDATION_MAP[component]?.props
  const customText =
    CUSTOM_TEXT_COMPONENTS.has(component) ||
    (recipeFamily !== undefined && RECIPE_TEXT_FAMILIES.has(recipeFamily))
  const supports = (name: (typeof ACCESSIBILITY_TEXT_PROPS)[number]) =>
    !!declaredProps?.[name] || customText
  const unsupported = ACCESSIBILITY_TEXT_PROPS.filter(
    (name) => isNonEmptyString(props[name]) && !supports(name)
  )
  const hasTitle = supports("title") && isNonEmptyString(props.title)
  const hasDescription =
    supports("description") && isNonEmptyString(props.description)
  const hasSummary = supports("summary") && isNonEmptyString(props.summary)
  const unsupportedFinding: A11yFinding | undefined =
    unsupported.length > 0
      ? {
          id: "understandable.unsupported-description-prop",
          principle: "understandable",
          heuristic: "Descriptive text is connected to the rendered chart",
          critical: true,
          status: "warn",
          message: `Useful ${unsupported.join(" and ")} text was supplied, but ${unsupported.length === 1 ? "that prop is" : "those props are"} not supported by ${component}'s declared chart API and cannot be credited as rendered accessibility text.`,
          fix: "Use the component's declared title, description, and summary props when available; for richer generated description or navigation, use ChartContainer with chartConfig plus describe and/or navigable."
        }
      : undefined

  return { hasTitle, hasDescription, hasSummary, unsupportedFinding }
}
