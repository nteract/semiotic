import { repairChartConfig } from "../ai/repairChartConfig"
import type { IntentId } from "../ai/intents"
import type { Datum } from "../charts/shared/datumTypes"
import type { ArtifactRepairLedgerEntry } from "./evaluateArtifactTypes"

/**
 * Project deterministic chart-fit advice into the artifact repair ledger.
 * Alternative components remain proposals: changing form can change emphasis,
 * so the fit engine alone cannot establish semantic equivalence.
 */
export function configurationRepairLedgerEntries(
  component: string,
  props: Datum,
  data: ReadonlyArray<Datum> | null | undefined,
  intents: ReadonlyArray<string>
): ArtifactRepairLedgerEntry[] {
  let result: ReturnType<typeof repairChartConfig>
  try {
    result = repairChartConfig(component, data, {
      props,
      intent: [...intents] as IntentId[],
      maxAlternatives: 3
    })
  } catch {
    return [
      {
        id: "repair.configuration.unavailable",
        category: "configuration",
        path: "props",
        action:
          "Correct the chart data shape before requesting configuration repair.",
        reason:
          "The deterministic chart-fit repair engine could not safely profile the supplied data.",
        applied: false,
        changesClaim: false
      }
    ]
  }
  const entries: ArtifactRepairLedgerEntry[] = (result.repairs ?? []).map(
    (action, index) => ({
      id: `repair.configuration.guidance.${index + 1}`,
      category: "configuration",
      path: "props",
      action,
      reason:
        "The registered chart or recipe exposes deterministic guidance, but it is descriptive rather than a structured patch and therefore requires author input.",
      applied: false,
      changesClaim: false
    })
  )

  if (result.status === "ok") return entries
  if (result.alternatives.length === 0) {
    entries.push({
      id: "repair.configuration.no-alternative",
      category: "configuration",
      path: "component",
      action:
        "Choose a registered component that fits the supplied data profile.",
      reason:
        result.status === "alternative"
          ? result.reason
          : `No capability is registered for ${component}.`,
      applied: false,
      changesClaim: false
    })
    return entries
  }

  result.alternatives.forEach((alternative, index) => {
    entries.push({
      id: `repair.configuration.alternative.${index + 1}`,
      category: "configuration",
      path: "component",
      action: `Consider ${alternative.displayName} as a configuration alternative.`,
      reason:
        result.status === "alternative"
          ? `${result.reason} Form changes require review because they can change emphasis even when the claim ledger is unchanged.`
          : `No capability is registered for ${component}; this ranked alternative fits the supplied data profile.`,
      applied: false,
      changesClaim: false,
      suggestedComponent: alternative.component,
      ...(alternative.variant?.key
        ? { suggestedVariant: alternative.variant.key }
        : {})
    })
  })
  return entries
}
