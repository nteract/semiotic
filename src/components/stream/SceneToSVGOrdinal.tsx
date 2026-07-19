/**
 * Ordinal scene graph → SVG element converter.
 *
 * Split out of SceneToSVG.tsx (which re-exports `ordinalSceneNodeToSVG`) to
 * keep that file under the file-size ratchet ceiling. Shared helpers
 * (svgFill, safeSvgId, glyphNodeToSVG, buildRectSVGGradient,
 * perCornerSvgPath, symbolSceneNodeToSVG, ARC_NOOP) live in
 * sceneToSVGShared.tsx so the XY and ordinal serializers agree on geometry.
 */

import * as React from "react"
import { arc as d3Arc } from "d3-shape"

import type {
  PointSceneNode,
  RectSceneNode,
  SymbolSceneNode,
  GlyphSceneNode
} from "./types"

import { isHatchFill, hatchPatternDef } from "../charts/shared/hatchFill"
import { hasAnyCornerRadius } from "./renderers/cornerRadii"
import { annularSectorPath, buildGaugeGradientGeometry } from "./renderers/wedgePathBuilder"

import type {
  OrdinalSceneNode,
  WedgeSceneNode,
  BoxplotSceneNode,
  ViolinSceneNode,
  ConnectorSceneNode,
  TrapezoidSceneNode
} from "./ordinalTypes"

import {
  ARC_NOOP,
  svgFill,
  safeSvgId,
  glyphNodeToSVG,
  buildRectSVGGradient,
  perCornerSvgPath,
  symbolSceneNodeToSVG
} from "./sceneToSVGShared"

function formatFunnelNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${(value / 1_000).toFixed(0)}K`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

/**
 * Funnel builders store their canvas-label geometry on the rect datum. Keep
 * those labels in the scene-to-SVG backend as well so server SVG is not a
 * marks-only variant of the canvas chart.
 */
function funnelRectLabels(node: RectSceneNode, key: string): React.ReactNode {
  const datum = node.datum as Record<string, unknown> | undefined
  if (!datum) return null
  const labels: React.ReactNode[] = []
  const step = datum.__funnelStepLabel
  const stepX = Number(datum.__funnelStepLabelX)
  const stepY = Number(datum.__funnelStepLabelY)
  const rowWidth = Number(datum.__funnelRowWidth)
  if (typeof step === "string" && Number.isFinite(stepX) && Number.isFinite(stepY) &&
      (!Number.isFinite(rowWidth) || step.length * 8.4 + 16 <= rowWidth)) {
    labels.push(
      <text key={`${key}-funnel-step`} x={stepX} y={stepY + 3} textAnchor="middle"
        dominantBaseline="hanging" fontSize={14} fontWeight="bold" fill="#fff"
        stroke="rgba(0,0,0,0.6)" strokeWidth={3} paintOrder="stroke">
        {step}
      </text>,
    )
  }

  const value = Number(datum.__funnelValue)
  const valueX = Number(datum.__funnelValueLabelX)
  const valueY = Number(datum.__funnelValueLabelY)
  const barWidth = Number(datum.__funnelBarW)
  if (Number.isFinite(value) && value !== 0 && Number.isFinite(valueX) && Number.isFinite(valueY) && barWidth >= 60) {
    const percent = Number(datum.__funnelPercent)
    const isFirst = datum.__funnelIsFirstStep === true
    let text = !isFirst && Number.isFinite(percent)
      ? `${formatFunnelNumber(value)} (${Math.abs(percent - Math.round(percent)) < 0.05 ? Math.round(percent) : percent.toFixed(1)}%)`
      : formatFunnelNumber(value)
    if (text.length * 7.8 + 16 > barWidth) text = formatFunnelNumber(value)
    if (text.length * 7.8 + 16 <= barWidth) {
      labels.push(
        <text key={`${key}-funnel-value`} x={valueX} y={valueY + 22} textAnchor="middle"
          dominantBaseline="hanging" fontSize={13} fontWeight="bold" fill="#fff"
          stroke="rgba(0,0,0,0.5)" strokeWidth={3} paintOrder="stroke">
          {text}
        </text>,
      )
    }
  }
  return labels.length ? <g key={`${key}-funnel-labels`}>{labels}</g> : null
}

export function ordinalSceneNodeToSVG(node: OrdinalSceneNode, i: number, idPrefix?: string): React.ReactNode {
  // Build a unique key combining node type, category (or group), and index
  // to avoid duplicate key warnings when multiple nodes share the same index
  // within stacked/grouped ordinal charts. `idPrefix` (when provided) is
  // also threaded into any SVG `id` attributes this node emits — required
  // for multi-chart pages where two ordinal frames could otherwise pick
  // the same `clipPath` id and produce cross-chart `url(#…)` references.
  const category = ("category" in node ? node.category : undefined) || ("group" in node ? node.group : undefined) || ""
  const nodeKey = (suffix: string) => `ord-${node.type}-${category}-${i}-${suffix}`
  const baseKey = `ord-${node.type}-${category}-${i}`

  switch (node.type) {
    case "rect": {
      const n = node as RectSceneNode
      // If the scene node carries a gradient, build the SVG defs entry and
      // reference it via `fill="url(#id)"`. buildRectSVGGradient returns null
      // for invalid configs (e.g. < 2 colorStops) so we fall back to solid.
      // baseKey embeds the category/group from user data — sanitize to the
      // strict ID charset so spaces or punctuation in category names can't
      // produce invalid markup or break the url(#...) reference.
      const gradientId = `${safeSvgId(baseKey)}-grad`
      const gradientDefs = buildRectSVGGradient(n, gradientId)
      // A HatchFill descriptor becomes an inline `<pattern>` def referenced
      // via url(#…) — the SVG counterpart to the canvas CanvasPattern, so a
      // hatched bar reads identically in SSR. Gradient takes precedence when
      // both are somehow set.
      let hatchDefEl: React.ReactElement | undefined
      let fillValue: string
      if (gradientDefs) {
        fillValue = `url(#${gradientId})`
      } else if (isHatchFill(n.style.fill)) {
        const hatchId = `${safeSvgId(baseKey)}-hatch`
        hatchDefEl = hatchPatternDef(n.style.fill, hatchId)
        fillValue = `url(#${hatchId})`
      } else {
        fillValue = svgFill(n.style.fill)
      }
      const rectDefs = gradientDefs || hatchDefEl ? <defs>{gradientDefs}{hatchDefEl}</defs> : null
      if (n.cornerRadii && hasAnyCornerRadius(n.cornerRadii)) {
        const d = perCornerSvgPath(n)
        return (
          <React.Fragment key={baseKey}>
            {rectDefs}
            <path
              d={d}
              fill={fillValue}
              opacity={n.style.opacity}
              stroke={n.style.stroke}
              strokeWidth={n.style.strokeWidth}
            />
          </React.Fragment>
        )
      }
      if (n.roundedTop && n.roundedTop > 0) {
        const r = Math.min(n.roundedTop, n.w / 2, n.h / 2)
        const { x, y, w, h } = n
        let d: string
        switch (n.roundedEdge) {
          case "right":
            d = `M${x},${y} L${x+w-r},${y} A${r},${r} 0 0 1 ${x+w},${y+r} L${x+w},${y+h-r} A${r},${r} 0 0 1 ${x+w-r},${y+h} L${x},${y+h} Z`
            break
          case "left":
            d = `M${x+w},${y} L${x+r},${y} A${r},${r} 0 0 0 ${x},${y+r} L${x},${y+h-r} A${r},${r} 0 0 0 ${x+r},${y+h} L${x+w},${y+h} Z`
            break
          case "bottom":
            d = `M${x},${y} L${x+w},${y} L${x+w},${y+h-r} A${r},${r} 0 0 1 ${x+w-r},${y+h} L${x+r},${y+h} A${r},${r} 0 0 1 ${x},${y+h-r} Z`
            break
          default: // "top"
            d = `M${x},${y+h} L${x},${y+r} A${r},${r} 0 0 1 ${x+r},${y} L${x+w-r},${y} A${r},${r} 0 0 1 ${x+w},${y+r} L${x+w},${y+h} Z`
        }
        return (
          <React.Fragment key={baseKey}>
            {rectDefs}
            <path
              d={d}
              fill={fillValue}
              opacity={n.style.opacity}
              stroke={n.style.stroke}
              strokeWidth={n.style.strokeWidth}
            />
          </React.Fragment>
        )
      }
      return (
        <React.Fragment key={baseKey}>
          {rectDefs}
          <rect
            x={n.x} y={n.y} width={n.w} height={n.h}
            fill={fillValue}
            opacity={n.style.opacity}
            stroke={n.style.stroke}
            strokeWidth={n.style.strokeWidth}
          />
          {funnelRectLabels(n, baseKey)}
        </React.Fragment>
      )
    }
    case "point": {
      const n = node as PointSceneNode
      return (
        <circle
          key={baseKey}
          cx={n.x} cy={n.y} r={n.r}
          fill={svgFill(n.style.fill)}
          opacity={n.style.opacity ?? n.style.fillOpacity ?? 0.8}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
        />
      )
    }
    case "symbol":
      return symbolSceneNodeToSVG(node as SymbolSceneNode, i, idPrefix)
    case "glyph": {
      const n = node as GlyphSceneNode
      return glyphNodeToSVG(n, n.x, n.y, `${idPrefix ?? ""}ord-glyph-${n.pointId ?? i}`)
    }
    case "wedge": {
      const n = node as WedgeSceneNode
      // Scene stores angles in canvas convention (0 = 3 o'clock).
      // d3-shape arc expects 0 = 12 o'clock; the manual path builder
      // accepts canvas convention directly. Pick the builder when the
      // node opts into per-end rounding (gauge endpoints), fall back to
      // d3-arc for uniform all-corner rounding and the unrounded fast
      // path.
      if (n._gradientBand && n._gradientBand.colors.length > 0) {
        // Gradient band: rounded outline drives a clipPath, N unrounded
        // slices inside paint the gradient. Shared geometry with the
        // canvas renderer via `buildGaugeGradientGeometry`. An empty
        // colors array falls through to the standard wedge fill below so
        // the node still renders something rather than disappearing.
        const clipId = safeSvgId(`${idPrefix ? `${idPrefix}-` : ""}gauge-grad-${n.category || baseKey}-${i}`)
        const { clipPath: clipD, slices } = buildGaugeGradientGeometry({
          innerRadius: n.innerRadius,
          outerRadius: n.outerRadius,
          startAngle: n.startAngle,
          endAngle: n.endAngle,
          cornerRadius: n.cornerRadius,
          roundStart: n.roundedEnds?.start ?? true,
          roundEnd: n.roundedEnds?.end ?? true,
          colors: n._gradientBand.colors,
        })
        return (
          <g
            key={baseKey}
            transform={`translate(${n.cx},${n.cy})`}
            opacity={n.style.opacity}
            fillOpacity={n.style.fillOpacity}
          >
            <defs>
              <clipPath id={clipId}>
                <path d={clipD} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              {slices.map((slice, idx) => (
                <path key={idx} d={slice.d} fill={svgFill(slice.color)} />
              ))}
            </g>
            {n.style.stroke && n.style.stroke !== "none" && (
              // Stroke the rounded outline OUTSIDE the clipped group so
              // the stroke isn't itself clipped (half the stroke width
              // sits outside the band's filled region). Matches the
              // non-gradient wedge branches and the canvas renderer.
              <path
                d={clipD}
                fill="none"
                stroke={n.style.stroke}
                strokeWidth={n.style.strokeWidth}
              />
            )}
          </g>
        )
      }
      let arcPath: string
      if (n.roundedEnds) {
        // Per-end rounding opted in. The `roundedEnds` object — even
        // when BOTH flags are false — is the authoritative signal: the
        // caller has explicitly chosen which sides round. Middle
        // wedges in a multi-zone gauge fall here with both flags false
        // and short-circuit to a square sector; without this they'd
        // inherit d3-arc's uniform all-corner rounding via the
        // fallback branch.
        arcPath = annularSectorPath({
          innerRadius: n.innerRadius,
          outerRadius: n.outerRadius,
          startAngle: n.startAngle,
          endAngle: n.endAngle,
          cornerRadius: n.cornerRadius,
          roundStart: n.roundedEnds.start,
          roundEnd: n.roundedEnds.end,
        })
      } else {
        // Uniform all-corner rounding (regular donut) or unrounded.
        const arcGen = d3Arc()
          .innerRadius(n.innerRadius)
          .outerRadius(n.outerRadius)
          .startAngle(n.startAngle + Math.PI / 2)
          .endAngle(n.endAngle + Math.PI / 2)
        if (n.cornerRadius) arcGen.cornerRadius(n.cornerRadius)
        arcPath = arcGen(ARC_NOOP) || ""
      }
      return (
        <path
          key={baseKey}
          d={arcPath}
          transform={`translate(${n.cx},${n.cy})`}
          fill={svgFill(n.style.fill)}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
          opacity={n.style.opacity}
        />
      )
    }
    case "boxplot": {
      const n = node as BoxplotSceneNode
      const halfW = n.columnWidth / 2
      if (n.projection === "vertical") {
        return (
          <g key={baseKey}>
            <line x1={n.x} y1={n.minPos} x2={n.x} y2={n.maxPos} stroke={n.style.stroke || "#333"} strokeWidth={1} />
            <rect
              x={n.x - halfW} y={Math.min(n.q1Pos, n.q3Pos)}
              width={n.columnWidth} height={Math.abs(n.q3Pos - n.q1Pos)}
              fill={svgFill(n.style.fill)} fillOpacity={n.style.fillOpacity ?? 0.6}
              stroke={n.style.stroke || "#333"} strokeWidth={1}
            />
            <line x1={n.x - halfW} y1={n.medianPos} x2={n.x + halfW} y2={n.medianPos} stroke={n.style.stroke || "#333"} strokeWidth={2} />
            <line x1={n.x - halfW * 0.5} y1={n.minPos} x2={n.x + halfW * 0.5} y2={n.minPos} stroke={n.style.stroke || "#333"} strokeWidth={1} />
            <line x1={n.x - halfW * 0.5} y1={n.maxPos} x2={n.x + halfW * 0.5} y2={n.maxPos} stroke={n.style.stroke || "#333"} strokeWidth={1} />
          </g>
        )
      } else {
        return (
          <g key={baseKey}>
            <line x1={n.minPos} y1={n.y} x2={n.maxPos} y2={n.y} stroke={n.style.stroke || "#333"} strokeWidth={1} />
            <rect
              x={Math.min(n.q1Pos, n.q3Pos)} y={n.y - halfW}
              width={Math.abs(n.q3Pos - n.q1Pos)} height={n.columnWidth}
              fill={svgFill(n.style.fill)} fillOpacity={n.style.fillOpacity ?? 0.6}
              stroke={n.style.stroke || "#333"} strokeWidth={1}
            />
            <line x1={n.medianPos} y1={n.y - halfW} x2={n.medianPos} y2={n.y + halfW} stroke={n.style.stroke || "#333"} strokeWidth={2} />
            <line x1={n.minPos} y1={n.y - halfW * 0.5} x2={n.minPos} y2={n.y + halfW * 0.5} stroke={n.style.stroke || "#333"} strokeWidth={1} />
            <line x1={n.maxPos} y1={n.y - halfW * 0.5} x2={n.maxPos} y2={n.y + halfW * 0.5} stroke={n.style.stroke || "#333"} strokeWidth={1} />
          </g>
        )
      }
    }
    case "violin": {
      const n = node as ViolinSceneNode
      const elements: React.ReactNode[] = [
        <path
          key={nodeKey("path")}
          d={n.pathString}
          transform={n.translateX || n.translateY ? `translate(${n.translateX},${n.translateY})` : undefined}
          fill={svgFill(n.style.fill)}
          fillOpacity={n.style.fillOpacity ?? 0.6}
          stroke={n.style.stroke || "#333"}
          strokeWidth={n.style.strokeWidth || 1}
        />
      ]
      if (n.iqrLine && n.bounds) {
        const b = n.bounds
        const midX = b.x + b.width / 2
        const midY = b.y + b.height / 2
        // The scene builder already records the projection used to generate
        // both the violin path and its IQR. Aspect-ratio inference breaks for
        // short/wide vertical violins, causing the SVG IQR to rotate while
        // the body remains vertical; canvas correctly reads this field.
        const isVertical = n.iqrLine.isVertical
        if (isVertical) {
          elements.push(
            <line key={nodeKey("iqr")}
              x1={midX} y1={n.iqrLine.q1Pos} x2={midX} y2={n.iqrLine.q3Pos}
              stroke={n.style.stroke || "#333"} strokeWidth={2}
            />,
            <circle key={nodeKey("med")}
              cx={midX} cy={n.iqrLine.medianPos} r={3}
              fill="white" stroke={n.style.stroke || "#333"} strokeWidth={1}
            />
          )
        } else {
          elements.push(
            <line key={nodeKey("iqr")}
              x1={n.iqrLine.q1Pos} y1={midY} x2={n.iqrLine.q3Pos} y2={midY}
              stroke={n.style.stroke || "#333"} strokeWidth={2}
            />,
            <circle key={nodeKey("med")}
              cx={n.iqrLine.medianPos} cy={midY} r={3}
              fill="white" stroke={n.style.stroke || "#333"} strokeWidth={1}
            />
          )
        }
      }
      return <g key={baseKey}>{elements}</g>
    }
    case "connector": {
      const n = node as ConnectorSceneNode
      return (
        <line
          key={baseKey}
          x1={n.x1} y1={n.y1} x2={n.x2} y2={n.y2}
          stroke={n.style.stroke || "#999"}
          strokeWidth={n.style.strokeWidth || 1}
          opacity={n.style.opacity ?? 0.5}
        />
      )
    }
    case "trapezoid": {
      const n = node as TrapezoidSceneNode
      const pts = n.points.map(p => `${p[0]},${p[1]}`).join(" ")
      return (
        <polygon
          key={baseKey}
          points={pts}
          fill={svgFill(n.style.fill, "#999")}
          opacity={n.style.opacity}
          stroke={n.style.stroke}
          strokeWidth={n.style.strokeWidth}
        />
      )
    }
    default:
      return null
  }
}
