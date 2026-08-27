import * as React from "react"
import type { Datum } from "../charts/shared/datumTypes"
import { buildGaugeArcModel } from "../charts/shared/gaugeGradient"
import { normalizeColorGradient } from "../charts/shared/gradient"
import { mergeShapeStyle } from "../charts/shared/mergeShapeStyle"
import {
  computeArcBoundingBox,
  sweepToAngles
} from "../charts/shared/radialGeometry"
import { resolveStyleRules, type StyleRule } from "../charts/shared/styleRules"
import {
  primitiveStyleOverrides,
  type ChartConfig
} from "./serverChartConfigShared"
import { renderServerGaugeOverlay } from "./serverGaugeOverlay"

/** GaugeChart's partial-arc model, needle overlay, and centered scene. */
export const gaugeChart: ChartConfig = {
  frameType: "ordinal",
  layout: { primarySize: { width: 300, height: 250 } },
  renderOverlay: renderServerGaugeOverlay,
  buildProps: (data, _colorBy, _colorScheme, common, rest) => {
    const gMin = rest.min ?? 0
    const gMax = rest.max ?? 100
    const sweep = rest.sweep ?? 240
    const arcWidth = rest.arcWidth ?? 0.3
    const showNeedle = rest.showNeedle !== false
    const fillZones = rest.fillZones !== false
    const { startAngleDeg } = sweepToAngles(sweep)

    const thresholds = rest.thresholds || [
      { value: gMax, color: rest.color || "#4e79a7" }
    ]
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
      showScaleLabels: rest.showScaleLabels !== false,
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
    const arcBBox = computeArcBoundingBox(sweep)
    const pad = Math.min(10, Math.max(1, Math.min(width, height) / 12))
    const radius = Math.max(
      4,
      Math.min(
        (width - 2 * pad) / arcBBox.width,
        (height - 2 * pad) / arcBBox.height
      ) - 2
    )
    const computedInnerRadius = Math.max(
      0,
      Math.min(radius - 1.5, radius * (1 - arcWidth))
    )
    const frameCenterX = width / 2 - arcBBox.cx * radius
    const frameCenterY = height / 2 - arcBBox.cy * radius
    const sceneSize = 2 * (radius + 4)
    const value = Math.max(gMin, Math.min(gMax, rest.value ?? gMin))
    const formattedValue =
      typeof rest.valueFormat === "function"
        ? rest.valueFormat(value)
        : String(Math.round(value))
    const suppliedCenterContent = rest.centerContent ?? common.centerContent
    const centerContent =
      suppliedCenterContent != null
        ? typeof suppliedCenterContent === "function"
          ? suppliedCenterContent(value, gMin, gMax)
          : suppliedCenterContent
        : rest.mode === "sparkline" || rest.mode === "context"
          ? undefined
          : React.createElement(
              "div",
              { style: { textAlign: "center", lineHeight: 1.2 } },
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: Math.max(16, radius * 0.3),
                    fontWeight: 700,
                    color: "var(--semiotic-text, #333)"
                  }
                },
                formattedValue
              ),
              rest.showScaleLabels !== false &&
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 11,
                      color: "var(--semiotic-text-secondary, #666)"
                    }
                  },
                  `${gMin} – ${gMax}`
                )
            )

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
      margin: {
        top: frameCenterY - sceneSize / 2,
        bottom: height - frameCenterY - sceneSize / 2,
        left: frameCenterX - sceneSize / 2,
        right: width - frameCenterX - sceneSize / 2
      },
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
        showScaleLabels: rest.showScaleLabels !== false,
        needleLength:
          computedInnerRadius > 20 ? computedInnerRadius - 8 : radius - 1,
        showNeedle,
        needleColor: rest.needleColor,
        ...(rest.mode === "context" &&
          suppliedCenterContent == null && {
            contextValue: formattedValue,
            contextValueY: frameCenterY - computedInnerRadius * 0.2,
            valueFontSize: Math.max(12, Math.min(22, radius * 0.28))
          })
      }
    }
  }
}
