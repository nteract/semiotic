import type { StalenessConfig } from "./types"

interface StalenessBadgeProps {
  isStale: boolean
  position?: StalenessConfig["badgePosition"]
}

/**
 * Live/stale indicator chip shown in a corner of a streaming chart when
 * `staleness.showBadge` is set.
 *
 * Shared by all four Stream Frames (XY / ordinal / network / geo) so the badge
 * is pixel-identical across families. The badge sits above the canvas and does
 * not intercept pointer events.
 */
export function StalenessBadge({ isStale, position }: StalenessBadgeProps) {
  return (
    <div
      className="stream-staleness-badge"
      style={{
        position: "absolute",
        ...(position === "top-left"
          ? { top: 4, left: 4 }
          : position === "bottom-left"
            ? { bottom: 4, left: 4 }
            : position === "bottom-right"
              ? { bottom: 4, right: 4 }
              : { top: 4, right: 4 }),
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
        pointerEvents: "none",
        zIndex: 3,
        background: isStale ? "#dc3545" : "#28a745",
        color: "white"
      }}
    >
      {isStale ? "STALE" : "LIVE"}
    </div>
  )
}
