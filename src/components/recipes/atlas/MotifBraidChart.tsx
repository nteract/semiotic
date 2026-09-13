"use client"
import { useMemo } from "react"
import { NetworkCustomChart } from "../../charts/custom/NetworkCustomChart"
import { prepareMotifBraid } from "./braid"
import {
  motifBraidChartProps,
  type MotifBraidChartProps
} from "./motifBraidChartProps"
export type { MotifBraidChartProps }

/**
 * Motif Braid reader. Prepare the atlas outside this component.
 *
 * @example
 * import { MotifBraidChart } from "semiotic/atlas"
 * // atlas is admitted by prepareNetworkAtlas from semiotic/atlas/core.
 * <MotifBraidChart atlas={atlas} title="Supported journeys" />
 *
 * @example
 * import { renderChartWithEvidence } from "semiotic/server"
 * const { svg, evidence } = renderChartWithEvidence("MotifBraidChart", {
 *   atlas, title: "Journey steps", accessibleTable: true
 * })
 */
export function MotifBraidChart(props: MotifBraidChartProps) {
  const braid = useMemo(() => prepareMotifBraid(props.atlas), [props.atlas])
  return <NetworkCustomChart {...motifBraidChartProps(props, braid)} />
}
