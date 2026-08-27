import * as React from "react"
import * as ReactDOMServer from "react-dom/server"

import type { Datum } from "../charts/shared/datumTypes"
import {
  buildFormatter,
  decorate,
  formatSignedDelta,
} from "../charts/value/formatting"
import { resolveThreshold } from "../charts/value/thresholdSparkline"
import type {
  BigNumberFormat,
  BigNumberLevel,
  BigNumberMode,
  BigNumberThreshold,
} from "../charts/value/types"
import { buildEvidence, type EvidenceSink } from "./renderEvidence"
import { resolveTheme, type ThemeInput } from "./themeResolver"

interface ValueModeDefaults {
  width: number
  height: number
  padding: number
  labelSize: number
  captionSize: number
  valueSize: number
  detailSize: number
  align: "start" | "center" | "end"
  border: boolean
  showHeader: boolean
  showDetail: boolean
}

const VALUE_MODE_DEFAULTS: Record<BigNumberMode, ValueModeDefaults> = {
  tile: {
    width: 280,
    height: 184,
    padding: 16,
    labelSize: 13,
    captionSize: 11,
    valueSize: 40,
    detailSize: 13,
    align: "start",
    border: true,
    showHeader: true,
    showDetail: true,
  },
  presentation: {
    width: 540,
    height: 320,
    padding: 32,
    labelSize: 18,
    captionSize: 14,
    valueSize: 96,
    detailSize: 18,
    align: "center",
    border: true,
    showHeader: true,
    showDetail: true,
  },
  inline: {
    width: 240,
    height: 64,
    padding: 8,
    labelSize: 0,
    captionSize: 0,
    valueSize: 28,
    detailSize: 13,
    align: "start",
    border: false,
    showHeader: false,
    showDetail: true,
  },
  thumbnail: {
    width: 96,
    height: 56,
    padding: 6,
    labelSize: 0,
    captionSize: 0,
    valueSize: 22,
    detailSize: 0,
    align: "center",
    border: false,
    showHeader: false,
    showDetail: false,
  },
}

function finiteDimension(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback
}

function thresholdColor(
  level: BigNumberLevel,
  explicit: string | undefined,
  theme: ReturnType<typeof resolveTheme>,
): string {
  if (explicit) return explicit
  if (level === "success") return theme.colors.success ?? "#2ca02c"
  if (level === "warning") return theme.colors.warning ?? "#b26a00"
  if (level === "danger") return theme.colors.danger ?? "#d62728"
  if (level === "info") return theme.colors.info ?? theme.colors.primary
  return theme.colors.text
}

function comparisonDetail(
  props: Datum,
  value: number,
  formatter: (value: number) => string,
): string | undefined {
  const comparison =
    props.comparison && typeof props.comparison === "object"
      ? props.comparison as Record<string, unknown>
      : undefined
  const comparisonValue =
    comparison && typeof comparison.value === "number" &&
      Number.isFinite(comparison.value)
      ? comparison.value
      : undefined
  const explicitDelta =
    typeof props.delta === "number" && Number.isFinite(props.delta)
      ? props.delta
      : undefined
  const delta = explicitDelta ?? (
    comparisonValue === undefined ? undefined : value - comparisonValue
  )
  if (delta === undefined) return undefined
  const formatted = formatSignedDelta(delta, formatter)
  const label =
    comparison && typeof comparison.label === "string"
      ? ` ${comparison.label}`
      : ""
  return `${formatted}${label}`
}

function targetDetail(
  props: Datum,
  value: number,
  formatter: (value: number) => string,
): string | undefined {
  const target =
    props.target && typeof props.target === "object"
      ? props.target as Record<string, unknown>
      : undefined
  if (
    !target ||
    typeof target.value !== "number" ||
    !Number.isFinite(target.value)
  ) {
    return undefined
  }
  const label = typeof target.label === "string" ? ` ${target.label}` : ""
  if (target.value === 0) return `target ${formatter(target.value)}${label}`
  const percent = new Intl.NumberFormat(
    typeof props.locale === "string" ? props.locale : "en-US",
    { style: "percent", maximumFractionDigits: 0 },
  ).format(value / target.value)
  return `${percent} of ${formatter(target.value)}${label}`
}

export function renderBigNumberToStaticSVG(
  props: Datum,
  sink?: EvidenceSink,
): string {
  const mode: BigNumberMode = (
    props.mode === "presentation" ||
    props.mode === "inline" ||
    props.mode === "thumbnail"
  ) ? props.mode as BigNumberMode : "tile"
  const defaults = VALUE_MODE_DEFAULTS[mode]
  const width = finiteDimension(props.width, defaults.width)
  const height = finiteDimension(props.height, defaults.height)
  const padding =
    typeof props.padding === "number" && Number.isFinite(props.padding)
      ? Math.max(0, props.padding)
      : defaults.padding
  const align =
    props.align === "center" || props.align === "end" || props.align === "start"
      ? props.align
      : defaults.align
  const textAnchor = align === "center" ? "middle" : align === "end" ? "end" : "start"
  const x = align === "center" ? width / 2 : align === "end" ? width - padding : padding
  const theme = resolveTheme(props.theme as ThemeInput)
  const value = typeof props.value === "number" && Number.isFinite(props.value)
    ? props.value
    : undefined
  const format =
    typeof props.format === "string" || typeof props.format === "function"
      ? props.format as BigNumberFormat
      : "number"
  const formatter = buildFormatter(format, {
    locale: typeof props.locale === "string" ? props.locale : undefined,
    currency: typeof props.currency === "string" ? props.currency : undefined,
    precision: typeof props.precision === "number" ? props.precision : undefined,
  })
  const formattedValue = value === undefined
    ? "No value"
    : decorate(
      formatter(value),
      typeof props.prefix === "string" ? props.prefix : undefined,
      typeof props.suffix === "string" ? props.suffix : undefined,
    )
  const matched = value === undefined
    ? undefined
    : resolveThreshold(value, props.thresholds as BigNumberThreshold[] | undefined)
  const level = matched?.level ?? "neutral"
  const valueColor =
    typeof props.color === "string"
      ? props.color
      : thresholdColor(level, matched?.color, theme)
  const label = typeof props.label === "string" ? props.label : undefined
  const caption = typeof props.caption === "string" ? props.caption : undefined
  const unit = typeof props.unit === "string" ? props.unit : undefined
  const comparison = value === undefined
    ? undefined
    : comparisonDetail(props, value, formatter)
  const target = value === undefined
    ? undefined
    : targetDetail(props, value, formatter)
  const details = [comparison, target, matched?.label].filter(Boolean).join(" · ")
  const accessibleName =
    (typeof props.description === "string" && props.description) ||
    [label, formattedValue, unit, details].filter(Boolean).join(", ")
  const surface =
    typeof props.background === "string"
      ? props.background
      : theme.colors.surface ?? theme.colors.background
  const border =
    typeof props.borderColor === "string" ? props.borderColor : theme.colors.border
  const labelY = padding + defaults.labelSize
  const captionY = labelY + defaults.captionSize + 4
  const headerBottom = defaults.showHeader && (label || caption)
    ? (caption ? captionY + 10 : labelY + 14)
    : padding
  const valueY = mode === "presentation"
    ? height / 2 + defaults.valueSize * 0.32
    : mode === "thumbnail"
      ? height / 2 + defaults.valueSize * 0.34
      : Math.min(height - padding - (details ? 26 : 4), headerBottom + defaults.valueSize)
  const unitX = x + (
    textAnchor === "start"
      ? Math.max(defaults.valueSize, formattedValue.length * defaults.valueSize * 0.55)
      : 0
  )

  const svg = ReactDOMServer.renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={accessibleName}
      data-semiotic-component="BigNumber"
    >
      <title>{label ?? formattedValue}</title>
      {typeof props.description === "string" && <desc>{props.description}</desc>}
      <rect
        x={defaults.border ? 0.5 : 0}
        y={defaults.border ? 0.5 : 0}
        width={defaults.border ? width - 1 : width}
        height={defaults.border ? height - 1 : height}
        rx={defaults.border ? 8 : 0}
        fill={surface}
        stroke={defaults.border ? border : "none"}
      />
      {defaults.showHeader && label && (
        <text
          x={x}
          y={labelY}
          textAnchor={textAnchor}
          fontFamily={theme.typography.fontFamily}
          fontSize={defaults.labelSize}
          fontWeight={600}
          fill={theme.colors.text}
        >
          {label}
        </text>
      )}
      {defaults.showHeader && caption && (
        <text
          x={x}
          y={captionY}
          textAnchor={textAnchor}
          fontFamily={theme.typography.fontFamily}
          fontSize={defaults.captionSize}
          fill={theme.colors.textSecondary}
        >
          {caption}
        </text>
      )}
      <text
        x={x}
        y={valueY}
        textAnchor={textAnchor}
        fontFamily={theme.typography.fontFamily}
        fontSize={defaults.valueSize}
        fontWeight={600}
        fontVariant="tabular-nums"
        fill={value === undefined ? theme.colors.textSecondary : valueColor}
        data-mark-type="value"
      >
        {formattedValue}
      </text>
      {unit && value !== undefined && textAnchor === "start" && (
        <text
          x={unitX + 6}
          y={valueY}
          textAnchor="start"
          fontFamily={theme.typography.fontFamily}
          fontSize={Math.max(11, Math.round(defaults.valueSize * 0.32))}
          fontWeight={500}
          fill={theme.colors.textSecondary}
        >
          {unit}
        </text>
      )}
      {defaults.showDetail && details && (
        <text
          x={x}
          y={Math.min(height - padding, valueY + defaults.detailSize + 10)}
          textAnchor={textAnchor}
          fontFamily={theme.typography.fontFamily}
          fontSize={defaults.detailSize}
          fill={theme.colors.textSecondary}
        >
          {details}
        </text>
      )}
    </svg>,
  )

  if (sink) {
    sink.evidence = buildEvidence({
      frameType: "value",
      width,
      height,
      marks: value === undefined ? [] : [{ type: "value" }],
      title: label,
      description: accessibleName,
    })
  }
  return svg
}

export const VALUE_RENDERERS = {
  BigNumber: renderBigNumberToStaticSVG,
} as const

export type ValueChartName = keyof typeof VALUE_RENDERERS

export function renderValueChart(
  component: ValueChartName,
  props: Datum,
  sink?: EvidenceSink,
): string {
  return VALUE_RENDERERS[component](props, sink)
}
