import * as React from "react"

// file-size-limit: allow — public types and six accessible editors stay colocated by design

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

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
}

type SentenceFilterTemplateSegment =
  | { type: "text"; value: string }
  | { type: "filter"; key: string }

/** Parse placeholders while preserving whitespace, punctuation, and escaped braces. */
function parseSentenceFilterTemplate(
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

const visuallyHiddenStyle: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
}

const popoverStyle: React.CSSProperties = {
  position: "absolute",
  zIndex: 30,
  top: "calc(100% + 0.5rem)",
  left: 0,
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  width: "var(--sentence-filter-popover-width, 18rem)",
  maxWidth: "min(22rem, calc(100vw - 2rem))",
  maxHeight: "min(24rem, calc(100vh - 2rem))",
  overflow: "auto",
  padding: 12,
  color: "var(--sentence-filter-text-color, var(--semiotic-fg, #1f2933))",
  backgroundColor: "var(--semiotic-bg, #fff)",
  border: "1px solid var(--semiotic-border, #cbd5e1)",
  borderRadius: 6,
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
  fontFamily: "inherit",
  fontSize: "1rem",
  fontWeight: 400,
  lineHeight: 1.4,
  textAlign: "left",
  whiteSpace: "normal",
}

const fieldStyle: React.CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  minHeight: 38,
  padding: "6px 8px",
  color: "inherit",
  backgroundColor: "var(--semiotic-bg, #fff)",
  border: "1px solid var(--semiotic-border, #94a3b8)",
  borderRadius: 4,
  font: "inherit",
}

const optionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
  minHeight: 38,
  padding: "7px 8px",
  color: "inherit",
  backgroundColor: "transparent",
  border: 0,
  borderRadius: 4,
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
}

function nodeText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join("")
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return nodeText(node.props.children)
  }
  return ""
}

function valuesEqual(a: SentenceFilterPrimitive, b: SentenceFilterPrimitive) {
  return Object.is(a, b)
}

function optionForValue(
  options: SentenceFilterOption[],
  value: SentenceFilterPrimitive,
) {
  return options.find((option) => valuesEqual(option.value, value))
}

function isEmptyValue(value: SentenceFilterValue | undefined): boolean {
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

function visualValue(
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

function accessibleValue(
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

function sourceFromClick(event: React.MouseEvent): "pointer" | "keyboard" {
  return event.detail === 0 ? "keyboard" : "pointer"
}

function filterOptions<T extends SentenceFilterOption>(options: T[], query: string): T[] {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return options
  return options.filter((option) => {
    const terms = [nodeText(option.label), ...(option.keywords ?? [])]
    return terms.some((term) => term.toLocaleLowerCase().includes(normalized))
  })
}

function nextEnabledIndex(
  options: SentenceFilterOption[],
  from: number,
  direction: 1 | -1,
): number {
  if (options.length === 0) return -1
  for (let step = 1; step <= options.length; step += 1) {
    const index = (from + direction * step + options.length) % options.length
    if (!options[index].disabled) return index
  }
  return -1
}

function useOptionNavigation(options: SentenceFilterOption[], initialIndex = 0) {
  const [activeIndex, setActiveIndex] = React.useState(() => {
    if (options[initialIndex] && !options[initialIndex].disabled) return initialIndex
    return nextEnabledIndex(options, -1, 1)
  })
  const listRef = React.useRef<HTMLElement>(null)
  const typeaheadRef = React.useRef({ value: "", at: 0 })

  React.useEffect(() => {
    if (activeIndex >= 0 && options[activeIndex] && !options[activeIndex].disabled) return
    setActiveIndex(nextEnabledIndex(options, -1, 1))
  }, [activeIndex, options])

  const focusIndex = React.useCallback((index: number) => {
    if (index < 0) return
    setActiveIndex(index)
    listRef.current
      ?.querySelector<HTMLElement>(`[data-sentence-filter-option-index="${index}"]`)
      ?.focus()
  }, [])

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      let next = -1
      if (event.key === "ArrowDown") next = nextEnabledIndex(options, activeIndex, 1)
      else if (event.key === "ArrowUp") next = nextEnabledIndex(options, activeIndex, -1)
      else if (event.key === "Home") next = nextEnabledIndex(options, -1, 1)
      else if (event.key === "End") next = nextEnabledIndex(options, 0, -1)
      else if (
        event.key.length === 1 &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        const now = Date.now()
        const previous = typeaheadRef.current
        const query = `${now - previous.at > 600 ? "" : previous.value}${event.key}`.toLocaleLowerCase()
        typeaheadRef.current = { value: query, at: now }
        for (let offset = 1; offset <= options.length; offset += 1) {
          const index = (Math.max(activeIndex, -1) + offset) % options.length
          const option = options[index]
          const terms = [nodeText(option.label), ...(option.keywords ?? [])]
          if (!option.disabled && terms.some((term) => term.toLocaleLowerCase().startsWith(query))) {
            next = index
            break
          }
        }
      }
      if (next < 0) return
      event.preventDefault()
      focusIndex(next)
    },
    [activeIndex, focusIndex, options],
  )

  return { activeIndex, focusIndex, listRef, onKeyDown }
}

interface ControlProps {
  value: SentenceFilterValue
  definition: SentenceFilterDefinition
  setValue: (
    value: SentenceFilterValue,
    source: SentenceFilterChangeMeta["source"],
  ) => void
  close: () => void
}

function OptionDetails({ option }: { option: SentenceFilterOption }) {
  return (
    <>
      <span>{option.label}</span>
      {option.count != null ? (
        <span aria-label={`${option.count} results`}>{option.count}</span>
      ) : null}
      {option.description ? (
        <span style={{ display: "block", fontSize: "0.82em", opacity: 0.78 }}>
          {option.description}
        </span>
      ) : null}
    </>
  )
}

function SelectControl({ value, definition, setValue, close }: ControlProps) {
  const select = definition as SentenceFilterSelectDefinition
  const [query, setQuery] = React.useState("")
  const options = React.useMemo(
    () => filterOptions(select.options, query),
    [query, select.options],
  )
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => valuesEqual(option.value, value as SentenceFilterPrimitive)),
  )
  const navigation = useOptionNavigation(options, selectedIndex)
  return (
    <>
      {select.searchable ? (
        <input
          data-sentence-filter-autofocus
          type="search"
          aria-label={`Search ${select.label}`}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              navigation.focusIndex(nextEnabledIndex(options, -1, 1))
            }
          }}
          style={fieldStyle}
        />
      ) : null}
      <span
        ref={navigation.listRef}
        role="listbox"
        aria-label={select.label}
        style={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        {options.map((option, index) => (
          <button
            key={`${String(option.value)}-${index}`}
            data-sentence-filter-option-index={index}
            data-sentence-filter-autofocus={!select.searchable && index === navigation.activeIndex ? "" : undefined}
            type="button"
            role="option"
            aria-selected={valuesEqual(option.value, value as SentenceFilterPrimitive)}
            tabIndex={index === navigation.activeIndex ? 0 : -1}
            disabled={option.disabled}
            onKeyDown={navigation.onKeyDown}
            onClick={(event) => {
              setValue(option.value, sourceFromClick(event))
              close()
            }}
            style={{
              ...optionStyle,
              backgroundColor: valuesEqual(option.value, value as SentenceFilterPrimitive)
                ? "var(--sentence-filter-hover-background, rgba(78, 121, 167, 0.12))"
                : "transparent",
              opacity: option.disabled ? 0.5 : 1,
            }}
          >
            <OptionDetails option={option} />
          </button>
        ))}
        {options.length === 0 ? <span role="status">No options found.</span> : null}
      </span>
    </>
  )
}

function MultiSelectControl({ value, definition, setValue }: ControlProps) {
  const multiselect = definition as SentenceFilterMultiSelectDefinition
  const [query, setQuery] = React.useState("")
  const options = React.useMemo(
    () => filterOptions(multiselect.options, query),
    [multiselect.options, query],
  )
  const selected = Array.isArray(value) ? (value as SentenceFilterPrimitive[]) : []
  const navigation = useOptionNavigation(options)
  return (
    <>
      {multiselect.searchable ? (
        <input
          data-sentence-filter-autofocus
          type="search"
          aria-label={`Search ${multiselect.label}`}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              navigation.focusIndex(nextEnabledIndex(options, -1, 1))
            }
          }}
          style={fieldStyle}
        />
      ) : null}
      <span
        ref={navigation.listRef}
        role="group"
        aria-label={multiselect.label}
        style={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        {options.map((option, index) => {
          const checked = selected.some((item) => valuesEqual(item, option.value))
          return (
            <label
              key={`${String(option.value)}-${index}`}
              style={{
                ...optionStyle,
                justifyContent: "flex-start",
                opacity: option.disabled ? 0.5 : 1,
              }}
            >
              <input
                data-sentence-filter-option-index={index}
                data-sentence-filter-autofocus={!multiselect.searchable && index === navigation.activeIndex ? "" : undefined}
                type="checkbox"
                checked={checked}
                disabled={option.disabled}
                tabIndex={index === navigation.activeIndex ? 0 : -1}
                onKeyDown={navigation.onKeyDown}
                onChange={(event) => {
                  const next = event.currentTarget.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => !valuesEqual(item, option.value))
                  setValue(next as string[] | number[], "input")
                }}
              />
              <span style={{ flex: 1 }}><OptionDetails option={option} /></span>
            </label>
          )
        })}
        {options.length === 0 ? <span role="status">No options found.</span> : null}
      </span>
    </>
  )
}

function NumberControl({ value, definition, setValue }: ControlProps) {
  const number = definition as SentenceFilterNumberDefinition
  const mode = number.inputMode ?? "input"
  const numericValue = typeof value === "number" ? value : number.min ?? 0
  const shared = {
    min: number.min,
    max: number.max,
    step: number.step ?? 1,
    value: numericValue,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.currentTarget.valueAsNumber
      if (Number.isFinite(next)) setValue(next, "input")
    },
  }
  return (
    <>
      {mode !== "slider" ? (
        <input
          {...shared}
          data-sentence-filter-autofocus
          type="number"
          aria-label={number.label}
          style={fieldStyle}
        />
      ) : null}
      {mode !== "input" ? (
        <input
          {...shared}
          data-sentence-filter-autofocus={mode === "slider" ? "" : undefined}
          type="range"
          aria-label={number.label}
          style={{ width: "100%" }}
        />
      ) : null}
    </>
  )
}

function RangeControl({ value, definition, setValue }: ControlProps) {
  const range = definition as SentenceFilterRangeDefinition
  const current = Array.isArray(value) && value.length >= 2
    ? [Number(value[0]), Number(value[1])] as [number, number]
    : [range.min, range.max] as [number, number]
  const update = (part: 0 | 1, next: number) => {
    if (!Number.isFinite(next)) return
    const bounded = Math.min(range.max, Math.max(range.min, next))
    setValue(
      part === 0
        ? [Math.min(bounded, current[1]), current[1]]
        : [current[0], Math.max(bounded, current[0])],
      "input",
    )
  }
  const inputProps = { min: range.min, max: range.max, step: range.step ?? 1 }
  return (
    <>
      <span style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label>
          <span>Minimum</span>
          <input
            {...inputProps}
            data-sentence-filter-autofocus
            type="number"
            value={current[0]}
            onChange={(event) => update(0, event.currentTarget.valueAsNumber)}
            style={fieldStyle}
          />
        </label>
        <label>
          <span>Maximum</span>
          <input
            {...inputProps}
            type="number"
            value={current[1]}
            onChange={(event) => update(1, event.currentTarget.valueAsNumber)}
            style={fieldStyle}
          />
        </label>
      </span>
      <label>
        <span style={visuallyHiddenStyle}>Minimum {range.label}</span>
        <input
          {...inputProps}
          type="range"
          value={current[0]}
          onChange={(event) => update(0, event.currentTarget.valueAsNumber)}
          style={{ width: "100%" }}
        />
      </label>
      <label>
        <span style={visuallyHiddenStyle}>Maximum {range.label}</span>
        <input
          {...inputProps}
          type="range"
          value={current[1]}
          onChange={(event) => update(1, event.currentTarget.valueAsNumber)}
          style={{ width: "100%" }}
        />
      </label>
    </>
  )
}

function ToggleControl({ value, definition, setValue, close }: ControlProps) {
  const toggle = definition as SentenceFilterToggleDefinition
  const choices = [
    { value: true, label: toggle.trueLabel ?? "On" },
    { value: false, label: toggle.falseLabel ?? "Off" },
  ]
  const options = choices.map((choice) => ({ ...choice }))
  const selectedIndex = value === false ? 1 : 0
  const navigation = useOptionNavigation(options, selectedIndex)
  return (
    <span
      ref={navigation.listRef}
      role="listbox"
      aria-label={toggle.label}
      style={{ display: "flex", gap: 4 }}
    >
      {choices.map((choice, index) => (
        <button
          key={String(choice.value)}
          data-sentence-filter-option-index={index}
          data-sentence-filter-autofocus={index === navigation.activeIndex ? "" : undefined}
          type="button"
          role="option"
          aria-selected={value === choice.value}
          tabIndex={index === navigation.activeIndex ? 0 : -1}
          onKeyDown={navigation.onKeyDown}
          onClick={(event) => {
            setValue(choice.value, sourceFromClick(event))
            close()
          }}
          style={{
            ...optionStyle,
            justifyContent: "center",
            backgroundColor: value === choice.value
              ? "var(--sentence-filter-hover-background, rgba(78, 121, 167, 0.12))"
              : "transparent",
          }}
        >
          {choice.label}
        </button>
      ))}
    </span>
  )
}

function TextControl({ value, definition, setValue, close }: ControlProps) {
  const text = definition as SentenceFilterTextDefinition
  const stringValue = typeof value === "string" ? value : ""
  const [query, setQuery] = React.useState("")
  const suggestions = React.useMemo(
    () => filterOptions(text.suggestions ?? [], query),
    [query, text.suggestions],
  )
  const navigation = useOptionNavigation(suggestions)
  return (
    <>
      <input
        data-sentence-filter-autofocus
        type="text"
        aria-label={text.label}
        placeholder={text.placeholder}
        value={stringValue}
        onChange={(event) => {
          setQuery(event.currentTarget.value)
          setValue(event.currentTarget.value, "input")
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && suggestions.length > 0) {
            event.preventDefault()
            navigation.focusIndex(nextEnabledIndex(suggestions, -1, 1))
          }
        }}
        style={fieldStyle}
      />
      {suggestions.length > 0 ? (
        <span
          ref={navigation.listRef}
          role="listbox"
          aria-label={`${text.label} suggestions`}
          style={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          {suggestions.map((option, index) => (
            <button
              key={`${option.value}-${index}`}
              data-sentence-filter-option-index={index}
              type="button"
              role="option"
              aria-selected={option.value === stringValue}
              disabled={option.disabled}
              tabIndex={index === navigation.activeIndex ? 0 : -1}
              onKeyDown={navigation.onKeyDown}
              onClick={(event) => {
                setValue(option.value, sourceFromClick(event))
                close()
              }}
              style={{ ...optionStyle, opacity: option.disabled ? 0.5 : 1 }}
            >
              <OptionDetails option={option} />
            </button>
          ))}
        </span>
      ) : null}
    </>
  )
}

function DefaultControl(props: ControlProps) {
  switch (props.definition.type) {
    case "select": return <SelectControl {...props} />
    case "multiselect": return <MultiSelectControl {...props} />
    case "number": return <NumberControl {...props} />
    case "range": return <RangeControl {...props} />
    case "toggle": return <ToggleControl {...props} />
    case "text": return <TextControl {...props} />
  }
}

/**
 * An editorial, natural-language filter control. Values are native inline
 * buttons and their editors open in an accessible non-modal dialog.
 */
export function SentenceFilter({
  sentence,
  filters: controlledFilters,
  defaultFilters,
  definitions,
  onChange,
  as: As = "div",
  className,
  style,
  size = "inherit",
  align = "start",
  wrap = true,
  disabled = false,
  readOnly = false,
  ariaLabel,
  id,
  renderControl,
  onOpenChange,
}: SentenceFilterProps): React.ReactElement {
  const [uncontrolledFilters, setUncontrolledFilters] = React.useState<
    Record<string, SentenceFilterValue>
  >(() => ({ ...(defaultFilters ?? {}) }))
  const filters = controlledFilters ?? uncontrolledFilters
  const filtersRef = React.useRef(filters)
  filtersRef.current = filters
  const controlled = controlledFilters !== undefined
  const segments = React.useMemo(
    () => parseSentenceFilterTemplate(sentence),
    [sentence],
  )
  const [open, setOpen] = React.useState<{ key: string; occurrence: number } | null>(null)
  const [popoverOffset, setPopoverOffset] = React.useState(0)
  const openRef = React.useRef(open)
  openRef.current = open
  const rootRef = React.useRef<HTMLElement | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const warnedRef = React.useRef(new Set<string>())
  const [announcement, setAnnouncement] = React.useState("")
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [focused, setFocused] = React.useState<number | null>(null)
  const reactId = React.useId().replace(/:/g, "")
  const baseId = id ?? `sentence-filter-${reactId}`

  React.useEffect(() => {
    if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") return
    for (const segment of segments) {
      if (segment.type !== "filter") continue
      let warning: string | null = null
      if (!definitions[segment.key]) {
        warning = `SentenceFilter: placeholder "{${segment.key}}" has no matching definition.`
      } else if (!(segment.key in filters)) {
        warning = `SentenceFilter: placeholder "{${segment.key}}" has no matching filter value.`
      }
      if (warning && !warnedRef.current.has(warning)) {
        warnedRef.current.add(warning)
        console.warn(warning)
      }
    }
  }, [definitions, filters, segments])

  const close = React.useCallback(() => {
    if (!openRef.current) return
    openRef.current = null
    setOpen(null)
    setPopoverOffset(0)
    onOpenChange?.(null)
    triggerRef.current?.focus()
  }, [onOpenChange])

  React.useEffect(() => {
    if (!open) return
    const onOutside = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        close()
      }
    }
    document.addEventListener("mousedown", onOutside)
    document.addEventListener("touchstart", onOutside)
    document.addEventListener("click", onOutside)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onOutside)
      document.removeEventListener("touchstart", onOutside)
      document.removeEventListener("click", onOutside)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [close, open])

  useIsomorphicLayoutEffect(() => {
    if (!open || typeof window === "undefined") return
    const popover = rootRef.current?.querySelector<HTMLElement>(
      `[data-sentence-filter-popover="${open.occurrence}"]`,
    )
    if (!popover) return

    const keepInsideViewport = () => {
      const gutter = 16
      const bounds = popover.getBoundingClientRect()
      if (bounds.width <= 0) return
      let correction = 0
      if (bounds.right > window.innerWidth - gutter) {
        correction -= bounds.right - (window.innerWidth - gutter)
      }
      if (bounds.left + correction < gutter) {
        correction += gutter - (bounds.left + correction)
      }
      if (Math.abs(correction) > 0.5) {
        setPopoverOffset((current) => current + correction)
      }
    }

    keepInsideViewport()
    window.addEventListener("resize", keepInsideViewport)
    return () => window.removeEventListener("resize", keepInsideViewport)
  }, [open, popoverOffset])

  React.useEffect(() => {
    if (!open) return
    const popover = rootRef.current?.querySelector<HTMLElement>(
      `[data-sentence-filter-popover="${open.occurrence}"]`,
    )
    const focusTarget = popover?.querySelector<HTMLElement>(
      "[data-sentence-filter-autofocus]",
    ) ?? popover
    focusTarget?.focus()
  }, [open])

  React.useEffect(() => {
    if (open && (disabled || readOnly || definitions[open.key]?.disabled)) close()
  }, [close, definitions, disabled, open, readOnly])

  const setValue = React.useCallback(
    (
      key: string,
      value: SentenceFilterValue,
      source: SentenceFilterChangeMeta["source"],
    ) => {
      const previousFilters = filtersRef.current
      const previousValue = previousFilters[key] ?? null
      const nextFilters = { ...previousFilters, [key]: value }
      if (!controlled) {
        filtersRef.current = nextFilters
        setUncontrolledFilters(nextFilters)
      }
      const meta: SentenceFilterChangeMeta = { key, previousValue, value, source }
      onChange?.(nextFilters, meta)
      const definition = definitions[key]
      if (definition) {
        const before = accessibleValue(definition, previousValue, previousFilters)
        const after = accessibleValue(definition, value, nextFilters)
        setAnnouncement(`${definition.label} changed from ${before} to ${after}.`)
      }
    },
    [controlled, definitions, onChange],
  )

  const fullSentence = React.useMemo(
    () => segments.map((segment) => {
      if (segment.type === "text") return segment.value
      const definition = definitions[segment.key]
      if (!definition) return `{${segment.key}}`
      return accessibleValue(definition, filters[segment.key], filters)
    }).join(""),
    [definitions, filters, segments],
  )

  const sizeStyle: React.CSSProperties["fontSize"] =
    size === "small" ? "0.875rem"
      : size === "medium" ? "1rem"
        : size === "large" ? "1.5rem"
          : "inherit"
  const rootStyle: React.CSSProperties = {
    position: "relative",
    margin: 0,
    color: "var(--sentence-filter-text-color, inherit)",
    fontFamily: "inherit",
    fontSize: sizeStyle,
    lineHeight: "inherit",
    textAlign: align === "start" ? "start" : align === "end" ? "end" : "center",
    whiteSpace: wrap ? "normal" : "nowrap",
    ...style,
  }
  const classes = ["semiotic-sentence-filter", className].filter(Boolean).join(" ")
  let occurrence = 0

  return (
    <As
      ref={(node: HTMLElement | null) => { rootRef.current = node }}
      id={baseId}
      className={classes}
      style={rootStyle}
      role={As === "div" || As === "span" ? "group" : undefined}
      aria-label={ariaLabel ?? fullSentence}
      data-semiotic-control="sentence-filter"
      data-sentence-filter-state={controlled ? "controlled" : "uncontrolled"}
    >
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index} aria-hidden="true">{segment.value}</span>
        }
        const definition = definitions[segment.key]
        if (!definition) {
          return <span key={index} aria-hidden="true">{`{${segment.key}}`}</span>
        }
        const currentOccurrence = occurrence
        occurrence += 1
        const value = filters[segment.key] ?? null
        const shown = visualValue(definition, value, filters)
        const spoken = accessibleValue(definition, value, filters)
        const isOpen = open?.key === segment.key && open.occurrence === currentOccurrence
        const unavailable = disabled || readOnly || Boolean(definition.disabled)
        const safeKey = segment.key.replace(/[^a-zA-Z0-9_-]/g, "-")
        const popoverId = `${baseId}-${safeKey}-${currentOccurrence}-popover`
        const accent = definition.accent ?? "var(--sentence-filter-accent, var(--semiotic-primary, #4e79a7))"
        return (
          <span
            key={`${segment.key}-${currentOccurrence}`}
            className="semiotic-sentence-filter__value"
            style={{ position: "relative", display: "inline" }}
          >
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isOpen}
              aria-controls={popoverId}
              aria-label={`${definition.label}: ${spoken}. Activate to change.`}
              disabled={unavailable}
              data-sentence-filter-key={segment.key}
              data-sentence-filter-type={definition.type}
              data-sentence-filter-open={isOpen || undefined}
              onMouseEnter={() => setHovered(currentOccurrence)}
              onMouseLeave={() => setHovered((value) => value === currentOccurrence ? null : value)}
              onFocus={() => setFocused(currentOccurrence)}
              onBlur={() => setFocused((value) => value === currentOccurrence ? null : value)}
              onClick={(event) => {
                if (unavailable) return
                if (isOpen) {
                  close()
                  return
                }
                triggerRef.current = event.currentTarget
                const nextOpen = { key: segment.key, occurrence: currentOccurrence }
                openRef.current = nextOpen
                setPopoverOffset(0)
                setOpen(nextOpen)
                setAnnouncement(`${definition.label} control opened.`)
                onOpenChange?.(segment.key)
              }}
              style={{
                appearance: "none",
                display: "inline",
                minWidth: 24,
                padding: "0.35em 0.12em",
                margin: "-0.35em 0",
                color: accent,
                backgroundColor: hovered === currentOccurrence || isOpen
                  ? "var(--sentence-filter-hover-background, rgba(78, 121, 167, 0.12))"
                  : "transparent",
                border: 0,
                borderBottom: "var(--sentence-filter-underline-thickness, 0.09em) solid currentColor",
                borderRadius: 2,
                outline: focused === currentOccurrence
                  ? "2px solid var(--sentence-filter-focus-color, currentColor)"
                  : "2px solid transparent",
                outlineOffset: 2,
                font: "inherit",
                fontWeight: 600,
                lineHeight: "inherit",
                textAlign: "inherit",
                cursor: unavailable ? "default" : "pointer",
                opacity: unavailable ? 0.6 : 1,
              }}
            >
              {shown}
            </button>
            {isOpen ? (
              <span
                id={popoverId}
                role="dialog"
                aria-label={definition.label}
                aria-describedby={definition.description ? `${popoverId}-description` : undefined}
                tabIndex={-1}
                data-sentence-filter-popover={currentOccurrence}
                data-sentence-filter-key={segment.key}
                style={{ ...popoverStyle, left: popoverOffset }}
              >
                <span style={{ fontWeight: 650 }}>{definition.label}</span>
                {definition.description ? (
                  <span id={`${popoverId}-description`} style={{ fontSize: "0.88em", opacity: 0.78 }}>
                    {definition.description}
                  </span>
                ) : null}
                {renderControl ? renderControl({
                  key: segment.key,
                  value,
                  filters,
                  definition,
                  setValue: (next, source = "programmatic") => setValue(segment.key, next, source),
                  close,
                }) : (
                  <DefaultControl
                    value={value}
                    definition={definition}
                    setValue={(next, source) => setValue(segment.key, next, source)}
                    close={close}
                  />
                )}
                {definition.allowClear && !isEmptyValue(value) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const empty = definition.type === "multiselect" ? [] : null
                      setValue(segment.key, empty, "clear")
                      close()
                    }}
                    style={{ ...optionStyle, justifyContent: "center", border: "1px solid var(--semiotic-border, #cbd5e1)" }}
                  >
                    Clear {definition.label}
                  </button>
                ) : null}
              </span>
            ) : null}
          </span>
        )
      })}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-sentence-filter-live-region
        style={visuallyHiddenStyle}
      >
        {announcement}
      </span>
    </As>
  )
}

export default SentenceFilter
