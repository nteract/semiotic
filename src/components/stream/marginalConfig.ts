import type { MarginalConfig, MarginalType } from "./types"

/** Resolve a string shorthand or full config into a MarginalConfig */
export function normalizeMarginalConfig(
  input: MarginalConfig | MarginalType
): MarginalConfig {
  if (typeof input === "string") {
    return { type: input }
  }
  return input
}
