import * as React from "react"
import type { StreamPhysicsFrameProps } from "../../stream/physics/StreamPhysicsTypes"
import type { PhysicalFlowProjectionMetadata } from "./physicsChartUtils"
import {
  formatPhysicalFlowThroughput,
  physicalFlowPathD
} from "./packetFlowSemantics"

export function physicalFlowOverlay(
  metadata: PhysicalFlowProjectionMetadata | undefined,
  options: {
    showNodeLabels: boolean
    showSensors: boolean
    showStaticFlow: boolean
  }
): StreamPhysicsFrameProps["foregroundGraphics"] | undefined {
  const { showNodeLabels, showSensors, showStaticFlow } = options
  if (!metadata || (!showStaticFlow && !showSensors && !showNodeLabels)) {
    return undefined
  }

  return ({ size }) => {
    const resolvedSize: [number, number] = [
      Number(size[0]) || 760,
      Number(size[1]) || 420
    ]
    const maxThroughput = Math.max(
      1,
      ...metadata.links.map((link) => link.throughput)
    )
    const sensorById = new Set(metadata.nodes.map((node) => node.sensorId))

    return (
      <svg
        aria-hidden="true"
        data-testid="physical-flow-static-flow-overlay"
        width={resolvedSize[0]}
        height={resolvedSize[1]}
        viewBox={`0 0 ${resolvedSize[0]} ${resolvedSize[1]}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {showStaticFlow
          ? metadata.links.map((link) => {
              const strokeWidth = 3 + (link.throughput / maxThroughput) * 16
              const mid = link.path[Math.floor(link.path.length / 2)]
              return (
                <g key={link.id}>
                  <path
                    d={physicalFlowPathD(link.path)}
                    fill="none"
                    stroke="var(--semiotic-border, #d1d5db)"
                    strokeWidth={strokeWidth + 5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.26}
                  />
                  <path
                    d={physicalFlowPathD(link.path)}
                    fill="none"
                    stroke="var(--semiotic-primary, #4e79a7)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.16}
                  />
                  {mid ? (
                    <text
                      x={mid.x}
                      y={mid.y - strokeWidth / 2 - 5}
                      textAnchor="middle"
                      fill="var(--semiotic-text-secondary, #555)"
                      fontSize={10}
                      fontWeight={700}
                    >
                      {formatPhysicalFlowThroughput(link.throughput)}
                    </text>
                  ) : null}
                </g>
              )
            })
          : null}
        {metadata.nodes.map((node) => (
          <g key={node.id}>
            {showSensors && sensorById.has(node.sensorId) ? (
              <rect
                data-testid="physical-flow-sensor-overlay"
                x={node.x - 12}
                y={node.y - 12}
                width={24}
                height={24}
                rx={4}
                fill="none"
                stroke="var(--semiotic-warning, #f59e0b)"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                opacity={0.88}
              />
            ) : null}
            {showStaticFlow ? (
              <circle
                cx={node.x}
                cy={node.y}
                r={6}
                fill="var(--semiotic-bg, #fff)"
                stroke="var(--semiotic-text-secondary, #555)"
                strokeWidth={1.2}
              />
            ) : null}
            {showNodeLabels ? (
              <text
                x={node.x}
                y={node.y - 14}
                textAnchor="middle"
                fill="var(--semiotic-text, #111827)"
                fontSize={11}
                fontWeight={800}
              >
                {node.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    )
  }
}
