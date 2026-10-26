/**
 * Shared transition utilities for PipelineStores.
 *
 * Extracts common easing logic and types used by PipelineStore,
 * OrdinalPipelineStore, NetworkPipelineStore, and GeoPipelineStore.
 */
import type { Style } from "./types"

export type TransitionOpacity = Pick<Style, "opacity" | "fillOpacity" | "strokeOpacity">

/** Copy channels independently of the animated multiplier, including for exits. */
export function snapshotOpacity(style?: TransitionOpacity | null): TransitionOpacity {
  return {
    opacity: style?.opacity ?? 1,
    fillOpacity: style?.fillOpacity,
    strokeOpacity: style?.strokeOpacity
  }
}

// ── Types ──────────────────────────────────────────────────────────────

/** Active transition state tracked by each PipelineStore */
export interface ActiveTransition {
  startTime: number
  duration: number
}

/** Easing mode — determines interpolation curve */
export type EasingMode = "linear" | "ease-out-cubic" | "ease-out"

// ── Easing ─────────────────────────────────────────────────────────────

/**
 * Compute the eased interpolation parameter from raw progress.
 *
 * @param rawT   - Raw linear progress in [0, 1]
 * @param easing - Easing mode. "linear" returns rawT unchanged;
 *                 "ease-out-cubic" (default) applies 1 - (1 - t)^3.
 * @returns Eased progress in [0, 1]
 */
export function computeEasing(rawT: number, easing?: EasingMode): number {
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
  return globalThis.performance?.now() ?? Date.now()
}

// ── Animate prop resolution ───────────────────────────────────────────

/** The animate prop type accepted by all HOCs and Stream Frames.
 *  Single source of truth — re-exported by types.ts, ordinalTypes.ts, networkTypes.ts, geoTypes.ts. */
export type AnimateProp =
  | boolean | { duration?: number; easing?: "linear" | "ease-out"; intro?: boolean }

/**
 * Resolve the declarative `animate` prop into a concrete TransitionConfig.
 * Used by all 4 Stream Frames. `animate` takes precedence over `transitionProp`.
 */
export function resolveAnimateConfig(
  animate: AnimateProp | undefined,
  transitionProp: { duration?: number; easing?: "ease-out" | "linear" } | undefined
): { transition: { duration?: number; easing?: "ease-out" | "linear" } | undefined; introEnabled: boolean } {
  // animate={false} explicitly disables transitions, overriding transitionProp.
  const transition = animate === false ? undefined : animate
    ? animate === true
      ? { duration: 300 }
      : { duration: animate.duration ?? 300, easing: animate.easing === "linear" ? ("linear" as const)
              : ("ease-out" as const)
        }
    : transitionProp

  // Skip intro under reduced motion: otherwise computeScene can create it
  // after the frame's fast-forward step and briefly paint the zero state.
  const introEnabled = !!animate &&
    !globalThis.window?.matchMedia?.("(prefers-reduced-motion: reduce)").matches &&
    (animate === true || animate.intro !== false)

  return { transition, introEnabled }
}
