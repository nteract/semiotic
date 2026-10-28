import { useTheme } from "../store/useTheme"
import { contrastRatio } from "../charts/shared/colorContrast"
import type { SourceLiveness, StalenessConfig } from "./types"

interface StalenessBadgeProps {
  isStale: boolean
  position?: StalenessConfig["badgePosition"]
  state?: SourceLiveness
  settling?: boolean
}

const BADGE_COLORS: Record<SourceLiveness, string> = {
  live: "#28a745",
  stale: "#dc3545",
  stopped: "#6c757d",
  failed: "#842029",
  settling: "#fd7e14",
}

export function resolveStalenessBadgeState(
  isStale: boolean,
  state?: SourceLiveness,
  settling?: boolean,
): SourceLiveness {
  if (state) return state
  if (settling) return "settling"
  return isStale ? "stale" : "live"
}

/**
 * Live/stale indicator chip shown in a corner of a streaming chart when
 * `staleness.showBadge` is set.
 *
 * Shared by all four Stream Frames (XY / ordinal / network / geo) so the badge
 * is pixel-identical across families. The badge sits above the canvas and does
 * not intercept pointer events.
 */
export function StalenessBadge({
  isStale,
  position,
  state,
  settling,
}: StalenessBadgeProps) {
  const kind = resolveStalenessBadgeState(isStale, state, settling)
  const { colors } = useTheme()
  const background = ({ live: colors.success, stale: colors.danger, stopped: colors.textSecondary,
    failed: colors.error, settling: colors.warning })[kind] ?? BADGE_COLORS[kind]
  const color = (contrastRatio(background, "#ffffff") ?? 0) >= 4.5 ? "#ffffff" : "#000000"
  const label = Object.hasOwn(BADGE_COLORS, kind) ? kind.toUpperCase() : "LIVE"
  return (
    <div
      className="stream-staleness-badge"
      role="status"
      aria-live="polite"
      aria-atomic="true"
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
        background,
        color
      }}
    >
      {label}
    </div>
  )
}
