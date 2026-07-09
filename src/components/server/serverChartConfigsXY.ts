import * as React from "react"
import type { Datum } from "../charts/shared/datumTypes"
import { createColorScale, getColor } from "../charts/shared/colorUtils"
import { computeDifferenceSegments } from "../charts/xy/DifferenceChart"
import {
  type ChartConfig,
  accessorValue,
  numericValue,
  prepareConnectedScatterplotData,
  viridisColor,
} from "./serverChartConfigShared"

// ── XY Charts ──────────────────────────────────────────────────────────

export const sparkline: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "line",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    groupAccessor: rest.lineBy || colorBy,
    colorAccessor: colorBy,
    ...common,
    // Sparkline-specific overrides — always applied regardless of frameProps
    showAxes: false,
    margin: common.margin || { top: 2, right: 2, bottom: 2, left: 2 },
    showLegend: false,
    showGrid: false,
    title: undefined,
  }),
}

export const lineChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "line",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    groupAccessor: rest.lineBy || colorBy,
    colorAccessor: colorBy,
    colorScheme,
    lineStyle: rest.lineStyle,
    ...common,
  }),
}

export const areaChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "area",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    y0Accessor: rest.y0Accessor,
    groupAccessor: rest.areaBy || colorBy,
    colorAccessor: colorBy,
    colorScheme,
    ...common,
  }),
}

export const differenceChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, _colorBy, _colorScheme, common, rest) => {
    // Mirror the client HOC: compute crossover-segmented area data plus
    // parallel overlay lines, then hand off to the mixed-frame path so
    // the same SVG converters paint server-side as canvas paints client-side.
    const xKey = rest.xAccessor || "x"
    const aKey = rest.seriesAAccessor || "a"
    const bKey = rest.seriesBAccessor || "b"
    const getX = (d: Datum) => numericValue(accessorValue(xKey, "x", d))
    const getA = (d: Datum) => numericValue(accessorValue(aKey, "a", d))
    const getB = (d: Datum) => numericValue(accessorValue(bKey, "b", d))
    const seriesAColor = rest.seriesAColor || "var(--semiotic-danger, #dc2626)"
    const seriesBColor = rest.seriesBColor || "var(--semiotic-info, #2563eb)"
    const areaOpacity = rest.areaOpacity ?? 0.6
    const lineWidth = rest.lineWidth ?? 1.5
    const showLines = rest.showLines !== false

    const segmented = computeDifferenceSegments(Array.isArray(data) ? data : [], getX, getA, getB)
    const overlay: Datum[] = []
    if (showLines && Array.isArray(data)) {
      // Filter non-finite x BEFORE sorting. `Array.sort`'s comparator
      // returns NaN for NaN-NaN, which V8 treats like 0 (equal), so
      // surrounding finite-x rows can land out of order. The downstream
      // emission already skips non-finite-x rows; doing it first keeps
      // the sort total-ordered.
      const finite = data.filter(d => Number.isFinite(getX(d)))
      const sorted = finite.sort((p, q) => getX(p) - getX(q))
      for (const d of sorted) {
        const x = getX(d), a = getA(d), b = getB(d)
        if (Number.isFinite(a)) overlay.push({ __x: x, __y: a, __diffSegment: "line-A" })
        if (Number.isFinite(b)) overlay.push({ __x: x, __y: b, __diffSegment: "line-B" })
      }
    }
    const combined = [...segmented, ...overlay] as Datum[]
    const areaGroups = Array.from(new Set(segmented.map(r => r.__diffSegment)))

    return {
      chartType: "mixed",
      data: combined,
      xAccessor: "__x",
      yAccessor: "__y",
      y0Accessor: "__y0",
      groupAccessor: "__diffSegment",
      areaGroups,
      areaStyle: (d: Datum) => {
        const key = d.__diffSegment as string
        const winner = key?.endsWith("-A") ? "A" : "B"
        return {
          fill: winner === "A" ? seriesAColor : seriesBColor,
          stroke: "none",
          fillOpacity: areaOpacity,
        }
      },
      lineStyle: (d: Datum) => {
        const key = d.__diffSegment as string
        const winner = key === "line-A" ? "A" : "B"
        return {
          stroke: winner === "A" ? seriesAColor : seriesBColor,
          strokeWidth: lineWidth,
          fill: "none",
        }
      },
      curve: rest.curve || "linear",
      ...common,
    }
  },
}

export const stackedAreaChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const colorAccessor = colorBy || rest.areaBy
    const colorScale =
      typeof colorAccessor === "string" && Array.isArray(data)
        ? createColorScale(data, colorAccessor, colorScheme)
        : undefined
    const lineStyle =
      rest.areaOpacity == null
        ? undefined
        : (d: Datum) => {
            const color =
              colorAccessor == null ? undefined : getColor(d, colorAccessor, colorScale)
            const showLine = rest.showLine ?? true
            const stroke = rest.stroke ?? color
            const strokeWidth = rest.strokeWidth ?? rest.lineWidth ?? 2
            return {
              fill: rest.color ?? color,
              stroke: showLine ? stroke : "none",
              ...(showLine ? { strokeWidth } : {}),
              fillOpacity: rest.areaOpacity,
              ...(rest.opacity == null ? {} : { opacity: rest.opacity }),
            }
          }

    return {
      chartType: "stackedarea",
      data,
      xAccessor: rest.xAccessor || "x",
      yAccessor: rest.yAccessor || "y",
      groupAccessor: rest.areaBy,
      colorAccessor,
      colorScheme,
      normalize: rest.normalize,
      stackOrder: rest.stackOrder,
      lineStyle,
      ...common,
    }
  },
}

export const candlestickChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, _colorBy, _colorScheme, common, rest) => ({
    chartType: "candlestick",
    data,
    xAccessor: rest.xAccessor || "x",
    // yAccessor drives the scale extent; the scene builder reads high/low/
    // open/close directly. High is the natural upper bound for the axis.
    yAccessor: rest.highAccessor || "high",
    highAccessor: rest.highAccessor || "high",
    lowAccessor: rest.lowAccessor || "low",
    // Open/close are optional — PipelineStore detects range mode when both
    // are absent, so don't synthesize defaults here.
    openAccessor: rest.openAccessor,
    closeAccessor: rest.closeAccessor,
    candlestickStyle: rest.candlestickStyle,
    ...common,
  }),
}

export const scatterplot: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "scatter",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    colorAccessor: colorBy,
    sizeAccessor: rest.sizeBy,
    colorScheme,
    ...common,
  }),
}

export const quadrantChart: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    // Build the four quadrant rects + centerlines + corner labels as
    // an svgPreRenderer closure so it gets painted UNDER the scatter
    // marks, matching the client HOC's z-order. The closure receives
    // the scene, scales, and layout at render time, so it can
    // translate data-space xCenter/yCenter into pixel coordinates the
    // same way the client does.
    const xCenter = rest.xCenter
    const yCenter = rest.yCenter
    const quadrants = rest.quadrants
    const centerlineStyle = rest.centerlineStyle || {}
    const showLabels = rest.showQuadrantLabels !== false
    const labelSize = rest.quadrantLabelSize ?? 12

    const stroke = centerlineStyle.stroke || "#999"
    const strokeWidth = centerlineStyle.strokeWidth ?? 1
    const dashArray = Array.isArray(centerlineStyle.strokeDasharray)
      ? centerlineStyle.strokeDasharray.join(",")
      : centerlineStyle.strokeDasharray
    const padding = 8

    const h_ = React.createElement
    const svgPreRenderers = quadrants ? [
      (_nodes: unknown, scales: { x: (v: number) => number; y: (v: number) => number } | null, layout: { width: number; height: number }) => {
        if (!scales?.x || !scales?.y) return null
        const w = layout.width, h = layout.height
        const rawCx = xCenter != null ? scales.x(xCenter) : w / 2
        const rawCy = yCenter != null ? scales.y(yCenter) : h / 2
        if (xCenter != null && !Number.isFinite(rawCx)) return null
        if (yCenter != null && !Number.isFinite(rawCy)) return null
        const cx = Math.max(0, Math.min(w, rawCx))
        const cy = Math.max(0, Math.min(h, rawCy))
        const quads = [
          { c: quadrants.topLeft,     x: 0,  y: 0,  w: cx,     h: cy     },
          { c: quadrants.topRight,    x: cx, y: 0,  w: w - cx, h: cy     },
          { c: quadrants.bottomLeft,  x: 0,  y: cy, w: cx,     h: h - cy },
          { c: quadrants.bottomRight, x: cx, y: cy, w: w - cx, h: h - cy },
        ]
        const labelEls = showLabels ? [
          h_("text", { key: "ltl", x: padding,     y: padding + labelSize, fill: quadrants.topLeft.color,     fontWeight: 600, fontSize: labelSize, opacity: 0.5 }, quadrants.topLeft.label),
          h_("text", { key: "ltr", x: w - padding, y: padding + labelSize, fill: quadrants.topRight.color,    fontWeight: 600, fontSize: labelSize, opacity: 0.5, textAnchor: "end" }, quadrants.topRight.label),
          h_("text", { key: "lbl", x: padding,     y: h - padding,         fill: quadrants.bottomLeft.color,  fontWeight: 600, fontSize: labelSize, opacity: 0.5 }, quadrants.bottomLeft.label),
          h_("text", { key: "lbr", x: w - padding, y: h - padding,         fill: quadrants.bottomRight.color, fontWeight: 600, fontSize: labelSize, opacity: 0.5, textAnchor: "end" }, quadrants.bottomRight.label),
        ] : []
        return h_(React.Fragment, null,
          ...quads.map((q, i) => (q.w > 0 && q.h > 0)
            ? h_("rect", { key: `qf-${i}`, x: q.x, y: q.y, width: q.w, height: q.h, fill: q.c.color, opacity: q.c.opacity ?? 0.08 })
            : null),
          h_("line", { key: "vc", x1: cx, y1: 0,  x2: cx, y2: h,  stroke, strokeWidth, strokeDasharray: dashArray }),
          h_("line", { key: "hc", x1: 0,  y1: cy, x2: w,  y2: cy, stroke, strokeWidth, strokeDasharray: dashArray }),
          ...labelEls,
        )
      }
    ] : undefined

    return {
      chartType: "scatter",
      data,
      xAccessor: rest.xAccessor || "x",
      yAccessor: rest.yAccessor || "y",
      colorAccessor: colorBy,
      sizeAccessor: rest.sizeBy,
      sizeRange: rest.sizeRange,
      colorScheme,
      pointStyle: rest.pointStyle,
      ...common,
      ...(svgPreRenderers && { svgPreRenderers }),
    }
  },
}

export const connectedScatterplot: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => {
    const prepared = prepareConnectedScatterplotData(data, rest)
    const pointRadius = rest.pointRadius ?? 4
    return {
      chartType: "line",
      data: prepared.data,
      xAccessor: rest.xAccessor || "x",
      yAccessor: rest.yAccessor || "y",
      colorAccessor: colorBy,
      colorScheme,
      lineStyle: rest.lineStyle || {
        stroke: rest.stroke || "#6366f1",
        strokeWidth: rest.strokeWidth ?? pointRadius,
        opacity: rest.opacity,
      },
      pointStyle: (d: Datum) => {
        const order = prepared.orderMap.get(d)
        const i = order?.idx ?? 0
        const n = order?.total ?? 1
        return {
          fill: n > 0 ? viridisColor(i, n) : "#6366f1",
          stroke: "white",
          strokeWidth: 1,
          r: pointRadius,
          fillOpacity: 1,
        }
      },
      ...common,
    }
  },
}

export const heatmap: ChartConfig = {
  frameType: "xy",
  buildProps: (data, colorBy, colorScheme, common, rest) => ({
    chartType: "heatmap",
    data,
    xAccessor: rest.xAccessor || "x",
    yAccessor: rest.yAccessor || "y",
    valueAccessor: rest.valueAccessor,
    colorScheme: colorScheme || rest.colorScheme || "blues",
    showValues: rest.showValues,
    cellBorderColor: rest.cellBorderColor,
    ...common,
  }),
}
