import * as React from "react"
import { createControlObservationAdapter } from "./controlContract"
import type { SentenceFilterChangeMeta, SentenceFilterProps, SentenceFilterValue } from "./sentenceFilterTypes"
import { OBSERVATION_SOURCES, accessibleValue, isEmptyValue, numericObservation, parseSentenceFilterTemplate, visualValue } from "./sentenceFilterValues"
import { optionStyle, popoverStyle, visuallyHiddenStyle } from "./sentenceFilterStyles"
import { ChoiceControl, type ControlProps } from "./sentenceFilterOptions"
import { NumberControl, RangeControl } from "./sentenceFilterNumeric"
import { DEFAULT_POPOVER_LAYOUT, useSentenceFilterPopover } from "./useSentenceFilterPopover"
import { useSentenceFilterAnnouncement } from "./useSentenceFilterAnnouncement"
export type * from "./sentenceFilterTypes"

function DefaultControl(props: ControlProps) {
  switch (props.definition.type) {
    case "select":
    case "toggle":
    case "multiselect":
    case "text": return <ChoiceControl key={props.definition.type} {...props} />
    case "number": return <NumberControl {...props} />
    case "range": return <RangeControl {...props} />
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
  onObservation,
  chartId,
  chartType = "SentenceFilter",
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
  const openRef = React.useRef(open)
  openRef.current = open
  const rootRef = React.useRef<HTMLElement | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const { popoverLayout, setPopoverLayout } = useSentenceFilterPopover(open, rootRef, triggerRef)
  const warnedRef = React.useRef(new Set<string>())
  const { announcement, setAnnouncement, announce, flush } = useSentenceFilterAnnouncement()
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [focused, setFocused] = React.useState<number | null>(null)
  const reactId = React.useId().replace(/:/g, "")
  const baseId = id ?? `sentence-filter-${reactId}`

  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return
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
    setPopoverLayout(DEFAULT_POPOVER_LAYOUT)
    flush()
    onOpenChange?.(null)
    triggerRef.current?.focus()
  }, [flush, onOpenChange, setPopoverLayout])

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
    if (open && (disabled || readOnly || !definitions[open.key] || definitions[open.key].disabled || !segments.some((segment) => segment.type === "filter" && segment.key === open.key))) close()
  }, [close, definitions, disabled, open, readOnly, segments])

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
      const observation = onObservation ? numericObservation(definition, value) : null
      if (observation) {
        // Each committed value is a discrete change: start, change, and end.
        const observe = createControlObservationAdapter({
          controlType: observation.controlType,
          controlId: key,
          chartId,
          chartType,
          onObservation,
        })
        for (const phase of ["control-start", "control-change", "control-end"] as const) {
          observe(phase, observation.value, OBSERVATION_SOURCES[source])
        }
      }
      if (definition) {
        const before = accessibleValue(definition, previousValue, previousFilters)
        const after = accessibleValue(definition, value, nextFilters)
        announce(
          { key, label: definition.label, before, after },
          source === "input" && (definition.type === "number" || definition.type === "range" || definition.type === "text"),
        )
      }
    },
    [announce, controlled, definitions, onChange, onObservation, chartId, chartType],
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
      aria-label={As === "div" || As === "span" || (typeof As === "string" && /^h[1-6]$/.test(As)) ? ariaLabel ?? fullSentence : undefined}
      data-semiotic-control="sentence-filter"
      data-sentence-filter-state={controlled ? "controlled" : "uncontrolled"}
    >
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.value}</span>
        }
        const definition = definitions[segment.key]
        if (!definition) {
          return <span key={index}>{`{${segment.key}}`}</span>
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
              aria-controls={isOpen ? popoverId : undefined}
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
                setPopoverLayout(DEFAULT_POPOVER_LAYOUT)
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
                style={{
                  ...popoverStyle,
                  top: popoverLayout.placement === "below" ? "calc(100% + 0.5rem)" : "auto",
                  bottom: popoverLayout.placement === "above" ? "calc(100% + 0.5rem)" : "auto",
                  left: popoverLayout.offsetX,
                  maxHeight: popoverLayout.maxHeight ?? popoverStyle.maxHeight,
                  maxWidth: popoverLayout.maxWidth ?? popoverStyle.maxWidth,
                }}
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
