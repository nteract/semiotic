import * as React from "react"
import type { NetworkViewportRect } from "semiotic/network"
import { bounds, nodes, cardWidth, cardHeight } from "./data"

/** Use the frame's world-coordinate visible window: no duplicated fitting math or scroll listeners. */
export function PipelineMinimap({
  visibleRect,
  selected,
}: {
  visibleRect: NetworkViewportRect | null
  selected: string
}) {
  // At small scales the viewport extends beyond the content. Keep its outline in the map.
  const x = Math.max(0, visibleRect?.x ?? 0)
  const y = Math.max(0, visibleRect?.y ?? 0)
  const right = Math.min(bounds.width, (visibleRect?.x ?? 0) + (visibleRect?.width ?? bounds.width))
  const bottom = Math.min(
    bounds.height,
    (visibleRect?.y ?? 0) + (visibleRect?.height ?? bounds.height),
  )
  return (
    <figure className="pipeline-minimap">
      <figcaption>Where you are</figcaption>
      <svg
        viewBox={`-20 -20 ${bounds.width + 40} ${bounds.height + 40}`}
        role="img"
        aria-label="Pipeline overview with the current viewport outlined"
      >
        {nodes.map((node) => (
          <rect
            key={node.id}
            x={node.x}
            y={node.y}
            width={cardWidth}
            height={cardHeight}
            fill={node.color}
            opacity={node.id === selected ? 1 : 0.4}
          />
        ))}
        <rect
          data-testid="pipeline-minimap-window"
          x={x}
          y={y}
          width={Math.max(0, right - x)}
          height={Math.max(0, bottom - y)}
          fill="none"
          className="pipeline-minimap-window"
          strokeWidth={18}
        />
      </svg>
    </figure>
  )
}
