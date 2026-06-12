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
 * is pixel-identical across families. Previously each frame inlined its own
 * copy and they had drifted — the network frame used a smaller, heavier variant
 * (10px/700, tighter padding, letterSpacing). This is the canonical style: the
 * more legible 11px/600 the other three shared, plus `zIndex`/`pointerEvents`
 * hardening so the badge always sits above the canvas and never intercepts
 * pointer events.
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
