"use client"
import * as React from "react"
import { useMemo } from "react"
import { bin as d3Bin } from "d3-array"
import type { ScaleLinear } from "d3-scale"
import type { MarginalConfig, MarginalType } from "./types"

export type MarginalOrient = "top" | "bottom" | "left" | "right"

export interface MarginalGraphicsProps {
  orient: MarginalOrient
  config: MarginalConfig
  /** Raw numeric values along the relevant axis */
  values: number[]
  /** The chart's scale for the axis this marginal summarizes */
  scale: ScaleLinear<number, number>
  /** Available pixel space in the margin (perpendicular to axis) */
  size: number
  /** Chart width (top/bottom) or height (left/right) */
  length: number
}

/** Resolve a string shorthand or full config into a MarginalConfig */
export function normalizeMarginalConfig(
  input: MarginalConfig | MarginalType
): MarginalConfig {
  if (typeof input === "string") {
    return { type: input }
  }
  return input
}

const DEFAULTS = {
  bins: 20,
  fill: "#4e79a7",
  fillOpacity: 0.5,
  stroke: "none",
  strokeWidth: 1
}

function resolveConfig(config: MarginalConfig) {
  return {
    type: config.type,
    bins: config.bins ?? DEFAULTS.bins,
    fill: config.fill ?? DEFAULTS.fill,
    fillOpacity: config.fillOpacity ?? DEFAULTS.fillOpacity,
    stroke: config.stroke ?? DEFAULTS.stroke,
    strokeWidth: config.strokeWidth ?? DEFAULTS.strokeWidth
  }
}

/** Compute quartiles and whiskers for boxplot */
function boxplotStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  if (n === 0) return null

  const q1 = sorted[Math.floor(n * 0.25)]
  const median = sorted[Math.floor(n * 0.5)]
  const q3 = sorted[Math.floor(n * 0.75)]
  const iqr = q3 - q1
  const whiskerLow = Math.max(sorted[0], q1 - 1.5 * iqr)
  const whiskerHigh = Math.min(sorted[n - 1], q3 + 1.5 * iqr)

  return { q1, median, q3, whiskerLow, whiskerHigh }
}

export function MarginalGraphics({
  orient,
  config: rawConfig,
  values,
  scale,
  size,
  length
}: MarginalGraphicsProps) {
  const config = resolveConfig(rawConfig)
  const padding = 4

  const isHorizontal = orient === "top" || orient === "bottom"

  const content = useMemo(() => {
    if (values.length === 0) return null

    const domain = scale.domain() as [number, number]
    const availableSize = size - padding * 2

    if (config.type === "boxplot") {
      const stats = boxplotStats(values)
      if (!stats) return null

      const { q1, median, q3, whiskerLow, whiskerHigh } = stats
      const boxThickness = Math.min(availableSize * 0.5, 20)
      const offset = (availableSize - boxThickness) / 2 + padding

      if (isHorizontal) {
        const x1 = scale(q1)
        const x2 = scale(q3)
        const xMed = scale(median)
        const xWLow = scale(whiskerLow)
        const xWHigh = scale(whiskerHigh)
        const growDir = orient === "top" ? -1 : 1
        const baseY = orient === "top" ? 0 : 0

        return (
          <g data-testid={`marginal-boxplot-${orient}`}>
            {/* Whisker line */}
            <line
              x1={xWLow} y1={baseY + growDir * (offset + boxThickness / 2)}
              x2={xWHigh} y2={baseY + growDir * (offset + boxThickness / 2)}
              stroke={config.fill} strokeWidth={config.strokeWidth}
            />
            {/* Whisker caps */}
            <line
              x1={xWLow} y1={baseY + growDir * offset}
              x2={xWLow} y2={baseY + growDir * (offset + boxThickness)}
              stroke={config.fill} strokeWidth={config.strokeWidth}
            />
            <line
              x1={xWHigh} y1={baseY + growDir * offset}
              x2={xWHigh} y2={baseY + growDir * (offset + boxThickness)}
              stroke={config.fill} strokeWidth={config.strokeWidth}
            />
            {/* Box */}
            <rect
              x={Math.min(x1, x2)}
              y={orient === "top" ? baseY - offset - boxThickness : baseY + offset}
              width={Math.abs(x2 - x1)}
              height={boxThickness}
              fill={config.fill}
              fillOpacity={config.fillOpacity}
              stroke={config.stroke === "none" ? config.fill : config.stroke}
              strokeWidth={config.strokeWidth}
            />
            {/* Median line */}
            <line
              x1={xMed} y1={orient === "top" ? baseY - offset - boxThickness : baseY + offset}
              x2={xMed} y2={orient === "top" ? baseY - offset : baseY + offset + boxThickness}
              stroke={config.fill} strokeWidth={2}
            />
          </g>
        )
      } else {
        // Vertical: left/right
        const y1 = scale(q1)
        const y2 = scale(q3)
        const yMed = scale(median)
        const yWLow = scale(whiskerLow)
        const yWHigh = scale(whiskerHigh)
        const growDir = orient === "left" ? -1 : 1
        const baseX = 0

        return (
          <g data-testid={`marginal-boxplot-${orient}`}>
            <line
              x1={baseX + growDir * (offset + boxThickness / 2)}
              y1={yWLow} x2={baseX + growDir * (offset + boxThickness / 2)} y2={yWHigh}
              stroke={config.fill} strokeWidth={config.strokeWidth}
            />
            <line
              x1={baseX + growDir * offset} y1={yWLow}
              x2={baseX + growDir * (offset + boxThickness)} y2={yWLow}
              stroke={config.fill} strokeWidth={config.strokeWidth}
            />
            <line
              x1={baseX + growDir * offset} y1={yWHigh}
              x2={baseX + growDir * (offset + boxThickness)} y2={yWHigh}
              stroke={config.fill} strokeWidth={config.strokeWidth}
            />
            <rect
              x={orient === "left" ? baseX - offset - boxThickness : baseX + offset}
              y={Math.min(y1, y2)}
              width={boxThickness}
              height={Math.abs(y2 - y1)}
              fill={config.fill}
              fillOpacity={config.fillOpacity}
              stroke={config.stroke === "none" ? config.fill : config.stroke}
              strokeWidth={config.strokeWidth}
            />
            <line
              x1={orient === "left" ? baseX - offset - boxThickness : baseX + offset}
              y1={yMed}
              x2={orient === "left" ? baseX - offset : baseX + offset + boxThickness}
              y2={yMed}
              stroke={config.fill} strokeWidth={2}
            />
          </g>
        )
      }
    }

    // Binned types: histogram, violin, ridgeline
    const binner = d3Bin()
      .domain(domain)
      .thresholds(config.bins)

    const bins = binner(values)
    if (bins.length === 0) return null

    const maxCount = Math.max(...bins.map(b => b.length))
    if (maxCount === 0) return null

    if (config.type === "histogram") {
      return (
        <g data-testid={`marginal-histogram-${orient}`}>
          {bins.map((bin, i) => {
            if (bin.x0 == null || bin.x1 == null) return null
            const count = bin.length
            const barSize = (count / maxCount) * availableSize

            if (isHorizontal) {
              const x = scale(bin.x0)
              const w = scale(bin.x1) - scale(bin.x0)
              const y = orient === "top" ? -padding - barSize : padding
              return (
                <rect
                  key={i}
                  x={x} y={y} width={Math.max(w, 0.5)} height={barSize}
                  fill={config.fill} fillOpacity={config.fillOpacity}
                  stroke={config.stroke} strokeWidth={config.strokeWidth}
                />
              )
            } else {
              const y = scale(bin.x0)
              const h = scale(bin.x1) - scale(bin.x0)
              const x = orient === "left" ? -padding - barSize : padding
              return (
                <rect
                  key={i}
                  x={x} y={Math.min(y, y + h)} width={barSize} height={Math.abs(h)}
                  fill={config.fill} fillOpacity={config.fillOpacity}
                  stroke={config.stroke} strokeWidth={config.strokeWidth}
                />
              )
            }
          })}
        </g>
      )
    }

    if (config.type === "violin") {
      // Symmetric density path around the midline
      const midline = availableSize / 2 + padding

      const points: string[] = []
      // Forward pass (one side)
      for (const bin of bins) {
        if (bin.x0 == null || bin.x1 == null) continue
        const mid = (bin.x0 + bin.x1) / 2
        const w = (bin.length / maxCount) * (availableSize / 2)
        const pos = scale(mid)

        if (isHorizontal) {
          const y = orient === "top" ? -(midline - w) : midline - w
          points.push(`${pos},${y}`)
        } else {
          const x = orient === "left" ? -(midline - w) : midline - w
          points.push(`${x},${pos}`)
        }
      }
      // Reverse pass (other side)
      for (let i = bins.length - 1; i >= 0; i--) {
        const bin = bins[i]
        if (bin.x0 == null || bin.x1 == null) continue
        const mid = (bin.x0 + bin.x1) / 2
        const w = (bin.length / maxCount) * (availableSize / 2)
        const pos = scale(mid)

        if (isHorizontal) {
          const y = orient === "top" ? -(midline + w) : midline + w
          points.push(`${pos},${y}`)
        } else {
          const x = orient === "left" ? -(midline + w) : midline + w
          points.push(`${x},${pos}`)
        }
      }

      return (
        <g data-testid={`marginal-violin-${orient}`}>
          <polygon
            points={points.join(" ")}
            fill={config.fill} fillOpacity={config.fillOpacity}
            stroke={config.stroke === "none" ? config.fill : config.stroke}
            strokeWidth={config.strokeWidth}
          />
        </g>
      )
    }

    if (config.type === "ridgeline") {
      // One-sided area fill from baseline into the margin
      const pathParts: string[] = []

      if (isHorizontal) {
        const baseY = orient === "top" ? 0 : 0
        // Start at baseline
        const startX = bins[0].x0 != null ? scale(bins[0].x0) : 0
        pathParts.push(`M${startX},${baseY}`)

        for (const bin of bins) {
          if (bin.x0 == null || bin.x1 == null) continue
          const mid = (bin.x0 + bin.x1) / 2
          const h = (bin.length / maxCount) * availableSize
          const x = scale(mid)
          const y = orient === "top" ? -h - padding : h + padding
          pathParts.push(`L${x},${y}`)
        }

        // Close back to baseline
        const endX = bins[bins.length - 1].x1 != null ? scale(bins[bins.length - 1].x1!) : length
        pathParts.push(`L${endX},${baseY}`)
        pathParts.push("Z")
      } else {
        const baseX = 0
        const startY = bins[0].x0 != null ? scale(bins[0].x0) : 0
        pathParts.push(`M${baseX},${startY}`)

        for (const bin of bins) {
          if (bin.x0 == null || bin.x1 == null) continue
          const mid = (bin.x0 + bin.x1) / 2
          const w = (bin.length / maxCount) * availableSize
          const y = scale(mid)
          const x = orient === "left" ? -w - padding : w + padding
          pathParts.push(`L${x},${y}`)
        }

        const endY = bins[bins.length - 1].x1 != null ? scale(bins[bins.length - 1].x1!) : length
        pathParts.push(`L${baseX},${endY}`)
        pathParts.push("Z")
      }

      return (
        <g data-testid={`marginal-ridgeline-${orient}`}>
          <path
            d={pathParts.join(" ")}
            fill={config.fill} fillOpacity={config.fillOpacity}
            stroke={config.stroke === "none" ? config.fill : config.stroke}
            strokeWidth={config.strokeWidth}
          />
        </g>
      )
    }

    return null
  }, [values, scale, config, size, length, orient, isHorizontal, padding])

  if (!content) return null

  // Position the <g> at the margin edge
  let transform: string
  switch (orient) {
    case "top":
      transform = `translate(0, 0)` // top edge of chart area
      break
    case "bottom":
      transform = `translate(0, ${length})` // wait — length is chart width for top/bottom
      break
    case "left":
      transform = `translate(0, 0)` // left edge of chart area
      break
    case "right":
      transform = `translate(${length}, 0)` // length is chart width for left/right? No.
      break
  }

  // For top/bottom: length = chart width. The g is already inside the margin-translated group.
  // For left/right: length = chart height.
  // orient=bottom means we're at y=chartHeight (bottom of chart area)
  // orient=right means we're at x=chartWidth (right of chart area)
  // Actually, let the parent handle positioning. This component just draws relative to origin.

  return (
    <g className={`marginal-${orient}`} data-testid={`marginal-${orient}`}>
      {content}
    </g>
  )
}
