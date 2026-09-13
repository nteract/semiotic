import { expect, type Locator } from "@playwright/test"
import type { FlowCircuitEvidence } from "./flow-circuit-parity-fixtures"

export async function assertFlowCircuitSurface(
  visual: Locator,
  evidence: FlowCircuitEvidence
) {
  await expect(visual.locator("[data-circuit-edition]")).toHaveAttribute(
    "data-circuit-edition",
    evidence.kind
  )
  await expect(visual.locator("[data-circuit-time]")).toHaveAttribute(
    "data-circuit-time",
    String(evidence.time)
  )
  for (const label of evidence.labels)
    await expect(visual.getByText(label, { exact: true }).first()).toBeVisible()
  const edges = await visual
    .locator("[data-circuit-edge]")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        id: element.getAttribute("data-circuit-edge"),
        source: element.getAttribute("data-source"),
        target: element.getAttribute("data-target"),
        flow: element.getAttribute("data-flow"),
        unit: element.getAttribute("data-unit")
      }))
    )
  expect(edges).toEqual(evidence.edges)
  const modules = await visual
    .locator("[data-circuit-module]")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        id: element.getAttribute("data-circuit-module"),
        kind: element.getAttribute("data-module-kind"),
        queued: element.getAttribute("data-queued")
      }))
    )
  // DOM order follows sections; canonical ownership follows forest traversal.
  const byId = (a: { id: string | null }, b: { id: string | null }) =>
    a.id!.localeCompare(b.id!)
  expect(modules.sort(byId)).toEqual([...evidence.modules].sort(byId))
}
