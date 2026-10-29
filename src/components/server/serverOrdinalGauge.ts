import {
  describeGaugeCenter,
  gaugeCenterCaptionLines,
  renderGaugeCenter
} from "../charts/shared/GaugeReadout"
import { computeGaugeLayout } from "../charts/shared/gaugeLayout"
import { hasTextTitle, MIN_TITLE_TOP_MARGIN } from "../stream/titleLayout"
import { staticTitleText } from "./staticTitle"
import type { Datum } from "../charts/shared/datumTypes"
import { buildGaugeArcModel } from "../charts/shared/gaugeGradient"
import { normalizeColorGradient } from "../charts/shared/gradient"
import { mergeShapeStyle } from "../charts/shared/mergeShapeStyle"
import { sweepToAngles } from "../charts/shared/radialGeometry"
import { resolveStyleRules, type StyleRule } from "../charts/shared/styleRules"
import {
  primitiveStyleOverrides,
  type ChartConfig
} from "./serverChartConfigShared"
import { renderServerGaugeOverlay } from "./serverGaugeOverlay"

/** GaugeChart's partial-arc model, needle overlay, and centered scene. */
export const gaugeChart: ChartConfig = {
  frameType: "ordinal",
  renderOverlay: renderServerGaugeOverlay,
  buildProps: (data, _colorBy, _colorScheme, common, rest) => {
    const gMin = rest.min ?? 0
    const gMax = rest.max ?? 100
    const sweep = rest.sweep ?? 240
    const arcWidth = rest.arcWidth ?? 0.3
    const showNeedle = rest.showNeedle !== false
    const fillZones = rest.fillZones !== false
    const { startAngleDeg } = sweepToAngles(sweep)
    // Compactness and scale-label defaults follow the resolved mode (including
    // responsive rules), as in the React chart.
    const mode = common.__resolvedMode ?? rest.mode
    const compact = mode === "context" || mode === "sparkline"
    const showScaleLabels = rest.showScaleLabels ?? !compact

    const thresholds = rest.thresholds
    const gradientFill = normalizeColorGradient(
      common.gradientFill as Parameters<typeof normalizeColorGradient>[0]
    )
    const gaugeModel = buildGaugeArcModel({
      min: gMin,
      max: gMax,
      value: rest.value,
      thresholds,
      fillColor: rest.color,
      backgroundColor: rest.backgroundColor || "#e0e0e0",
      fillZones,
      showScaleLabels,
      gradientFill
    })
    const gaugeRules = rest.styleRules as StyleRule[] | undefined
    const gaugePieceStyle = (datum: Datum, category?: string): Datum => {
      const base: Datum = { ...gaugeModel.pieceStyle(datum, category) }
      if (gaugeRules?.length) {
        Object.assign(
          base,
          resolveStyleRules(datum, gaugeRules, {
            value: typeof datum.value === "number" ? datum.value : undefined,
            category:
              category ??
              (datum.category == null ? undefined : String(datum.category))
          })
        )
      }
      return base
    }

    const [width, height] = (common.size as [number, number] | undefined) || [
      300, 250
    ]
    const value = Math.max(gMin, Math.min(gMax, rest.value ?? gMin))
    const formattedValue =
      typeof rest.valueFormat === "function"
        ? rest.valueFormat(value)
        : String(Math.round(value))
    const suppliedCenterContent = rest.centerContent ?? common.centerContent
    const center = describeGaugeCenter({
      centerContent: suppliedCenterContent,
      centerLabel: typeof rest.centerLabel === "string" ? rest.centerLabel : undefined,
      value,
      min: gMin,
      max: gMax,
      showScaleLabels,
      valueFormat: typeof rest.valueFormat === "function" ? rest.valueFormat : undefined,
      compact
    })
    // Same arc + readout fit as the React chart (see computeGaugeLayout).
    const layout = computeGaugeLayout({
      width,
      height,
      sweep,
      arcWidth,
      readout:
        center && "readout" in center
          ? { value: center.readout.value, captionLines: gaugeCenterCaptionLines(center) }
          : null,
      needle: showNeedle,
      scaleLabels: gaugeModel.gaugeAnnotations
        .filter((ann) => ann.type === "gauge-label")
        .map((ann) => ({
          fraction: gMax === gMin ? 0 : (ann.value - gMin) / (gMax - gMin),
          text: String(ann.label)
        })),
      // Static output reserves the title strip only for text titles.
      topInset: hasTextTitle(staticTitleText(common.title ?? rest.title)) ? MIN_TITLE_TOP_MARGIN : 0
    })
    const { radius, innerRadius: computedInnerRadius } = layout
    const frameCenterX = layout.centerX
    const frameCenterY = layout.centerY
    const centerContent = renderGaugeCenter(center, {
      min: gMin,
      max: gMax,
      radius,
      innerRadius: computedInnerRadius,
      offsetY: layout.readoutOffset
    })

    return {
      chartType: "donut",
      data: gaugeModel.gaugeData,
      oAccessor: "category",
      rAccessor: "value",
      projection: "radial",
      innerRadius: computedInnerRadius,
      sweepAngle: sweep,
      startAngle: startAngleDeg,
      oSort: false,
      pieceStyle: mergeShapeStyle(
        gaugePieceStyle,
        primitiveStyleOverrides(rest)
      ),
      ...(rest.cornerRadius != null && { cornerRadius: rest.cornerRadius }),
      ...common,
      size: [width, height],
      margin: layout.margin,
      ...(centerContent != null && { centerContent }),
      showAxes: false,
      annotations: [
        ...(Array.isArray(common.annotations) ? common.annotations : []),
        ...gaugeModel.gaugeAnnotations
      ],
      __gauge: {
        gMin,
        gMax,
        sweep,
        arcWidth,
        value,
        startAngleDeg,
        thresholds,
        centerX: frameCenterX,
        centerY: frameCenterY,
        radius,
        innerRadius: computedInnerRadius,
        showScaleLabels,
        needleLength:
          computedInnerRadius > 20 ? computedInnerRadius - 8 : radius - 1,
        showNeedle,
        needleColor: rest.needleColor,
        ...(mode === "context" &&
          suppliedCenterContent == null && {
            contextValue: formattedValue,
            contextValueY: frameCenterY - computedInnerRadius * 0.2,
            valueFontSize: Math.max(12, Math.min(22, radius * 0.28))
          })
      }
    }
  }
}
