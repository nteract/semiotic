import { staticTitleText } from "./staticTitle"
import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import type { Datum } from "../charts/shared/datumTypes"
import { minimapChromeMargins, MINIMAP_DEFAULT_HEIGHT } from "../charts/xy/minimapLayout"
import { renderStreamXYFrame } from "./staticXY"
import { buildCompositeEvidence, type EvidenceSink } from "./renderEvidence"
import { lineChart } from "./serverChartConfigsXY"
import { chartUID } from "./staticSVGChrome"
import { resolveTheme, themeStyles } from "./themeResolver"
import { renderStaticMinimapBrush } from "./serverMinimapBrush"
import {
  finiteNumber,
  mergedPartEvidence,
  placedSvg,
  readPayload
} from "./serverCompositeShared"

// MinimapChart's static rendering: the detail and overview scenes, placed in
// one SVG, with the overview brush drawn over the overview's plot.

export function renderMinimap(frameProps: Datum, sink?: EvidenceSink): string {
  const { data, colorBy, colorScheme, common, rest } = readPayload(frameProps)
  const [width, detailHeight] = (common.size as [number, number]) ?? [600, 400]
  const minimap =
    rest.minimap && typeof rest.minimap === "object"
      ? (rest.minimap as Datum)
      : {}
  const overviewHeight = finiteNumber(minimap.height, MINIMAP_DEFAULT_HEIGHT)
  const detailMargin = common.margin as Datum
  const configuredMargin =
    minimap.margin && typeof minimap.margin === "object"
      ? (minimap.margin as Datum)
      : {}
  // Opt-in brush chrome gets the same default room as in the browser.
  const chromeMargins = minimapChromeMargins(minimap)
  const overviewMargin = {
    top: finiteNumber(configuredMargin.top, chromeMargins.top),
    right: finiteNumber(
      configuredMargin.right,
      finiteNumber(detailMargin?.right, 20)
    ),
    bottom: finiteNumber(configuredMargin.bottom, chromeMargins.bottom),
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

  const lineRest: Datum = {
    ...rest,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y"
  }
  // The brushed range sets the detail's domain on the brushed axis only.
  const brushDirection = minimap.brushDirection === "y" ? "y" : "x"
  const detailCommon: Datum = {
    ...common,
    size: [width, detailHeight],
    xExtent:
      framePropsOverride.xExtent ??
      (brushDirection === "x" ? rest.brushExtent : undefined) ??
      common.xExtent,
    yExtent:
      framePropsOverride.yExtent ??
      (brushDirection === "y" ? rest.brushExtent : undefined) ??
      rest.yExtent ??
      common.yExtent,
    _idPrefix: `${String(common._idPrefix ?? "minimap")}-detail`
  }
  const detailProps = lineChart.buildProps(
    data,
    colorBy,
    colorScheme,
    detailCommon,
    lineRest
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
    ...lineRest,
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
  const title = staticTitleText(common.title) || undefined
  const description =
    typeof common.description === "string"
      ? common.description
      : title || "Chart with overview minimap"
  const idPrefix = chartUID(common)
  const titleId = title ? `${idPrefix}-title` : undefined
  const descriptionId = `${idPrefix}-description`
  const controlledBrush =
    Array.isArray(rest.brushExtent) && rest.brushExtent.length >= 2
      ? [Number(rest.brushExtent[0]), Number(rest.brushExtent[1])] as [number, number]
      : null
  const overviewDomain = brushDirection === "x"
    ? overviewSink.evidence?.xDomain
    : overviewSink.evidence?.yDomain
  const brushSelection = overviewDomain
    ? renderStaticMinimapBrush({
      theme,
      config: minimap,
      direction: brushDirection,
      domain: overviewDomain,
      extent: controlledBrush && controlledBrush.every(Number.isFinite) ? controlledBrush : null,
      plot: {
        x: overviewMargin.left,
        y: overviewY + overviewMargin.top,
        width: Math.max(0, width - overviewMargin.left - overviewMargin.right),
        height: overviewHeight
      },
      margin: overviewMargin,
      axisFormat: brushDirection === "x" ? common.xFormat : common.yFormat
    })
    : null
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
