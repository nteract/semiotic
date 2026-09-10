import type { Datum } from "../shared/datumTypes"
import type { Style } from "../../stream/types"
import {
  composeStyleRules,
  makeRuleValueResolver,
  type StyleRule
} from "../shared/styleRules"

/** Map a flow value onto `edgeWidthRange`, collapsing non-finite inputs to min. */
export function flowMapEdgeWidth(
  value: unknown,
  domain: [number, number] | undefined,
  range: [number, number]
): number {
  const [widthMin, widthMax] = range
  if (!domain) return widthMin
  const [minValue, maxValue] = domain
  const valueRange = maxValue > minValue ? maxValue - minValue : 0
  const raw = Number(value)
  const v = Number.isFinite(raw) ? raw : minValue
  const ratio = valueRange > 0 ? (v - minValue) / valueRange : 0
  const normalized = Math.max(0, Math.min(1, ratio))
  return widthMin + normalized * (widthMax - widthMin)
}

/**
 * Shared FlowMap edge style for the client HOC and `renderChart`. `fillOpacity: 0`
 * is load-bearing: the line renderer treats fillOpacity &gt; 0 as area fill.
 */
export function buildFlowMapLineStyle(options: {
  valueAccessor: string
  valueDomain: [number, number] | undefined
  edgeWidthRange: [number, number]
  resolveStroke: (d: Datum) => string
  edgeOpacity: number
  edgeLinecap: "butt" | "round" | "square"
  styleRules?: ReadonlyArray<StyleRule>
}): (d: Datum) => Style {
  const {
    valueAccessor,
    valueDomain,
    edgeWidthRange,
    resolveStroke,
    edgeOpacity,
    edgeLinecap,
    styleRules
  } = options
  const readValue = makeRuleValueResolver(valueAccessor)
  const base = (d: Datum): Style => ({
    stroke: resolveStroke(d),
    strokeWidth: flowMapEdgeWidth(d[valueAccessor], valueDomain, edgeWidthRange),
    strokeLinecap: edgeLinecap,
    opacity: edgeOpacity,
    fillOpacity: 0
  })
  return composeStyleRules(base, styleRules, (raw) => ({
    value: readValue(raw)
  })) as (d: Datum) => Style
}
