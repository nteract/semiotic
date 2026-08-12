import * as React from "react"
import type { StreamPhysicsFrameProps } from "../../stream/physics/StreamPhysicsTypes"
import {
  physicsChartArea,
  pileTubeGeometry,
  type CollisionSwarmProjectionMetadata,
  type EventDropProjectionMetadata,
  type GaltonBoardProjectionMetadata
} from "./physicsChartUtils"

type ValueProjectionRow = { label: string; value: number }
type EventProjectionRow = ValueProjectionRow & { secondary?: number }

export interface GaltonBoardReferenceLine {
  value: number
  label?: React.ReactNode
  color?: string
  className?: string
  strokeDasharray?: string
  strokeWidth?: number
  labelPosition?: "top" | "bottom"
}

export function galtonBoardOverlay(
  rows: ValueProjectionRow[],
  bins: number,
  enabled: boolean | undefined,
  metadata: GaltonBoardProjectionMetadata | undefined,
  referenceLines:
    GaltonBoardReferenceLine | GaltonBoardReferenceLine[] | undefined
): StreamPhysicsFrameProps["foregroundGraphics"] | undefined {
  const referenceLineArray = Array.isArray(referenceLines)
    ? referenceLines
    : referenceLines
      ? [referenceLines]
      : []
  if (enabled === false && referenceLineArray.length === 0) return undefined
  return ({ size }) => {
    const resolvedSize: [number, number] = [
      Number(size[0]) || 700,
      Number(size[1]) || 420
    ]
    const area = physicsChartArea(resolvedSize)
    const resolvedBins = Math.max(2, Math.round(bins))
    const laneWidth = area.plot.width / resolvedBins
    const yBottom = area.plot.y + area.plot.height
    const maxValue = Math.max(1, ...rows.map((row) => row.value))
    const showScaffold = enabled !== false
    const [domainStart, domainEnd] = metadata?.valueExtent ?? [0, resolvedBins]
    const domainSpan = domainEnd === domainStart ? 1 : domainEnd - domainStart
    const curve = rows
      .map((row, index) => {
        const x = area.plot.x + (index + 0.5) * laneWidth
        const y = yBottom - (row.value / maxValue) * area.plot.height * 0.9
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(" ")

    return (
      <svg
        aria-hidden="true"
        data-testid="galton-board-structure-overlay"
        width={resolvedSize[0]}
        height={resolvedSize[1]}
        viewBox={`0 0 ${resolvedSize[0]} ${resolvedSize[1]}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {showScaffold ? (
          <>
            {Array.from({ length: resolvedBins + 1 }, (_, index) => {
              const x = area.plot.x + index * laneWidth
              return (
                <line
                  key={`bin-wall-${index}`}
                  data-testid="galton-board-bin-wall"
                  x1={x}
                  x2={x}
                  y1={area.plot.y}
                  y2={yBottom}
                  stroke="var(--semiotic-border, #d1d5db)"
                  strokeOpacity={0.28}
                  strokeWidth={1}
                />
              )
            })}
            <line
              x1={area.plot.x}
              x2={area.plot.x + area.plot.width}
              y1={yBottom}
              y2={yBottom}
              stroke="var(--semiotic-border, #d1d5db)"
              strokeWidth={1.5}
            />
            <path
              d={curve}
              fill="none"
              stroke="var(--semiotic-primary, #4e79a7)"
              strokeOpacity={0.7}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {rows.map((row, index) => {
              if (row.value <= 0) return null
              const x = area.plot.x + (index + 0.5) * laneWidth
              const y =
                yBottom - (row.value / maxValue) * area.plot.height * 0.9
              return (
                <text
                  key={`${row.label}-${index}`}
                  x={x}
                  y={Math.max(area.plot.y + 10, y - 6)}
                  textAnchor="middle"
                  fill="var(--semiotic-text-secondary, #555)"
                  fontSize={10}
                  fontWeight={700}
                >
                  {row.value}
                </text>
              )
            })}
          </>
        ) : null}
        {referenceLineArray.map((line, index) => {
          const value = Number(line.value)
          if (!Number.isFinite(value)) return null
          const ratio = Math.max(
            0,
            Math.min(1, (value - domainStart) / domainSpan)
          )
          const x = area.plot.x + ratio * area.plot.width
          const color = line.color ?? "var(--semiotic-warning, #f28e2b)"
          const labelY =
            line.labelPosition === "bottom"
              ? Math.min(resolvedSize[1] - 8, yBottom + 16)
              : area.plot.y + 16
          return (
            <g
              key={`galton-reference-${index}-${value}`}
              className={line.className}
              data-testid="galton-board-reference-line"
            >
              <line
                x1={x}
                x2={x}
                y1={area.plot.y + 8}
                y2={yBottom - 4}
                stroke={color}
                strokeDasharray={line.strokeDasharray ?? "6 5"}
                strokeWidth={line.strokeWidth ?? 2}
              />
              {line.label == null ? null : (
                <text
                  x={Math.min(area.plot.x + area.plot.width - 4, x + 6)}
                  y={labelY}
                  fill={color}
                  fontSize={10}
                  fontWeight={700}
                >
                  {line.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    )
  }
}

export function eventDropOverlay(
  rows: EventProjectionRow[],
  metadata: EventDropProjectionMetadata | undefined,
  enabled: boolean | undefined
): StreamPhysicsFrameProps["foregroundGraphics"] | undefined {
  if (enabled === false || !metadata) return undefined
  return ({ size }) => {
    const resolvedSize: [number, number] = [
      Number(size[0]) || 760,
      Number(size[1]) || 360
    ]
    const area = physicsChartArea(resolvedSize)
    const windowCount = Math.max(1, metadata.windowCount)
    const plot = metadata.plot ?? area.plot
    const gutter = metadata.gutter ?? {
      x: plot.x,
      y: plot.y,
      width: 0,
      height: plot.height
    }
    const windowPlot = metadata.windowPlot ?? plot
    const laneWidth = windowPlot.width / windowCount
    const yBottom = plot.y + plot.height
    const windowTop = plot.y + plot.height * 0.48
    const gutterTop = metadata.lidSegments[0]?.y1 ?? windowTop
    const domainStart = metadata.windowStart
    const domainEnd = metadata.windowStart + windowCount * metadata.windowSize
    const watermarkRatio =
      domainEnd === domainStart
        ? 0
        : (metadata.watermarkValue - domainStart) / (domainEnd - domainStart)
    const watermarkX =
      windowPlot.x + Math.max(0, Math.min(1, watermarkRatio)) * windowPlot.width

    return (
      <svg
        aria-hidden="true"
        data-testid="event-drop-window-overlay"
        width={resolvedSize[0]}
        height={resolvedSize[1]}
        viewBox={`0 0 ${resolvedSize[0]} ${resolvedSize[1]}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <rect
          x={plot.x}
          y={plot.y}
          width={plot.width}
          height={plot.height}
          fill="none"
          stroke="var(--semiotic-border, #d1d5db)"
          strokeOpacity={0.7}
          strokeWidth={1}
        />
        {gutter.width > 0 ? (
          <g>
            <rect
              x={gutter.x}
              y={gutterTop}
              width={gutter.width}
              height={yBottom - gutterTop}
              fill="var(--semiotic-danger, #e15759)"
              fillOpacity={0.07}
              stroke="var(--semiotic-border, #d1d5db)"
              strokeOpacity={0.55}
              strokeWidth={1}
            />
            <text
              x={gutter.x + gutter.width / 2}
              y={gutterTop - 8}
              textAnchor="middle"
              fill="var(--semiotic-danger, #e15759)"
              fontSize={10}
              fontWeight={700}
            >
              gutter
            </text>
          </g>
        ) : null}
        {Array.from({ length: windowCount }, (_, index) => {
          const row = rows[index]
          const x = windowPlot.x + index * laneWidth
          const closed = index < metadata.closedWindowCount
          const late = row?.secondary ?? 0
          return (
            <g key={`window-${index}`}>
              <rect
                x={x}
                y={windowTop}
                width={laneWidth}
                height={yBottom - windowTop}
                fill={
                  closed
                    ? "var(--semiotic-danger, #e15759)"
                    : "var(--semiotic-primary, #4e79a7)"
                }
                fillOpacity={closed ? 0.08 : 0.06}
                stroke="var(--semiotic-border, #d1d5db)"
                strokeOpacity={0.68}
                strokeWidth={1}
              />
              {closed
                ? metadata.lidSegments
                    .filter((segment) => segment.windowIndex === index)
                    .map((segment) => (
                      <line
                        key={segment.id}
                        x1={segment.x1}
                        x2={segment.x2}
                        y1={segment.y1}
                        y2={segment.y2}
                        stroke="var(--semiotic-danger, #e15759)"
                        strokeOpacity={0.78}
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    ))
                : null}
              <text
                x={x + laneWidth / 2}
                y={windowTop - 8}
                textAnchor="middle"
                fill="var(--semiotic-text-secondary, #555)"
                fontSize={10}
                fontWeight={700}
              >
                {row?.value ?? 0}
                {late ? ` / ${late} late` : ""}
              </text>
              <text
                x={x + laneWidth / 2}
                y={Math.min(resolvedSize[1] - 8, yBottom + 16)}
                textAnchor="middle"
                fill="var(--semiotic-text-secondary, #555)"
                fontSize={10}
              >
                {row?.label ?? ""}
              </text>
            </g>
          )
        })}
        {metadata.lidSegments
          .filter((segment) => segment.windowIndex == null)
          .map((segment) => (
            <line
              key={segment.id}
              x1={segment.x1}
              x2={segment.x2}
              y1={segment.y1}
              y2={segment.y2}
              stroke="var(--semiotic-danger, #e15759)"
              strokeOpacity={0.62}
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        <line
          x1={plot.x}
          x2={plot.x + plot.width}
          y1={yBottom}
          y2={yBottom}
          stroke="var(--semiotic-border, #d1d5db)"
          strokeWidth={1.5}
        />
        <line
          data-testid="event-drop-watermark"
          x1={watermarkX}
          x2={watermarkX}
          y1={plot.y + 8}
          y2={yBottom}
          stroke="var(--semiotic-warning, #f28e2b)"
          strokeDasharray="5 4"
          strokeWidth={2}
        />
        <text
          x={Math.min(plot.x + plot.width - 4, watermarkX + 6)}
          y={plot.y + 16}
          fill="var(--semiotic-warning, #f28e2b)"
          fontSize={10}
          fontWeight={700}
        >
          watermark {Math.round(metadata.watermarkValue * 100) / 100}
        </text>
        {metadata.lateCount > 0 ? (
          <text
            x={gutter.x + gutter.width / 2}
            y={plot.y + 32}
            textAnchor="middle"
            fill="var(--semiotic-danger, #e15759)"
            fontSize={10}
            fontWeight={700}
          >
            {metadata.lateCount} late
          </text>
        ) : null}
      </svg>
    )
  }
}

export function pileProjectionOverlay(
  rows: ValueProjectionRow[],
  ballRadius: number,
  enabled: boolean | undefined
): StreamPhysicsFrameProps["foregroundGraphics"] | undefined {
  if (enabled === false || rows.length === 0) return undefined
  return ({ size }) => {
    const resolvedSize: [number, number] = [
      Number(size[0]) || 700,
      Number(size[1]) || 380
    ]
    const area = physicsChartArea(resolvedSize)
    const geom = pileTubeGeometry(area.plot, rows.length, ballRadius)
    const yBottom = area.plot.y + area.plot.height

    return (
      <svg
        aria-hidden="true"
        data-testid="physics-pile-projection-overlay"
        width={resolvedSize[0]}
        height={resolvedSize[1]}
        viewBox={`0 0 ${resolvedSize[0]} ${resolvedSize[1]}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <line
          x1={area.plot.x}
          x2={area.plot.x + area.plot.width}
          y1={yBottom}
          y2={yBottom}
          stroke="var(--semiotic-border, #d1d5db)"
          strokeWidth={1}
        />
        {rows.map((row, index) => {
          const barHeight = Math.min(
            area.plot.height,
            geom.pileHeight(row.value)
          )
          const barWidth = geom.tubeWidth
          const x = geom.centerX(index)
          const y = yBottom - barHeight
          return (
            <g key={`${row.label}-${index}`}>
              <rect
                x={x - barWidth / 2}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill="var(--semiotic-primary, #4e79a7)"
                fillOpacity={0.08}
                stroke="var(--semiotic-primary, #4e79a7)"
                strokeOpacity={0.42}
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <text
                x={x}
                y={Math.max(area.plot.y + 12, y - 6)}
                textAnchor="middle"
                fill="var(--semiotic-text-secondary, #555)"
                fontSize={11}
                fontWeight={700}
              >
                {row.value}
              </text>
              <text
                x={x}
                y={Math.min(resolvedSize[1] - 8, yBottom + 16)}
                textAnchor="middle"
                fill="var(--semiotic-text-secondary, #555)"
                fontSize={10}
              >
                {row.label}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }
}

function formatTick(value: number): string {
  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export function collisionSwarmProjectionOverlay(
  metadata: CollisionSwarmProjectionMetadata | undefined,
  enabled: boolean | undefined
): StreamPhysicsFrameProps["foregroundGraphics"] | undefined {
  if (enabled === false || !metadata) return undefined

  return ({ size }) => {
    const resolvedSize: [number, number] = [
      Number(size[0]) || 700,
      Number(size[1]) || 360
    ]
    const area = physicsChartArea(resolvedSize)
    const yAxis = area.plot.y + area.plot.height
    const [min, max] = metadata.xExtent
    const mid = min + (max - min) / 2
    const ticks = [
      { label: formatTick(min), x: metadata.xRange[0] },
      {
        label: formatTick(mid),
        x: metadata.xRange[0] + (metadata.xRange[1] - metadata.xRange[0]) / 2
      },
      { label: formatTick(max), x: metadata.xRange[1] }
    ]

    return (
      <svg
        aria-hidden="true"
        data-testid="collision-swarm-projection-overlay"
        width={resolvedSize[0]}
        height={resolvedSize[1]}
        viewBox={`0 0 ${resolvedSize[0]} ${resolvedSize[1]}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {metadata.groups.map((group) => (
          <g key={group.label}>
            <line
              x1={area.plot.x}
              x2={area.plot.x + area.plot.width}
              y1={group.y}
              y2={group.y}
              stroke="var(--semiotic-border, #d1d5db)"
              strokeDasharray="3 5"
              strokeWidth={1}
            />
            <text
              x={area.plot.x + 4}
              y={group.y - 7}
              fill="var(--semiotic-text-secondary, #555)"
              fontSize={10}
              fontWeight={700}
            >
              {group.label}
            </text>
            <text
              x={area.plot.x + area.plot.width - 4}
              y={group.y - 7}
              textAnchor="end"
              fill="var(--semiotic-text-secondary, #555)"
              fontSize={10}
            >
              n={group.count}
            </text>
          </g>
        ))}
        <line
          x1={metadata.xRange[0]}
          x2={metadata.xRange[1]}
          y1={yAxis}
          y2={yAxis}
          stroke="var(--semiotic-text-secondary, #555)"
          strokeWidth={1}
        />
        {ticks.map((tick) => (
          <g key={`${tick.label}-${tick.x}`}>
            <line
              x1={tick.x}
              x2={tick.x}
              y1={yAxis}
              y2={yAxis + 5}
              stroke="var(--semiotic-text-secondary, #555)"
              strokeWidth={1}
            />
            <text
              x={tick.x}
              y={Math.min(resolvedSize[1] - 8, yAxis + 18)}
              textAnchor="middle"
              fill="var(--semiotic-text-secondary, #555)"
              fontSize={10}
            >
              {tick.label}
            </text>
          </g>
        ))}
      </svg>
    )
  }
}
