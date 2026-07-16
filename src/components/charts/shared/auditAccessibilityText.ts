import type { A11yFinding } from "./auditAccessibility"
import type { Datum } from "./datumTypes"
import { VALIDATION_MAP } from "./validateProps"

const ACCESSIBILITY_TEXT_PROPS = ["title", "description", "summary"] as const

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

/**
 * Only declared chart props can be credited as rendered accessibility text.
 * This keeps the audit aligned with the generated prop schema and validation.
 */
export function assessAccessibilityText(component: string, props: Datum) {
  const declaredProps = VALIDATION_MAP[component]?.props
  const supports = (name: typeof ACCESSIBILITY_TEXT_PROPS[number]) =>
    !!declaredProps?.[name]
  const unsupported = ACCESSIBILITY_TEXT_PROPS.filter(
    (name) => isNonEmptyString(props[name]) && !supports(name),
  )
  const hasTitle = supports("title") && isNonEmptyString(props.title)
  const hasDescription = supports("description") && isNonEmptyString(props.description)
  const hasSummary = supports("summary") && isNonEmptyString(props.summary)
  const unsupportedFinding: A11yFinding | undefined = unsupported.length > 0
    ? {
        id: "understandable.unsupported-description-prop",
        principle: "understandable",
        heuristic: "Descriptive text is connected to the rendered chart",
        critical: true,
        status: "warn",
        message: `Useful ${unsupported.join(" and ")} text was supplied, but ${unsupported.length === 1 ? "that prop is" : "those props are"} not supported by ${component}'s declared chart API and cannot be credited as rendered accessibility text.`,
        fix: "Use the component's declared title, description, and summary props when available; for richer generated description or navigation, use ChartContainer with chartConfig plus describe and/or navigable.",
      }
    : undefined

  return { hasTitle, hasDescription, hasSummary, unsupportedFinding }
}
