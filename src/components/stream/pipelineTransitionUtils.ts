/**
 * Shared transition utilities for PipelineStores.
 *
 * Extracts common easing logic and types used by PipelineStore,
 * OrdinalPipelineStore, NetworkPipelineStore, and GeoPipelineStore.
 */

// ── Types ──────────────────────────────────────────────────────────────

/** Active transition state tracked by each PipelineStore */
export interface ActiveTransition {
  startTime: number
  duration: number
}

/** Easing mode — determines interpolation curve */
export type EasingMode = "linear" | "ease-out-cubic"

// ── Easing ─────────────────────────────────────────────────────────────

/**
 * Compute the eased interpolation parameter from raw progress.
 *
 * @param rawT   - Raw linear progress in [0, 1]
 * @param easing - Easing mode. "linear" returns rawT unchanged;
 *                 "ease-out-cubic" (default) applies 1 - (1 - t)^3.
 * @returns Eased progress in [0, 1]
 */
export function computeEasing(rawT: number, easing: EasingMode = "ease-out-cubic"): number {
  if (easing === "linear") return rawT
  // Ease-out cubic
  return 1 - Math.pow(1 - rawT, 3)
}

// ── Progress ───────────────────────────────────────────────────────────

/**
 * Compute the raw linear progress of a transition.
 *
 * @param now        - Current timestamp (e.g. performance.now())
 * @param transition - The active transition state
 * @returns Raw progress clamped to [0, 1]
 */
export function computeRawProgress(now: number, transition: ActiveTransition): number {
  const elapsed = now - transition.startTime
  return Math.min(elapsed / transition.duration, 1)
}

// ── Interpolation helpers ──────────────────────────────────────────────

/**
 * Linearly interpolate between two values.
 *
 * @param from - Start value
 * @param to   - End value
 * @param t    - Eased progress in [0, 1]
 */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/**
 * Get the current timestamp in a way that works both in browser and Node.
 */
export function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now()
}

// ── Animate prop resolution ───────────────────────────────────────────

/** The animate prop type accepted by all HOCs and Stream Frames. */
export type AnimateProp = boolean | { duration?: number; easing?: "linear" | "ease-out"; intro?: boolean }

/** Transition config type (duplicated here to avoid circular import with types.ts). */
export interface TransitionConfigResolved {
  duration: number
  easing: "ease-out" | "linear"
}

/**
 * Resolve the declarative `animate` prop into a concrete TransitionConfig.
 * Used by all 4 Stream Frames. `animate` takes precedence over `transitionProp`.
 */
export function resolveAnimateConfig(
  animate: AnimateProp | undefined,
  transitionProp: { duration?: number; easing?: "ease-out" | "linear" } | undefined
): { transition: { duration?: number; easing?: "ease-out" | "linear" } | undefined; introEnabled: boolean } {
  const transition = animate
    ? (animate === true
      ? { duration: 300 }
      : { duration: animate.duration ?? 300, easing: animate.easing === "linear" ? "linear" as const : "ease-out" as const })
    : transitionProp

  const introEnabled = animate
    ? (animate === true ? true : (animate as { intro?: boolean }).intro !== false)
    : false

  return { transition, introEnabled }
}
