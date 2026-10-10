import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import type { Datum } from "../charts/shared/datumTypes"
import type { RenderChartName } from "./renderToStaticSVG"
import type { FrameType, StaticFrameProps } from "./staticSVGChrome"
import { resolveTheme, themeStyles, type ThemeInput } from "./themeResolver"
import { setSvgRootAttributes } from "../shared/svgRoot"
import { createSvgIdPrefix } from "../shared/svgNamespace"
import {
  finiteDimension,
  renderedSvgDimensions,
  fitSvgToBox,
  type SVGDimensions
} from "./svgSizing"

export interface DashboardChart {
  /** Frame type or HOC component name */
  component?: RenderChartName
  frameType?: FrameType
  /** Chart props (data, accessors, etc.) */
  props: Datum
  /** Span multiple columns (for emphasis="primary") */
  colSpan?: number
}

export interface DashboardLayout {
  /** Number of columns */
  columns?: number
  /** Gap between charts in pixels */
  gap?: number
}

export interface RenderDashboardOptions {
  title?: string
  subtitle?: string
  theme?: ThemeInput
  width?: number
  height?: number
  layout?: DashboardLayout
  background?: string
  /** Output format */
  format?: "svg"
}

interface DashboardRenderers {
  chart: (component: RenderChartName, props: Datum) => string
  frame: (frameType: FrameType, props: StaticFrameProps) => string
}

/** Compose multiple charts into a single SVG. */
export function composeDashboard(
  charts: DashboardChart[],
  options: RenderDashboardOptions,
  renderers: DashboardRenderers
): string {
  const {
    title,
    subtitle,
    theme: themeInput,
    width: widthInput,
    height: heightInput,
    layout = {},
    background
  } = options

  const theme = resolveTheme(themeInput)
  const styles = themeStyles(theme)
  const width = finiteDimension(widthInput, 1200)
  const columns = Math.max(1, Math.floor(finiteDimension(layout.columns, 2)))
  const gap = Math.min(
    typeof layout.gap === "number" &&
      Number.isFinite(layout.gap) &&
      layout.gap >= 0
      ? layout.gap
      : 16,
    width / (columns + 1)
  )
  const idPrefix = createSvgIdPrefix("dashboard")

  let headerHeight = 0
  if (title) headerHeight += 30
  if (subtitle) headerHeight += 20
  if (headerHeight > 0) headerHeight += 10

  const chartAreaWidth = width - gap
  const cellWidth = Math.floor((chartAreaWidth - gap * (columns - 1)) / columns)
  const rows: {
    x: number
    y: number
    width: number
    height: number
    svg: string
    svgDimensions: SVGDimensions
  }[] = []
  let column = 0
  let rowY = headerHeight + gap
  let rowHeight = 0
  const defaultCellHeight = 300

  for (const chart of charts) {
    const span = Math.min(
      Math.max(1, Math.floor(finiteDimension(chart.colSpan, 1))),
      columns
    )
    const cellWidthWithSpan = cellWidth * span + gap * (span - 1)
    const requestedCellHeight = finiteDimension(
      chart.props.height,
      defaultCellHeight
    )

    if (column + span > columns) {
      rowY += rowHeight + gap
      column = 0
      rowHeight = 0
    }

    const x = gap / 2 + column * (cellWidth + gap)
    const chartProps = {
      ...chart.props,
      width: cellWidthWithSpan,
      height: requestedCellHeight,
      theme: themeInput,
      _idPrefix: `${idPrefix}-chart-${rows.length}${chart.props._idPrefix ? `-${String(chart.props._idPrefix).replace(/[^a-zA-Z0-9_-]/g, "_")}` : ""}`
    }
    const svg = chart.component
      ? renderers.chart(chart.component, chartProps)
      : chart.frameType
        ? renderers.frame(chart.frameType, chartProps as StaticFrameProps)
        : ReactDOMServer.renderToStaticMarkup(
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={cellWidthWithSpan}
              height={requestedCellHeight}
            />
          )
    const svgDimensions = renderedSvgDimensions(svg, {
      width: cellWidthWithSpan,
      height: requestedCellHeight
    })
    const cellHeight = Math.max(requestedCellHeight, svgDimensions.height)
    rows.push({
      x,
      y: rowY,
      width: cellWidthWithSpan,
      height: cellHeight,
      svg,
      svgDimensions
    })
    rowHeight = Math.max(rowHeight, cellHeight)
    column += span
  }

  const totalHeight = finiteDimension(heightInput, rowY + rowHeight + gap)
  const chartElements = rows.map((item, index) => (
    <g
      key={`dashboard-chart-${index}`}
      transform={`translate(${item.x},${item.y})`}
      dangerouslySetInnerHTML={{
        __html: setSvgRootAttributes(
          fitSvgToBox(item.svg, item.svgDimensions),
          {
            width: String(item.width),
            height: String(item.height),
            role: "group"
          }
        )
      }}
    />
  ))

  return ReactDOMServer.renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={totalHeight}
      role="group"
      aria-label={title || "Dashboard"}
      aria-describedby={subtitle ? `${idPrefix}-desc` : undefined}
      style={{ fontFamily: styles.fontFamily }}
    >
      {title && <title>{title}</title>}
      {subtitle && <desc id={`${idPrefix}-desc`}>{subtitle}</desc>}
      {background && (
        <rect
          x={0}
          y={0}
          width={width}
          height={totalHeight}
          fill={background}
        />
      )}
      {title && (
        <text
          x={width / 2}
          y={24}
          textAnchor="middle"
          fontSize={styles.titleFontSize + 4}
          fontWeight={styles.titleFontWeight}
          fill={styles.text}
          fontFamily={styles.titleFontFamily}
        >
          {title}
        </text>
      )}
      {subtitle && (
        <text
          x={width / 2}
          y={title ? 46 : 20}
          textAnchor="middle"
          fontSize={styles.labelSize}
          fill={styles.textSecondary}
          fontFamily={styles.fontFamily}
        >
          {subtitle}
        </text>
      )}
      {chartElements}
    </svg>
  )
}
