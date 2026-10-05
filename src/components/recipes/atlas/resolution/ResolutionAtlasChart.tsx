"use client"
import { ResolutionReader } from "./ResolutionReader"
import type { ResolutionChartProps } from "./chartProps"

/** Experimental aligned representations of a prepared resolution, with exact ownership evidence. */
export function ResolutionAtlasChart(props: ResolutionChartProps) {
  return <ResolutionReader {...props} mode="resolution-atlas" />
}
