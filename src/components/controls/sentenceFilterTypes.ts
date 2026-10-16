import type * as React from "react"
import type { ControlObservationCallback } from "./controlContract"

export type SentenceFilterPrimitive = string | number | boolean | null

export type SentenceFilterValue =
  | SentenceFilterPrimitive
  | string[]
  | number[]
  | [number, number]

export interface SentenceFilterOption<T = SentenceFilterPrimitive> {
  value: T
  label: React.ReactNode
  description?: React.ReactNode
  count?: number
  disabled?: boolean
  keywords?: string[]
}

export interface SentenceFilterBaseDefinition<T = SentenceFilterValue> {
  label: string
  description?: string
  disabled?: boolean
  allowClear?: boolean
  emptyLabel?: React.ReactNode
  accent?: string
  formatValue?: (
    value: T,
    filters: Record<string, SentenceFilterValue>,
  ) => React.ReactNode
  getAccessibleValue?: (
    value: T,
    filters: Record<string, SentenceFilterValue>,
  ) => string
}

export interface SentenceFilterSelectDefinition
  extends SentenceFilterBaseDefinition {
  type: "select"
  options: SentenceFilterOption[]
  searchable?: boolean
}

export interface SentenceFilterMultiSelectDefinition
  extends SentenceFilterBaseDefinition {
  type: "multiselect"
  options: SentenceFilterOption[]
  searchable?: boolean
  conjunction?: "and" | "or"
}

export interface SentenceFilterNumberDefinition
  extends SentenceFilterBaseDefinition<number> {
  type: "number"
  min?: number
  max?: number
  step?: number
  inputMode?: "input" | "slider" | "both"
}

export interface SentenceFilterRangeDefinition
  extends SentenceFilterBaseDefinition<[number, number]> {
  type: "range"
  min: number
  max: number
  step?: number
}

export interface SentenceFilterToggleDefinition
  extends SentenceFilterBaseDefinition<boolean> {
  type: "toggle"
  trueLabel?: React.ReactNode
  falseLabel?: React.ReactNode
}

export interface SentenceFilterTextDefinition
  extends SentenceFilterBaseDefinition<string> {
  type: "text"
  suggestions?: SentenceFilterOption<string>[]
  placeholder?: string
}

export type SentenceFilterDefinition =
  | SentenceFilterSelectDefinition
  | SentenceFilterMultiSelectDefinition
  | SentenceFilterNumberDefinition
  | SentenceFilterRangeDefinition
  | SentenceFilterToggleDefinition
  | SentenceFilterTextDefinition

export interface SentenceFilterChangeMeta {
  key: string
  previousValue: SentenceFilterValue
  value: SentenceFilterValue
  source: "pointer" | "keyboard" | "input" | "clear" | "programmatic"
}

export interface SentenceFilterRenderContext {
  key: string
  value: SentenceFilterValue
  filters: Record<string, SentenceFilterValue>
  definition: SentenceFilterDefinition
  setValue: (
    value: SentenceFilterValue,
    source?: SentenceFilterChangeMeta["source"],
  ) => void
  close: () => void
}

export interface SentenceFilterProps {
  sentence: string
  /** Controlled filter values. */
  filters?: Record<string, SentenceFilterValue>
  /** Initial values for the optional uncontrolled form. */
  defaultFilters?: Record<string, SentenceFilterValue>
  definitions: Record<string, SentenceFilterDefinition>
  onChange?: (
    filters: Record<string, SentenceFilterValue>,
    meta: SentenceFilterChangeMeta,
  ) => void
  as?: React.ElementType
  className?: string
  style?: React.CSSProperties
  size?: "small" | "medium" | "large" | "inherit"
  align?: "start" | "center" | "end"
  wrap?: boolean
  disabled?: boolean
  readOnly?: boolean
  ariaLabel?: string
  id?: string
  renderControl?: (context: SentenceFilterRenderContext) => React.ReactNode
  onOpenChange?: (key: string | null) => void
  /**
   * Receives `semiotic/controls` observations for `number` and `range`
   * filters: `control-start`, `control-change`, and `control-end` for each
   * committed value, with `controlType` `"value"` (number) or
   * `"range-boundary"` (range) and `controlId` set to the filter key. Other
   * filter types have no numeric value and emit none.
   */
  onObservation?: ControlObservationCallback
  /** Chart the filters drive, carried on observations. */
  chartId?: string
  /** Observation `chartType`. @default "SentenceFilter" */
  chartType?: string
}

