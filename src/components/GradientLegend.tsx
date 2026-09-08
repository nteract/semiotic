import * as React from "react"
import { LEGEND_FONT_STYLE } from "./legendStyles"
import { numericTickFormatter } from "./charts/shared/numericTickFormatter"

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
  const horizontal = orientation === "horizontal"
  const formatValue = format || numericTickFormatter(domain)
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

  const rangeItem = (index: number): LegendItem => {
    const visualIndex = horizontal ? index : binCount - index - 1
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

  const [min, max] = domain
  const stops = React.useMemo(
    () =>
      Array.from({ length: steps + 1 }, (_, index) => {
        const ratio = index / steps
        const value = horizontal
          ? min + ratio * (max - min)
          : max - ratio * (max - min)
        return (
          <stop
            key={index}
            offset={ratio}
            stopColor={colorFn(value)}
          />
        )
      }),
    [colorFn, min, max, horizontal]
  )
  const barWidth = horizontal ? Math.min(width, 200) : 14
  const barHeight = horizontal ? 12 : 100
  const startX = horizontal ? Math.max(0, (width - barWidth) / 2) : 0
  const barY = label ? GRADIENT_LEGEND_LABELED_BAR_Y : 0

  return (
    <g
      aria-label={label || "Gradient legend"}
      role={interactive ? "listbox" : undefined}
      aria-orientation={interactive ? orientation : undefined}
      aria-multiselectable={interactive && isolateMode ? true : undefined}
      style={LEGEND_FONT_STYLE}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="0%"
          y1="0%"
          x2={horizontal ? "100%" : "0%"}
          y2={horizontal ? "0%" : "100%"}
        >
          {stops}
        </linearGradient>
      </defs>
      {label && (
        <text
          x={horizontal ? startX + barWidth / 2 : 0}
          y={GRADIENT_LEGEND_LABEL_BASELINE}
          textAnchor={horizontal ? "middle" : "start"}
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
              x: horizontal ? startX + (index * barWidth) / binCount : 0,
              y: horizontal ? barY : barY + (index * barHeight) / binCount,
              width: horizontal ? barWidth / binCount : barWidth,
              height: horizontal ? barHeight : barHeight / binCount
            },
            index
          )
        )}
      {[0, 1].map((index) => (
        <text
          key={index}
          x={horizontal ? startX + index * barWidth : barWidth + 5}
          y={barY + (horizontal ? barHeight + 12 : index ? barHeight : 10)}
          textAnchor={horizontal ? (index ? "end" : "start") : undefined}
          fontSize={10}
          fill="var(--semiotic-text-secondary, #666)"
        >
          {formatValue(domain[horizontal ? index : 1 - index])}
        </text>
      ))}
    </g>
  )
}
