import * as React from "react"

import type { GradientLegendConfig, LegendItem } from "./types/legendTypes"
import {
  GRADIENT_LEGEND_LABEL_BASELINE,
  GRADIENT_LEGEND_LABELED_BAR_Y
} from "./legendLayout"

export interface GradientLegendProps {
  config: GradientLegendConfig
  orientation?: "vertical" | "horizontal"
  width?: number
  customClickBehavior?: (item: LegendItem) => void
  customHoverBehavior?: (item: LegendItem | null) => void
  highlightedCategory?: string | null
  isolatedCategories?: Set<string>
  legendInteraction?: string
}

/** Gradient legend for continuous/sequential color scales. */
export function GradientLegend({
  config,
  orientation = "vertical",
  width = 100,
  customClickBehavior,
  customHoverBehavior,
  highlightedCategory,
  isolatedCategories,
  legendInteraction
}: GradientLegendProps) {
  const { colorFn, domain, label, format } = config
  const formatValue =
    format || ((value: number) => String(Math.round(value * 100) / 100))
  const steps = 64
  const reactId = React.useId()
  const gradientId = `grad-legend-${reactId}`
  const binCount = 5
  const interactive = !!(customClickBehavior || customHoverBehavior)
  const isolateMode =
    legendInteraction === "isolate" ||
    (legendInteraction === undefined && isolatedCategories != null)
  const [rovingIndex, setRovingIndex] = React.useState(0)
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null)
  const binRefs = React.useRef<Array<SVGRectElement | null>>([])

  const rangeItem = (index: number, reverse = false): LegendItem => {
    const visualIndex = reverse ? binCount - index - 1 : index
    const start = domain[0] + (visualIndex / binCount) * (domain[1] - domain[0])
    const end =
      domain[0] + ((visualIndex + 1) / binCount) * (domain[1] - domain[0])
    return {
      label: `${formatValue(start)} – ${formatValue(end)}`,
      valueRange: [start, end],
      interactionKey: `${start}:${end}`
    }
  }

  const interactionRegion = (
    item: LegendItem,
    geometry: { x: number; y: number; width: number; height: number },
    index: number
  ) => {
    const itemKey =
      typeof item.interactionKey === "string" ? item.interactionKey : item.label
    const isolated = isolatedCategories?.has(itemKey) ?? false
    const highlighted = highlightedCategory === itemKey
    const focused = focusedIndex === index
    const dimmed =
      (isolatedCategories?.size && !isolated) ||
      (highlightedCategory != null && !highlighted)
    const moveFocus = (nextIndex: number) => {
      const wrappedIndex = (nextIndex + binCount) % binCount
      setRovingIndex(wrappedIndex)
      binRefs.current[wrappedIndex]?.focus()
    }

    return (
      <rect
        ref={(node) => {
          binRefs.current[index] = node
        }}
        key={`gradient-interaction-${index}`}
        className="semiotic-gradient-legend-bin"
        {...geometry}
        fill={dimmed ? "rgba(255,255,255,0.65)" : "transparent"}
        stroke={
          focused || isolated || highlighted
            ? "var(--semiotic-focus, #005fcc)"
            : "transparent"
        }
        strokeWidth={focused ? 3 : 2}
        tabIndex={index === rovingIndex ? 0 : -1}
        role="option"
        aria-label={item.label}
        aria-selected={isolateMode ? isolated : undefined}
        aria-current={!isolateMode && highlighted ? true : undefined}
        onClick={
          customClickBehavior ? () => customClickBehavior(item) : undefined
        }
        onMouseEnter={
          customHoverBehavior ? () => customHoverBehavior(item) : undefined
        }
        onMouseLeave={
          customHoverBehavior ? () => customHoverBehavior(null) : undefined
        }
        onFocus={() => {
          setRovingIndex(index)
          setFocusedIndex(index)
          customHoverBehavior?.(item)
        }}
        onBlur={() => {
          setFocusedIndex(null)
          customHoverBehavior?.(null)
        }}
        onKeyDown={(event: React.KeyboardEvent<SVGRectElement>) => {
          if (
            (event.key === "Enter" || event.key === " ") &&
            customClickBehavior
          ) {
            event.preventDefault()
            customClickBehavior(item)
            return
          }
          const previousKey =
            orientation === "horizontal" ? "ArrowLeft" : "ArrowUp"
          const nextKey =
            orientation === "horizontal" ? "ArrowRight" : "ArrowDown"
          if (event.key === previousKey || event.key === nextKey) {
            event.preventDefault()
            moveFocus(index + (event.key === nextKey ? 1 : -1))
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault()
            moveFocus(event.key === "Home" ? 0 : binCount - 1)
          }
        }}
        style={{ cursor: "pointer", pointerEvents: "all" }}
      />
    )
  }

  const horizontal = orientation === "horizontal"
  const stops: React.ReactElement[] = []
  for (let index = 0; index <= steps; index++) {
    const ratio = index / steps
    const value = horizontal
      ? domain[0] + ratio * (domain[1] - domain[0])
      : domain[1] - ratio * (domain[1] - domain[0])
    stops.push(
      <stop key={index} offset={`${ratio * 100}%`} stopColor={colorFn(value)} />
    )
  }

  if (horizontal) {
    const barHeight = 12
    const barWidth = Math.min(width, 200)
    const startX = Math.max(0, (width - barWidth) / 2)
    const barY = label ? GRADIENT_LEGEND_LABELED_BAR_Y : 0

    return (
      <g
        aria-label={label || "Gradient legend"}
        role={interactive ? "listbox" : undefined}
        aria-orientation={interactive ? "horizontal" : undefined}
        aria-multiselectable={interactive && isolateMode ? true : undefined}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {stops}
          </linearGradient>
        </defs>
        {label && (
          <text
            x={startX + barWidth / 2}
            y={GRADIENT_LEGEND_LABEL_BASELINE}
            textAnchor="middle"
            fontSize={11}
            fill="var(--semiotic-text, #333)"
          >
            {label}
          </text>
        )}
        <rect
          x={startX}
          y={barY}
          width={barWidth}
          height={barHeight}
          fill={`url(#${gradientId})`}
          rx={2}
        />
        {interactive &&
          Array.from({ length: binCount }, (_, index) =>
            interactionRegion(
              rangeItem(index),
              {
                x: startX + (index * barWidth) / binCount,
                y: barY,
                width: barWidth / binCount,
                height: barHeight
              },
              index
            )
          )}
        <text
          x={startX}
          y={barY + barHeight + 12}
          textAnchor="start"
          fontSize={10}
          fill="var(--semiotic-text-secondary, #666)"
        >
          {formatValue(domain[0])}
        </text>
        <text
          x={startX + barWidth}
          y={barY + barHeight + 12}
          textAnchor="end"
          fontSize={10}
          fill="var(--semiotic-text-secondary, #666)"
        >
          {formatValue(domain[1])}
        </text>
      </g>
    )
  }

  const barWidth = 14
  const barHeight = 100
  const barY = label ? GRADIENT_LEGEND_LABELED_BAR_Y : 0

  return (
    <g
      aria-label={label || "Gradient legend"}
      role={interactive ? "listbox" : undefined}
      aria-orientation={interactive ? "vertical" : undefined}
      aria-multiselectable={interactive && isolateMode ? true : undefined}
    >
      {label && (
        <text
          x={0}
          y={GRADIENT_LEGEND_LABEL_BASELINE}
          textAnchor="start"
          fontSize={11}
          fill="var(--semiotic-text, #333)"
        >
          {label}
        </text>
      )}
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          {stops}
        </linearGradient>
      </defs>
      <rect
        x={0}
        y={barY}
        width={barWidth}
        height={barHeight}
        fill={`url(#${gradientId})`}
        rx={2}
      />
      {interactive &&
        Array.from({ length: binCount }, (_, index) =>
          interactionRegion(
            rangeItem(index, true),
            {
              x: 0,
              y: barY + (index * barHeight) / binCount,
              width: barWidth,
              height: barHeight / binCount
            },
            index
          )
        )}
      <text
        x={barWidth + 5}
        y={barY + 10}
        fontSize={10}
        fill="var(--semiotic-text-secondary, #666)"
      >
        {formatValue(domain[1])}
      </text>
      <text
        x={barWidth + 5}
        y={barY + barHeight}
        fontSize={10}
        fill="var(--semiotic-text-secondary, #666)"
      >
        {formatValue(domain[0])}
      </text>
    </g>
  )
}
