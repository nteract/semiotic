import * as React from "react"
import type { SentenceFilterChangeMeta, SentenceFilterDefinition, SentenceFilterOption, SentenceFilterPrimitive, SentenceFilterValue, SentenceFilterSelectDefinition, SentenceFilterMultiSelectDefinition, SentenceFilterToggleDefinition, SentenceFilterTextDefinition } from "./sentenceFilterTypes"
import { valuesEqual } from "./sentenceFilterValues"
import { nodeText } from "./controlText"
import { fieldStyle, optionStyle, visuallyHiddenStyle } from "./sentenceFilterStyles"

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
      const currentIndex = Number(event.currentTarget.getAttribute("data-sentence-filter-option-index") ?? activeIndex)
      if (event.key === "ArrowDown") next = nextEnabledIndex(options, currentIndex, 1)
      else if (event.key === "ArrowUp") next = nextEnabledIndex(options, currentIndex, -1)
      else if (event.key === "Home") next = nextEnabledIndex(options, -1, 1)
      else if (event.key === "End") next = nextEnabledIndex(options, 0, -1)
      else if (
        event.key.length === 1 &&
        event.key !== " " &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        const now = Date.now()
        const previous = typeaheadRef.current
        const query = `${now - previous.at > 600 ? "" : previous.value}${event.key}`.toLocaleLowerCase()
        typeaheadRef.current = { value: query, at: now }
        for (let offset = 1; offset <= options.length; offset += 1) {
          const index = (Math.max(currentIndex, -1) + offset) % options.length
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

export interface ControlProps {
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
      <span aria-hidden={option.count != null || undefined}>{option.label}</span>
      {option.count != null ? (
        <>
          <span aria-hidden="true">{option.count}</span>
          <span style={visuallyHiddenStyle}>{`${nodeText(option.label)}, ${option.count} results`}</span>
        </>
      ) : null}
      {option.description ? (
        <span style={{ display: "block", fontSize: "0.82em", opacity: 0.78 }}>
          {option.description}
        </span>
      ) : null}
    </>
  )
}

/** Shared option editing keeps keyboard, search, and selection behavior in sync. */
export function ChoiceControl({ value, definition, setValue, close }: ControlProps) {
  const choice = definition as SentenceFilterSelectDefinition | SentenceFilterMultiSelectDefinition | SentenceFilterToggleDefinition | SentenceFilterTextDefinition
  const toggle = choice.type === "toggle"
  const text = choice.type === "text"
  const multiple = choice.type === "multiselect"
  const searchable = (choice.type === "select" || multiple) && choice.searchable
  const currentValue = text ? typeof value === "string" ? value : "" : value
  const [query, setQuery] = React.useState("")
  const options = React.useMemo<SentenceFilterOption[]>(() => {
    if (choice.type === "toggle") {
      return [{ value: true, label: choice.trueLabel ?? "On" }, { value: false, label: choice.falseLabel ?? "Off" }]
    }
    return filterOptions(choice.type === "text" ? choice.suggestions ?? [] : choice.options, query)
  }, [choice, query])
  const selected = multiple && Array.isArray(value) ? value as SentenceFilterPrimitive[] : []
  const navigation = useOptionNavigation(options, multiple || text ? 0 : Math.max(
    0, options.findIndex((option) => valuesEqual(option.value, value as SentenceFilterPrimitive)),
  ))
  return (
    <>
      {text || searchable ? (
        <input
          data-sentence-filter-autofocus
          type={text ? "text" : "search"}
          aria-label={text ? choice.label : `Search ${choice.label}`}
          placeholder={choice.type === "text" ? choice.placeholder : undefined}
          value={text ? currentValue as string : query}
          onChange={(event) => {
            setQuery(event.currentTarget.value)
            if (text) setValue(event.currentTarget.value, "input")
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && (!text || options.length > 0)) {
              event.preventDefault()
              navigation.focusIndex(nextEnabledIndex(options, -1, 1))
            }
          }}
          style={fieldStyle}
        />
      ) : null}
      {!text || options.length > 0 ? (
        <span
          ref={navigation.listRef}
          role={multiple ? "group" : "listbox"}
          aria-label={text ? `${choice.label} suggestions` : choice.label}
          style={{ display: "flex", flexDirection: toggle ? undefined : "column", gap: toggle ? 4 : 2 }}
        >
          {options.map((option, index) => {
            const checked = multiple
              ? selected.some((item) => valuesEqual(item, option.value))
              : valuesEqual(option.value, currentValue as SentenceFilterPrimitive)
            const shared = {
              "data-sentence-filter-option-index": index,
              "data-sentence-filter-autofocus": !text && !searchable && index === navigation.activeIndex ? "" : undefined,
              tabIndex: index === navigation.activeIndex ? 0 : -1,
              disabled: option.disabled,
              onKeyDown: navigation.onKeyDown,
            }
            const key = `${String(option.value)}-${index}`
            return multiple ? (
              <label key={key} style={{ ...optionStyle, justifyContent: "flex-start", opacity: option.disabled ? 0.5 : 1 }}>
                <input
                  {...shared}
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => setValue((event.currentTarget.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => !valuesEqual(item, option.value))) as string[] | number[], "input")}
                />
                <span style={{ flex: 1 }}><OptionDetails option={option} /></span>
              </label>
            ) : (
              <button
                {...shared}
                key={key}
                type="button"
                role="option"
                aria-selected={checked}
                onClick={(event) => {
                  setValue(option.value, sourceFromClick(event))
                  close()
                }}
                style={{
                  ...optionStyle,
                  justifyContent: toggle ? "center" : "space-between",
                  backgroundColor: !text && checked
                    ? "var(--sentence-filter-hover-background, rgba(78, 121, 167, 0.12))"
                    : "transparent",
                  opacity: option.disabled ? 0.5 : 1,
                }}
              >
                {toggle ? option.label : <OptionDetails option={option} />}
              </button>
            )
          })}
          {multiple && options.length === 0 ? <span role="status">No options found.</span> : null}
        </span>
      ) : null}
      {!multiple && !text && options.length === 0 ? <span role="status">No options found.</span> : null}
    </>
  )
}
