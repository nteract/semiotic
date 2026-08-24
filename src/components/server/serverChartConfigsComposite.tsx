import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import type { Datum } from "../charts/shared/datumTypes"
import {
  createColorScale,
  DEFAULT_COLOR,
  getColor,
  resolveExplicitColor
} from "../charts/shared/colorUtils"
import { renderStreamXYFrame } from "./staticXY"
import {
  buildCompositeEvidence,
  type EvidenceSink,
  type RenderEvidence
} from "./renderEvidence"
import {
  type ChartConfig,
  type ServerAccessor,
  type ServerChartData,
  type ServerColorScheme
} from "./serverChartConfigShared"
import { lineChart } from "./serverChartConfigsXY"
import { renderChainReaction } from "./serverCompositeChainReaction"
import { chartUID } from "./staticSVGChrome"
import { resolveTheme, themeStyles } from "./themeResolver"

const CELL_MARGIN = { top: 4, bottom: 4, left: 4, right: 4 }

interface CompositePayload {
  data: ServerChartData
  colorBy: ServerAccessor | undefined
  colorScheme: ServerColorScheme
  common: Datum
  rest: Datum
}

function payload(
  data: ServerChartData,
  colorBy: ServerAccessor | undefined,
  colorScheme: ServerColorScheme,
  common: Datum,
  rest: Datum
): Datum {
  return {
    __composite: { data, colorBy, colorScheme, common, rest }
  }
}

function readPayload(frameProps: Datum): CompositePayload {
  return frameProps.__composite as CompositePayload
}

function rows(value: ServerChartData): Datum[] {
  return Array.isArray(value)
    ? value.filter(
        (datum): datum is Datum =>
          datum != null && typeof datum === "object" && !Array.isArray(datum)
      )
    : []
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function positiveInteger(value: unknown, fallback: number): number {
  return Math.max(1, Math.floor(finiteNumber(value, fallback)))
}

function placedSvg(svg: string, x: number, y: number, part: string): string {
  return svg.replace(
    /^<svg\b/,
    `<svg x="${x}" y="${y}" data-semiotic-composite-part="${part}"`
  )
}

function mergedPartEvidence(
  parts: ReadonlyArray<RenderEvidence | undefined>,
  type: keyof RenderEvidence
): [number, number] | undefined {
  for (const part of parts) {
    const value = part?.[type]
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      return value as [number, number]
    }
  }
  return undefined
}

// ── MinimapChart ───────────────────────────────────────────────────────

function renderMinimap(frameProps: Datum, sink?: EvidenceSink): string {
  const { data, colorBy, colorScheme, common, rest } = readPayload(frameProps)
  const [width, detailHeight] = (common.size as [number, number]) ?? [600, 400]
  const minimap =
    rest.minimap && typeof rest.minimap === "object"
      ? (rest.minimap as Datum)
      : {}
  const overviewHeight = finiteNumber(minimap.height, 60)
  const detailMargin = common.margin as Datum
  const configuredMargin =
    minimap.margin && typeof minimap.margin === "object"
      ? (minimap.margin as Datum)
      : {}
  const overviewMargin = {
    top: finiteNumber(configuredMargin.top, 0),
    right: finiteNumber(
      configuredMargin.right,
      finiteNumber(detailMargin?.right, 20)
    ),
    bottom: finiteNumber(configuredMargin.bottom, 20),
    left: finiteNumber(
      configuredMargin.left,
      finiteNumber(detailMargin?.left, 40)
    )
  }
  const overviewTotalHeight =
    overviewHeight + overviewMargin.top + overviewMargin.bottom
  const framePropsOverride =
    rest.frameProps && typeof rest.frameProps === "object"
      ? (rest.frameProps as Datum)
      : {}

  const detailCommon: Datum = {
    ...common,
    size: [width, detailHeight],
    xExtent: framePropsOverride.xExtent ?? rest.brushExtent ?? common.xExtent,
    yExtent: framePropsOverride.yExtent ?? rest.yExtent ?? common.yExtent,
    _idPrefix: `${String(common._idPrefix ?? "minimap")}-detail`
  }
  const detailProps = lineChart.buildProps(
    data,
    colorBy,
    colorScheme,
    detailCommon,
    rest
  )
  // MinimapChart's documented frameProps escape hatch is spread last.
  Object.assign(detailProps, framePropsOverride)

  // The overview is deliberately a quiet, non-interactive copy of the full
  // series. Remove detail-only frame overrides before asking the shared line
  // server config to construct it.
  const overviewCommon: Datum = {
    ...common,
    size: [width, overviewTotalHeight],
    margin: overviewMargin,
    title: undefined,
    description: `${String(common.description ?? common.title ?? "Chart")} overview minimap`,
    showAxes: minimap.showAxes ?? false,
    showLegend: false,
    showGrid: false,
    accessibleTable: false,
    background: minimap.background,
    xExtent: undefined,
    yExtent: rest.yExtent ?? common.yExtent,
    _idPrefix: `${String(common._idPrefix ?? "minimap")}-overview`
  }
  // `common` may contain detail-only frameProps. Omitting these keys is
  // materially different from assigning undefined: lineChart's computed
  // overview style must survive its final common-prop spread.
  delete overviewCommon.lineStyle
  delete overviewCommon.pointStyle
  const overviewRest: Datum = {
    ...rest,
    fillArea: false,
    lineWidth: 1,
    showPoints: false,
    directLabel: false,
    forecast: undefined,
    anomaly: undefined,
    band: undefined
  }
  const overviewProps = lineChart.buildProps(
    data,
    colorBy,
    colorScheme,
    overviewCommon,
    overviewRest
  )
  // The HOC keeps the area layout when fillArea=true but intentionally uses
  // a no-fill overview style. A caller-provided overview lineStyle wins.
  overviewProps.chartType = rest.fillArea ? "area" : "line"
  if (typeof minimap.lineStyle === "function") {
    overviewProps.lineStyle = minimap.lineStyle
  }

  const detailSink: EvidenceSink = {}
  const overviewSink: EvidenceSink = {}
  const detailSvg = renderStreamXYFrame(detailProps as never, detailSink)
  const overviewSvg = renderStreamXYFrame(overviewProps as never, overviewSink)
  const renderBefore = rest.renderBefore === true
  const detailY = renderBefore ? overviewTotalHeight : 0
  const overviewY = renderBefore ? 0 : detailHeight
  const childMarkup = [
    placedSvg(detailSvg, 0, detailY, "detail"),
    placedSvg(overviewSvg, 0, overviewY, "overview")
  ].join("")
  const totalHeight = detailHeight + overviewTotalHeight
  const theme = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0])
  const styles = themeStyles(theme)
  const title = typeof common.title === "string" ? common.title : undefined
  const description =
    typeof common.description === "string"
      ? common.description
      : title || "Chart with overview minimap"
  const idPrefix = chartUID(common)
  const titleId = title ? `${idPrefix}-title` : undefined
  const descriptionId = `${idPrefix}-description`
  const brushDirection = minimap.brushDirection === "y" ? "y" : "x"
  const controlledBrush =
    Array.isArray(rest.brushExtent) && rest.brushExtent.length >= 2
      ? [Number(rest.brushExtent[0]), Number(rest.brushExtent[1])]
      : null
  const overviewEvidence = overviewSink.evidence
  let brushSelection: React.ReactNode = null
  if (
    controlledBrush &&
    controlledBrush.every(Number.isFinite) &&
    overviewEvidence
  ) {
    const domain =
      brushDirection === "x"
        ? overviewEvidence.xDomain
        : overviewEvidence.yDomain
    if (domain && domain[0] !== domain[1]) {
      const plotWidth = Math.max(
        0,
        width - overviewMargin.left - overviewMargin.right
      )
      const plotHeight = overviewHeight
      const project = (value: number) =>
        (value - domain[0]) / (domain[1] - domain[0])
      if (brushDirection === "x") {
        const x0 = project(Math.min(...controlledBrush)) * plotWidth
        const x1 = project(Math.max(...controlledBrush)) * plotWidth
        brushSelection = (
          <rect
            className="selection"
            x={overviewMargin.left + x0}
            y={overviewY + overviewMargin.top}
            width={x1 - x0}
            height={plotHeight}
            fill="steelblue"
            fillOpacity={0.2}
            stroke="steelblue"
            strokeWidth={1}
          />
        )
      } else {
        const y0 = (1 - project(Math.max(...controlledBrush))) * plotHeight
        const y1 = (1 - project(Math.min(...controlledBrush))) * plotHeight
        brushSelection = (
          <rect
            className="selection"
            x={overviewMargin.left}
            y={overviewY + overviewMargin.top + y0}
            width={plotWidth}
            height={y1 - y0}
            fill="steelblue"
            fillOpacity={0.2}
            stroke="steelblue"
            strokeWidth={1}
          />
        )
      }
    }
  }
  const svg = ReactDOMServer.renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="minimap-chart"
      width={width}
      height={totalHeight}
      role="img"
      aria-labelledby={[titleId, descriptionId].filter(Boolean).join(" ")}
      style={{ fontFamily: styles.fontFamily }}
    >
      {title && <title id={titleId}>{title}</title>}
      <desc id={descriptionId}>{description}</desc>
      <g dangerouslySetInnerHTML={{ __html: childMarkup }} />
      {brushSelection}
    </svg>
  )

  if (sink) {
    const parts = [detailSink.evidence, overviewSink.evidence]
    sink.evidence = buildCompositeEvidence({
      frameType: "xy",
      width,
      height: totalHeight,
      parts,
      title,
      description,
      xDomain: mergedPartEvidence(parts, "xDomain"),
      yDomain: mergedPartEvidence(parts, "yDomain")
    })
  }
  return svg
}

export const minimapChart: ChartConfig = {
  frameType: "xy",
  buildProps: payload,
  renderStatic: renderMinimap
}

// ── ScatterplotMatrix ─────────────────────────────────────────────────

function categoryValue(datum: Datum, accessor: ServerAccessor): string {
  return String(
    typeof accessor === "function" ? accessor(datum) : datum[accessor]
  )
}

function splomColorScale(
  data: Datum[],
  colorBy: ServerAccessor | undefined,
  colorScheme: ServerColorScheme,
  theme: ReturnType<typeof resolveTheme>
): { categories: string[]; color: (datum: Datum) => string } {
  if (!colorBy) {
    return { categories: [], color: () => DEFAULT_COLOR }
  }
  const categories = Array.from(
    new Set(data.map((datum) => categoryValue(datum, colorBy)))
  )
  const colorKey =
    typeof colorBy === "string" ? colorBy : "__semioticSplomColor"
  const colorRows =
    typeof colorBy === "function"
      ? data.map((datum) => ({
          ...datum,
          [colorKey]: categoryValue(datum, colorBy)
        }))
      : data
  const scale = createColorScale(
    colorRows,
    colorKey,
    colorScheme ?? theme.colors.categorical
  )
  return {
    categories,
    color: (datum) =>
      getColor(datum, colorBy as string | ((datum: Datum) => string), scale)
  }
}

function diagonalMarkup(options: {
  data: Datum[]
  field: string
  label: string
  cellSize: number
  bins: number
  diagonal: string
  colorBy: ServerAccessor | undefined
  color: (datum: Datum) => string
  x: number
  y: number
}): { svg: string; visibleBars: number } {
  const { data, field, label, cellSize, bins, diagonal, colorBy, color, x, y } =
    options
  if (diagonal === "label") {
    return {
      visibleBars: 0,
      svg: ReactDOMServer.renderToStaticMarkup(
        <svg
          x={x}
          y={y}
          width={cellSize}
          height={cellSize}
          data-semiotic-composite-part={`diagonal-${field}`}
        >
          <text
            x={cellSize / 2}
            y={cellSize / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fontWeight="bold"
            fill="#333"
          >
            {label}
          </text>
        </svg>
      )
    }
  }

  const numeric = data
    .map((datum) => Number(datum[field]))
    .filter(Number.isFinite)
  const min = numeric.length ? Math.min(...numeric) : 0
  const max = numeric.length ? Math.max(...numeric) : 0
  const binWidth = (max - min) / bins || 1
  const buckets = Array.from({ length: bins }, () => new Map<string, Datum[]>())
  for (const datum of data) {
    const value = Number(datum[field])
    if (!Number.isFinite(value)) continue
    const index = Math.max(
      0,
      Math.min(bins - 1, Math.floor((value - min) / binWidth))
    )
    const category = colorBy ? categoryValue(datum, colorBy) : "__all"
    const bucket = buckets[index]
    bucket.set(category, [...(bucket.get(category) ?? []), datum])
  }
  const totals = buckets.map((bucket) =>
    Array.from(bucket.values()).reduce((sum, values) => sum + values.length, 0)
  )
  const maxCount = Math.max(1, ...totals)
  let visibleBars = 0
  const bars = buckets.flatMap((bucket, binIndex) => {
    let stacked = 0
    return Array.from(bucket.entries()).flatMap(([category, values]) => {
      if (values.length === 0) return []
      visibleBars += 1
      const height = (values.length / maxCount) * (cellSize - 24)
      const y0 = stacked
      stacked += height
      return (
        <rect
          key={`${binIndex}-${category}`}
          x={(binIndex / bins) * cellSize}
          y={cellSize - y0 - height}
          width={Math.max(cellSize / bins - 1, 1)}
          height={height}
          fill={colorBy ? color(values[0]) : DEFAULT_COLOR}
          opacity={0.6}
        />
      )
    })
  })
  return {
    visibleBars,
    svg: ReactDOMServer.renderToStaticMarkup(
      <svg
        x={x}
        y={y}
        width={cellSize}
        height={cellSize}
        data-semiotic-composite-part={`diagonal-${field}`}
      >
        <text
          x={cellSize / 2}
          y={14}
          textAnchor="middle"
          fontSize={11}
          fontWeight="bold"
          fill="#333"
        >
          {label}
        </text>
        {bars}
      </svg>
    )
  }
}

function renderScatterplotMatrix(
  frameProps: Datum,
  sink?: EvidenceSink
): string {
  const {
    data: input,
    colorBy,
    colorScheme,
    common,
    rest
  } = readPayload(frameProps)
  const data = rows(input)
  const fields = Array.isArray(rest.fields)
    ? rest.fields.filter((field): field is string => typeof field === "string")
    : []
  const fieldLabels =
    rest.fieldLabels && typeof rest.fieldLabels === "object"
      ? (rest.fieldLabels as Record<string, unknown>)
      : {}
  const cellSize = positiveInteger(rest.cellSize, 150)
  const cellGap = Math.max(0, finiteNumber(rest.cellGap, 4))
  const pointRadius = Math.max(0, finiteNumber(rest.pointRadius, 2))
  const pointOpacity = Math.max(
    0,
    Math.min(1, finiteNumber(rest.pointOpacity, 0.5))
  )
  const histogramBins = positiveInteger(rest.histogramBins, 20)
  const diagonal =
    typeof rest.diagonal === "string" ? rest.diagonal : "histogram"
  const labelWidth = 40
  const gridWidth =
    labelWidth + fields.length * cellSize + fields.length * cellGap
  const gridHeight =
    fields.length * cellSize + labelWidth + fields.length * cellGap
  const theme = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0])
  const styles = themeStyles(theme)
  const colors = splomColorScale(data, colorBy, colorScheme, theme)
  const shouldShowLegend = rest.showLegend ?? Boolean(colorBy)
  const title = typeof common.title === "string" ? common.title : undefined
  const description =
    typeof common.description === "string"
      ? common.description
      : `Scatterplot matrix comparing ${fields.length} fields`
  const titleHeight = title ? 28 : 0
  const legendItems = shouldShowLegend ? colors.categories : []
  const legendItemWidth = (label: string) => Math.max(72, 30 + label.length * 7)
  let legendX = 0
  let legendRow = 0
  const legendLayout = legendItems.map((label) => {
    const itemWidth = legendItemWidth(label)
    if (legendX > 0 && legendX + itemWidth > gridWidth) {
      legendRow += 1
      legendX = 0
    }
    const item = { label, x: legendX, y: legendRow * 24 }
    legendX += itemWidth
    return item
  })
  const legendHeight = legendItems.length ? (legendRow + 1) * 24 + 4 : 0
  const gridTop = titleHeight + legendHeight
  const totalHeight = gridTop + gridHeight
  const childEvidence: Array<RenderEvidence | undefined> = []
  const cellMarkup: string[] = []
  let histogramMarks = 0

  fields.forEach((rowField, rowIndex) => {
    fields.forEach((columnField, columnIndex) => {
      const x = labelWidth + cellGap + columnIndex * (cellSize + cellGap)
      const y = gridTop + rowIndex * (cellSize + cellGap)
      if (rowIndex === columnIndex) {
        const diagonalResult = diagonalMarkup({
          data,
          field: rowField,
          label: resolveExplicitColor(fieldLabels, rowField) ?? rowField,
          cellSize,
          bins: histogramBins,
          diagonal,
          colorBy,
          color: colors.color,
          x,
          y
        })
        histogramMarks += diagonalResult.visibleBars
        cellMarkup.push(diagonalResult.svg)
        return
      }
      const cellSink: EvidenceSink = {}
      const cellSvg = renderStreamXYFrame(
        {
          chartType: "scatter",
          data,
          size: [cellSize, cellSize],
          xAccessor: columnField,
          yAccessor: rowField,
          pointStyle: (datum: Datum) => ({
            r: pointRadius,
            opacity: pointOpacity,
            fill: colors.color(datum)
          }),
          margin: CELL_MARGIN,
          showAxes: false,
          showGrid: false,
          enableHover: false,
          accessibleTable: false,
          description: `${resolveExplicitColor(fieldLabels, columnField) ?? columnField} versus ${resolveExplicitColor(fieldLabels, rowField) ?? rowField} scatterplot`,
          theme: common.theme,
          _idPrefix: `${String(common._idPrefix ?? "splom")}-${rowIndex}-${columnIndex}`
        },
        cellSink
      )
      childEvidence.push(cellSink.evidence)
      cellMarkup.push(
        placedSvg(cellSvg, x, y, `cell-${rowField}-${columnField}`)
      )
    })
  })

  const idPrefix = chartUID(common)
  const titleId = title ? `${idPrefix}-title` : undefined
  const descriptionId = `${idPrefix}-description`
  const svg = ReactDOMServer.renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="scatterplot-matrix"
      width={gridWidth}
      height={totalHeight}
      role="img"
      aria-labelledby={[titleId, descriptionId].filter(Boolean).join(" ")}
      style={{ fontFamily: styles.fontFamily }}
    >
      {title && <title id={titleId}>{title}</title>}
      <desc id={descriptionId}>{description}</desc>
      <rect width={gridWidth} height={totalHeight} fill={styles.background} />
      {title && (
        <text x={0} y={18} fontSize={14} fontWeight={600} fill={styles.text}>
          {title}
        </text>
      )}
      {legendLayout.map((item) => {
        const sample = data.find(
          (datum) => colorBy && categoryValue(datum, colorBy) === item.label
        )
        const fill = sample ? colors.color(sample) : DEFAULT_COLOR
        return (
          <g
            key={item.label}
            transform={`translate(${item.x},${titleHeight + item.y})`}
          >
            <circle cx={5} cy={8} r={5} fill={fill} />
            <text x={14} y={12} fontSize={11} fill={styles.text}>
              {item.label}
            </text>
          </g>
        )
      })}
      {fields.map((field, rowIndex) => {
        const x = labelWidth / 2
        const y = gridTop + rowIndex * (cellSize + cellGap) + cellSize / 2
        return (
          <text
            key={`row-${field}`}
            x={x}
            y={y}
            transform={`rotate(-90 ${x} ${y})`}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fontWeight="bold"
            fill={styles.text}
          >
            {resolveExplicitColor(fieldLabels, field) ?? field}
          </text>
        )
      })}
      {fields.map((field, columnIndex) => (
        <text
          key={`column-${field}`}
          x={
            labelWidth +
            cellGap +
            columnIndex * (cellSize + cellGap) +
            cellSize / 2
          }
          y={gridTop + fields.length * (cellSize + cellGap) + labelWidth / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fontWeight="bold"
          fill={styles.text}
        >
          {resolveExplicitColor(fieldLabels, field) ?? field}
        </text>
      ))}
      <g dangerouslySetInnerHTML={{ __html: cellMarkup.join("") }} />
    </svg>
  )

  if (sink) {
    sink.evidence = buildCompositeEvidence({
      frameType: "xy",
      width: gridWidth,
      height: totalHeight,
      parts: childEvidence,
      additionalMarkCountByType:
        histogramMarks > 0 ? { histogram: histogramMarks } : undefined,
      title,
      description,
      categories: colors.categories.length ? colors.categories : undefined,
      legendItems: legendItems.length || undefined
    })
  }
  return svg
}

export const scatterplotMatrix: ChartConfig = {
  frameType: "xy",
  buildProps: payload,
  renderStatic: renderScatterplotMatrix
}

export const chainReactionChart: ChartConfig = {
  frameType: "physics",
  layout: { primarySize: { width: 920, height: 620 } },
  buildProps: payload,
  renderStatic: renderChainReaction
}
