// ── Realtime encoding configs ─────────────────────────────────────────

export interface DecayConfig {
  type: "linear" | "exponential" | "step"
  /** Exponential: half-life in buffer positions (default: bufferSize/2) */
  halfLife?: number
  /** Minimum opacity floor (default: 0.1) */
  minOpacity?: number
  /** Step: positions from newest before fading (default: bufferSize*0.5) */
  stepThreshold?: number
}

export interface PulseConfig {
  /** Duration of the pulse glow in ms (default: 500) */
  duration?: number
  /** Glow color (default: "rgba(255,255,255,0.6)") */
  color?: string
  /** Extra px radius for glow ring on points (default: 4) */
  glowRadius?: number
}

export interface TransitionConfig {
  /** Animation duration in ms (default: 300) */
  duration?: number
  /** Easing function (default: "ease-out") */
  easing?: "ease-out" | "linear"
}

export interface StalenessConfig {
  /**
   * ms without data before "stale" (default: 5000). In graded mode this
   * is the base TTL the lifecycle bands are measured against — `aging`
   * begins here, `stale` at 1.5×, `expired` at 3× (overridable).
   */
  threshold?: number
  /** Canvas alpha when stale, binary mode (default: 0.5) */
  dimOpacity?: number
  /** Render LIVE/STALE badge (default: false) */
  showBadge?: boolean
  /** Badge position (default: "top-right") */
  badgePosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  /**
   * Opt into graded (banded) staleness. Instead of a single live→stale
   * flip at `threshold`, frames that support graded staleness dim
   * progressively through fresh → aging → stale → expired as idle time
   * crosses multiples of `threshold`, sharing one schedule with per-datum
   * decay and annotation freshness. (Currently honored by `StreamXYFrame`,
   * which backs the realtime XY charts; other frames treat it as binary.)
   * `true` uses the default per-band opacities; pass an object to override
   * the band thresholds or opacities.
   */
  graded?:
    | boolean
    | {
        /** Multiples of `threshold` marking each band edge (see LifecycleBandThresholds). */
        thresholds?: import("../realtime/lifecycleBands").LifecycleBandThresholds
        /** Per-band canvas alpha override. Missing bands use the defaults. */
        opacities?: Partial<
          Record<import("../realtime/lifecycleBands").LifecycleBand, number>
        >
      }
}
