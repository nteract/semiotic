"use client"
import { ResolutionReader } from "./ResolutionReader"
import type { ResolutionChartProps } from "./chartProps"

/** Experimental incidence reader retaining each source edge and its ownership history. */
export function BoundaryLoomChart(props: ResolutionChartProps) {
  return <ResolutionReader {...props} mode="boundary-loom" />
}
