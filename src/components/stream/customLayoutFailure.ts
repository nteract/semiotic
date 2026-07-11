/**
 * Structured failure information emitted when a custom layout throws.
 *
 * Custom layouts run inside imperative stores so an exception cannot reach a
 * React error boundary. Keep this deliberately small and serializable enough
 * for an app's error UI, telemetry, or an imperative frame-handle readback.
 */
export type CustomLayoutFamily = "xy" | "ordinal" | "geo" | "network"

export type CustomLayoutFailureRecovery =
  | "preserved-last-good-scene"
  | "empty-scene"

export interface CustomLayoutFailureDiagnostic {
  /** Stable machine-readable failure code. */
  code: "CUSTOM_LAYOUT_ERROR"
  severity: "error"
  phase: "layout"
  /** Frame family whose layout callback threw. */
  component: CustomLayoutFamily
  /** The callback surface that threw. */
  source: "customLayout" | "customNetworkLayout"
  /** Human-readable summary suitable for a non-blocking error UI. */
  message: string
  /** A safe, serializable summary of the thrown value. */
  error: {
    name: string
    message: string
  }
  /** Whether a prior custom-layout scene remained visible. */
  recovery: CustomLayoutFailureRecovery
  /** Convenience mirror of `recovery` for simple caller branching. */
  preservedLastGoodScene: boolean
  /** Store revision at which the failed layout attempt occurred. */
  affectedRevision: number
}

function summarizeThrownValue(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name || "Error", message: error.message || "Custom layout threw." }
  }
  if (typeof error === "string") {
    return { name: "Error", message: error }
  }
  if (error == null) {
    return { name: "Error", message: "Custom layout threw a nullish value." }
  }
  try {
    return { name: "Error", message: String(error) }
  } catch {
    return { name: "Error", message: "Custom layout threw a non-stringifiable value." }
  }
}

export function createCustomLayoutFailureDiagnostic(
  component: CustomLayoutFamily,
  error: unknown,
  preservedLastGoodScene: boolean,
  affectedRevision: number
): CustomLayoutFailureDiagnostic {
  const summary = summarizeThrownValue(error)
  const source = component === "network" ? "customNetworkLayout" : "customLayout"
  return {
    code: "CUSTOM_LAYOUT_ERROR",
    severity: "error",
    phase: "layout",
    component,
    source,
    message: `Semiotic ${component} ${source} failed: ${summary.message}`,
    error: summary,
    recovery: preservedLastGoodScene
      ? "preserved-last-good-scene"
      : "empty-scene",
    preservedLastGoodScene,
    affectedRevision
  }
}
