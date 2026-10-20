import * as React from "react"
import type { StreamPhysicsFrameProps } from "../../stream/physics/StreamPhysicsTypes"
import { physicsCanvasThemeCSSValue as color } from "../../stream/physics/PhysicsCanvasTheme"
import type { EventDropProjectionMetadata } from "./eventDropPhysics"
import type { EventDropWindowChrome } from "./physicsProjectionOverlays"

/** Window surfaces belong beneath the bodies, including opaque theme overrides. */
export function eventDropWindowBackground(
  metadata: EventDropProjectionMetadata | undefined,
  enabled?: boolean,
  chrome?: EventDropWindowChrome
): StreamPhysicsFrameProps["backgroundGraphics"] {
  if (!metadata || enabled === false || chrome?.show === false) return undefined
  const { plot, windowPlot, gutter, windowCount, windowSize, windowStart } =
    metadata
  const top = plot.y + plot.height * 0.48
  const bottom = plot.y + plot.height
  const gutterTop = metadata.lidSegments[0]?.y1 ?? top
  const ledgerByStart = new Map(metadata.ledger?.map((row) => [row.start, row]))
  return (
    <g data-testid="event-drop-window-background" aria-hidden="true">
      <rect
        x={gutter.x}
        y={gutterTop}
        width={gutter.width}
        height={bottom - gutterTop}
        fill={color("gutterFill")}
      />
      {Array.from({ length: windowCount }, (_, index) => {
        const closed = index < metadata.closedWindowCount
        const start = windowStart + index * windowSize
        const end = start + windowSize
        const row = ledgerByStart.get(start) ?? {
          windowId: `${start}-${end}`,
          start,
          end,
          accepted: 0,
          late: 0,
          bySource: {},
          open: !closed
        }
        const fill =
          typeof chrome?.fill === "function" ? chrome.fill(row) : chrome?.fill
        return (
          <rect
            key={start}
            x={windowPlot.x + (index * windowPlot.width) / windowCount}
            y={top}
            width={windowPlot.width / windowCount}
            height={bottom - top}
            fill={fill ?? color(closed ? "closedWindowFill" : "openWindowFill")}
          />
        )
      })}
    </g>
  )
}
