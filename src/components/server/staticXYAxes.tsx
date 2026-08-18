import * as React from "react"
import type { StreamLayout, StreamScales, StreamXYFrameProps } from "../stream/types"
import type { XYFrameAxisConfig } from "../stream/xyFrameAxisTypes"
import type { SemioticTheme } from "../store/themeCore"
import { themeStyles } from "./themeResolver"
import {
  jaggedBaselinePath,
  resolveAxisLineStyle,
  resolveVerticalTickBaseline,
  tickPixelExtent,
} from "../stream/svgOverlayUtils"
import { axisTickCount, defaultTickFormat } from "../stream/axisTickUtils"
import { ticksForMode } from "../charts/shared/axisExtent"
import { resolveLegendSideGutter, type AxisChromeInput } from "../legendLayout"
import {
  isStaticTextTickLabel,
  renderStaticTickForeignObject,
} from "./staticAxisTickLabel"
import {
  createStaticAxisTicks,
  isStaticAxisLandmark,
  resolveStaticAxisTicks,
} from "./staticXYAxisTicks"

/**
 * Render the second vertical axis when an XY frame explicitly supplies a
 * left/right pair. The primary axis remains in staticSVGChrome so right-only
 * configurations retain their longstanding markup; keeping the paired branch
 * here prevents the shared chrome module from growing past its size boundary.
 */
export function renderPairedRightAxisSVG(options: {
  scales: StreamScales
  layout: StreamLayout
  props: StreamXYFrameProps
  theme: SemioticTheme
  leftAxis?: XYFrameAxisConfig
  rightAxis?: XYFrameAxisConfig
  margin: { top: number; right: number; bottom: number; left: number }
  axisChrome?: AxisChromeInput
  hasRenderedLegend?: boolean
}): React.ReactNode {
  const {
    scales,
    layout,
    props,
    theme,
    leftAxis,
    rightAxis,
    margin,
    axisChrome,
    hasRenderedLegend,
  } = options
  if (!leftAxis || !rightAxis) return null

  const s = themeStyles(theme)
  const extentMode = rightAxis.extent ?? props.axisExtent
  const tickCount = extentMode === "exact"
    ? Math.max(2, axisTickCount(rightAxis, 5))
    : Math.min(
        axisTickCount(rightAxis, 5),
        Math.max(2, Math.floor(layout.height / 30))
  )
  const values = rightAxis.tickValues ?? ticksForMode(scales.y, tickCount, extentMode)
  const format = rightAxis.tickFormat || props.yFormat || props.tickFormatValue || defaultTickFormat
  // The live right-axis branch invokes its formatter with the tick value
  // alone, unlike the horizontal axis which exposes index/all ticks.
  const rightTickFormatter = (value: number | Date) => format(value as number)
  const ticks = resolveStaticAxisTicks({
    candidates: createStaticAxisTicks({
      values,
      scale: scales.y,
      format: rightTickFormatter,
    }),
    scale: scales.y,
    minPixelDistance: 22,
    includeMax: rightAxis.includeMax,
    extentMode,
    hasExplicitTickValues: Boolean(rightAxis.tickValues),
    format: rightTickFormatter,
  })
  const pixelExtent = tickPixelExtent(ticks)
  const label = rightAxis.label ?? props.yLabelRight
  const axisLine = resolveAxisLineStyle(rightAxis.axisStyle, {
    stroke: s.border,
    strokeWidth: 1,
  })
  const legendPosition = props.legendPosition ?? "right"
  const sideLegendGutter = resolveLegendSideGutter(props.legendLayout, axisChrome?.rightAxis)
  const labelMargin = hasRenderedLegend && legendPosition === "right" && sideLegendGutter > 0
    ? sideLegendGutter
    : margin.right
  const labelX = layout.width + labelMargin - 15

  return (
    <g className="stream-axes semiotic-axis semiotic-axis-right" data-orient="right">
      {rightAxis.baseline !== false && !rightAxis.jaggedBase && (
        <line x1={layout.width} y1={0} x2={layout.width} y2={layout.height} {...axisLine} />
      )}
      {rightAxis.jaggedBase && (
        <path d={jaggedBaselinePath("right", layout.width, layout.height)} fill="none" {...axisLine} />
      )}
      {ticks.map((tick, index) => {
        const isLandmark = isStaticAxisLandmark(rightAxis.landmarkTicks, tick, index, ticks)
        return (
          <g key={`ytick-r-${index}`} transform={`translate(${layout.width},${tick.pixel})`}>
            <line x2={5} {...axisLine} />
            {isStaticTextTickLabel(tick.label) ? (
              <text
                x={8}
                textAnchor="start"
                dominantBaseline={resolveVerticalTickBaseline(
                  rightAxis.tickAnchor,
                  tick.pixel === pixelExtent.min,
                  tick.pixel === pixelExtent.max,
                )}
                fontWeight={isLandmark ? 600 : 400}
                fontSize={isLandmark ? s.tickSize + 1 : s.tickSize}
                fill={s.textSecondary}
                fontFamily={s.fontFamily}
              >
                {tick.label}
              </text>
            ) : renderStaticTickForeignObject({
              label: tick.label,
              x: 8,
              y: -12,
              textAlign: "left",
              fontSize: s.tickSize,
              fontFamily: s.fontFamily,
              color: s.textSecondary,
            })}
          </g>
        )
      })}
      {label && (
        <text
          x={labelX}
          y={layout.height / 2}
          textAnchor="middle"
          fontSize={s.labelSize}
          fill={s.text}
          fontFamily={s.fontFamily}
          transform={`rotate(90, ${labelX}, ${layout.height / 2})`}
        >
          {label}
        </text>
      )}
    </g>
  )
}
