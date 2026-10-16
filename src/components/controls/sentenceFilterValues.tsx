import * as React from "react"
import { nodeText } from "./controlText"
import type { ControlInputSource, VisualizationControlType, VisualizationControlValue } from "./controlContract"
import type { SentenceFilterChangeMeta, SentenceFilterDefinition, SentenceFilterOption, SentenceFilterPrimitive, SentenceFilterValue } from "./sentenceFilterTypes"

export const OBSERVATION_SOURCES: Partial<Record<SentenceFilterChangeMeta["source"], ControlInputSource>> = {
  pointer: "pointer",
  keyboard: "keyboard",
  programmatic: "programmatic",
}

/** The contract value and type for a numeric filter change, else null. */
export function numericObservation(
  definition: SentenceFilterDefinition | undefined,
  value: SentenceFilterValue,
): { controlType: VisualizationControlType; value: VisualizationControlValue } | null {
  if (definition?.type === "number" && typeof value === "number" && Number.isFinite(value)) {
    return { controlType: "value", value }
  }
  if (
    definition?.type === "range" &&
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((part) => typeof part === "number" && Number.isFinite(part))
  ) {
    return { controlType: "range-boundary", value: [value[0] as number, value[1] as number] }
  }
  return null
}

type SentenceFilterTemplateSegment =
  | { type: "text"; value: string }
  | { type: "filter"; key: string }

/** Parse placeholders while preserving whitespace, punctuation, and escaped braces. */
export function parseSentenceFilterTemplate(
  sentence: string,
): SentenceFilterTemplateSegment[] {
  const segments: SentenceFilterTemplateSegment[] = []
  let text = ""
  const flushText = () => {
    if (!text) return
    const previous = segments[segments.length - 1]
    if (previous?.type === "text") previous.value += text
    else segments.push({ type: "text", value: text })
    text = ""
  }

  for (let index = 0; index < sentence.length; ) {
    if (sentence.startsWith("{{", index)) {
      text += "{"
      index += 2
      continue
    }
    if (sentence.startsWith("}}", index)) {
      text += "}"
      index += 2
      continue
    }
    if (sentence[index] === "{") {
      const end = sentence.indexOf("}", index + 1)
      if (end !== -1) {
        const key = sentence.slice(index + 1, end)
        if (key.length > 0 && !key.includes("{")) {
          flushText()
          segments.push({ type: "filter", key })
          index = end + 1
          continue
        }
      }
    }
    text += sentence[index]
    index += 1
  }
  flushText()
  return segments
}

export function valuesEqual(a: SentenceFilterPrimitive, b: SentenceFilterPrimitive) {
  return Object.is(a, b)
}

function optionForValue(
  options: SentenceFilterOption[],
  value: SentenceFilterPrimitive,
) {
  return options.find((option) => valuesEqual(option.value, value))
}

export function isEmptyValue(value: SentenceFilterValue | undefined): boolean {
  return value == null || value === "" || (Array.isArray(value) && value.length === 0)
}

function defaultVisualValue(
  definition: SentenceFilterDefinition,
  value: SentenceFilterValue | undefined,
): React.ReactNode {
  if (isEmptyValue(value)) return definition.emptyLabel ?? "Any"
  if (definition.type === "select") {
    return optionForValue(definition.options, value as SentenceFilterPrimitive)?.label ?? String(value)
  }
  if (definition.type === "multiselect") {
    const values = value as SentenceFilterPrimitive[]
    const labels = values.map(
      (item) => optionForValue(definition.options, item)?.label ?? String(item),
    )
    const separator = definition.conjunction === "or" ? " or " : " and "
    return labels.map((label, index) => (
      <React.Fragment key={index}>
        {index > 0 ? separator : null}
        {label}
      </React.Fragment>
    ))
  }
  if (definition.type === "toggle") {
    return value ? definition.trueLabel ?? "on" : definition.falseLabel ?? "off"
  }
  if (definition.type === "range") {
    const range = value as [number, number]
    return `${range[0]} to ${range[1]}`
  }
  return String(value)
}

export function visualValue(
  definition: SentenceFilterDefinition,
  value: SentenceFilterValue | undefined,
  filters: Record<string, SentenceFilterValue>,
): React.ReactNode {
  if (isEmptyValue(value)) return definition.emptyLabel ?? "Any"
  if (definition.formatValue) {
    return definition.formatValue(value as never, filters)
  }
  return defaultVisualValue(definition, value)
}

export function accessibleValue(
  definition: SentenceFilterDefinition,
  value: SentenceFilterValue | undefined,
  filters: Record<string, SentenceFilterValue>,
): string {
  if (isEmptyValue(value)) return nodeText(definition.emptyLabel ?? "Any")
  if (definition.getAccessibleValue) {
    return definition.getAccessibleValue(value as never, filters)
  }
  return nodeText(defaultVisualValue(definition, value)) || String(value)
}

