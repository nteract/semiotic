import {
  createCustomLayoutFailureDiagnostic,
  type CustomLayoutFamily,
  type CustomLayoutFailureDiagnostic,
} from "./customLayoutFailure"

export type CustomLayoutAttemptResult<T> =
  | { kind: "success"; result: T }
  | {
      kind: "failure"
      diagnostic: CustomLayoutFailureDiagnostic
      preservedLastGoodScene: boolean
    }

/**
 * Shared custom-layout try/catch + diagnostic + onLayoutError boundary.
 * Each family store still applies its own success/failure scene recovery.
 */
export function runCustomLayoutAttempt<T>(options: {
  family: CustomLayoutFamily
  logLabel: string
  revision: number
  hasPreviousResult: boolean
  onLayoutError?: (diagnostic: CustomLayoutFailureDiagnostic) => void
  run: () => T
}): CustomLayoutAttemptResult<T> {
  try {
    return { kind: "success", result: options.run() }
  } catch (error) {
    const preservedLastGoodScene = options.hasPreviousResult
    const diagnostic = createCustomLayoutFailureDiagnostic(
      options.family,
      error,
      preservedLastGoodScene,
      options.revision,
    )
    if (process.env.NODE_ENV !== "production") {
      console.error(`[semiotic] ${options.logLabel} threw:`, error)
    }
    try {
      options.onLayoutError?.(diagnostic)
    } catch (callbackError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[semiotic] onLayoutError threw:", callbackError)
      }
    }
    return { kind: "failure", diagnostic, preservedLastGoodScene }
  }
}
